-- Members sign up with their part in the ensemble. The account and its
-- membership request are created together and wait for an admin's approval.

create type public.member_part as enum ('lead_vocal', 'percussion', 'instrument');

alter table public.profiles add column part public.member_part;
alter table public.membership_requests add column part public.member_part;
create index profiles_part_idx on public.profiles (part);

-- One pending request per account (no duplicate or spam requests).
create unique index membership_requests_one_pending_idx
  on public.membership_requests (user_id) where status = 'pending';

-- New auth user -> pending profile, and a pending request when the sign-up
-- form sent a part. Metadata comes from the browser: every value is cast
-- safely and trimmed, never trusted as-is.
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

  insert into public.profiles (id, full_name, preferred_locale, part, instruments)
  values (new.id, v_name, v_locale, v_part,
          case when v_instrument <> '' then array[v_instrument] else '{}'::text[] end);
  insert into public.profile_private (id, email) values (new.id, new.email);

  if v_part is not null and v_name <> '' then
    insert into public.membership_requests (user_id, full_name, email, part, instruments, preferred_locale)
    values (new.id, v_name, coalesce(new.email, ''), v_part,
            case when v_instrument <> '' then array[v_instrument] else '{}'::text[] end, v_locale);
  end if;
  return new;
end;
$$;

-- Requests now come only from signed-in people, for their own account.
drop policy "anyone can apply" on public.membership_requests;
create policy "apply for own account" on public.membership_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending' and reviewed_by is null and reviewed_at is null
  );
