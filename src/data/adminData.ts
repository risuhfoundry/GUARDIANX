export type PalmStatus = 'Registered' | 'Not registered';
export type DismissalStatus = 'Pending' | 'Approved' | 'Completed';

export interface AdminClass {
  id: string;
  name: string;
  teacherId?: string;
}

export interface AdminTeacher {
  id: string;
  name: string;
}

export interface AdminGuardian {
  id: string;
  name: string;
  palmStatus: PalmStatus;
}

export interface AdminStudent {
  id: string;
  name: string;
  admissionNumber: string;
  classId: string;
  guardianIds: string[];
}

export interface DismissalRequest {
  id: string;
  studentId: string;
  guardianId: string;
  teacherId?: string;
  requestedAt: string;
  status: DismissalStatus;
}

export interface AdminDataState {
  classes: AdminClass[];
  teachers: AdminTeacher[];
  guardians: AdminGuardian[];
  students: AdminStudent[];
  dismissalRequests: DismissalRequest[];
}

// Real Tulip class roster transcribed from the "TULIP" sheet of the school
// workbook. Values are stored exactly as they appear there, including leading
// zeros in admission numbers. No dismissal requests exist yet: the workbook
// records no dismissal events, so none were invented.
export const initialAdminData: AdminDataState = {
  classes: [
    { id: 'class-tulip', name: 'Tulip', teacherId: 'teacher-shruti' },
  ],
  teachers: [
    { id: 'teacher-shruti', name: 'Shruti' },
  ],
  guardians: [
    { id: 'guardian-mukesh-kumar-rai', name: 'MUKESH KUMAR RAI', palmStatus: 'Not registered' },
    { id: 'guardian-arti-rai', name: 'ARTI RAI', palmStatus: 'Not registered' },
    { id: 'guardian-prakash-chandra-sharma', name: 'PRAKASH CHANDRA SHARMA', palmStatus: 'Not registered' },
    { id: 'guardian-suman-sharma', name: 'SUMAN SHARMA', palmStatus: 'Not registered' },
    { id: 'guardian-anuj-kumar-sharma', name: 'ANUJ KUMAR SHARMA', palmStatus: 'Not registered' },
    { id: 'guardian-poornima', name: 'POORNIMA', palmStatus: 'Not registered' },
    { id: 'guardian-dheerender-kumar-saroj', name: 'DHEERENDER KUMAR SAROJ', palmStatus: 'Not registered' },
    { id: 'guardian-pooja', name: 'POOJA', palmStatus: 'Not registered' },
    { id: 'guardian-brij-mohan', name: 'BRIJ MOHAN', palmStatus: 'Not registered' },
    { id: 'guardian-deepa', name: 'DEEPA', palmStatus: 'Not registered' },
    { id: 'guardian-nakul-gupta', name: 'NAKUL GUPTA', palmStatus: 'Not registered' },
    { id: 'guardian-chitra-sharma', name: 'CHITRA SHARMA', palmStatus: 'Not registered' },
    { id: 'guardian-aman-sharma', name: 'AMAN SHARMA', palmStatus: 'Not registered' },
    { id: 'guardian-sumit-sharma', name: 'SUMIT SHARMA', palmStatus: 'Not registered' },
    { id: 'guardian-ankita-sharma', name: 'ANKITA SHARMA', palmStatus: 'Not registered' },
    { id: 'guardian-surjit-singh-rawat', name: 'SURJIT SINGH RAWAT', palmStatus: 'Not registered' },
    { id: 'guardian-geeta', name: 'GEETA', palmStatus: 'Not registered' },
    { id: 'guardian-pawan-kumar', name: 'PAWAN KUMAR', palmStatus: 'Not registered' },
    { id: 'guardian-preeti', name: 'PREETI', palmStatus: 'Not registered' },
    { id: 'guardian-pramod-kumar', name: 'PRAMOD KUMAR', palmStatus: 'Not registered' },
    { id: 'guardian-bimlash', name: 'BIMLASH', palmStatus: 'Not registered' },
    { id: 'guardian-shakil', name: 'SHAKIL', palmStatus: 'Not registered' },
    { id: 'guardian-sagira', name: 'SAGIRA', palmStatus: 'Not registered' },
    { id: 'guardian-vineet-chauhan', name: 'VINEET CHAUHAN', palmStatus: 'Not registered' },
    { id: 'guardian-sangeeta-chauhan', name: 'SANGEETA CHAUHAN', palmStatus: 'Not registered' },
    { id: 'guardian-shahrukh-khan', name: 'SHAHRUKH KHAN', palmStatus: 'Not registered' },
    { id: 'guardian-shagufta-khan', name: 'SHAGUFTA KHAN', palmStatus: 'Not registered' },
    { id: 'guardian-krishna-kant-mahera', name: 'KRISHNA KANT MAHERA', palmStatus: 'Not registered' },
    { id: 'guardian-jyoti-sharma', name: 'JYOTI SHARMA', palmStatus: 'Not registered' },
    { id: 'guardian-sushil-kumar', name: 'SUSHIL KUMAR', palmStatus: 'Not registered' },
    { id: 'guardian-manju-tomar', name: 'MANJU TOMAR', palmStatus: 'Not registered' },
    { id: 'guardian-om-prakash', name: 'OM PRAKASH', palmStatus: 'Not registered' },
    { id: 'guardian-asha', name: 'ASHA', palmStatus: 'Not registered' },
    { id: 'guardian-irfan-ali', name: 'IRFAN ALI', palmStatus: 'Not registered' },
    { id: 'guardian-arifa-khatoon', name: 'ARIFA KHATOON', palmStatus: 'Not registered' },
  ],
  students: [
    { id: 'student-5851', name: 'AYAANSH RAI', admissionNumber: '5851', classId: 'class-tulip', guardianIds: ['guardian-mukesh-kumar-rai', 'guardian-arti-rai'] },
    { id: 'student-041', name: 'CHIRAYU SHARMA', admissionNumber: '041', classId: 'class-tulip', guardianIds: ['guardian-prakash-chandra-sharma', 'guardian-suman-sharma'] },
    { id: 'student-5800', name: 'DIVIT SHARMA', admissionNumber: '5800', classId: 'class-tulip', guardianIds: ['guardian-anuj-kumar-sharma', 'guardian-poornima'] },
    { id: 'student-5929', name: 'DRISHA SAROJ', admissionNumber: '5929', classId: 'class-tulip', guardianIds: ['guardian-dheerender-kumar-saroj', 'guardian-pooja'] },
    { id: 'student-5877', name: 'GAURANSH SINGH', admissionNumber: '5877', classId: 'class-tulip', guardianIds: ['guardian-brij-mohan', 'guardian-deepa'] },
    { id: 'student-5767', name: 'HARSH GUPTA', admissionNumber: '5767', classId: 'class-tulip', guardianIds: ['guardian-nakul-gupta', 'guardian-chitra-sharma'] },
    { id: 'student-5834', name: 'HERMAN SHARMA', admissionNumber: '5834', classId: 'class-tulip', guardianIds: ['guardian-aman-sharma'] },
    { id: 'student-5801', name: 'KATHA SHARMA', admissionNumber: '5801', classId: 'class-tulip', guardianIds: ['guardian-sumit-sharma', 'guardian-ankita-sharma'] },
    { id: 'student-5883', name: 'KIARA RAWAT', admissionNumber: '5883', classId: 'class-tulip', guardianIds: ['guardian-surjit-singh-rawat', 'guardian-geeta'] },
    { id: 'student-040', name: 'LAKSHYA KASHYAP', admissionNumber: '040', classId: 'class-tulip', guardianIds: ['guardian-pawan-kumar', 'guardian-preeti'] },
    { id: 'student-5930', name: 'MISHTI GAUTAM', admissionNumber: '5930', classId: 'class-tulip', guardianIds: ['guardian-pramod-kumar', 'guardian-bimlash'] },
    { id: 'student-5876', name: 'MOHD AAHIL', admissionNumber: '5876', classId: 'class-tulip', guardianIds: ['guardian-shakil', 'guardian-sagira'] },
    { id: 'student-5838', name: 'NAKSH CHAUHAN', admissionNumber: '5838', classId: 'class-tulip', guardianIds: ['guardian-vineet-chauhan', 'guardian-sangeeta-chauhan'] },
    { id: 'student-5909', name: 'ORHAN KHAN', admissionNumber: '5909', classId: 'class-tulip', guardianIds: ['guardian-shahrukh-khan', 'guardian-shagufta-khan'] },
    { id: 'student-5903', name: 'RITVI SHARMA', admissionNumber: '5903', classId: 'class-tulip', guardianIds: ['guardian-krishna-kant-mahera', 'guardian-jyoti-sharma'] },
    { id: 'student-5867', name: 'SURYANSH SINGH RATHORE', admissionNumber: '5867', classId: 'class-tulip', guardianIds: ['guardian-sushil-kumar', 'guardian-manju-tomar'] },
    { id: 'student-5827', name: 'VAISHNAVI ARYA', admissionNumber: '5827', classId: 'class-tulip', guardianIds: ['guardian-om-prakash', 'guardian-asha'] },
    { id: 'student-5900', name: 'ZUNAIRA ALI', admissionNumber: '5900', classId: 'class-tulip', guardianIds: ['guardian-irfan-ali', 'guardian-arifa-khatoon'] },
  ],
  dismissalRequests: [],
};

export function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
