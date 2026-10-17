-- Music theory reference (maqamat, rhythms, instruments, forms) and the
-- audio library / document archive. Files live in Storage; rows keep the key
-- and metadata only.

create type public.document_kind as enum ('score', 'lyrics', 'program', 'photo', 'article', 'study', 'other');

-- ---------------------------------------------------------------------------
-- Categories (shared by recordings and documents, nestable)
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  parent_id uuid references public.categories (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);

-- ---------------------------------------------------------------------------
-- Theory
-- ---------------------------------------------------------------------------
create table public.maqamat (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  family text,                 -- e.g. family of Rast, Bayati, Hijaz...
  tonic text,                  -- قرار / tonic note
  dominant text,               -- غماز
  scale_notes text[] not null default '{}',
  ajnas jsonb not null default '[]',      -- [{ "name": "Rast", "position": "lower", "tonic": "C" }]
  sayr text,                   -- melodic path (السير اللحني)
  description text,
  notation_path text,
  status public.content_status not null default 'draft',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger maqamat_updated_at before update on public.maqamat
  for each row execute function private.set_updated_at();

create table public.rhythms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  time_signature text,         -- e.g. 10/8
  beats integer check (beats is null or beats > 0),
  pattern jsonb not null default '[]',    -- [{ "stroke": "dum", "duration": 1 }, ...]
  tempo_min integer,
  tempo_max integer,
  description text,
  notation_path text,
  status public.content_status not null default 'draft',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rhythms_updated_at before update on public.rhythms
  for each row execute function private.set_updated_at();

create table public.instruments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  family text,                 -- strings, winds, percussion...
  description text,
  image_path text,
  status public.content_status not null default 'draft',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger instruments_updated_at before update on public.instruments
  for each row execute function private.set_updated_at();

-- Musical forms: muwashshah, samai, dulab, bashraf, qudud...
create table public.musical_forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tradition text,              -- regional tradition note (Tunisian, Aleppine, Egyptian...)
  structure text,
  description text,
  status public.content_status not null default 'draft',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger musical_forms_updated_at before update on public.musical_forms
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Recordings
-- ---------------------------------------------------------------------------
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  performers text,
  composer text,
  lyricist text,
  recorded_on date,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  storage_bucket text not null default 'media-private',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  category_id uuid references public.categories (id) on delete set null,
  maqam_id uuid references public.maqamat (id) on delete set null,
  rhythm_id uuid references public.rhythms (id) on delete set null,
  form_id uuid references public.musical_forms (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  language public.app_locale,
  source text,                 -- provenance of the recording
  rights text,                 -- copyright / publication rights
  visibility public.access_level not null default 'members',
  ensemble_id uuid references public.ensembles (id) on delete set null,
  course_id uuid references public.courses (id) on delete set null,
  status public.content_status not null default 'draft',
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (visibility <> 'ensemble' or ensemble_id is not null),
  check (visibility <> 'course' or course_id is not null)
);
create index recordings_category_idx on public.recordings (category_id);
create index recordings_maqam_idx on public.recordings (maqam_id);
create index recordings_rhythm_idx on public.recordings (rhythm_id);
create index recordings_form_idx on public.recordings (form_id);
create index recordings_event_idx on public.recordings (event_id);
create index recordings_ensemble_idx on public.recordings (ensemble_id);
create index recordings_course_idx on public.recordings (course_id);
create index recordings_uploaded_by_idx on public.recordings (uploaded_by);
create index recordings_status_visibility_idx on public.recordings (status, visibility);
create trigger recordings_updated_at before update on public.recordings
  for each row execute function private.set_updated_at();
create trigger recordings_audit_delete after delete on public.recordings
  for each row execute function private.audit_delete();

create table public.maqam_examples (
  id uuid primary key default gen_random_uuid(),
  maqam_id uuid not null references public.maqamat (id) on delete cascade,
  recording_id uuid not null references public.recordings (id) on delete cascade,
  title text,
  note text,
  position integer not null default 0,
  unique (maqam_id, recording_id)
);
create index maqam_examples_recording_idx on public.maqam_examples (recording_id);

create table public.rhythm_examples (
  id uuid primary key default gen_random_uuid(),
  rhythm_id uuid not null references public.rhythms (id) on delete cascade,
  recording_id uuid not null references public.recordings (id) on delete cascade,
  title text,
  note text,
  position integer not null default 0,
  unique (rhythm_id, recording_id)
);
create index rhythm_examples_recording_idx on public.rhythm_examples (recording_id);

-- ---------------------------------------------------------------------------
-- Playlists
-- ---------------------------------------------------------------------------
create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_path text,
  visibility public.access_level not null default 'members',
  ensemble_id uuid references public.ensembles (id) on delete set null,
  course_id uuid references public.courses (id) on delete set null,
  status public.content_status not null default 'draft',
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index playlists_ensemble_idx on public.playlists (ensemble_id);
create index playlists_course_idx on public.playlists (course_id);
create index playlists_owner_idx on public.playlists (owner_id);
create trigger playlists_updated_at before update on public.playlists
  for each row execute function private.set_updated_at();

create table public.playlist_items (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  recording_id uuid not null references public.recordings (id) on delete cascade,
  position integer not null default 0,
  note text,
  primary key (playlist_id, recording_id)
);
create index playlist_items_recording_idx on public.playlist_items (recording_id);

-- ---------------------------------------------------------------------------
-- Documents (PDF scores, programs, photos, studies)
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind public.document_kind not null default 'other',
  author text,
  document_date date,
  storage_bucket text not null default 'media-private',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  page_count integer,
  category_id uuid references public.categories (id) on delete set null,
  maqam_id uuid references public.maqamat (id) on delete set null,
  form_id uuid references public.musical_forms (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  language public.app_locale,
  source text,
  rights text,
  visibility public.access_level not null default 'members',
  ensemble_id uuid references public.ensembles (id) on delete set null,
  course_id uuid references public.courses (id) on delete set null,
  status public.content_status not null default 'draft',
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (visibility <> 'ensemble' or ensemble_id is not null),
  check (visibility <> 'course' or course_id is not null)
);
create index documents_category_idx on public.documents (category_id);
create index documents_maqam_idx on public.documents (maqam_id);
create index documents_form_idx on public.documents (form_id);
create index documents_event_idx on public.documents (event_id);
create index documents_ensemble_idx on public.documents (ensemble_id);
create index documents_course_idx on public.documents (course_id);
create index documents_uploaded_by_idx on public.documents (uploaded_by);
create index documents_status_visibility_idx on public.documents (status, visibility);
create trigger documents_updated_at before update on public.documents
  for each row execute function private.set_updated_at();
create trigger documents_audit_delete after delete on public.documents
  for each row execute function private.audit_delete();

create or replace function private.can_view_recording(p_recording_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recordings r
    where r.id = p_recording_id
      and private.can_view(r.visibility, r.status, r.ensemble_id, r.course_id, 'librarian')
  );
$$;

grant execute on all functions in schema private to anon, authenticated;
revoke execute on function private.audit(text, text, text, jsonb) from public, anon, authenticated;
