-- GUARDIAN X — Phase 2 schema, reconciled with the existing Supabase architecture
--
-- This migration EXTENDS the deployed schema. It deliberately does NOT create
-- `classes` and does NOT create a `teachers` table:
--
--   * `classes` already exists remotely (uuid PK, `section`, `display_order`,
--     `is_archived`, `archived_at`, UNIQUE(name, section), RLS + policies).
--     Recreating it would collide and would discard working infrastructure, so
--     GUARDIAN X references it instead. `students.class_id` is therefore uuid.
--
--   * Teacher identity already lives in `profiles` (role = 'TEACHER') linked to
--     classes through `teacher_classes`. A second `teachers` table would create
--     two competing sources of truth for who teaches what, so it is not created.
--     The class/teacher relationship stays in `teacher_classes`.
--
-- The `dismissal_requests.teacher_id` column references `profiles(id)`, so a
-- dismissal decision is attributed to a real authenticated teacher account.
--
-- Primary keys for GUARDIAN X entities stay `text` so the stable identifiers the
-- application already uses (student-5851, guardian-arti-rai, ...) carry over
-- unchanged. Admission numbers are `text` so leading zeros ('041', '040') survive.

create table public.guardians (
  id          text primary key,
  name        text not null check (char_length(name) between 1 and 120),
  -- Palm enrolment state. 'Not registered' is the current state of every
  -- guardian in the source dataset; palm_id stays NULL until a palm is actually
  -- enrolled. No biometric template is fabricated here.
  palm_status text not null default 'Not registered'
              check (palm_status in ('Registered', 'Not registered')),
  palm_id     text
);

create table public.students (
  id               text primary key,
  name             text not null check (char_length(name) between 1 and 120),
  -- text, not int: '041' and '040' are real admission numbers.
  admission_number text not null unique,
  -- uuid FK into the pre-existing `classes` table, not a new classes table.
  class_id         uuid references public.classes (id) on delete set null
);

create table public.student_guardians (
  student_id  text not null references public.students (id) on delete cascade,
  guardian_id text not null references public.guardians (id) on delete cascade,
  primary key (student_id, guardian_id)
);

-- A student may have at most two guardians. A CHECK constraint cannot count
-- rows in another table, so the limit is enforced by a trigger.
--
-- The trigger fires on INSERT *and* UPDATE. UPDATE matters: without it, moving
-- an existing link to a different student (`update ... set student_id = ...`)
-- would sidestep the limit entirely and could push a student past two guardians.
create or replace function public.enforce_student_guardian_limit()
returns trigger
language plpgsql
as $$
declare
  existing_count integer;
begin
  -- Exclude the row being updated so re-saving an unchanged link is a no-op
  -- rather than a false positive against its own count.
  select count(*)
  into existing_count
  from public.student_guardians
  where student_id = new.student_id
    and (tg_op = 'INSERT' or guardian_id <> new.guardian_id);

  if existing_count >= 2 then
    raise exception
      'A student can have at most 2 guardians (student %, guardian %)',
      new.student_id, new.guardian_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger student_guardian_limit
  before insert or update on public.student_guardians
  for each row
  execute function public.enforce_student_guardian_limit();

create table public.dismissal_requests (
  id          text primary key,
  student_id  text not null,
  guardian_id text not null,
  -- The teacher who owns the decision is a real profile, not a duplicate
  -- teacher table. NULL until a teacher is assigned.
  teacher_id  uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  status      text not null default 'Pending'
              check (status in ('Pending', 'Approved', 'Rejected', 'Completed')),
  -- A request must name a guardian who is actually linked to that student, so
  -- the (student, guardian) pair is itself the foreign key. This is enforced by
  -- the database, not by the application.
  foreign key (student_id, guardian_id)
    references public.student_guardians (student_id, guardian_id)
    on delete cascade
);

-- Faster lookups for the read paths the app actually uses.
create index students_class_id_idx on public.students (class_id);
create index student_guardians_guardian_id_idx on public.student_guardians (guardian_id);
create index dismissal_requests_student_id_idx on public.dismissal_requests (student_id);
create index dismissal_requests_status_idx on public.dismissal_requests (status);
create index dismissal_requests_teacher_id_idx on public.dismissal_requests (teacher_id);
