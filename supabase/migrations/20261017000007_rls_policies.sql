-- Row Level Security: the database itself refuses anything a role may not do.
-- Hiding a link in the UI is never relied on.

do $$
declare t text;
begin
  foreach t in array array[
    'roles', 'profiles', 'profile_private', 'user_roles', 'membership_requests', 'audit_log',
    'ensembles', 'ensemble_members', 'events', 'event_ensembles', 'event_invitees', 'bookings', 'event_attendance',
    'courses', 'course_teachers', 'course_enrollments',
    'categories', 'maqamat', 'rhythms', 'instruments', 'musical_forms',
    'recordings', 'maqam_examples', 'rhythm_examples', 'playlists', 'playlist_items', 'documents',
    'lessons', 'lesson_prerequisites', 'lesson_resources', 'exercises', 'exercise_questions',
    'exercise_answer_keys', 'exercise_attempts', 'lesson_progress',
    'articles', 'translations', 'notifications'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ===========================================================================
-- Users & roles
-- ===========================================================================
create policy "roles readable" on public.roles for select using (true);
create policy "roles admin write" on public.roles for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Members see each other; visitors only see teachers and ensemble leaders (for public pages).
create policy "profiles readable" on public.profiles for select using (
  id = (select auth.uid())
  or (select private.is_active_member())
  or exists (select 1 from public.course_teachers ct where ct.user_id = profiles.id)
  or exists (select 1 from public.ensembles e where e.leader_id = profiles.id and e.is_public)
);
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));
create policy "profiles admin delete" on public.profiles for delete to authenticated
  using ((select private.is_admin()));

create policy "private data self or admin" on public.profile_private for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy "private data self or admin update" on public.profile_private for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

create policy "user_roles self or admin read" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "user_roles admin insert" on public.user_roles for insert to authenticated
  with check ((select private.is_admin()));
create policy "user_roles admin delete" on public.user_roles for delete to authenticated
  using ((select private.is_admin()));

create policy "anyone can apply" on public.membership_requests for insert to anon, authenticated
  with check (
    status = 'pending' and reviewed_by is null and reviewed_at is null
    and (user_id is null or user_id = (select auth.uid()))
  );
create policy "applicant or admin read" on public.membership_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "admin reviews requests" on public.membership_requests for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin deletes requests" on public.membership_requests for delete to authenticated
  using ((select private.is_admin()));

create policy "audit admin read" on public.audit_log for select to authenticated
  using ((select private.is_admin()));

-- ===========================================================================
-- Ensembles & events
-- ===========================================================================
create policy "ensembles readable" on public.ensembles for select using (
  is_public or (select private.is_active_member())
);
create policy "ensembles managed" on public.ensembles for all to authenticated
  using ((select private.has_role('activity_manager')))
  with check ((select private.has_role('activity_manager')));

create policy "ensemble members readable" on public.ensemble_members for select to authenticated
  using ((select private.is_active_member()));
create policy "ensemble members managed" on public.ensemble_members for all to authenticated
  using ((select private.has_role('activity_manager')) or private.leads_ensemble(ensemble_id))
  with check ((select private.has_role('activity_manager')) or private.leads_ensemble(ensemble_id));

create policy "events readable" on public.events for select using (private.can_view_event(id));
create policy "events managed" on public.events for all to authenticated
  using ((select private.has_role('activity_manager')))
  with check ((select private.has_role('activity_manager')));

create policy "event ensembles readable" on public.event_ensembles for select using (private.can_view_event(event_id));
create policy "event ensembles managed" on public.event_ensembles for all to authenticated
  using ((select private.has_role('activity_manager')))
  with check ((select private.has_role('activity_manager')));

create policy "event invitees readable" on public.event_invitees for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('activity_manager')));
create policy "event invitees managed" on public.event_invitees for all to authenticated
  using ((select private.has_role('activity_manager')))
  with check ((select private.has_role('activity_manager')));

