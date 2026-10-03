/**
 * Illustrative records for the public landing page.
 *
 * Every name here is invented for the product demonstration and is not a real
 * student or guardian. The landing page never reads from Supabase; these values
 * exist only so the mockups tell one consistent story. Fields mirror what the
 * application actually stores (name, admission number, class, linked guardians,
 * palm status, dismissal status) and statuses reuse its exact vocabulary.
 */
import type { DismissalStatus, PalmStatus } from '../../data/adminData';

export interface DemoStudent {
  name: string;
  admission: string;
  className: string;
  guardians: number;
}

export interface DemoGuardian {
  name: string;
  ward: string;
  wardClass: string;
  palm: PalmStatus;
}

export interface DemoRequest {
  student: string;
  className: string;
  guardian: string;
  time: string;
  status: DismissalStatus;
}

/** The single story the whole page follows. */
export const featured = {
  student: 'Aarav Sharma',
  admission: 'GX-2318',
  className: '8A',
  classLong: 'Class 8 · Section A',
  guardian: 'Rajesh Sharma',
  otherGuardian: 'Priya Sharma',
  teacher: 'Ms. Kavya Nair',
  time: '2:41 PM',
} as const;

export const demoStudents: DemoStudent[] = [
  { name: featured.student, admission: featured.admission, className: '8A', guardians: 2 },
  { name: 'Diya Patel', admission: 'GX-2324', className: '8A', guardians: 1 },
  { name: 'Kabir Mehta', admission: 'GX-2331', className: '8B', guardians: 2 },
  { name: 'Ananya Iyer', admission: 'GX-2342', className: '7A', guardians: 1 },
  { name: 'Vihaan Reddy', admission: 'GX-2356', className: '7C', guardians: 0 },
  { name: 'Ishita Rao', admission: 'GX-2361', className: '6B', guardians: 2 },
];

export const demoGuardians: DemoGuardian[] = [
  { name: featured.guardian, ward: featured.student, wardClass: '8A', palm: 'Registered' },
  { name: 'Neha Patel', ward: 'Diya Patel', wardClass: '8A', palm: 'Registered' },
  { name: 'Sanjay Mehta', ward: 'Kabir Mehta', wardClass: '8B', palm: 'Not registered' },
  { name: 'Lakshmi Iyer', ward: 'Ananya Iyer', wardClass: '7A', palm: 'Registered' },
  { name: 'Meera Rao', ward: 'Ishita Rao', wardClass: '6B', palm: 'Registered' },
];

export const demoRequests: DemoRequest[] = [
  { student: featured.student, className: '8A', guardian: featured.guardian, time: featured.time, status: 'Pending' },
  { student: 'Diya Patel', className: '8A', guardian: 'Neha Patel', time: '2:36 PM', status: 'Completed' },
  { student: 'Ananya Iyer', className: '7A', guardian: 'Lakshmi Iyer', time: '2:29 PM', status: 'Completed' },
  { student: 'Ishita Rao', className: '6B', guardian: 'Meera Rao', time: '2:18 PM', status: 'Approved' },
];
