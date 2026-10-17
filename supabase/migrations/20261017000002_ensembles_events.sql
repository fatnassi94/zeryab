-- Ensembles, events (concerts, rehearsals...), bookings and attendance.

create type public.event_kind as enum ('concert', 'rehearsal', 'workshop', 'lesson', 'meeting', 'other');
create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.booking_status as enum ('pending', 'confirmed', 'waitlist', 'cancelled');
create type public.attendance_status as enum ('present', 'absent', 'excused', 'late');

-- ---------------------------------------------------------------------------
-- Ensembles
-- ---------------------------------------------------------------------------
create table public.ensembles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  cover_path text,
  is_public boolean not null default true,
  leader_id uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ensembles_leader_idx on public.ensembles (leader_id);
create trigger ensembles_updated_at before update on public.ensembles
  for each row execute function private.set_updated_at();

create table public.ensemble_members (
  ensemble_id uuid not null references public.ensembles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  instrument text,
  part text,
  joined_at date not null default current_date,
  left_at date,
  primary key (ensemble_id, user_id)
);
create index ensemble_members_user_idx on public.ensemble_members (user_id);

create or replace function private.in_ensemble(p_ensemble_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ensemble_members em
    join public.profiles p on p.id = em.user_id
    where em.ensemble_id = p_ensemble_id
      and em.user_id = auth.uid()
      and em.left_at is null
      and p.status = 'active'
  );
$$;

create or replace function private.leads_ensemble(p_ensemble_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ensembles e
    where e.id = p_ensemble_id and e.leader_id = auth.uid()
  ) and private.is_active_member();
$$;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  kind public.event_kind not null default 'concert',
  title text not null,
  summary text,
  description text,
  venue text,
  address text,
  map_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  visibility public.access_level not null default 'public'
    check (visibility <> 'course'),
  status public.event_status not null default 'draft',
  is_bookable boolean not null default false,
  capacity integer check (capacity is null or capacity > 0),
  -- null = free entry
  price_tnd numeric(10, 3) check (price_tnd is null or price_tnd >= 0),
  booking_closes_at timestamptz,
  cover_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_starts_idx on public.events (starts_at);
create index events_status_visibility_idx on public.events (status, visibility);
create index events_created_by_idx on public.events (created_by);
create trigger events_updated_at before update on public.events
  for each row execute function private.set_updated_at();
create trigger events_audit_delete after delete on public.events
  for each row execute function private.audit_delete();

create table public.event_ensembles (
  event_id uuid not null references public.events (id) on delete cascade,
  ensemble_id uuid not null references public.ensembles (id) on delete cascade,
  primary key (event_id, ensemble_id)
);
create index event_ensembles_ensemble_idx on public.event_ensembles (ensemble_id);

-- Specific members invited to an event outside its ensembles.
create table public.event_invitees (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (event_id, user_id)
);
create index event_invitees_user_idx on public.event_invitees (user_id);

create or replace function private.can_view_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (
        private.has_role('activity_manager')
        or e.created_by = auth.uid()
        or (e.status in ('published', 'cancelled', 'completed') and (
              e.visibility = 'public'
              or (e.visibility = 'members' and private.is_active_member())
              or (e.visibility = 'ensemble' and private.is_active_member() and (
                    exists (select 1 from public.event_ensembles ee
                            where ee.event_id = e.id and private.in_ensemble(ee.ensemble_id))
                    or exists (select 1 from public.event_invitees ei
                               where ei.event_id = e.id and ei.user_id = auth.uid())))
              or (e.visibility = 'private' and private.is_staff())
            ))
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Bookings (public reservations for performances)
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  seats integer not null default 1 check (seats between 1 and 10),
  note text,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_event_idx on public.bookings (event_id);
create index bookings_user_idx on public.bookings (user_id);
create trigger bookings_updated_at before update on public.bookings
  for each row execute function private.set_updated_at();

create or replace function private.event_is_bookable(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.status = 'published'
      and e.is_bookable
      and e.visibility = 'public'
      and e.starts_at > now()
      and (e.booking_closes_at is null or e.booking_closes_at > now())
  );
$$;

-- Public bookings: confirmed while seats remain, otherwise waitlisted.
create or replace function private.assign_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_taken integer;
begin
  if private.has_role('activity_manager') then
    return new;
  end if;

  select capacity into v_capacity from public.events where id = new.event_id for update;

  if v_capacity is null then
    new.status := 'confirmed';
  else
    select coalesce(sum(seats), 0) into v_taken
    from public.bookings
    where event_id = new.event_id and status = 'confirmed';
    new.status := case when v_taken + new.seats <= v_capacity then 'confirmed' else 'waitlist' end;
  end if;

  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger bookings_assign_status before insert on public.bookings
  for each row execute function private.assign_booking_status();

-- Seats left, safe for the public page (no personal data exposed).
create or replace function public.event_seats_left(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when e.capacity is null then null
              else greatest(e.capacity - coalesce((
                select sum(b.seats) from public.bookings b
                where b.event_id = e.id and b.status = 'confirmed'), 0), 0)::integer
         end
  from public.events e
  where e.id = p_event_id and private.can_view_event(e.id);
$$;

-- ---------------------------------------------------------------------------
-- Attendance (rehearsals, concerts). Kept when a member is deactivated.
-- ---------------------------------------------------------------------------
create table public.event_attendance (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  status public.attendance_status not null,
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  recorded_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_attendance_user_idx on public.event_attendance (user_id);
create index event_attendance_recorded_by_idx on public.event_attendance (recorded_by);

grant execute on all functions in schema private to anon, authenticated;
revoke execute on function private.audit(text, text, text, jsonb) from public, anon, authenticated;
