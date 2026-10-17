-- Articles / news / static pages, per-field translations, notifications.
-- Base rows hold the original text (Arabic by default); `translations`
-- holds French / English (or Arabic for content written in another language).
-- A missing translation falls back to the original in the app.

create type public.article_kind as enum ('news', 'announcement', 'page', 'story');

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind public.article_kind not null default 'news',
  original_locale public.app_locale not null default 'ar',
  title text not null,
  excerpt text,
  body text,
  cover_path text,
  visibility public.access_level not null default 'public'
    check (visibility in ('public', 'members', 'ensemble', 'private')),
  ensemble_id uuid references public.ensembles (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visibility <> 'ensemble' or ensemble_id is not null)
);
create index articles_published_idx on public.articles (status, published_at desc);
create index articles_ensemble_idx on public.articles (ensemble_id);
create index articles_event_idx on public.articles (event_id);
create index articles_author_idx on public.articles (author_id);
create trigger articles_updated_at before update on public.articles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Translations
-- ---------------------------------------------------------------------------
create table public.translations (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
    'articles', 'events', 'ensembles', 'courses', 'lessons', 'exercises', 'exercise_questions',
    'maqamat', 'rhythms', 'instruments', 'musical_forms', 'categories',
    'recordings', 'documents', 'playlists'
  )),
  entity_id uuid not null,
  locale public.app_locale not null,
  field text not null,          -- e.g. 'title', 'summary', 'body'
  value text not null,
  is_reviewed boolean not null default false,
  translated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, locale, field)
);
create index translations_entity_idx on public.translations (entity_type, entity_id);
create index translations_translated_by_idx on public.translations (translated_by);
create trigger translations_updated_at before update on public.translations
  for each row execute function private.set_updated_at();

-- Translations inherit the visibility of the row they translate.
create or replace function private.can_read_entity(p_type text, p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return case p_type
    when 'articles' then exists (select 1 from public.articles a where a.id = p_id
      and private.can_view(a.visibility, a.status, a.ensemble_id, null, 'activity_manager'))
    when 'events' then private.can_view_event(p_id)
    when 'ensembles' then exists (select 1 from public.ensembles e where e.id = p_id
      and (e.is_public or private.is_active_member()))
    when 'courses' then private.can_view_course(p_id)
    when 'lessons' then private.can_view_lesson(p_id)
    when 'exercises' then exists (select 1 from public.exercises x where x.id = p_id
      and private.can_view_lesson(x.lesson_id))
    when 'exercise_questions' then exists (select 1 from public.exercise_questions q
      join public.exercises x on x.id = q.exercise_id
      where q.id = p_id and private.can_view_lesson(x.lesson_id))
    when 'maqamat' then exists (select 1 from public.maqamat m where m.id = p_id
      and (m.status = 'published' or private.has_role('teacher')))
    when 'rhythms' then exists (select 1 from public.rhythms r where r.id = p_id
      and (r.status = 'published' or private.has_role('teacher')))
    when 'instruments' then exists (select 1 from public.instruments i where i.id = p_id
      and (i.status = 'published' or private.has_role('teacher')))
    when 'musical_forms' then exists (select 1 from public.musical_forms f where f.id = p_id
      and (f.status = 'published' or private.has_role('teacher')))
    when 'categories' then true
    when 'recordings' then private.can_view_recording(p_id)
    when 'documents' then exists (select 1 from public.documents d where d.id = p_id
      and private.can_view(d.visibility, d.status, d.ensemble_id, d.course_id, 'librarian'))
    when 'playlists' then exists (select 1 from public.playlists pl where pl.id = p_id
      and private.can_view(pl.visibility, pl.status, pl.ensemble_id, pl.course_id, 'librarian'))
    else false
  end;
end;
$$;

-- Who may write translations for a given entity type.
create or replace function private.can_translate(p_type text, p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return private.is_admin() or case
    when p_type in ('articles', 'events', 'ensembles') then private.has_role('activity_manager')
    when p_type in ('recordings', 'documents', 'playlists', 'categories') then private.has_role('librarian')
    when p_type in ('maqamat', 'rhythms', 'instruments', 'musical_forms') then private.has_role('teacher')
    when p_type = 'courses' then private.teaches_course(p_id)
    when p_type = 'lessons' then private.teaches_course(private.lesson_course(p_id))
    when p_type = 'exercises' then exists (select 1 from public.exercises x where x.id = p_id
      and private.teaches_course(private.lesson_course(x.lesson_id)))
    when p_type = 'exercise_questions' then exists (select 1 from public.exercise_questions q
      join public.exercises x on x.id = q.exercise_id
      where q.id = p_id and private.teaches_course(private.lesson_course(x.lesson_id)))
    else false
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications (in-app; email/push only for members who opted in)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  link text,
  kind text not null default 'info',
  event_id uuid references public.events (id) on delete cascade,
  read_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_event_idx on public.notifications (event_id);
create index notifications_created_by_idx on public.notifications (created_by);

-- Members may only mark their own notifications as read.
create or replace function private.protect_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('activity_manager') then
    if (new.user_id, new.title, new.body, new.link, new.kind, new.event_id, new.created_by)
       is distinct from (old.user_id, old.title, old.body, old.link, old.kind, old.event_id, old.created_by) then
      raise exception 'Only read_at can be changed';
    end if;
  end if;
  return new;
end;
$$;

create trigger notifications_protect before update on public.notifications
  for each row execute function private.protect_notification();

grant execute on all functions in schema private to anon, authenticated;
revoke execute on function private.audit(text, text, text, jsonb) from public, anon, authenticated;
