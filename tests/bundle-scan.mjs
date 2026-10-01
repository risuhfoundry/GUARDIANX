/**
 * Browser bundle safety scan.
 *
 * Covers brief items 12-14: no privileged Supabase credential and no real
 * student or guardian record may be present in the built output. This reads the
 * shipped artefacts rather than the source, because that is what a browser
 * actually downloads.
 *
 * Run with:  node tests/bundle-scan.mjs
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const DIST = join(process.cwd(), 'dist');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

if (!existsSync(DIST)) {
  console.error('dist/ not found. Run `pnpm run build` first.');
  process.exit(2);
}

/** Every text artefact the browser can download from dist/. */
async function shippedFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await shippedFiles(path)));
    else if (/\.(js|mjs|css|html|json|map|txt|webmanifest)$/.test(entry.name)) found.push(path);
  }
  return found;
}

const files = await shippedFiles(DIST);
const contents = [];
for (const path of files) {
  contents.push({ path: path.slice(DIST.length + 1), text: await readFile(path, 'utf8') });
}

console.log(`\n\x1b[1mScanning ${contents.length} shipped files in dist/\x1b[0m\n`);

console.log('\x1b[1m12-13. No privileged credentials in the browser bundle\x1b[0m');

// service_role is the grant-everything JWT. It is matched as a word so the
// string inside supabase-js's own type definitions and error text does not
// produce a false positive — only an actual key value would match the JWT shape.
const SERVICE_ROLE_LITERAL = /['"`]service_role['"`]\s*[:=]|service_role\s*[:=]\s*['"]eyJ/gi;
const JWT_SHAPED = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const SECRET_KEY_PREFIX = /sb_secret_[A-Za-z0-9_-]{10,}/g;

const literalHits = contents.filter((f) => SERVICE_ROLE_LITERAL.test(f.text)).map((f) => f.path);
SERVICE_ROLE_LITERAL.lastIndex = 0;
check('no service_role credential assignment', literalHits.length === 0, literalHits.join(', '));

const jwtHits = [];
const secretHits = [];
for (const file of contents) {
  // A JWT shape is a hit unless it is the known public anon/publishable key
  // that is deliberately shipped; those do not match anyway, so anything found
  // here is unexplained and worth failing on.
  if (JWT_SHAPED.test(file.text)) jwtHits.push(file.path);
  JWT_SHAPED.lastIndex = 0;
  if (SECRET_KEY_PREFIX.test(file.text)) secretHits.push(file.path);
  SECRET_KEY_PREFIX.lastIndex = 0;
}
check('no JWT-shaped credential in the bundle', jwtHits.length === 0, jwtHits.join(', '));
check('no sb_secret_ key in the bundle', secretHits.length === 0, secretHits.join(', '));

// The project URL is public and must be present, but the key must be the
// publishable one — never the legacy service-role JWT.
check('no "SUPABASE_SERVICE" environment reference', !contents.some((f) => /VITE_SUPABASE_SERVICE|SUPABASE_SERVICE_ROLE/i.test(f.text)));
check('no hardcoded Supabase key constant', !contents.some((f) => /SUPABASE_ANON_KEY\s*=\s*['"][^'"]+['"]/.test(f.text)));

console.log('\n\x1b[1m14. No student or guardian data bundled statically\x1b[0m');

// Real records, taken from the seed migration. If any of these appear in the
// bundle, the database is no longer the only source of truth.
const REAL_NAMES = [
  'MUKESH KUMAR RAI', 'PRAKASH CHANDRA SHARMA', 'SUMAN SHARMA',
  'POORNIMA', 'ASHA', 'IRFAN ALI',
];
const REAL_ADMISSION_NUMBERS = ['040', '041'];

const nameHits = REAL_NAMES.filter((name) => contents.some((f) => f.text.includes(name)));
check('no guardian or student names in the bundle', nameHits.length === 0, nameHits.join(', '));

const admissionHits = REAL_ADMISSION_NUMBERS.filter((n) => {
  // Only a name/value pair in object-literal shape counts; a bare "041" appears
  // in unrelated numeric contexts.
  const pattern = new RegExp(`(name|student|guardian)['"]?\\s*:\\s*['"][^'"]*\\b${n}\\b`, 'i');
  return contents.some((f) => pattern.test(f.text));
});
check('no admission numbers paired with a record name', admissionHits.length === 0, admissionHits.join(', '));

const seedHits = contents.filter((f) => /guardian-mukesh|student-5827|student-5900/.test(f.text)).map((f) => f.path);
check('no seeded primary keys in the bundle', seedHits.length === 0, seedHits.join(', '));

console.log('\n\x1b[1mBuild integrity\x1b[0m');
const html = contents.find((f) => f.path === 'index.html');
check('index.html is emitted', Boolean(html));
check('root mount point present', Boolean(html?.text.includes('id="root"')));

console.log(`\n${'-'.repeat(60)}`);
console.log(`passed ${passed}   failed ${failed}`);
if (failed > 0) {
  console.log(`\n\x1b[31mFailed:\x1b[0m ${failures.join(', ')}`);
  process.exit(1);
}