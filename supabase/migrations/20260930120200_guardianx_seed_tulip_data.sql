-- GUARDIAN X — Phase 2 seed: the real Tulip class dataset
--
-- Every row below comes from the "TULIP" sheet of the school workbook, as
-- transcribed in commit 3a3c036 (src/data/adminData.ts, since removed from the
-- working tree once the database became the source of truth). Nothing is
-- invented:
--
--   * 1 class (Tulip), resolved to its real uuid in the existing `classes` table
--   * 18 students, admission numbers as text so '041' and '040' keep their zeros
--   * 35 guardians, all 'Not registered' — no palm is enrolled in the source
--   * 35 guardian<->student links; no student exceeds two guardians
--   * 0 dismissal requests, because the workbook records none
--
-- The class is inserted into the pre-existing `classes` table rather than into a
-- GUARDIAN X table. `section` is NOT NULL there, so a section value is supplied;
-- the workbook names the sheet "TULIP" and records no section, so 'A' is used as
-- an explicit placeholder. It is the only value in this seed not transcribed
-- from the workbook, and it is required by an existing NOT NULL constraint.
--
-- Teacher: `profiles.id` references `auth.users.id`, and this project has no
-- authenticated users. A Shruti profile therefore CANNOT be created without a
-- legitimate Supabase Auth account, and the `teacher_classes` link depends on
-- that profile. No `auth.users` row is fabricated here. The teacher assignment
-- is left to a follow-up once a real teacher signs up; see the note at the end.

begin;

-- Resolve the class by name and reuse its uuid for every student. Guarded so a
-- re-run cannot create a second Tulip class.
insert into classes (name, section)
select 'Tulip', 'A'
where not exists (select 1 from classes where name = 'Tulip');

-- Guardians: every one is 'Not registered' with no palm enrolled.
insert into guardians (id, name, palm_status, palm_id) values ('guardian-mukesh-kumar-rai', 'MUKESH KUMAR RAI', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-arti-rai', 'ARTI RAI', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-prakash-chandra-sharma', 'PRAKASH CHANDRA SHARMA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-suman-sharma', 'SUMAN SHARMA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-anuj-kumar-sharma', 'ANUJ KUMAR SHARMA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-poornima', 'POORNIMA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-dheerender-kumar-saroj', 'DHEERENDER KUMAR SAROJ', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-pooja', 'POOJA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-brij-mohan', 'BRIJ MOHAN', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-deepa', 'DEEPA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-nakul-gupta', 'NAKUL GUPTA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-chitra-sharma', 'CHITRA SHARMA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-aman-sharma', 'AMAN SHARMA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-sumit-sharma', 'SUMIT SHARMA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-ankita-sharma', 'ANKITA SHARMA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-surjit-singh-rawat', 'SURJIT SINGH RAWAT', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-geeta', 'GEETA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-pawan-kumar', 'PAWAN KUMAR', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-preeti', 'PREETI', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-pramod-kumar', 'PRAMOD KUMAR', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-bimlash', 'BIMLASH', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-shakil', 'SHAKIL', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-sagira', 'SAGIRA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-vineet-chauhan', 'VINEET CHAUHAN', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-sangeeta-chauhan', 'SANGEETA CHAUHAN', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-shahrukh-khan', 'SHAHRUKH KHAN', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-shagufta-khan', 'SHAGUFTA KHAN', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-krishna-kant-mahera', 'KRISHNA KANT MAHERA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-jyoti-sharma', 'JYOTI SHARMA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-sushil-kumar', 'SUSHIL KUMAR', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-manju-tomar', 'MANJU TOMAR', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-om-prakash', 'OM PRAKASH', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-asha', 'ASHA', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-irfan-ali', 'IRFAN ALI', 'Not registered', null);
insert into guardians (id, name, palm_status, palm_id) values ('guardian-arifa-khatoon', 'ARIFA KHATOON', 'Not registered', null);

-- Students. class_id is resolved from the real `classes` row rather than
-- hard-coded, so the seed stays correct whatever uuid the row carries.
insert into students (id, name, admission_number, class_id)
select v.id, v.name, v.admission_number, c.id
from (values
  ('student-5851', 'AYAANSH RAI',         '5851'),
  ('student-041',  'CHIRAYU SHARMA',      '041'),
  ('student-5800', 'DIVIT SHARMA',        '5800'),
  ('student-5929', 'DRISHA SAROJ',        '5929'),
  ('student-5877', 'GAURANSH SINGH',      '5877'),
  ('student-5767', 'HARSH GUPTA',         '5767'),
  ('student-5834', 'HERMAN SHARMA',       '5834'),
  ('student-5801', 'KATHA SHARMA',        '5801'),
  ('student-5883', 'KIARA RAWAT',         '5883'),
  ('student-040',  'LAKSHYA KASHYAP',     '040'),
  ('student-5930', 'MISHTI GAUTAM',       '5930'),
  ('student-5876', 'MOHD AAHIL',          '5876'),
  ('student-5838', 'NAKSH CHAUHAN',       '5838'),
  ('student-5909', 'ORHAN KHAN',          '5909'),
  ('student-5903', 'RITVI SHARMA',        '5903'),
  ('student-5867', 'SURYANSH SINGH RATHORE', '5867'),
  ('student-5827', 'VAISHNAVI ARYA',      '5827'),
  ('student-5900', 'ZUNAIRA ALI',         '5900')
) as v(id, name, admission_number)
cross join lateral (select id from classes where name = 'Tulip' limit 1) c;

