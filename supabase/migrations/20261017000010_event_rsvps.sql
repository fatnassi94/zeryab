-- Members answer "will you attend?" before an event. Actual attendance is
-- still recorded separately by the activity manager (event_attendance).

create type public.rsvp_response as enum ('yes', 'maybe', 'no');

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  response public.rsvp_response not null,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_rsvps_user_idx on public.event_rsvps (user_id);
create trigger event_rsvps_updated_at before update on public.event_rsvps
  for each row execute function private.set_updated_at();

alter table public.event_rsvps enable row level security;

create policy "rsvps readable" on public.event_rsvps for select to authenticated using (
  user_id = (select auth.uid())
  or (select private.has_role('activity_manager'))
  or exists (select 1 from public.event_ensembles ee
             where ee.event_id = event_rsvps.event_id and private.leads_ensemble(ee.ensemble_id))
);
create policy "rsvp self insert" on public.event_rsvps for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_active_member()) and private.can_view_event(event_id));
create policy "rsvp self update" on public.event_rsvps for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.can_view_event(event_id));
create policy "rsvp self delete" on public.event_rsvps for delete to authenticated
  using (user_id = (select auth.uid()));
