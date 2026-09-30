import { useState } from 'react';
import { AdminPageHeading, DemoDataNotice } from '../components/AdminPage';
import { Button, Card, CardHeading, DataTable, EmptyState, StatusIndicator } from '../components/ui';
import { formatTimestamp, type DismissalRequest } from '../data/adminData';
import { RequestDetailDialog } from '../features/admin/RequestDetailDialog';
import { useAdminData } from '../features/admin/AdminDataContext';

export default function DismissalRequestsPage() {
  const { state } = useAdminData();
  const [selectedRequest, setSelectedRequest] = useState<DismissalRequest | null>(null);
  const requests = [...state.dismissalRequests].sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));

  return (
    <div className="admin-page">
      <AdminPageHeading eyebrow="OPERATIONS" title="Dismissal requests" description="See all requests. Open a request to review its student, guardian, teacher decision, status, and timestamp." />
      <DemoDataNotice />
      <Card className="admin-card">
        <CardHeading title="All dismissal requests" description={`${requests.length} requests`} />
        {requests.length ? <DataTable label="All dismissal requests" className="admin-table--requests">
          <thead><tr><th scope="col">Student</th><th scope="col">Class</th><th scope="col">Guardian</th><th scope="col">Requested time</th><th scope="col">Teacher</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
          <tbody>{requests.map((request) => {
            const student = state.students.find((item) => item.id === request.studentId);
            const guardian = state.guardians.find((item) => item.id === request.guardianId);
            const schoolClass = state.classes.find((item) => item.id === student?.classId);
            const teacher = state.teachers.find((item) => item.id === request.teacherId);
            return <tr key={request.id}>
              <td><span className="table-primary">{student?.name ?? '—'}</span></td>
              <td>{schoolClass?.name ?? '—'}</td>
              <td>{guardian?.name ?? '—'}</td>
              <td>{formatTimestamp(request.requestedAt)}</td>
              <td>{teacher?.name ?? '—'}</td>
              <td><StatusIndicator label={request.status} tone={request.status === 'Pending' ? 'pending' : 'success'} /></td>
              <td><Button variant="ghost" size="sm" onClick={() => setSelectedRequest(request)}>View</Button></td>
            </tr>;
          })}</tbody>
        </DataTable> : <EmptyState title="No dismissal requests" description="No dismissal requests have been recorded yet." />}
      </Card>
      <RequestDetailDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </div>
  );
}
