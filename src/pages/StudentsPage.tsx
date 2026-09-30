import { useMemo, useState } from 'react';
import { FileUp, Plus } from 'lucide-react';
import { AdminPageHeading, DemoDataNotice } from '../components/AdminPage';
import { Button, Card, CardHeading, DataTable, EmptyState, SearchInput, SelectField, StatusIndicator, Toast } from '../components/ui';
import type { AdminStudent } from '../data/adminData';
import { useAdminData } from '../features/admin/AdminDataContext';
import { ExcelImportDialog } from '../features/students/ExcelImportDialog';
import { StudentDetailDialog, StudentEditorDialog } from '../features/students/StudentDialogs';

export default function StudentsPage() {
  const { state } = useAdminData();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AdminStudent | undefined>();
  const [viewingStudent, setViewingStudent] = useState<AdminStudent | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState('');

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return state.students.filter((student) => {
      if (classFilter !== 'all' && student.classId !== classFilter) return false;
      if (!normalizedQuery) return true;
      const guardianNames = student.guardianIds.map((id) => state.guardians.find((guardian) => guardian.id === id)?.name ?? '').join(' ');
      return `${student.name} ${student.admissionNumber} ${guardianNames}`.toLocaleLowerCase().includes(normalizedQuery);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.students, state.guardians, query, classFilter]);

  function openAdd() {
    setEditingStudent(undefined);
    setEditorOpen(true);
  }
  function openEdit(student: AdminStudent) {
    setViewingStudent(null);
    setEditingStudent(student);
    setEditorOpen(true);
  }

  return (
    <div className="admin-page">
      <AdminPageHeading eyebrow="DIRECTORY" title="Students" description="Find students by name, admission number, or class. View linked guardians and their palm registration state." actions={<><Button variant="secondary" onClick={() => setImportOpen(true)}><FileUp size={15} aria-hidden="true" />Import Excel</Button><Button variant="primary" onClick={openAdd}><Plus size={15} aria-hidden="true" />Add student</Button></>} />
      <DemoDataNotice />
      <Card className="admin-card">
        <CardHeading title="Student records" description={`${filteredStudents.length} of ${state.students.length} students`} />
        <div className="table-toolbar">
          <SearchInput label="Search students" value={query} onChange={(event) => setQuery(event.target.value)} />
          <SelectField label="Filter by class" aria-label="Filter by class" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            <option value="all">All classes</option>
            {state.classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </SelectField>
        </div>
        {filteredStudents.length ? (
          <DataTable label="Student records" className="admin-table--students">
            <thead><tr><th scope="col">Student</th><th scope="col">Admission number</th><th scope="col">Class</th><th scope="col">Linked guardian(s) · palm</th><th scope="col">Action</th></tr></thead>
            <tbody>{filteredStudents.map((student) => {
              const schoolClass = state.classes.find((item) => item.id === student.classId);
              const guardians = student.guardianIds.map((id) => state.guardians.find((guardian) => guardian.id === id)).filter((guardian) => guardian !== undefined);
              return (
                <tr key={student.id}>
                  <td><span className="table-primary">{student.name}</span></td>
                  <td>{student.admissionNumber}</td>
                  <td>{schoolClass?.name ?? '—'}</td>
                  <td>{guardians.length ? <div className="guardian-table-list">{guardians.map((guardian) => <span className="guardian-table-line" key={guardian.id}><span>{guardian.name}</span><StatusIndicator label={guardian.palmStatus} tone={guardian.palmStatus === 'Registered' ? 'success' : 'pending'} /></span>)}</div> : <span className="muted-copy">No linked guardians · palm —</span>}</td>
                  <td><div className="row-actions"><Button variant="ghost" size="sm" onClick={() => setViewingStudent(student)}>View</Button><Button variant="ghost" size="sm" onClick={() => openEdit(student)}>Edit</Button></div></td>
                </tr>
              );
            })}</tbody>
          </DataTable>
        ) : <EmptyState title="No students found" description={query || classFilter !== 'all' ? 'Try a different name or class filter.' : 'Add a student or import an Excel workbook to begin.'} />}
      </Card>
      <StudentEditorDialog editorOpen={editorOpen} student={editingStudent} onCloseEditor={() => setEditorOpen(false)} onSaved={setToast} />
      <StudentDetailDialog student={viewingStudent} onClose={() => setViewingStudent(null)} onEdit={openEdit} />
      <ExcelImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={(count) => setToast(`${count} student${count === 1 ? '' : 's'} added to this session.`)} />
      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast('')} />}
    </div>
  );
}
