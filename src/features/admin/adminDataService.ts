import { supabase } from '../../lib/supabase';
import type {
  AdminClass,
  AdminDataState,
  AdminGuardian,
  AdminStudent,
  AdminTeacher,
  DismissalRequest,
  DismissalStatus,
  PalmStatus,
} from '../../data/adminData';

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    this.name = 'SupabaseNotConfiguredError';
  }
}

// Supabase is absent at runtime when the build has no VITE_SUPABASE_* values.
// Failing loudly beats falling back to bundled records, which would hide a
// broken connection behind data that looks real.
function client() {
  if (!supabase) throw new SupabaseNotConfiguredError();
  return supabase;
}

// Unwraps a resolved PostgREST result, turning a failed query into a thrown
// error so a partial read can never be mistaken for real data.
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('Query returned no data.');
  return result.data;
}

function toPalmStatus(value: string): PalmStatus {
  return value === 'Registered' ? 'Registered' : 'Not registered';
}

// Every status the database accepts is carried through unchanged. The database
// constrains this column to Pending/Approved/Rejected/Completed, so an
// unrecognised value would mean the constraint and this function have drifted;
// surfacing that is better than silently relabelling a rejected request.
const DISMISSAL_STATUSES: readonly DismissalStatus[] = ['Pending', 'Approved', 'Rejected', 'Completed'];

function toDismissalStatus(value: string): DismissalStatus {
  if ((DISMISSAL_STATUSES as readonly string[]).includes(value)) return value as DismissalStatus;
  throw new Error(`Unknown dismissal status "${value}" returned by the database.`);
}

// Reads every table the current pages need and folds the guardian<->student
// join table back into the nested `guardianIds` shape the UI already expects,
// so no page component has to change.
//
// Classes and teachers are read through the `class_directory` and
// `teacher_directory` views rather than the base tables. Teacher identity lives
// in `profiles` + `teacher_classes` in the database; the view exposes only a
// teacher's id and display name, so no email or phone number reaches the
// browser.
export async function loadAdminData(): Promise<AdminDataState> {
  const db = client();

  const [classResult, teacherResult, guardianResult, studentResult, linkResult, requestResult] = await Promise.all([
    db.from('class_directory').select('id, name').order('name'),
    db.from('teacher_directory').select('id, name, class_id').order('name'),
    db.from('guardians').select('id, name, palm_status').order('name'),
    db.from('students').select('id, name, admission_number, class_id').order('name'),
    db.from('student_guardians').select('student_id, guardian_id').order('student_id'),
    db.from('dismissal_requests').select('id, student_id, guardian_id, teacher_id, requested_at, status').order('requested_at'),
  ]);

  const classRows = unwrap(classResult);
  const teacherRows = unwrap(teacherResult);
  const guardianRows = unwrap(guardianResult);
  const studentRows = unwrap(studentResult);
  const linkRows = unwrap(linkResult);
  const requestRows = unwrap(requestResult);

  const guardianIdsByStudent = new Map<string, string[]>();
  for (const link of linkRows) {
    const ids = guardianIdsByStudent.get(link.student_id);
    if (ids) ids.push(link.guardian_id);
    else guardianIdsByStudent.set(link.student_id, [link.guardian_id]);
  }

  // A teacher row per class assignment; a teacher with no classes still gets a
  // row (class_id null) so the Teachers page can list them as unassigned.
  const teachers = new Map<string, AdminTeacher>();
  const classIdByTeacher = new Map<string, Set<string>>();
  for (const row of teacherRows) {
    if (!row.id) continue;
    if (!teachers.has(row.id)) teachers.set(row.id, { id: row.id, name: row.name ?? '' });
    if (row.class_id) {
      const assigned = classIdByTeacher.get(row.id);
      if (assigned) assigned.add(row.class_id);
      else classIdByTeacher.set(row.id, new Set([row.class_id]));
    }
  }

  const classes: AdminClass[] = classRows.map((row) => {
    // A class can have several teachers, but AdminClass carries a single
    // teacherId. The Teachers page resolves assignments from teacher_directory
    // itself, so this is only a convenience for single-teacher classes.
    const owner = [...classIdByTeacher.entries()].find(([, ids]) => ids.has(row.id ?? ''));
    return {
      id: row.id ?? '',
      name: row.name ?? '',
      ...(owner ? { teacherId: owner[0] } : {}),
    };
  });

  const guardians: AdminGuardian[] = guardianRows.map((row) => ({
    id: row.id,
    name: row.name,
    palmStatus: toPalmStatus(row.palm_status),
  }));

  const students: AdminStudent[] = studentRows.map((row) => ({
    id: row.id,
    name: row.name,
    // admission_number is a text column, so '041' and '040' arrive intact.
    admissionNumber: row.admission_number,
    classId: row.class_id ?? '',
    guardianIds: guardianIdsByStudent.get(row.id) ?? [],
  }));

  const dismissalRequests: DismissalRequest[] = requestRows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    guardianId: row.guardian_id,
    ...(row.teacher_id ? { teacherId: row.teacher_id } : {}),
    requestedAt: row.requested_at,
    status: toDismissalStatus(row.status),
  }));

  return { classes, teachers: [...teachers.values()], guardians, students, dismissalRequests };
}
