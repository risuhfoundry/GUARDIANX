import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AdminPageHeading, DataSourceNotice } from '../components/AdminPage';
import { Button, Card, CardHeading, DataTable, EmptyState, Toast } from '../components/ui';
import type { AdminClass } from '../data/adminData';
import { ClassDetailDialog, ClassEditorDialog } from '../features/admin/ClassDialogs';
import { useAdminData } from '../features/admin/AdminDataContext';

export default function ClassesPage() {
  const { state, readOnly } = useAdminData();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<AdminClass | undefined>();
  const [viewingClass, setViewingClass] = useState<AdminClass | null>(null);
  const [toast, setToast] = useState('');

  function openAdd() { setEditingClass(undefined); setEditorOpen(true); }
  function openEdit(schoolClass: AdminClass) { setViewingClass(null); setEditingClass(schoolClass); setEditorOpen(true); }

  return (
    <div className="admin-page">
      <AdminPageHeading eyebrow="DIRECTORY" title="Classes" description="View class membership and the teacher assigned to each class." actions={<Button variant="primary" disabled={readOnly} title={readOnly ? 'Editing is disabled until accounts are added' : undefined} onClick={openAdd}><Plus size={15} aria-hidden="true" />Add class</Button>} />
      <DataSourceNotice />
      <Card className="admin-card">
        <CardHeading title="Class records" description={`${state.classes.length} classes`} />
        {state.classes.length ? <DataTable label="Class records" className="admin-table--classes">
          <thead><tr><th scope="col">Class name</th><th scope="col">Student count</th><th scope="col">Assigned teacher</th><th scope="col">Students</th><th scope="col">Action</th></tr></thead>
          <tbody>{[...state.classes].sort((a, b) => a.name.localeCompare(b.name)).map((schoolClass) => {
            const students = state.students.filter((student) => student.classId === schoolClass.id);
            const teacher = state.teachers.find((item) => item.id === schoolClass.teacherId);
            return <tr key={schoolClass.id}>
              <td><span className="table-primary">{schoolClass.name}</span></td>
              <td>{students.length}</td>
              <td>{teacher?.name ?? <span className="muted-copy">—</span>}</td>
              <td>{students.length ? <span className="student-name-list">{students.map((student) => student.name).join(', ')}</span> : <span className="muted-copy">No students</span>}</td>
              <td><div className="row-actions"><Button variant="ghost" size="sm" onClick={() => setViewingClass(schoolClass)}>View</Button><Button variant="ghost" size="sm" disabled={readOnly} title={readOnly ? 'Editing is disabled until accounts are added' : undefined} onClick={() => openEdit(schoolClass)}>Edit</Button></div></td>
            </tr>;
          })}</tbody>
        </DataTable> : <EmptyState title="No classes yet" description="Add a class to organize student records." />}
      </Card>
      <ClassEditorDialog open={editorOpen} schoolClass={editingClass} onClose={() => setEditorOpen(false)} onSaved={setToast} />
      <ClassDetailDialog schoolClass={viewingClass} onClose={() => setViewingClass(null)} onEdit={openEdit} />
      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast('')} />}
    </div>
  );
}
