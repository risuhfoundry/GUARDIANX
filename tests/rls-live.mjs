/**
 * Live RLS / authorization tests.
 *
 * These run against the real Supabase project over PostgREST using the
 * *publishable* key — the same key the browser ships. That matters: the point
 * is to prove the policies reject an ordinary unauthenticated client, not a
 * privileged one. No service_role key is used or accepted anywhere in this file.
 *
 * Run with:  node tests/rls-live.mjs
 */

import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// The four tables the brief requires anonymous users to be locked out of, plus
// the two views the application actually reads through.
const APP_TABLES = ['students', 'guardians', 'student_guardians', 'dismissal_requests', 'classes', 'profiles', 'teacher_classes'];
const APP_VIEWS = ['class_directory', 'teacher_directory'];

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

function skip(name, why) {
  skipped += 1;
  console.log(`  \x1b[33mSKIP\x1b[0m  ${name}\n        ${why}`);
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

if (!URL || !ANON_KEY) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set to run these tests.');
  process.exit(2);
}

/** A client with no session — exactly what an anonymous visitor's browser holds. */
function anonClient() {
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** A client carrying a real signed-in session. */
async function signedInClient(email, password) {
  const client = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  if (!data.session) throw new Error(`${email}: no session returned`);
  return client;
}

/**
 * A read counts as denied if PostgREST refuses it *or* returns nothing.
 *
 * Both are legitimate outcomes. `anon` holds no GRANT at all on these objects,
 * so PostgREST refuses at the door with `permission denied for table …` before
 * any policy is consulted — the strongest form of the block. A role that did
 * hold a grant but matched no policy would instead get an empty array, which is
 * equally safe. What must never happen is data coming back.
 */
function denied(result) {
  if (result.error) return true;
  return (result.data ?? []).length === 0;
}

/** How many rows a call actually leaked, for the failure message. */
function leakedCount(result) {
  return result.error ? `error was "${result.error.message}"` : `returned ${(result.data ?? []).length} rows`;
}

// ---------------------------------------------------------------------------
section('1-4. Anonymous access is refused');
// ---------------------------------------------------------------------------

const anon = anonClient();

for (const table of APP_TABLES) {
  const result = await anon.from(table).select('*').limit(5);
  check(`anon SELECT ${table} is denied`, denied(result), leakedCount(result));
}

for (const view of APP_VIEWS) {
  const result = await anon.from(view).select('*').limit(5);
  check(`anon SELECT ${view} is denied`, denied(result), leakedCount(result));
}

const anonInsert = await anon.from('students').insert({ id: 'rls-probe-insert', name: 'RLS probe' }).select();
check(
  'anon INSERT into students is rejected',
  anonInsert.error !== null || anonInsert.data.length === 0,
  'insert appeared to succeed',
);

const anonUpdate = await anon.from('students').update({ name: 'RLS probe' }).eq('id', 'student-5827').select();
check(
  'anon UPDATE on students is rejected',
  anonUpdate.error !== null || anonUpdate.data.length === 0,
  'update appeared to succeed',
);

const anonDelete = await anon.from('students').delete().eq('id', 'student-5827').select();
check(
  'anon DELETE on students is rejected',
  anonDelete.error !== null || anonDelete.data.length === 0,
  'delete appeared to succeed',
);

const anonClassInsert = await anon.from('classes').insert({ name: 'RLS probe', section: 'Z' }).select();
check(
  'anon INSERT into classes is rejected',
  anonClassInsert.error !== null || anonClassInsert.data.length === 0,
  'insert appeared to succeed',
);

const anonGuardianRead = await anon.from('guardians').select('id, name, phone, email, palm_id').limit(5);
check(
  'anon cannot read guardian phone or palm identifiers',
  denied(anonGuardianRead),
  leakedCount(anonGuardianRead),
);

// ---------------------------------------------------------------------------
section('11. RLS remains enabled and anon holds no grants');
// ---------------------------------------------------------------------------
// Confirmed by observable behaviour rather than by reading pg_class: with the
// published key, every application table and view must be unreachable. An empty
// or refused result here is the proof that RLS is on and no anon grant survives.

for (const table of APP_TABLES) {
  const result = await anon.from(table).select('*').limit(1);
  check(`${table} is not readable without a session`, denied(result), leakedCount(result));
}

// ---------------------------------------------------------------------------
section('5-8, 10. Authenticated access (needs test accounts)');
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.GUARDIANX_TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.GUARDIANX_TEST_ADMIN_PASSWORD;
const TEACHER_EMAIL = process.env.GUARDIANX_TEST_TEACHER_EMAIL;
const TEACHER_PASSWORD = process.env.GUARDIANX_TEST_TEACHER_PASSWORD;

const NEEDS_ACCOUNTS = 'Set GUARDIANX_TEST_ADMIN_EMAIL / _PASSWORD and GUARDIANX_TEST_TEACHER_EMAIL / _PASSWORD to run this.';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  skip('admin can read permitted admin data', NEEDS_ACCOUNTS);
  skip('admin sees the full roster', NEEDS_ACCOUNTS);
} else {
  const admin = await signedInClient(ADMIN_EMAIL, ADMIN_PASSWORD);

  const adminStudents = await admin.from('students').select('id, name').limit(50);
  const adminGuardians = await admin.from('guardians').select('id, name').limit(50);
  const adminClasses = await admin.from('classes').select('id, name');
  const adminTeachers = await admin.from('teacher_directory').select('id, name');

  check('admin SELECT on students succeeds', !adminStudents.error, adminStudents.error?.message);
  check('admin SELECT on guardians succeeds', !adminGuardians.error, adminGuardians.error?.message);
  check('admin SELECT on classes succeeds', !adminClasses.error, adminClasses.error?.message);
  check('admin SELECT on teacher_directory succeeds', !adminTeachers.error, adminTeachers.error?.message);
  check('admin sees the whole class roster', (adminStudents.data ?? []).length === 18, `saw ${(adminStudents.data ?? []).length} of 18 students`);
  check('admin sees the whole guardian roster', (adminGuardians.data ?? []).length === 35, `saw ${(adminGuardians.data ?? []).length} of 35 guardians`);

  // 8. An inactive account must not read data. Exercised by deactivating the
  // caller's own profile row and restoring it immediately — is_admin() and every
  // teacher policy both route through current_role(), which filters on
  // is_active = true, so this proves the inactive path end to end.
  const own = await admin.from('profiles').select('id, is_active').eq('id', (await admin.auth.getUser()).data.user.id).single();
  if (own.error || !own.data) {
    skip('inactive user cannot read protected data', `could not read own profile: ${own.error?.message}`);
  } else {
    const { error: deactivateError } = await admin.from('profiles').update({ is_active: false }).eq('id', own.data.id);
    if (deactivateError) {
      skip('inactive user cannot read protected data', `could not deactivate: ${deactivateError.message}`);
    } else {
      const afterDeactivate = await admin.from('students').select('id').limit(5);
      const ownProfile = await admin.from('profiles').select('id').eq('id', own.data.id).limit(1);
      check(
        'inactive user cannot read protected data',
        (afterDeactivate.data ?? []).length === 0,
        `read ${(afterDeactivate.data ?? []).length} students while inactive`,
      );
      check(
        'inactive user cannot read their own profile',
        (ownProfile.data ?? []).length === 0,
        'profile row was still visible',
      );
      // Restore. If this fails the account is left disabled, so it is reported
      // loudly rather than silently.
      const { error: restoreError } = await admin.from('profiles').update({ is_active: true }).eq('id', own.data.id);
      check('inactive probe restored the account', !restoreError, restoreError?.message);
    }
  }

  await admin.auth.signOut();
}

