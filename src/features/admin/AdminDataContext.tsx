import { createContext, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import { emptyAdminData, type AdminClass, type AdminDataState, type AdminGuardian, type AdminStudent } from '../../data/adminData';
import { loadAdminData } from './adminDataService';

export type AdminDataAction =
  | { type: 'hydrate'; state: AdminDataState }
  | { type: 'save-class'; item: AdminClass }
  | { type: 'save-student'; item: AdminStudent }
  | { type: 'save-guardian'; item: AdminGuardian; studentIds: string[] }
  | { type: 'import-students'; items: AdminStudent[] };

// The database is the source of truth. The save-* and import-* actions are
// retained so the shape of the context is unchanged, but they no longer apply:
// every table is RLS-locked against anon writes until an auth model exists to
// key write policies on. Guarding here means a disabled button is not the only
// thing standing between the UI and a rejected mutation.
export function adminDataReducer(state: AdminDataState, action: AdminDataAction): AdminDataState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'save-class':
    case 'save-student':
    case 'save-guardian':
    case 'import-students':
      return state;
  }
}

export type DataStatus = 'loading' | 'ready' | 'error';

interface AdminDataContextValue {
  state: AdminDataState;
  dispatch: Dispatch<AdminDataAction>;
  status: DataStatus;
  error: string | null;
  /** False while the database is read-only, so write controls can be disabled. */
  readOnly: boolean;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(adminDataReducer, emptyAdminData);
  const [status, setStatus] = useState<DataStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadAdminData()
      .then((loaded) => {
        if (!active) return;
        dispatch({ type: 'hydrate', state: loaded });
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Failed to load records from the database.');
        setStatus('error');
      });
    return () => { active = false; };
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, status, error, readOnly: true }),
    [state, status, error],
  );
  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminDataContextValue {
  const value = useContext(AdminDataContext);
  if (!value) throw new Error('useAdminData must be used within AdminDataProvider.');
  return value;
}
