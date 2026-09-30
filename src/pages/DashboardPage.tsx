import { useState } from 'react';
import { ArrowUpRight, Check, ClipboardList, Clock3, Users } from 'lucide-react';
import { Button, Card, CardHeading, DataTable, EmptyState, StatusIndicator } from '../components/ui';
import { AdminPageHeading, DemoDataNotice } from '../components/AdminPage';
import { formatTime, localDateKey, type DismissalRequest } from '../data/adminData';
import { RequestDetailDialog } from '../features/admin/RequestDetailDialog';
import { useAdminData } from '../features/admin/AdminDataContext';

const metrics = [
  { key: 'today', label: "Today's dismissal requests", icon: ClipboardList },
  { key: 'pending', label: 'Pending dismissal requests', icon: Clock3 },
  { key: 'approved', label: 'Approved dismissal requests', icon: Check },
  { key: 'completed', label: 'Completed dismissal requests', icon: Users },
] as const;

type MetricKey = (typeof metrics)[number]['key'];

export default function DashboardPage() {
  const { state } = useAdminData();
  const [selectedRequest, setSelectedRequest] = useState<DismissalRequest | null>(null);
  const todayKey = localDateKey(new Date());
  const countByKey: Record<MetricKey, number> = {
    today: state.dismissalRequests.filter((request) => localDateKey(request.requestedAt) === todayKey).length,
    pending: state.dismissalRequests.filter((request) => request.status === 'Pending').length,
    approved: state.dismissalRequests.filter((request) => request.status === 'Approved').length,
    completed: state.dismissalRequests.filter((request) => request.status === 'Completed').length,
  };
  const recentRequests = [...state.dismissalRequests].sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt)).slice(0, 5);

  return (
    <div className="admin-page">
      <AdminPageHeading eyebrow="OPERATIONS" title="Dismissal overview" description="A focused view of dismissal activity in this local session." />
      <DemoDataNotice />
      <section className="metric-grid" aria-label="Dismissal request summary">
        {metrics.map(({ key, label, icon: Icon }) => (
          <Card className="metric-card" key={key}>
            <span className="metric-card__icon"><Icon size={16} aria-hidden="true" /></span>
            <span className="metric-card__label">{label}</span>
            <strong className="metric-card__value">{countByKey[key]}</strong>
          </Card>
        ))}
      </section>

      <Card className="admin-card">
        <CardHeading title="Recent dismissal requests" description="Student, class, guardian, status, and time." />
        {recentRequests.length ? (
          <DataTable label="Recent dismissal requests" className="admin-table--recent">
            <thead><tr><th scope="col">Student</th><th scope="col">Class</th><th scope="col">Guardian</th><th scope="col">Status</th><th scope="col">Time</th></tr></thead>
            <tbody>
              {recentRequests.map((request) => {
                const student = state.students.find((item) => item.id === request.studentId);
                const guardian = state.guardians.find((item) => item.id === request.guardianId);
                const schoolClass = state.classes.find((item) => item.id === student?.classId);
                return (
                  <tr key={request.id}>
                    <td><Button variant="ghost" size="sm" className="table-link" aria-label={`View dismissal request for ${student?.name ?? 'student'} at ${formatTime(request.requestedAt)}`} onClick={() => setSelectedRequest(request)}>{student?.name ?? '—'}<ArrowUpRight size={12} aria-hidden="true" /></Button></td>
                    <td>{schoolClass?.name ?? '—'}</td>
                    <td>{guardian?.name ?? '—'}</td>
                    <td><StatusIndicator label={request.status} tone={request.status === 'Pending' ? 'pending' : 'success'} /></td>
                    <td>{formatTime(request.requestedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : <EmptyState title="No dismissal requests" description="No dismissal requests have been recorded yet." />}
      </Card>
      <RequestDetailDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </div>
  );
}
