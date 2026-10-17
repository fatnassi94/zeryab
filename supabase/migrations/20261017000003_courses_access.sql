-- Courses, teachers, enrollments and the shared content-access check.

create type public.course_level as enum ('beginner', 'intermediate', 'advanced');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  description text,
  level public.course_level not null default 'beginner',
  cover_path text,
  -- public: anyone can read lessons; members: any active member; course: enrolled learners only
  visibility public.access_level not null default 'members'
    check (visibility in ('public', 'members', 'course', 'private')),
  status public.content_status not null default 'draft',
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_created_by_idx on public.courses (created_by);
create trigger courses_updated_at before update on public.courses
  for each row execute function private.set_updated_at();

create table public.course_teachers (
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (course_id, user_id)
);
create index course_teachers_user_idx on public.course_teachers (user_id);

create table public.course_enrollments (
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (course_id, user_id)
);
create index course_enrollments_user_idx on public.course_enrollments (user_id);

create or replace function private.teaches_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or (
    private.has_role('teacher') and exists (
      select 1 from public.course_teachers ct
      where ct.course_id = p_course_id and ct.user_id = auth.uid()
    )
  );
$$;

create or replace function private.enrolled_in(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_member() and exists (
    select 1 from public.course_enrollments ce
    where ce.course_id = p_course_id and ce.user_id = auth.uid()
  );
$$;

create or replace function private.can_view_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and (
        private.teaches_course(c.id)
        or (c.status = 'published' and (
              c.visibility = 'public'
              or (c.visibility = 'members' and private.is_active_member())
              or (c.visibility = 'course' and private.enrolled_in(c.id))
              or (c.visibility = 'private' and private.is_staff())
            ))
      )
  );
$$;

-- Shared rule for recordings, documents, playlists and articles.
-- Staff with the given editor role always see drafts; others see published items
-- according to the access level.
create or replace function private.can_view(
  p_visibility public.access_level,
  p_status public.content_status,
  p_ensemble_id uuid,
  p_course_id uuid,
  p_editor_role text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (p_editor_role is not null and private.has_role(p_editor_role))
    or (p_status = 'published' and (
          p_visibility = 'public'
          or (p_visibility = 'members' and private.is_active_member())
          or (p_visibility = 'ensemble' and (private.in_ensemble(p_ensemble_id) or private.has_role('activity_manager')))
          or (p_visibility = 'course' and (private.enrolled_in(p_course_id) or private.teaches_course(p_course_id)))
          or (p_visibility = 'private' and private.is_staff())
        ));
$$;

grant execute on all functions in schema private to anon, authenticated;
revoke execute on function private.audit(text, text, text, jsonb) from public, anon, authenticated;
