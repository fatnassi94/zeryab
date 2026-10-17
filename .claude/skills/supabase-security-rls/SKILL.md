---
name: supabase-security-rls
description: Supabase/PostgreSQL schema changes, row-level security, storage policies, roles and permissions for the Zeryab project (ref dwmboexuyjdahprjavxo) — migrations, private helper functions, audit logging, signed URLs, and verifying access with role simulation and advisors. Use for any table, policy, bucket, auth or permission change, or when data is unexpectedly visible/invisible.
---

# Supabase security & RLS

**Principle (from the project spec / OWASP):** hiding a link is not access control — the database refuses what a role may not do.

## Current model
- Roles in `public.user_roles`: member, teacher, activity_manager, librarian, admin (admin implies all). Account must be `profiles.status = 'active'`.
- Helpers in schema **`private`** (not exposed via the API), `security definer`, `set search_path = ''`: `has_role`, `is_admin`, `is_active_member`, `is_staff`, `in_ensemble`, `leads_ensemble`, `teaches_course`, `enrolled_in`, `can_view(visibility,status,ensemble,course,editor_role)`, `can_view_event`, `can_view_course`, `can_view_lesson`, `can_view_recording`, `can_read_entity`, `can_translate`, `can_read_private_object`.
- `access_level`: public / members / ensemble / course / private, enforced by `can_view`.
- Personal data in `profile_private` (self + admin only). Quiz answer keys in `exercise_answer_keys` (teachers only); grading via `submit_exercise_attempt` RPC.
- Audit: triggers write `audit_log` on role grant/revoke, status change, deletes of events/recordings/documents. `private.audit()` is not executable by clients.
- Storage: `media-public` (public URLs, staff upload), `media-private` (readable only if a matching recordings/documents/lessons row is viewable; app uses signed URLs), `avatars` (own folder).
- First admin bootstrapped by email trigger (`bootstrap_admin`).

## Workflow for a change
1. Inspect: `list_tables` (verbose) and existing policies before editing.
2. Write a migration file `supabase/migrations/<timestamp>_<name>.sql` **and** apply the same SQL with `apply_migration` (keep repo and DB identical).
3. New table checklist: RLS enabled; select/insert/update/delete policies per role; FK indexes; `updated_at` trigger; audit trigger if sensitive; translations entity type added to `can_read_entity`/`can_translate` if translatable.
4. Policies call helpers via `(select private.fn())` for per-statement caching when the call has no row arguments.
5. Verify with role simulation in a rolled-back transaction:
   ```sql
   begin; set local role anon; set local request.jwt.claims = '{"role":"anon"}';
   select count(*) from public.recordings;  -- expect only public+published
   rollback;
   ```
   For a user: `set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'; set local role authenticated;`
6. Run `get_advisors` (security + performance); fix ERRORs, justify intentional WARNs (e.g. `event_seats_left`, `submit_exercise_attempt` are intentionally callable).
7. Regenerate TypeScript types.

## Failure modes
- `security definer` function in `public` without need → exposed RPC. Keep helpers in `private`.
- Policies referencing the same table recursively (infinite recursion) — use a definer helper.
- Forgetting `PUBLIC` when revoking execute (functions default to EXECUTE for PUBLIC).
- Client code using the secret key; anon `.insert().select()` failing silently in UI.
- Deleting members: `event_attendance.user_id` is `on delete restrict` by design (history kept) — deactivate instead.

## Acceptance criteria
- Simulation queries for anon, pending user, member, teacher, librarian, admin match the permission table in the spec.
- Advisors: zero security ERRORs.
- Migration files in the repo reproduce the remote schema from scratch.
