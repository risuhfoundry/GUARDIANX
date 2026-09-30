import { AdminPageHeading, DemoDataNotice } from '../components/AdminPage';
import { Card, CardHeading, DataTable, EmptyState, StatusIndicator } from '../components/ui';
import { useAdminData } from '../features/admin/AdminDataContext';

export default function TeachersPage() {
  const { state } = useAdminData();
  return (
    <div className="admin-page">
      <AdminPageHeading eyebrow="DIRECTORY" title="Teachers" description="See teacher names and class assignments only; no HR details are included." />
      <DemoDataNotice />
      <Card className="admin-card">
        <CardHeading title="Teacher assignments" description={`${state.teachers.length} teachers`} />
        {state.teachers.length ? <DataTable label="Teacher assignments" className="admin-table--teachers">
          <thead><tr><th scope="col">Teacher</th><th scope="col">Assigned class/classes</th><th scope="col">Status</th></tr></thead>
          <tbody>{[...state.teachers].sort((a, b) => a.name.localeCompare(b.name)).map((teacher) => {
            const classes = state.classes.filter((schoolClass) => schoolClass.teacherId === teacher.id);
            return <tr key={teacher.id}>
              <td><span className="table-primary">{teacher.name}</span></td>
              <td>{classes.length ? classes.map((schoolClass) => schoolClass.name).join(', ') : <span className="muted-copy">—</span>}</td>
              <td><StatusIndicator label={classes.length ? 'Assigned' : 'Unassigned'} tone={classes.length ? 'success' : 'neutral'} /></td>
            </tr>;
          })}</tbody>
        </DataTable> : <EmptyState title="No teachers listed" description="Teacher assignments will appear here when teacher records are available." />}
      </Card>
    </div>
  );
}
