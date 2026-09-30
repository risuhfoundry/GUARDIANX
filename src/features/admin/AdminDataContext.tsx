import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { initialAdminData, type AdminClass, type AdminDataState, type AdminGuardian, type AdminStudent } from '../../data/adminData';

export type AdminDataAction =
  | { type: 'save-class'; item: AdminClass }
  | { type: 'save-student'; item: AdminStudent }
  | { type: 'save-guardian'; item: AdminGuardian; studentIds: string[] }
  | { type: 'import-students'; items: AdminStudent[] };

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((entry) => entry.id === item.id)
    ? list.map((entry) => entry.id === item.id ? item : entry)
    : [...list, item];
}

export function adminDataReducer(state: AdminDataState, action: AdminDataAction): AdminDataState {
  switch (action.type) {
    case 'save-class':
      return { ...state, classes: upsert(state.classes, action.item) };
    case 'save-student': {
      const item = { ...action.item, guardianIds: [...new Set(action.item.guardianIds)].slice(0, 2) };
      return { ...state, students: upsert(state.students, item) };
    }
    case 'save-guardian': {
      const studentIds = new Set(action.studentIds);
      const students = state.students.map((student) => {
        const wasLinked = student.guardianIds.includes(action.item.id);
        const linkedWithoutThisGuardian = student.guardianIds.filter((id) => id !== action.item.id);
        if (!studentIds.has(student.id)) return wasLinked ? { ...student, guardianIds: linkedWithoutThisGuardian } : student;
        if (wasLinked) return student;
        if (linkedWithoutThisGuardian.length >= 2) return student;
        return { ...student, guardianIds: [...linkedWithoutThisGuardian, action.item.id] };
      });
      return { ...state, guardians: upsert(state.guardians, action.item), students };
    }
    case 'import-students': {
      const knownAdmissions = new Set(state.students.map((student) => student.admissionNumber.toLocaleLowerCase()));
      const additions = action.items
        .filter((item) => !knownAdmissions.has(item.admissionNumber.toLocaleLowerCase()))
        .map((item) => ({ ...item, guardianIds: [] }));
      return { ...state, students: [...state.students, ...additions] };
    }
  }
}

interface AdminDataContextValue {
  state: AdminDataState;
  dispatch: Dispatch<AdminDataAction>;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(adminDataReducer, initialAdminData);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminDataContextValue {
  const value = useContext(AdminDataContext);
  if (!value) throw new Error('useAdminData must be used within AdminDataProvider.');
  return value;
}