create policy "anyone books open events" on public.bookings for insert to anon, authenticated
  with check (private.event_is_bookable(event_id));
create policy "own or manager reads bookings" on public.bookings for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('activity_manager')));
create policy "own booking cancel" on public.bookings for update to authenticated
  using (user_id = (select auth.uid()) and status <> 'cancelled')
  with check (user_id = (select auth.uid()) and status = 'cancelled');
create policy "manager updates bookings" on public.bookings for update to authenticated
  using ((select private.has_role('activity_manager')))
  with check ((select private.has_role('activity_manager')));
create policy "manager deletes bookings" on public.bookings for delete to authenticated
  using ((select private.has_role('activity_manager')));

create policy "attendance readable" on public.event_attendance for select to authenticated using (
  user_id = (select auth.uid())
  or (select private.has_role('activity_manager'))
  or exists (select 1 from public.event_ensembles ee
             where ee.event_id = event_attendance.event_id and private.leads_ensemble(ee.ensemble_id))
);
create policy "attendance recorded" on public.event_attendance for all to authenticated using (
  (select private.has_role('activity_manager'))
  or exists (select 1 from public.event_ensembles ee
             where ee.event_id = event_attendance.event_id and private.leads_ensemble(ee.ensemble_id))
) with check (
  (select private.has_role('activity_manager'))
  or exists (select 1 from public.event_ensembles ee
             where ee.event_id = event_attendance.event_id and private.leads_ensemble(ee.ensemble_id))
);

-- ===========================================================================
-- Courses
-- ===========================================================================
-- Enrollment-only courses still appear in the members' catalog so they can ask to join.
create policy "courses readable" on public.courses for select using (
  private.can_view_course(id)
  or (status = 'published' and visibility = 'course' and (select private.is_active_member()))
);
create policy "teachers create courses" on public.courses for insert to authenticated
  with check ((select private.has_role('teacher')));
create policy "course teachers edit" on public.courses for update to authenticated
  using (private.teaches_course(id)) with check (private.teaches_course(id));
create policy "course teachers delete" on public.courses for delete to authenticated
  using (private.teaches_course(id));

-- The teacher who creates a course is attached to it automatically.
create or replace function private.attach_course_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    insert into public.course_teachers (course_id, user_id) values (new.id, auth.uid())
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger courses_attach_creator after insert on public.courses
  for each row execute function private.attach_course_creator();

create policy "course teachers readable" on public.course_teachers for select using (true);
create policy "admin assigns teachers" on public.course_teachers for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "enrollments readable" on public.course_enrollments for select to authenticated
  using (user_id = (select auth.uid()) or private.teaches_course(course_id));
create policy "self enroll in open courses" on public.course_enrollments for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and (select private.is_active_member()) and exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published' and c.visibility in ('public', 'members')))
    or private.teaches_course(course_id)
  );
create policy "teacher updates enrollments" on public.course_enrollments for update to authenticated
  using (private.teaches_course(course_id)) with check (private.teaches_course(course_id));
create policy "leave or remove enrollment" on public.course_enrollments for delete to authenticated
  using (user_id = (select auth.uid()) or private.teaches_course(course_id));

-- ===========================================================================
-- Theory reference
-- ===========================================================================
create policy "maqamat readable" on public.maqamat for select
  using (status = 'published' or (select private.has_role('teacher')));
create policy "maqamat teachers write" on public.maqamat for all to authenticated
  using ((select private.has_role('teacher'))) with check ((select private.has_role('teacher')));

create policy "rhythms readable" on public.rhythms for select
  using (status = 'published' or (select private.has_role('teacher')));
create policy "rhythms teachers write" on public.rhythms for all to authenticated
  using ((select private.has_role('teacher'))) with check ((select private.has_role('teacher')));

create policy "instruments readable" on public.instruments for select
  using (status = 'published' or (select private.has_role('teacher')));
create policy "instruments teachers write" on public.instruments for all to authenticated
  using ((select private.has_role('teacher'))) with check ((select private.has_role('teacher')));

