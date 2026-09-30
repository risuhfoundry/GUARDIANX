export type PalmStatus = 'Registered' | 'Not registered';
export type DismissalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed';

// Maps a dismissal status onto the status-indicator tone. A rejected request is
// a real outcome and must not be rendered with the success colour.
export function dismissalStatusTone(status: DismissalStatus): 'neutral' | 'success' | 'danger' | 'pending' {
  switch (status) {
    case 'Pending':
      return 'pending';
    case 'Rejected':
      return 'danger';
    case 'Approved':
    case 'Completed':
      return 'success';
  }
}

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

// The Tulip roster no longer lives here. Records are read from Supabase at
// runtime (see src/features/admin/adminDataService.ts); the schema and seed
// in supabase/migrations/ hold the data. This module is the shared type
// surface and the formatting helpers, nothing more.

export const emptyAdminData: AdminDataState = {
  classes: [],
  teachers: [],
  guardians: [],
  students: [],
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