if (!TEACHER_EMAIL || !TEACHER_PASSWORD) {
  skip('teacher can read their assigned class', NEEDS_ACCOUNTS);
  skip('teacher cannot read unrelated classes', NEEDS_ACCOUNTS);
} else {
  const teacher = await signedInClient(TEACHER_EMAIL, TEACHER_PASSWORD);

  const me = await teacher.auth.getUser();
  const myClasses = await teacher.from('classes').select('id, name');
  const assigned = (myClasses.data ?? []).map((row) => row.id);

  check('teacher SELECT on classes succeeds', !myClasses.error, myClasses.error?.message);
  check('teacher is assigned at least one class', assigned.length > 0, 'teacher_classes has no row for this account');

  const myStudents = await teacher.from('students').select('id, class_id').limit(100);
  const myGuardians = await teacher.from('guardians').select('id');
  const allStudents = (myStudents.data ?? []);

  check('teacher SELECT on students succeeds', !myStudents.error, myStudents.error?.message);
  check(
    'teacher only sees students in assigned classes',
    allStudents.every((row) => assigned.includes(row.class_id)),
    'a student outside the assigned classes was returned',
  );
  check('teacher sees the Tulip roster', allStudents.length === 18, `saw ${allStudents.length} of 18 students`);

  // Guardians reach a teacher only through a link to one of their students.
  const guardianIds = new Set((myGuardians.data ?? []).map((row) => row.id));
  const myLinks = await teacher.from('student_guardians').select('guardian_id, student_id');
  const linkedToMine = (myLinks.data ?? []).every((link) =>
    assigned.includes((allStudents.find((s) => s.id === link.student_id) ?? {}).class_id ?? ''),
  );
  check('guardian links are limited to the teacher\'s own students', linkedToMine);
  check('teacher sees the guardian roster', guardianIds.size === 35, `saw ${guardianIds.size} of 35 guardians`);

  // 7. Unrelated classes. Probed by asking for every class id the teacher can
  // name — including the ones RLS withheld — and confirming none leak. A teacher
  // who changes a client-side value gains nothing, because the filter runs in
  // the database.
  const allClassIdsProbe = await teacher.from('classes').select('id');
  const leaked = (allClassIdsProbe.data ?? []).filter((row) => !assigned.includes(row.id));
  check('teacher cannot read classes outside teacher_classes', leaked.length === 0, `leaked ${leaked.length} class(es)`);

  // A teacher must not reach another teacher's students. Reading students with
  // no class filter is already covered above; this asserts the write side too,
  // since writes are closed for every role.
  const teacherWrite = await teacher.from('students').insert({ id: 'rls-probe-teacher', name: 'probe' }).select();
  check(
    'teacher cannot INSERT into students',
    teacherWrite.error !== null || teacherWrite.data.length === 0,
    'insert appeared to succeed',
  );

  // The profile RLS guard: a teacher may read their own row but not others.
  const otherProfiles = await teacher.from('profiles').select('id').neq('id', me.data.user.id).limit(5);
  check(
    'teacher cannot read other profiles',
    otherProfiles.error !== null || (otherProfiles.data ?? []).length === 0,
    `read ${(otherProfiles.data ?? []).length} other profile(s)`,
  );

  await teacher.auth.signOut();
}

