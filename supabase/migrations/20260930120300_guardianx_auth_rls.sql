-- GUARDIAN X — Phase 3: authenticated access and RLS hardening.
--
-- Phase 2 granted the browser temporary anonymous read access so the app could
-- render before any account existed. Phase 3 adds real Supabase Auth, so that
-- access is withdrawn and every read is keyed to the signed-in profile's role.
--
-- Nothing here weakens an existing policy. The admin/self policies on
-- `classes`, `profiles` and `teacher_classes` are left exactly as they are; the
-- role model is reused as-is:
--
--     auth.users -> profiles.role  (SUPER_ADMIN | ADMIN | TEACHER)
--
-- with `public.is_admin()` and `public.teacher_assigned_class_ids()` as the two
-- SECURITY DEFINER helpers the schema already provides. No new role names, no
-- new tables, no second identity system.
--
-- Writes stay closed: no INSERT/UPDATE/DELETE policy is added for the four
-- GUARDIAN X tables, so the application remains read-only, exactly as before.
--
-- After this migration no `anon` role retains any grant on any application
-- object, so an unauthenticated request can neither read nor write data.

-- 1. Withdraw the temporary anonymous access ---------------------------------

drop policy if exists students_select_anon          on public.students;
drop policy if exists guardians_select_anon         on public.guardians;
drop policy if exists student_guardians_select_anon on public.student_guardians;
drop policy if exists dismissal_requests_select_anon on public.dismissal_requests;

-- The public schema's default ACL grants anon full privileges (including
-- TRUNCATE) on newly created objects, so the revoke is stated explicitly rather
-- than assumed. `authenticated` is revoked first because these tables currently
-- hold anon-only grants and the authenticated grant is issued in section 3.
revoke all on public.students            from anon, authenticated;
revoke all on public.guardians           from anon, authenticated;
revoke all on public.student_guardians   from anon, authenticated;
revoke all on public.dismissal_requests  from anon, authenticated;
revoke all on public.class_directory     from anon, authenticated;
revoke all on public.teacher_directory   from anon, authenticated;

-- anon never held a grant on these three; revoking states the intent, changes
-- nothing, and keeps the whole surface consistent if a grant is ever added.
revoke all on public.classes         from anon;
revoke all on public.profiles        from anon;
revoke all on public.teacher_classes from anon;

-- 2. Stop the views bypassing the tables they read ----------------------------

-- A view executes with its owner's rights, so without `security_invoker` these
-- two would ignore the base tables' RLS entirely and hand every signed-in user
-- all classes and all teacher assignments, including rows the caller's role
-- cannot see. Running them as the invoker makes the existing base-table policies
-- authoritative, which yields exactly the intended split for free: an admin
-- matches `classes_select_admin` / `profiles_select_admin`, and a teacher
-- matches `classes_select_teacher` / `teacher_classes_select_self` and sees only
-- their own assignments.
alter view public.class_directory   set (security_invoker = true);
alter view public.teacher_directory set (security_invoker = true);

-- 3. Grant the signed-in role read access ------------------------------------

grant select on public.students           to authenticated;
grant select on public.guardians          to authenticated;
grant select on public.student_guardians  to authenticated;
grant select on public.dismissal_requests to authenticated;
grant select on public.class_directory    to authenticated;
grant select on public.teacher_directory  to authenticated;

-- 4. Role-scoped read policies -----------------------------------------------
--
-- Admins read everything, mirroring `classes_select_admin`. Teachers read only
-- students in their assigned classes, resolved through the same
-- `teacher_assigned_class_ids()` helper the pre-existing `classes_select_teacher`
-- policy uses, so authorisation stays in the database and cannot be widened by
-- changing a value in the browser.
--
-- Guardian and link rows are reachable through the student they belong to: a
-- guardian is visible when linked to a student in an assigned class. Because
-- each subquery is evaluated as the calling user, it also sees only the rows
-- this same role is already permitted, so the policies compose instead of
-- widening one another.

create policy students_select_admin on public.students
  for select to authenticated
  using (public.is_admin());

create policy students_select_teacher on public.students
  for select to authenticated
  using (
    public.current_role() = 'TEACHER'
    and class_id in (select public.teacher_assigned_class_ids())
  );

create policy guardians_select_admin on public.guardians
  for select to authenticated
  using (public.is_admin());

create policy guardians_select_teacher on public.guardians
  for select to authenticated
  using (
    exists (
      select 1
      from public.student_guardians sg
      join public.students s on s.id = sg.student_id
      where sg.guardian_id = guardians.id
        and s.class_id in (select public.teacher_assigned_class_ids())
    )
  );

create policy student_guardians_select_admin on public.student_guardians
  for select to authenticated
  using (public.is_admin());

create policy student_guardians_select_teacher on public.student_guardians
  for select to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_guardians.student_id
        and s.class_id in (select public.teacher_assigned_class_ids())
    )
  );

create policy dismissal_requests_select_admin on public.dismissal_requests
  for select to authenticated
  using (public.is_admin());

create policy dismissal_requests_select_teacher on public.dismissal_requests
  for select to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = dismissal_requests.student_id
        and s.class_id in (select public.teacher_assigned_class_ids())
    )
  );