create policy "forms readable" on public.musical_forms for select
  using (status = 'published' or (select private.has_role('teacher')));
create policy "forms teachers write" on public.musical_forms for all to authenticated
  using ((select private.has_role('teacher'))) with check ((select private.has_role('teacher')));

-- ===========================================================================
-- Library & archive
-- ===========================================================================
create policy "categories readable" on public.categories for select using (true);
create policy "librarian manages categories" on public.categories for all to authenticated
  using ((select private.has_role('librarian'))) with check ((select private.has_role('librarian')));

create policy "recordings readable" on public.recordings for select using (
  private.can_view(visibility, status, ensemble_id, course_id, 'librarian')
  or (course_id is not null and private.teaches_course(course_id))
);
create policy "recordings managed" on public.recordings for all to authenticated using (
  (select private.has_role('librarian'))
  or (course_id is not null and private.teaches_course(course_id))
) with check (
  (select private.has_role('librarian'))
  or (course_id is not null and visibility in ('course', 'members') and private.teaches_course(course_id))
);

create policy "documents readable" on public.documents for select using (
  private.can_view(visibility, status, ensemble_id, course_id, 'librarian')
  or (course_id is not null and private.teaches_course(course_id))
);
create policy "documents managed" on public.documents for all to authenticated using (
  (select private.has_role('librarian'))
  or (course_id is not null and private.teaches_course(course_id))
) with check (
  (select private.has_role('librarian'))
  or (course_id is not null and visibility in ('course', 'members') and private.teaches_course(course_id))
);

create policy "maqam examples readable" on public.maqam_examples for select
  using (private.can_view_recording(recording_id));
create policy "maqam examples managed" on public.maqam_examples for all to authenticated
  using ((select private.has_role('teacher')) or (select private.has_role('librarian')))
  with check ((select private.has_role('teacher')) or (select private.has_role('librarian')));

create policy "rhythm examples readable" on public.rhythm_examples for select
  using (private.can_view_recording(recording_id));
create policy "rhythm examples managed" on public.rhythm_examples for all to authenticated
  using ((select private.has_role('teacher')) or (select private.has_role('librarian')))
  with check ((select private.has_role('teacher')) or (select private.has_role('librarian')));

create policy "playlists readable" on public.playlists for select
  using (private.can_view(visibility, status, ensemble_id, course_id, 'librarian'));
create policy "playlists managed" on public.playlists for all to authenticated using (
  (select private.has_role('librarian')) or (course_id is not null and private.teaches_course(course_id))
) with check (
  (select private.has_role('librarian')) or (course_id is not null and private.teaches_course(course_id))
);

create policy "playlist items readable" on public.playlist_items for select using (
  private.can_view_recording(recording_id)
  and exists (select 1 from public.playlists pl where pl.id = playlist_items.playlist_id)
);
create policy "playlist items managed" on public.playlist_items for all to authenticated using (
  exists (select 1 from public.playlists pl where pl.id = playlist_items.playlist_id and (
    private.has_role('librarian') or (pl.course_id is not null and private.teaches_course(pl.course_id))))
) with check (
  exists (select 1 from public.playlists pl where pl.id = playlist_items.playlist_id and (
    private.has_role('librarian') or (pl.course_id is not null and private.teaches_course(pl.course_id))))
);

-- ===========================================================================
-- Lessons, exercises, progress
-- ===========================================================================
create policy "lessons readable" on public.lessons for select using (private.can_view_lesson(id));
create policy "lessons managed" on public.lessons for all to authenticated
  using (private.teaches_course(course_id)) with check (private.teaches_course(course_id));

create policy "prerequisites readable" on public.lesson_prerequisites for select
  using (private.can_view_lesson(lesson_id));
create policy "prerequisites managed" on public.lesson_prerequisites for all to authenticated
  using (private.teaches_course(private.lesson_course(lesson_id)))
  with check (private.teaches_course(private.lesson_course(lesson_id)));

