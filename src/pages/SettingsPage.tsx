import { FileText } from 'lucide-react';
import { AdminPageHeading, DemoDataNotice } from '../components/AdminPage';
import { Card, EmptyState } from '../components/ui';

export default function SettingsPage() {
  return (
    <div className="admin-page">
      <AdminPageHeading eyebrow="WORKSPACE" title="Settings" description="The Settings destination is included in Admin navigation as requested." />
      <DemoDataNotice />
      <Card className="placeholder-card">
        <EmptyState title="No settings controls in scope" description="The brief does not specify Admin settings functionality, so no settings workflow has been added." icon={FileText} />
      </Card>
    </div>
  );
}
