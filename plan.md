# GUARDIAN X — Part 2 Admin Frontend Plan

## Authorized scope

Continue the existing GUARDIAN X React/TypeScript/Vite SPA without redesigning its shell or design system. Implement only the Admin panel described in the Part 2 brief: dashboard dismissal summaries and recent requests; classes; students with search/class filter and an Excel import flow; guardians; guardian-to-student relationships capped at two guardians per student; guardian palm registration display; teachers; dismissal request list and detail. Preserve the exact seven Admin navigation labels. Keep Settings as an intentionally unimplemented placeholder because the brief requires its navigation entry but specifies no settings functionality. Add no unrelated modules or workflows.

This project currently has no server, database, authentication, or real school API. Do not enable managed features or fabricate connected records. Use a clearly marked, synthetic sample dataset and keep edits/imports in React in-memory state for this frontend demonstration only; no persistence, API calls, biometric implementation, or claims of real school data. The XLSX selected by the user is read locally in the browser and is not uploaded. Import exactly the student columns Name, Admission number, and Class; validate required values, unique admission number, and class matching before local confirmation. Do not invent extra student fields or dismissal states.

## Product behavior

- Dashboard summary cards show today's dismissal requests and total pending, approved, and completed requests. A recent-dismissals table contains Student, Class, Guardian, Status, and Time only.
- Classes list Class name, Student count, optional assigned teacher, and students; provide Add class, Edit class, and View class.
- Students list Student name, Admission number, Class, linked guardian(s) and each linked guardian's palm registration where applicable; provide add, view, edit, search, and filter by class.
- Excel import has the requested steps: upload/select a workbook, show the selected file, preview student rows, show validation status, and confirm import. A confirmation changes only the labeled local demo session.
- Guardians support add, view, edit, and search. Show guardian name, linked student(s) and class, and palm state. Make the guardian/ward link clear from both guardian and student views. Never allow more than two linked guardians for one student.
- Palm is display-only and limited to Registered / Not registered; do not add biometric algorithms or claims of face, fingerprint, or iris recognition.
- Teachers show Teacher name, assigned class/classes, and assignment status only; no HR functionality.
- Dismissal Requests shows all requests with Student, Class, Guardian, Requested time, Teacher, Status, and Action. Clicking a request opens details for Student, Class, Guardian, Request information, Teacher decision, Current status, and Timestamp. Since no backend exists, use only the brief's Pending, Approved, and Completed sample states; label all records as demo data, not actual activity.
- Retain the existing shell's visual direction, responsive behavior, keyboard focus, and reusable components. Keep the seven requested sidebar items and do not add QR, parent portal, attendance, fees, exams, transport, messaging, AI, facial/fingerprint recognition, unrelated analytics, or other unspecified features.

## Architecture and implementation

- Keep the existing Vite client-rendered React SPA and CSS token system. Do not enable a server, database, login, API, published route, or deployment configuration.
- Maintain a typed in-memory Admin data provider for students, guardians, classes, teachers, and requests; derive counts, class membership, guardian relationships, and assignment status from the same state. Seed clearly synthetic records, including the brief's Rajesh Sharma / Aarav Sharma / 11-A and Rajesh Sharma + Priya Sharma two-guardian example. The state resets on reload.
- Add small page modules for Dashboard, Classes, Students, Guardians, Teachers, Dismissal Requests, and the Settings placeholder, plus focused forms/detail components. Reuse `src/layout/AppShell.tsx`, `src/components/ui.tsx`, existing styles and brand.
- Add `read-excel-file` only for the browser-side `.xlsx` reader. Load it dynamically only when an Excel file is selected so it is not part of the initial dashboard bundle. Require only Student Name, Admission Number, and Class columns; ignore other columns, identify malformed rows, duplicate admissions, and unknown classes; disable confirmation until every imported row is valid.
- Keep in-app navigation as local shell state; the current app has only `/`, so retain the route manifest at `/` and verify that manifest JSON remains valid. Production remains static Vite `dist` output: no API/server routes; revalidate stable HTML and use long-lived immutable caching only for content-hashed assets. Do not publish without an explicit request.

## Project structure

- `src/data/adminSeed.ts` — typed demo records and initial Admin data.
- `src/features/admin/AdminDataContext.tsx` — shared reducer/context and in-memory relation updates.
- `src/features/admin/RequestDetailDialog.tsx` — shared request detail view used by Dashboard and Dismissal Requests.
- `src/features/students/` — student editor and lazy Excel-import reader/preview.
- `src/pages/` — page-level compositions for each specified Admin navigation destination.
- Existing `src/layout/`, `src/components/`, `src/styles/`, `public/manus-routes.json`, Vite manifest/build files — preserve shell, shared primitives, style system, root route, and static build.

## Verification and operating constraints

Use the registered host-managed TypeScript diagnostics and existing `pnpm check` / `pnpm build`. Inspect the source/model logic for the two-guardian ceiling, allowed dismissal/palm states, local-only demo changes, and the Excel schema. Check the static route manifest from source. The Preview service was explicitly stopped by the user; respect the stop and do not restart it for this task. Therefore no HTTP, screenshot, or browser verification is authorized/available unless the user asks to resume Preview. Do not publish.