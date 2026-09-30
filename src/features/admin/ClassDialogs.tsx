import { useEffect, useState, type FormEvent } from 'react';
import { Button, Dialog, Input, SelectField } from '../../components/ui';
import { createId, type AdminClass } from '../../data/adminData';
import { useAdminData } from './AdminDataContext';

export function ClassEditorDialog({ open, schoolClass, onClose, onSaved }: { open: boolean; schoolClass?: AdminClass; onClose: () => void; onSaved: (message: string) => void }) {
  const { state, dispatch } = useAdminData();
  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(schoolClass?.name ?? '');
    setTeacherId(schoolClass?.teacherId ?? '');
    setError('');
  }, [open, schoolClass?.id]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return setError('Class name is required.');
    const duplicate = state.classes.some((item) => item.id !== schoolClass?.id && item.name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase());
    if (duplicate) return setError('A class with this name already exists.');
    dispatch({ type: 'save-class', item: { id: schoolClass?.id ?? createId('class'), name: cleanName, ...(teacherId ? { teacherId } : {}) } });
    onSaved(schoolClass ? 'Class updated in this session.' : 'Class added to this session.');
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={schoolClass ? 'Edit class' : 'Add class'} description="Changes stay in this frontend session only." className="dialog--form">
      <form className="admin-form" onSubmit={submit}>
        <Input label="Class name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
        <SelectField label="Assigned teacher (optional)" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
          <option value="">No teacher assigned</option>
          {state.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </SelectField>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog__actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{schoolClass ? 'Save class' : 'Add class'}</Button></div>
      </form>
    </Dialog>
  );
}

export function ClassDetailDialog({ schoolClass, onClose, onEdit }: { schoolClass: AdminClass | null; onClose: () => void; onEdit: (schoolClass: AdminClass) => void }) {
  const { state, readOnly } = useAdminData();
  if (!schoolClass) return null;
  const teacher = state.teachers.find((item) => item.id === schoolClass.teacherId);
  const students = state.students.filter((student) => student.classId === schoolClass.id);

  return (
    <Dialog open={Boolean(schoolClass)} onClose={onClose} title={schoolClass.name} description="Class details" className="dialog--detail">
      <dl className="detail-list">
        <div className="detail-row"><dt>Class name</dt><dd>{schoolClass.name}</dd></div>
        <div className="detail-row"><dt>Student count</dt><dd>{students.length}</dd></div>
        <div className="detail-row"><dt>Assigned teacher</dt><dd>{teacher?.name ?? '—'}</dd></div>
      </dl>
      <div className="detail-section">
        <h3>Students</h3>
        {students.length ? <ul className="simple-record-list">{students.map((student) => <li key={student.id}><span>{student.name}</span><small>{student.admissionNumber}</small></li>)}</ul> : <p className="muted-copy">No students in this class.</p>}
      </div>
      <div className="dialog__actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button variant="primary" disabled={readOnly} title={readOnly ? 'Editing is disabled until accounts are added' : undefined} onClick={() => onEdit(schoolClass)}>Edit class</Button></div>
    </Dialog>
  );
}
