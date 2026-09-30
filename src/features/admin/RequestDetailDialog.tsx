import { Dialog, StatusIndicator } from '../../components/ui';
import { formatTime, formatTimestamp, type DismissalRequest } from '../../data/adminData';
import { useAdminData } from './AdminDataContext';

export function RequestDetailDialog({ request, onClose }: { request: DismissalRequest | null; onClose: () => void }) {
  const { state } = useAdminData();
  if (!request) return null;

  const student = state.students.find((item) => item.id === request.studentId);
  const guardian = state.guardians.find((item) => item.id === request.guardianId);
  const schoolClass = state.classes.find((item) => item.id === student?.classId);
  const teacher = state.teachers.find((item) => item.id === request.teacherId);
  const teacherDecision = request.status === 'Pending' ? 'Pending' : 'Approved';

  return (
    <Dialog open={Boolean(request)} onClose={onClose} title="Dismissal request" description="Request detail · not connected to a live backend." className="dialog--detail">
      <dl className="detail-list">
        <div className="detail-row"><dt>Student</dt><dd>{student?.name ?? '—'}</dd></div>
        <div className="detail-row"><dt>Class</dt><dd>{schoolClass?.name ?? '—'}</dd></div>
        <div className="detail-row"><dt>Guardian</dt><dd>{guardian?.name ?? '—'}</dd></div>
        <div className="detail-row"><dt>Request information</dt><dd>Dismissal requested for {formatTime(request.requestedAt)}</dd></div>
        <div className="detail-row"><dt>Teacher decision</dt><dd>{teacher ? `${teacher.name} · ${teacherDecision}` : teacherDecision}</dd></div>
        <div className="detail-row"><dt>Current status</dt><dd><StatusIndicator label={request.status} tone={request.status === 'Pending' ? 'pending' : 'success'} /></dd></div>
        <div className="detail-row"><dt>Timestamp</dt><dd>{formatTimestamp(request.requestedAt)}</dd></div>
      </dl>
    </Dialog>
  );
}
