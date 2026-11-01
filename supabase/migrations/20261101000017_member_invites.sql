-- Members added by an admin before they sign up ("pre-approved").
-- When someone signs up with an invited email, the account is active at once,
-- with the part and roles the admin chose; no membership request is needed.
-- Supabase still asks them to confirm the email, so only the real owner of the
-- address gets in.

create table public.member_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(btrim(email)) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  part public.member_part,
  roles text[] not null default '{member}' check (roles <@ array['member', 'teacher', 'activity_manager', 'librarian', 'admin'] and cardinality(roles) >= 1),
  invited_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null
);
-- One open invite per address.
create unique index member_invites_open_email_idx on public.member_invites (email) where used_at is null;

alter table public.member_invites enable row level security;
create policy "invites admin only" on public.member_invites for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Sign-up: as before, plus the invite check.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := left(btrim(coalesce(v_meta ->> 'full_name', '')), 120);
  v_instrument text := left(btrim(coalesce(v_meta ->> 'instrument', '')), 60);
  v_part public.member_part;
  v_locale public.app_locale := 'ar';
  v_invite public.member_invites%rowtype;
begin
  begin
    v_part := nullif(v_meta ->> 'part', '')::public.member_part;
  exception when invalid_text_representation then
    v_part := null;
  end;
  begin
    v_locale := coalesce(nullif(v_meta ->> 'locale', '')::public.app_locale, 'ar');
  exception when invalid_text_representation then
    v_locale := 'ar';
  end;
  if v_part is distinct from 'instrument' then
    v_instrument := '';
  end if;

  select * into v_invite from public.member_invites
  where email = lower(btrim(coalesce(new.email, ''))) and used_at is null
  limit 1;

  insert into public.profiles (id, full_name, preferred_locale, part, instruments, status, joined_at)
  values (
    new.id,
    case when v_name <> '' then v_name else coalesce(v_invite.full_name, '') end,
    v_locale,
    coalesce(v_invite.part, v_part),
    case when v_instrument <> '' then array[v_instrument] else '{}'::text[] end,
    case when v_invite.id is not null then 'active'::public.member_status else 'pending'::public.member_status end,
    case when v_invite.id is not null then current_date end
  );
  insert into public.profile_private (id, email) values (new.id, new.email);

  if v_invite.id is not null then
    insert into public.user_roles (user_id, role, granted_by)
    select new.id, r, v_invite.invited_by from unnest(v_invite.roles) as r
    on conflict do nothing;
    update public.member_invites set used_at = now(), used_by = new.id where id = v_invite.id;
  elsif v_part is not null and v_name <> '' then
    insert into public.membership_requests (user_id, full_name, email, part, instruments, preferred_locale)
    values (new.id, v_name, coalesce(new.email, ''), v_part,
            case when v_instrument <> '' then array[v_instrument] else '{}'::text[] end, v_locale);
  end if;
  return new;
end;
$$;

-- Members edit their own profile, but status, part and join date stay with the admins.
create or replace function private.protect_profile_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() and current_setting('role', true) in ('authenticated', 'anon') then
    if new.status is distinct from old.status then
      raise exception 'Only administrators can change membership status';
    end if;
    if new.part is distinct from old.part or new.joined_at is distinct from old.joined_at then
      raise exception 'Only administrators can change the part or join date';
    end if;
  end if;
  return new;
end;
$$;
