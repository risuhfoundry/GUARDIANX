import type { ReactNode } from 'react';

export function AdminPageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="admin-page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>
      {actions && <div className="admin-page-heading__actions">{actions}</div>}
    </div>
  );
}

export function DataSourceNotice() {
  return <aside className="demo-notice" role="note"><span className="status-dot" aria-hidden="true" />Records are read live from the Supabase database. Editing is disabled until accounts are added.</aside>;
}