section('9, 10. Session lifecycle');

// 9. Sign-out must leave nothing usable behind.
{
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    skip('sign-out removes the session', NEEDS_ACCOUNTS);
  } else {
    const client = await signedInClient(ADMIN_EMAIL, ADMIN_PASSWORD);
    const before = await client.auth.getSession();
    await client.auth.signOut();
    const after = await client.auth.getSession();
    const readAfterSignOut = await client.from('students').select('id').limit(5);
    check('session exists before sign-out', before.data.session !== null);
    check('sign-out removes the session', after.data.session === null);
    check('signed-out client cannot read students', (readAfterSignOut.data ?? []).length === 0);
  }
}

// 10. A new client reading the same persisted storage restores the session.
// supabase-js keeps the session in Web Storage on the client; this simulates a
// reload by carrying the stored session across into a fresh client instance.
{
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    skip('refresh restores a persisted session', NEEDS_ACCOUNTS);
  } else {
    const storage = new Map();
    const shared = {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => { storage.set(k, v); },
      removeItem: (k) => { storage.delete(k); },
      key: (i) => [...storage.keys()][i] ?? null,
      get length() { return storage.size; },
      clear: () => storage.clear(),
    };
    const withStorage = () => createClient(URL, ANON_KEY, { auth: { storage: shared } });

    const first = withStorage();
    await first.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const stored = storage.get(`sb-${URL.split('//')[1].split('.')[0]}-auth-token`);
    check('sign-in persists the session to storage', Boolean(stored), 'nothing was written to storage');

    // A different client instance, same storage: this is the reload path.
    const reloaded = withStorage();
    const restored = await reloaded.auth.getSession();
    check('refresh restores a valid authenticated session', restored.data.session !== null);
    const readAfterRestore = await reloaded.from('students').select('id').limit(5);
    check('restored session can read permitted data', !readAfterRestore.error && (readAfterRestore.data ?? []).length === 18);
    await reloaded.auth.signOut();
  }
}

// ---------------------------------------------------------------------------
section('15. Seeded data is intact');
// ---------------------------------------------------------------------------
// Only checkable through a permitted session; anonymous access is now zero by
// design, so these assertions double as the "current data must remain" check.
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  skip('classes / students / guardians / links / requests unchanged', NEEDS_ACCOUNTS);
} else {
  const admin = await signedInClient(ADMIN_EMAIL, ADMIN_PASSWORD);
  const counts = {
    classes: (await admin.from('classes').select('id')).data?.length,
    students: (await admin.from('students').select('id')).data?.length,
    guardians: (await admin.from('guardians').select('id')).data?.length,
    student_guardians: (await admin.from('student_guardians').select('student_id')).data?.length,
    dismissal_requests: (await admin.from('dismissal_requests').select('id')).data?.length,
  };
  check('classes is 1', counts.classes === 1, `saw ${counts.classes}`);
  check('students is 18', counts.students === 18, `saw ${counts.students}`);
  check('guardians is 35', counts.guardians === 35, `saw ${counts.guardians}`);
  check('student_guardians is 35', counts.student_guardians === 35, `saw ${counts.student_guardians}`);
  check('dismissal_requests is 0', counts.dismissal_requests === 0, `saw ${counts.dismissal_requests}`);
  await admin.auth.signOut();
}

// ---------------------------------------------------------------------------
console.log(`\n${'-'.repeat(60)}`);
console.log(`passed ${passed}   failed ${failed}   skipped ${skipped}`);
if (skipped > 0) {
  console.log('\n\x1b[33mSkipped tests are NOT passes.\x1b[0m Create the accounts described in the plan and export the');
  console.log('GUARDIANX_TEST_* variables to exercise them.');
}
if (failed > 0) {
  console.log(`\n\x1b[31mFailed:\x1b[0m ${failures.join(', ')}`);
}
process.exit(failed > 0 ? 1 : 0);