-- Show program pages edited from the back office.
-- A row holds only the changed texts and values, keyed by their path in the
-- program ("title.ar", "tableaux.0.songs.1.rhythm"…); the page applies them over
-- the version written in src/lib/programs.ts. Deleting the row restores it.

create table public.program_edits (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,60}$'),
  edits jsonb not null default '{}'::jsonb check (jsonb_typeof(edits) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null
);
create trigger program_edits_updated_at before update on public.program_edits
  for each row execute function private.set_updated_at();

alter table public.program_edits enable row level security;

-- Program pages are public, so are their texts.
create policy "program edits readable" on public.program_edits for select to anon, authenticated using (true);
-- Librarians and admins edit them (has_role lets admins through).
create policy "program edits insert" on public.program_edits for insert to authenticated
  with check ((select private.has_role('librarian')));
create policy "program edits update" on public.program_edits for update to authenticated
  using ((select private.has_role('librarian')))
  with check ((select private.has_role('librarian')));
create policy "program edits delete" on public.program_edits for delete to authenticated
  using ((select private.has_role('librarian')));
