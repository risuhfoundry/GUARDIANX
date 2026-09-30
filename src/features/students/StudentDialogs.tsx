import { useEffect, useState, type FormEvent } from 'react';
import { Button, Dialog, Input, SelectField, StatusIndicator } from '../../components/ui';
import { createId, type AdminStudent } from '../../data/adminData';
import { useAdminData } from '../admin/AdminDataContext';

interface StudentDialogsProps {
  editorOpen: boolean;
  student?: AdminStudent;
  onCloseEditor: () => void;
  onSaved: (message: string) => void;
}

export function StudentEditorDialog({ editorOpen, student, onCloseEditor, onSaved }: StudentDialogsProps) {
  const { state, dispatch } = useAdminData();
  const [name, setName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [classId, setClassId] = useState('');
  const [guardianIds, setGuardianIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editorOpen) return;
    setName(student?.name ?? '');
    setAdmissionNumber(student?.admissionNumber ?? '');
    setClassId(student?.classId ?? state.classes[0]?.id ?? '');
    setGuardianIds(student?.guardianIds ?? []);
    setError('');
  }, [editorOpen, student?.id, state.classes]);

  function toggleGuardian(id: string) {
    setGuardianIds((current) => {
      if (current.includes(id)) return current.filter((guardianId) => guardianId !== id);
      if (current.length >= 2) return current;
      return [...current, id];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAdmission = admissionNumber.trim().toLocaleLowerCase();
    if (!name.trim() || !admissionNumber.trim() || !classId) {
      setError('Student name, admission number, and class are required.');
      return;
    }
    if (guardianIds.length > 2) {
      setError('A student can have no more than two guardians.');
      return;
    }
    const duplicate = state.students.some((item) => item.id !== student?.id && item.admissionNumber.trim().toLocaleLowerCase() === normalizedAdmission);
    if (duplicate) {
      setError('That admission number is already in use.');
      return;
    }
    dispatch({
      type: 'save-student',
      item: {
        id: student?.id ?? createId('student'),
        name: name.trim(),
        admissionNumber: admissionNumber.trim(),
        classId,
        guardianIds: guardianIds.slice(0, 2),
      },
    });
    onSaved(student ? 'Student updated in this session.' : 'Student added to this session.');
    onCloseEditor();
  }

  const sortedGuardians = [...state.guardians].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog
      open={editorOpen}
      onClose={onCloseEditor}
      title={student ? 'Edit student' : 'Add student'}
      description="Changes stay in this frontend session; no school backend is connected."
      className="dialog--form"
    >
      <form className="admin-form" onSubmit={handleSubmit}>
        <Input label="Student name" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="Admission number" autoComplete="off" value={admissionNumber} onChange={(event) => setAdmissionNumber(event.target.value)} />
        <SelectField label="Class" value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="" disabled>Select a class</option>
          {state.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </SelectField>

        <fieldset className="choice-group">
          <legend>Linked guardians <span>(maximum 2)</span></legend>
          <p className="field__hint">Select up to two guardians for this student. Palm status is shown, not edited here.</p>
          {sortedGuardians.length === 0 ? <p className="muted-copy">No guardians are listed yet.</p> : (
            <div className="choice-list">
              {sortedGuardians.map((guardian) => {
                const checked = guardianIds.includes(guardian.id);
                return (
                  <label className="choice-option" key={guardian.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && guardianIds.length >= 2}
                      onChange={() => toggleGuardian(guardian.id)}
                    />
                    <span className="choice-option__copy"><strong>{guardian.name}</strong><StatusIndicator label={guardian.palmStatus} tone={guardian.palmStatus === 'Registered' ? 'success' : 'pending'} /></span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog__actions">
          <Button variant="secondary" onClick={onCloseEditor}>Cancel</Button>
          <Button variant="primary" type="submit">{student ? 'Save student' : 'Add student'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function StudentDetailDialog({ student, onClose, onEdit }: { student: AdminStudent | null; onClose: () => void; onEdit: (student: AdminStudent) => void }) {
  const { state, readOnly } = useAdminData();
  if (!student) return null;
  const schoolClass = state.classes.find((item) => item.id === student.classId);
  const guardians = student.guardianIds.map((id) => state.guardians.find((item) => item.id === id)).filter((item) => item !== undefined);

  return (
    <Dialog open={Boolean(student)} onClose={onClose} title={student.name} description="Student details" className="dialog--detail">
      <dl className="detail-list">
        <div className="detail-row"><dt>Student name</dt><dd>{student.name}</dd></div>
        <div className="detail-row"><dt>Admission number</dt><dd>{student.admissionNumber}</dd></div>
        <div className="detail-row"><dt>Class</dt><dd>{schoolClass?.name ?? '—'}</dd></div>
        <div className="detail-row detail-row--stacked">
          <dt>Linked guardian(s) & palm registration</dt>
          <dd>{guardians.length ? <div className="detail-palm-list">{guardians.map((guardian) => <span key={guardian.id}><strong>{guardian.name}</strong><StatusIndicator label={guardian.palmStatus} tone={guardian.palmStatus === 'Registered' ? 'success' : 'pending'} /></span>)}</div> : 'No linked guardians'}</dd>
        </div>
      </dl>
      <div className="dialog__actions"><Button variant="secondary" onClick={onClose}>Close</Button><Button variant="primary" disabled={readOnly} title={readOnly ? 'Editing is disabled until accounts are added' : undefined} onClick={() => onEdit(student)}>Edit student</Button></div>
    </Dialog>
  );
}
