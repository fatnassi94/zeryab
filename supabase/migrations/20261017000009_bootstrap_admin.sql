-- First administrator: the account registered with this email is approved and
-- made admin automatically (on sign-up, or now if it already exists).
-- Later admins are granted from the admin panel.

create or replace function private.bootstrap_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) = 'fatnassifares050@gmail.com' then
    update public.profiles set status = 'active', joined_at = coalesce(joined_at, current_date)
    where id = new.id;
    insert into public.user_roles (user_id, role) values (new.id, 'admin'), (new.id, 'member')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Runs after on_auth_user_created (trigger names fire alphabetically).
create trigger on_auth_user_created_zz_admin after insert on auth.users
  for each row execute function private.bootstrap_admin();

do $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = 'fatnassifares050@gmail.com';
  if v_id is not null then
    update public.profiles set status = 'active', joined_at = coalesce(joined_at, current_date) where id = v_id;
    insert into public.user_roles (user_id, role) values (v_id, 'admin'), (v_id, 'member') on conflict do nothing;
  end if;
end $$;
