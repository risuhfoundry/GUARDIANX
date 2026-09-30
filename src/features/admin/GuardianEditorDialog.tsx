import { useEffect, useState, type FormEvent } from 'react';
import { Button, Dialog, Input, StatusIndicator } from '../../components/ui';
import { createId, type AdminGuardian } from '../../data/adminData';
import { useAdminData } from './AdminDataContext';

export function GuardianEditorDialog({ open, guardian, onClose, onSaved }: { open: boolean; guardian?: AdminGuardian; onClose: () => void; onSaved: (message: string) => void }) {
  const { state, dispatch } = useAdminData();
  const [name, setName] = useState('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(guardian?.name ?? '');
    setStudentIds(guardian ? state.students.filter((student) => student.guardianIds.includes(guardian.id)).map((student) => student.id) : []);
    setError('');
  }, [open, guardian?.id, state.students]);

  function toggleStudent(id: string) {
    setStudentIds((current) => current.includes(id) ? current.filter((studentId) => studentId !== id) : [...current, id]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return setError('Guardian name is required.');
    const duplicate = state.guardians.some((item) => item.id !== guardian?.id && item.name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase());
    if (duplicate) return setError('A guardian with this name already exists.');
    const item: AdminGuardian = {
      id: guardian?.id ?? createId('guardian'),
      name: cleanName,
      palmStatus: guardian?.palmStatus ?? 'Not registered',
    };
    dispatch({ type: 'save-guardian', item, studentIds });
    onSaved(guardian ? 'Guardian and ward links updated in this session.' : 'Guardian added to this session.');
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={guardian ? 'Edit guardian' : 'Add guardian'} description="Connect this guardian to their ward. Each student can have up to two guardians." className="dialog--form">
      <form className="admin-form" onSubmit={submit}>
        <Input label="Guardian name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
        <fieldset className="choice-group">
          <legend>Linked student(s)</legend>
          <p className="field__hint">Students already linked to two other guardians cannot be selected.</p>
          {state.students.length ? (
            <div className="choice-list">
              {state.students.map((student) => {
                const selected = studentIds.includes(student.id);
                const otherGuardians = student.guardianIds.filter((id) => id !== guardian?.id);
                const limitReached = otherGuardians.length >= 2;
                const schoolClass = state.classes.find((item) => item.id === student.classId);
                return (
                  <label className={`choice-option${limitReached && !selected ? ' choice-option--disabled' : ''}`} key={student.id}>
                    <input type="checkbox" checked={selected} disabled={limitReached && !selected} onChange={() => toggleStudent(student.id)} />
                    <span className="choice-option__copy"><strong>{student.name}</strong><small>{schoolClass?.name ?? '—'} · {student.guardianIds.length}/2 guardians</small></span>
                  </label>
                );
              })}
            </div>
          ) : <p className="muted-copy">Add a student before connecting a ward.</p>}
        </fieldset>
        {guardian && <div className="palm-readonly"><span>Palm registration</span><StatusIndicator label={guardian.palmStatus} tone={guardian.palmStatus === 'Registered' ? 'success' : 'pending'} /></div>}
        {!guardian && <p className="field__hint">A new guardian starts as Not registered. Palm state is display-only in this screen.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog__actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{guardian ? 'Save guardian' : 'Add guardian'}</Button></div>
      </form>
    </Dialog>
  );
}