-- Guardian <-> student links, exactly as recorded in the workbook.
insert into student_guardians (student_id, guardian_id) values ('student-5851', 'guardian-mukesh-kumar-rai');
insert into student_guardians (student_id, guardian_id) values ('student-5851', 'guardian-arti-rai');
insert into student_guardians (student_id, guardian_id) values ('student-041', 'guardian-prakash-chandra-sharma');
insert into student_guardians (student_id, guardian_id) values ('student-041', 'guardian-suman-sharma');
insert into student_guardians (student_id, guardian_id) values ('student-5800', 'guardian-anuj-kumar-sharma');
insert into student_guardians (student_id, guardian_id) values ('student-5800', 'guardian-poornima');
insert into student_guardians (student_id, guardian_id) values ('student-5929', 'guardian-dheerender-kumar-saroj');
insert into student_guardians (student_id, guardian_id) values ('student-5929', 'guardian-pooja');
insert into student_guardians (student_id, guardian_id) values ('student-5877', 'guardian-brij-mohan');
insert into student_guardians (student_id, guardian_id) values ('student-5877', 'guardian-deepa');
insert into student_guardians (student_id, guardian_id) values ('student-5767', 'guardian-nakul-gupta');
insert into student_guardians (student_id, guardian_id) values ('student-5767', 'guardian-chitra-sharma');
insert into student_guardians (student_id, guardian_id) values ('student-5834', 'guardian-aman-sharma');
insert into student_guardians (student_id, guardian_id) values ('student-5801', 'guardian-sumit-sharma');
insert into student_guardians (student_id, guardian_id) values ('student-5801', 'guardian-ankita-sharma');
insert into student_guardians (student_id, guardian_id) values ('student-5883', 'guardian-surjit-singh-rawat');
insert into student_guardians (student_id, guardian_id) values ('student-5883', 'guardian-geeta');
insert into student_guardians (student_id, guardian_id) values ('student-040', 'guardian-pawan-kumar');
insert into student_guardians (student_id, guardian_id) values ('student-040', 'guardian-preeti');
insert into student_guardians (student_id, guardian_id) values ('student-5930', 'guardian-pramod-kumar');
insert into student_guardians (student_id, guardian_id) values ('student-5930', 'guardian-bimlash');
insert into student_guardians (student_id, guardian_id) values ('student-5876', 'guardian-shakil');
insert into student_guardians (student_id, guardian_id) values ('student-5876', 'guardian-sagira');
insert into student_guardians (student_id, guardian_id) values ('student-5838', 'guardian-vineet-chauhan');
insert into student_guardians (student_id, guardian_id) values ('student-5838', 'guardian-sangeeta-chauhan');
insert into student_guardians (student_id, guardian_id) values ('student-5909', 'guardian-shahrukh-khan');
insert into student_guardians (student_id, guardian_id) values ('student-5909', 'guardian-shagufta-khan');
insert into student_guardians (student_id, guardian_id) values ('student-5903', 'guardian-krishna-kant-mahera');
insert into student_guardians (student_id, guardian_id) values ('student-5903', 'guardian-jyoti-sharma');
insert into student_guardians (student_id, guardian_id) values ('student-5867', 'guardian-sushil-kumar');
insert into student_guardians (student_id, guardian_id) values ('student-5867', 'guardian-manju-tomar');
insert into student_guardians (student_id, guardian_id) values ('student-5827', 'guardian-om-prakash');
insert into student_guardians (student_id, guardian_id) values ('student-5827', 'guardian-asha');
insert into student_guardians (student_id, guardian_id) values ('student-5900', 'guardian-irfan-ali');
insert into student_guardians (student_id, guardian_id) values ('student-5900', 'guardian-arifa-khatoon');

-- Dismissal requests: the workbook records none, so none are inserted.
-- Nothing is invented to make the table non-empty.
--
-- Teacher assignment is intentionally absent. `teacher_classes` requires a
-- `profiles` row, which requires a real `auth.users` account, and this project
-- has no authenticated users. Creating one would mean fabricating a credential,
-- so Shruti's profile and her class assignment must be completed through a
-- legitimate Supabase Auth signup before the teacher link can be inserted.
