import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AdminPageHeading, DemoDataNotice } from '../components/AdminPage';
import { Button, Card, CardHeading, DataTable, Dialog, EmptyState, SearchInput, StatusIndicator, Toast } from '../components/ui';
import type { AdminGuardian } from '../data/adminData';
import { GuardianEditorDialog } from '../features/admin/GuardianEditorDialog';
import { useAdminData } from '../features/admin/AdminDataContext';

function GuardianDetailDialog({ guardian, onClose, onEdit }: { guardian: AdminGuardian | null; onClose: () => void; onEdit: (guardian: AdminGuardian) => void }) {
  const { state } = useAdminData();
  if (!guardian) return null;
  const students = state.students.filter((student) => student.guardianIds.includes(guardian.id));
  return (
    <Dialog open={Boolean(guardian)} onClose={onClose} title={guardian.name} description="Guardian details" className="dialog--detail">
      <dl className="detail-list">
        <div className="detail-row"><dt>Guardian name</dt><dd>{guardian.name}</dd></div>
        <div className="detail-row detail-row--stacked"><dt>Linked student(s) and class</dt><dd>{students.length ? <ul className="relationship-list">{students.map((student) => <li key={student.id}><strong>{student.name}</strong><span>{state.classes.find((item) => item.id === student.classId)?.name ?? '—'}</span></li>)}</ul> : 'No linked students'}</dd></div>
        <div className="detail-row"><dt>Palm registration status</dt><dd><StatusIndicator label={guardian.palmStatus} tone={guardian.palmStatus === 'Registered' ? 'success' : 'pending'} /></dd></div>
      </dl>
      <div className="dialog__actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button variant="primary" onClick={() => onEdit(guardian)}>Edit guardian</Button></div>
    </Dialog>
  );
}

export default function GuardiansPage() {
  const { state } = useAdminData();
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<AdminGuardian | undefined>();
  const [viewingGuardian, setViewingGuardian] = useState<AdminGuardian | null>(null);
  const [toast, setToast] = useState('');

  const guardians = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return [...state.guardians].filter((guardian) => {
      if (!search) return true;
      const wardNames = state.students.filter((student) => student.guardianIds.includes(guardian.id)).map((student) => student.name).join(' ');
      return `${guardian.name} ${wardNames}`.toLocaleLowerCase().includes(search);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.guardians, state.students, query]);

  function openAdd() { setEditingGuardian(undefined); setEditorOpen(true); }
  function openEdit(guardian: AdminGuardian) { setViewingGuardian(null); setEditingGuardian(guardian); setEditorOpen(true); }

  return (
    <div className="admin-page">
      <AdminPageHeading eyebrow="DIRECTORY" title="Guardians" description="Find guardians, see their linked wards and classes, and view palm registration state." actions={<Button variant="primary" onClick={openAdd}><Plus size={15} aria-hidden="true" />Add guardian</Button>} />
      <DemoDataNotice />
      <Card className="admin-card">
        <CardHeading title="Guardian records" description={`${guardians.length} of ${state.guardians.length} guardians`} />
        <div className="table-toolbar"><SearchInput label="Search guardians" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        {guardians.length ? <DataTable label="Guardian records" className="admin-table--guardians">
          <thead><tr><th scope="col">Guardian</th><th scope="col">Linked student(s) · class</th><th scope="col">Palm registration status</th><th scope="col">Action</th></tr></thead>
          <tbody>{guardians.map((guardian) => {
            const students = state.students.filter((student) => student.guardianIds.includes(guardian.id));
            return <tr key={guardian.id}>
              <td><span className="table-primary">{guardian.name}</span></td>
              <td>{students.length ? <div className="relationship-table-list">{students.map((student) => <span key={student.id}><strong>{student.name}</strong><small>{state.classes.find((item) => item.id === student.classId)?.name ?? '—'}</small></span>)}</div> : <span className="muted-copy">No linked students</span>}</td>
              <td><StatusIndicator label={guardian.palmStatus} tone={guardian.palmStatus === 'Registered' ? 'success' : 'pending'} /></td>
              <td><div className="row-actions"><Button variant="ghost" size="sm" onClick={() => setViewingGuardian(guardian)}>View</Button><Button variant="ghost" size="sm" onClick={() => openEdit(guardian)}>Edit</Button></div></td>
            </tr>;
          })}</tbody>
        </DataTable> : <EmptyState title="No guardians found" description={query ? 'Try another guardian or student name.' : 'Add a guardian to connect them to a student.'} />}
      </Card>
      <GuardianEditorDialog open={editorOpen} guardian={editingGuardian} onClose={() => setEditorOpen(false)} onSaved={setToast} />
      <GuardianDetailDialog guardian={viewingGuardian} onClose={() => setViewingGuardian(null)} onEdit={openEdit} />
      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast('')} />}
    </div>
  );
}
