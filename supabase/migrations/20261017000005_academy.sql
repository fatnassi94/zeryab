-- Academy: lessons, resources, exercises, quiz questions, attempts, progress.
-- Correct answers are hidden from learners and graded on the server.

create type public.exercise_kind as enum ('listening', 'performance', 'quiz', 'maqam_identification', 'rhythm_identification');
create type public.progress_status as enum ('in_progress', 'completed');

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  objectives text[] not null default '{}',
  level public.course_level,
  body text,                   -- theory text (Markdown)
  notation_path text,          -- diagram or notation image/PDF
  maqam_id uuid references public.maqamat (id) on delete set null,
  rhythm_id uuid references public.rhythms (id) on delete set null,
  form_id uuid references public.musical_forms (id) on delete set null,
  instrument_id uuid references public.instruments (id) on delete set null,
  is_preview boolean not null default false,   -- readable by visitors as a sample
  position integer not null default 0,
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);
create index lessons_course_idx on public.lessons (course_id, position);
create index lessons_maqam_idx on public.lessons (maqam_id);
create index lessons_rhythm_idx on public.lessons (rhythm_id);
create index lessons_form_idx on public.lessons (form_id);
create index lessons_instrument_idx on public.lessons (instrument_id);
create index lessons_created_by_idx on public.lessons (created_by);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function private.set_updated_at();

create table public.lesson_prerequisites (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  required_lesson_id uuid not null references public.lessons (id) on delete cascade,
  primary key (lesson_id, required_lesson_id),
  check (lesson_id <> required_lesson_id)
);
create index lesson_prerequisites_required_idx on public.lesson_prerequisites (required_lesson_id);

-- Recordings and PDFs attached to a lesson.
create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  recording_id uuid references public.recordings (id) on delete cascade,
  document_id uuid references public.documents (id) on delete cascade,
  caption text,
  position integer not null default 0,
  check (num_nonnulls(recording_id, document_id) = 1)
);
create index lesson_resources_lesson_idx on public.lesson_resources (lesson_id);
create index lesson_resources_recording_idx on public.lesson_resources (recording_id);
create index lesson_resources_document_idx on public.lesson_resources (document_id);

create or replace function private.can_view_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = p_lesson_id
      and (
        private.teaches_course(c.id)
        or (l.status = 'published' and private.can_view_course(c.id))
        or (l.status = 'published' and l.is_preview and c.status = 'published' and c.visibility <> 'private')
      )
  );
$$;

create or replace function private.lesson_course(p_lesson_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select course_id from public.lessons where id = p_lesson_id;
$$;

-- ---------------------------------------------------------------------------
-- Exercises and questions
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  kind public.exercise_kind not null,
  title text not null,
  instructions text,
  recording_id uuid references public.recordings (id) on delete set null,  -- reference / practice audio
  loop_start_seconds numeric,
  loop_end_seconds numeric,
  position integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercises_lesson_idx on public.exercises (lesson_id, position);
create index exercises_recording_idx on public.exercises (recording_id);
create trigger exercises_updated_at before update on public.exercises
  for each row execute function private.set_updated_at();

create table public.exercise_questions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  prompt text not null,
  recording_id uuid references public.recordings (id) on delete set null,
  options jsonb not null default '[]',          -- ["Rast", "Bayati", "Hijaz", "Saba"]
  points integer not null default 1 check (points >= 0),
  position integer not null default 0,
  check (jsonb_typeof(options) = 'array')
);
create index exercise_questions_exercise_idx on public.exercise_questions (exercise_id, position);
create index exercise_questions_recording_idx on public.exercise_questions (recording_id);

-- Answer keys are a separate table readable by teachers only;
-- learners get them back from submit_exercise_attempt after answering.
create table public.exercise_answer_keys (
  question_id uuid primary key references public.exercise_questions (id) on delete cascade,
  correct_option integer not null check (correct_option >= 0),
  explanation text
);

create table public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}',          -- { "<question_id>": <option index> }
  score integer not null default 0,
  max_score integer not null default 0,
  created_at timestamptz not null default now()
);
create index exercise_attempts_user_idx on public.exercise_attempts (user_id, exercise_id);
create index exercise_attempts_exercise_idx on public.exercise_attempts (exercise_id);

-- Learners' own record of completed lessons. Performance is not auto-graded.
create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status public.progress_status not null default 'in_progress',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);
create trigger lesson_progress_updated_at before update on public.lesson_progress
  for each row execute function private.set_updated_at();

-- Grade a quiz attempt on the server and return the corrected answers.
create or replace function public.submit_exercise_attempt(p_exercise_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson_id uuid;
  v_score integer := 0;
  v_max integer := 0;
  v_results jsonb := '[]';
  q record;
  v_given integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to submit answers';
  end if;

  select lesson_id into v_lesson_id
  from public.exercises
  where id = p_exercise_id and status = 'published';

  if v_lesson_id is null or not private.can_view_lesson(v_lesson_id) then
    raise exception 'Exercise not available';
  end if;

  for q in
    select eq.id, k.correct_option, k.explanation, eq.points
    from public.exercise_questions eq
    left join public.exercise_answer_keys k on k.question_id = eq.id
    where eq.exercise_id = p_exercise_id
    order by eq.position
  loop
    v_given := nullif(p_answers ->> q.id::text, '')::integer;
    v_max := v_max + q.points;
    if v_given = q.correct_option then
      v_score := v_score + q.points;
    end if;
    v_results := v_results || jsonb_build_object(
      'question_id', q.id,
      'given', v_given,
      'correct_option', q.correct_option,
      'is_correct', coalesce(v_given = q.correct_option, false),
      'explanation', q.explanation
    );
  end loop;

  insert into public.exercise_attempts (exercise_id, user_id, answers, score, max_score)
  values (p_exercise_id, auth.uid(), coalesce(p_answers, '{}'), v_score, v_max);

  return jsonb_build_object('score', v_score, 'max_score', v_max, 'results', v_results);
end;
$$;
revoke execute on function public.submit_exercise_attempt(uuid, jsonb) from public, anon;
grant execute on function public.submit_exercise_attempt(uuid, jsonb) to authenticated;

grant execute on all functions in schema private to anon, authenticated;
revoke execute on function private.audit(text, text, text, jsonb) from public, anon, authenticated;
