-- Zeryab club platform: users, roles, membership requests, audit log, helpers.
-- Helper functions live in the `private` schema so they are not exposed through the API.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_locale as enum ('ar', 'fr', 'en');
create type public.member_status as enum ('pending', 'active', 'suspended', 'inactive');
create type public.request_status as enum ('pending', 'approved', 'rejected');
create type public.content_status as enum ('draft', 'published', 'archived');
-- Who may see a piece of content.
--   public   : everyone, including visitors
--   members  : any active member
--   ensemble : members of the linked ensemble (plus staff)
--   course   : learners enrolled in the linked course (plus staff)
--   private  : staff only
create type public.access_level as enum ('public', 'members', 'ensemble', 'course', 'private');

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create table public.roles (
  key text primary key,
  name_ar text not null,
  name_fr text not null,
  name_en text not null,
  description text
);

insert into public.roles (key, name_ar, name_fr, name_en, description) values
  ('member',           'عضو',            'Membre',                 'Member',            'Access to internal schedules, recordings and files'),
  ('teacher',          'مدرّس',          'Enseignant',             'Teacher',           'Manages own courses, lessons and exercises'),
  ('activity_manager', 'مسؤول الأنشطة',  'Responsable activités',  'Activity manager',  'Manages ensembles, events, bookings, attendance, news'),
  ('librarian',        'مسؤول المكتبة',  'Bibliothécaire',         'Librarian',         'Manages recordings, documents and playlists'),
  ('admin',            'إداري',          'Administrateur',         'Administrator',     'Full access, members and permissions');

-- ---------------------------------------------------------------------------
-- Profiles (public-facing fields) + private personal data
-- Passwords are never stored here: Supabase Auth owns them.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  display_name text,
  avatar_path text,
  instruments text[] not null default '{}',
  bio text,
  preferred_locale public.app_locale not null default 'ar',
  status public.member_status not null default 'pending',
  notify_email boolean not null default false,
  notify_push boolean not null default false,
  joined_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Personal data, visible only to the person and to admins.
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  email text,
  phone text,
  birth_date date,
  address text,
  emergency_contact text,
  admin_notes text,
  updated_at timestamptz not null default now()
);

create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function private.set_updated_at();

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null references public.roles (key),
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_role_idx on public.user_roles (role);
create index user_roles_granted_by_idx on public.user_roles (granted_by);

-- New auth user -> pending profile. Access to internal content waits for approval.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, preferred_locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', '')::public.app_locale, 'ar')
  );
  insert into public.profile_private (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Permission helpers (used by RLS policies)
-- ---------------------------------------------------------------------------
create or replace function private.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid()
      and p.status = 'active'
      and (ur.role = p_role or ur.role = 'admin')
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and p.status = 'active' and ur.role = 'admin'
  );
$$;

-- Active member = approved account holding at least one role.
create or replace function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.id = auth.uid() and p.status = 'active'
  );
$$;

-- Any staff role (teacher, activity manager, librarian, admin).
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid()
      and p.status = 'active'
      and ur.role in ('teacher', 'activity_manager', 'librarian', 'admin')
  );
$$;

grant execute on all functions in schema private to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Membership requests (visitors apply; admins approve)
-- ---------------------------------------------------------------------------
create table public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  instruments text[] not null default '{}',
  experience text,
  message text,
  preferred_locale public.app_locale not null default 'ar',
  status public.request_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create index membership_requests_user_idx on public.membership_requests (user_id);
create index membership_requests_reviewed_by_idx on public.membership_requests (reviewed_by);
create index membership_requests_status_idx on public.membership_requests (status);

-- ---------------------------------------------------------------------------
-- Audit log of sensitive operations (written by triggers only)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

create or replace function private.audit(p_action text, p_entity_type text, p_entity_id text, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'));
$$;
revoke execute on function private.audit(text, text, text, jsonb) from public, anon, authenticated;

create or replace function private.audit_user_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit('role_granted', 'user_roles', new.user_id::text, jsonb_build_object('role', new.role));
    return new;
  else
    perform private.audit('role_revoked', 'user_roles', old.user_id::text, jsonb_build_object('role', old.role));
    return old;
  end if;
end;
$$;

create trigger user_roles_audit after insert or delete on public.user_roles
  for each row execute function private.audit_user_roles();

create or replace function private.audit_profile_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    perform private.audit('member_status_changed', 'profiles', new.id::text,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create trigger profiles_status_audit after update of status on public.profiles
  for each row execute function private.audit_profile_status();

-- Members may edit their own profile, but never their own status.
create or replace function private.protect_profile_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not private.is_admin()
     and current_setting('role', true) in ('authenticated', 'anon') then
    raise exception 'Only administrators can change membership status';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_status before update on public.profiles
  for each row execute function private.protect_profile_status();

-- Generic deletion audit, attached to sensitive tables in later migrations.
create or replace function private.audit_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.audit('deleted', tg_table_name, old.id::text, to_jsonb(old));
  return old;
end;
$$;
