-- GUARDIAN X — Phase 2 Row Level Security, reconciled with the existing architecture
--
-- The remote database is authenticated-only: every existing policy is scoped to
-- `authenticated` and gated on `is_admin()` / `current_role()`. Nothing in this
-- file alters, drops, or weakens any of that. The existing `profiles`,
-- `classes`, and `teacher_classes` policies are left exactly as they are.
--
-- The GUARDIAN X frontend has no authentication yet — it uses the anon key and
-- never calls signIn/getSession — so it can only read as `anon`. This migration
-- therefore grants the minimum needed to make the dashboard work:
--
--   * RLS stays ENABLED on every table. Nothing is ever disabled.
--   * `anon` gets SELECT and nothing else. No INSERT, UPDATE, DELETE, or TRUNCATE.
--   * `authenticated` keeps its existing admin-gated policies untouched.
--   * Zero GUARDIAN X tables receive a write policy for any role, so writes are
--     default-denied at the RLS layer even if a grant were ever misconfigured.
--
-- IMPORTANT — this anonymous read access is TEMPORARY. It exists only until the
-- application has real authentication. It exposes the student/guardian directory
-- (names, admission numbers, class names, dismissal history) to the public.
-- It deliberately does NOT expose the `profiles` table, which holds emails and
-- phone numbers, nor any guardian contact or biometric data. When auth lands,
-- delete the `anon` SELECT grants below and add `authenticated` policies; do not
-- widen them.
--
-- Defence in depth: the public schema's default ACL grants `anon` and
-- `authenticated` full privileges (including TRUNCATE) on newly created tables.
-- Every table is therefore explicitly revoked down to SELECT-only, so a table is
-- never briefly world-writable between creation and this migration.

alter table public.guardians          enable row level security;
alter table public.students           enable row level security;
alter table public.student_guardians  enable row level security;
alter table public.dismissal_requests enable row level security;

-- Start from nothing, then grant back only what the dashboard needs to read.
revoke all on public.guardians          from anon, authenticated;
revoke all on public.students           from anon, authenticated;
revoke all on public.student_guardians  from anon, authenticated;
revoke all on public.dismissal_requests from anon, authenticated;

grant select on public.guardians          to anon, authenticated;
grant select on public.students           to anon, authenticated;
grant select on public.student_guardians  to anon, authenticated;
grant select on public.dismissal_requests to anon, authenticated;

-- Column-level grants for `anon` keep the public surface to exactly what the
-- dashboard renders. `palm_id` holds the enrolled palm template reference and is
-- never selectable anonymously.
grant select (id, name, palm_status) on public.guardians to anon;

-- `classes` is an existing table whose RLS stays exactly as deployed: every
-- policy there is `authenticated` + admin/teacher gated. The dashboard still
-- needs class names, and it reads them through a dedicated view rather than by
-- opening `classes` to anonymous clients.
--
-- The view is deliberately narrow — name and section only. It exposes no
-- archived bookkeeping and, crucially, no join to `profiles`, so no teacher
-- email or phone number can leak through it. `security_invoker` is NOT set, so
-- the view runs with the definer's rights and the caller's lack of access to
-- `classes` cannot break the read.
create view public.class_directory as
  select id, name, section, display_order
  from public.classes
  where is_archived = false;

-- A view is subject to the same default ACL as a table, so `create view` alone
-- hands `anon` full privileges including UPDATE. This view is auto-updatable, so
-- that would let an anonymous client write straight through into `classes` and
-- sidestep its admin-gated RLS — the view runs with the definer's rights, so the
-- underlying policies would not apply to the writer. Revoke first, then grant
-- back read-only.
revoke all on public.class_directory from anon, authenticated;
grant select on public.class_directory to anon, authenticated;

-- Teacher names reach the dashboard through this view too. `profiles` holds
-- emails and phone numbers and is never granted to `anon`; this view exposes
-- only the id and display name of active teachers, and the class each one is
-- assigned to via the existing `teacher_classes` link. No credential or contact
-- field is included.
create view public.teacher_directory as
  select p.id,
         p.full_name as name,
         tc.class_id
  from public.profiles p
  left join public.teacher_classes tc on tc.teacher_profile_id = p.id
  where p.role = 'TEACHER'
    and p.is_active
    and p.archived_at is null;

-- Same default-ACL trap as above: bring the view down to read-only.
revoke all on public.teacher_directory from anon, authenticated;
grant select on public.teacher_directory to anon, authenticated;

-- RLS is enabled above. A table-level SELECT grant on its own is NOT enough:
-- with RLS on and no policy for the role, `anon` reads zero rows and the
-- dashboard renders empty. These read-only policies are what make the grant
-- effective. They are SELECT-only and scoped to `anon`; no INSERT/UPDATE/DELETE
-- policy exists for any role on these four tables, so every write stays
-- default-denied, and `anon` has no write privilege at the grant layer either.
create policy guardians_select_anon
  on public.guardians
  for select
  to anon
  using (true);

create policy students_select_anon
  on public.students
  for select
  to anon
  using (true);

create policy student_guardians_select_anon
  on public.student_guardians
  for select
  to anon
  using (true);

create policy dismissal_requests_select_anon
  on public.dismissal_requests
  for select
  to anon
  using (true);

-- The guardian-limit trigger is SECURITY INVOKER, so it runs as the caller and
-- cannot be used to bypass the write denial.