create policy "lesson resources readable" on public.lesson_resources for select
  using (private.can_view_lesson(lesson_id));
create policy "lesson resources managed" on public.lesson_resources for all to authenticated
  using (private.teaches_course(private.lesson_course(lesson_id)))
  with check (private.teaches_course(private.lesson_course(lesson_id)));

create policy "exercises readable" on public.exercises for select using (
  (status = 'published' and private.can_view_lesson(lesson_id))
  or private.teaches_course(private.lesson_course(lesson_id))
);
create policy "exercises managed" on public.exercises for all to authenticated
  using (private.teaches_course(private.lesson_course(lesson_id)))
  with check (private.teaches_course(private.lesson_course(lesson_id)));

create policy "questions readable" on public.exercise_questions for select using (
  exists (select 1 from public.exercises x where x.id = exercise_questions.exercise_id)
);
create policy "questions managed" on public.exercise_questions for all to authenticated using (
  exists (select 1 from public.exercises x where x.id = exercise_questions.exercise_id
          and private.teaches_course(private.lesson_course(x.lesson_id)))
) with check (
  exists (select 1 from public.exercises x where x.id = exercise_questions.exercise_id
          and private.teaches_course(private.lesson_course(x.lesson_id)))
);

create policy "answer keys teachers only" on public.exercise_answer_keys for all to authenticated using (
  exists (select 1 from public.exercise_questions q join public.exercises x on x.id = q.exercise_id
          where q.id = exercise_answer_keys.question_id
            and private.teaches_course(private.lesson_course(x.lesson_id)))
) with check (
  exists (select 1 from public.exercise_questions q join public.exercises x on x.id = q.exercise_id
          where q.id = exercise_answer_keys.question_id
            and private.teaches_course(private.lesson_course(x.lesson_id)))
);

-- Attempts are written only by submit_exercise_attempt().
create policy "attempts readable" on public.exercise_attempts for select to authenticated using (
  user_id = (select auth.uid())
  or exists (select 1 from public.exercises x where x.id = exercise_attempts.exercise_id
             and private.teaches_course(private.lesson_course(x.lesson_id)))
);

create policy "progress readable" on public.lesson_progress for select to authenticated using (
  user_id = (select auth.uid()) or private.teaches_course(private.lesson_course(lesson_id))
);
create policy "progress self insert" on public.lesson_progress for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_view_lesson(lesson_id));
create policy "progress self update" on public.lesson_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.can_view_lesson(lesson_id));
create policy "progress self delete" on public.lesson_progress for delete to authenticated
  using (user_id = (select auth.uid()));

-- ===========================================================================
-- Articles, translations, notifications
-- ===========================================================================
create policy "articles readable" on public.articles for select
  using (private.can_view(visibility, status, ensemble_id, null, 'activity_manager'));
create policy "articles managed" on public.articles for all to authenticated
  using ((select private.has_role('activity_manager')))
  with check ((select private.has_role('activity_manager')));

create policy "translations readable" on public.translations for select
  using (private.can_read_entity(entity_type, entity_id));
create policy "translations insert" on public.translations for insert to authenticated
  with check (private.can_translate(entity_type, entity_id));
create policy "translations update" on public.translations for update to authenticated
  using (private.can_translate(entity_type, entity_id))
  with check (private.can_translate(entity_type, entity_id));
create policy "translations delete" on public.translations for delete to authenticated
  using (private.can_translate(entity_type, entity_id));

create policy "own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('activity_manager')));
create policy "managers send notifications" on public.notifications for insert to authenticated
  with check ((select private.has_role('activity_manager')));
create policy "mark own read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('activity_manager')))
  with check (user_id = (select auth.uid()) or (select private.has_role('activity_manager')));
create policy "delete own notifications" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('activity_manager')));

grant execute on all functions in schema private to anon, authenticated;
revoke execute on function private.audit(text, text, text, jsonb) from public, anon, authenticated;
