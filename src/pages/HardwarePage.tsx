import { useEffect, useMemo, useState } from 'react';
import { Copy, EyeOff, RefreshCcw } from 'lucide-react';
import { AdminPageHeading, DataSourceNotice } from '../components/AdminPage';
import { Button, Card, CardHeading, DataTable, Dialog, EmptyState, SearchInput, StatusIndicator, Toast } from '../components/ui';
import { useAdminData } from '../features/admin/AdminDataContext';

type ApiKey = {
  id: string;
  device_name: string;
  key_prefix: string;
  status: 'active' | 'revoked';
  created_at: string;
  last_used_at: string | null;
  created_by: string | null;
};

type ApiKeyResponse = {
  keys: ApiKey[];
};

const ENDPOINT = '/functions/v1/hardware-api-keys';
const DISMISSAL_ENDPOINT = '/functions/v1/hardware-dismissal';

async function adminFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const session = await getSession();
  if (!session) throw new Error('No Supabase session.');

  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `Request failed with ${res.status}.`;
    try {
      const body = JSON.parse(text);
      if (body.error) message = body.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

async function getSession() {
  const { supabase } = await import('../lib/supabase');
  if (!supabase) throw new Error('Supabase client is not configured.');
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export default function HardwarePage() {
  const { state: _adminState } = useAdminData();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [createError, setCreateError] = useState('');
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
  const [revealSecret, setRevealSecret] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);

  async function loadKeys() {
    setStatus('loading');
    setError(null);
    try {
      const data = await adminFetch<ApiKeyResponse>(ENDPOINT);
      setKeys(data.keys ?? []);
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Could not load API keys.');
    }
  }

  useEffect(() => {
    void loadKeys();
  }, []);

  const filteredKeys = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return keys.filter((item) => {
      if (!normalized) return true;
      return (
        item.device_name.toLowerCase().includes(normalized) ||
        item.key_prefix.toLowerCase().includes(normalized) ||
        item.status.toLowerCase().includes(normalized)
      );
    });
  }, [keys, query]);

  async function createKey() {
    const cleanName = deviceName.trim();
    if (!cleanName) {
      setCreateError('Device name is required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const data = await adminFetch<{ key: string; device_name: string }>(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ device_name: cleanName }),
      });
      setLastCreatedKey(data.key);
      setRevealSecret(true);
      setDeviceName('');
      await loadKeys();
      setToast(`API key created for ${data.device_name}. Copy it now; it will not be shown again.`);
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'Could not create API key.');
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: 'active' | 'revoked') {
    await adminFetch<{ id: string; status: string }>(`${ENDPOINT}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await loadKeys();
    setToast(status === 'revoked' ? 'API key revoked.' : 'API key reactivated.');
  }

  async function deleteKey(id: string) {
    await adminFetch<{ deleted: string }>(`${ENDPOINT}/${id}`, {
      method: 'DELETE',
    });
    await loadKeys();
    setToast('API key deleted.');
    setSelectedKey(null);
  }

  function copySecret(key: string) {
    void navigator.clipboard.writeText(key).catch(() => {});
  }

  return (
    <div className="admin-page">
      <AdminPageHeading eyebrow="HARDWARE" title="Hardware / API" description="Manage API keys for ESP32 and guardian palm dismissal devices, and review the live integration endpoints." actions={<Button variant="secondary" onClick={loadKeys} loading={status === 'loading'}><RefreshCcw size={14} aria-hidden="true" />Refresh</Button>} />
      <DataSourceNotice />

      <Card className="admin-card">
        <CardHeading title="Device API keys" description="Keys are shown once. Store the secret on the device and never expose it in client-side code." />
        <div className="hardware-create">
          <div className="field">
            <label className="field__label" htmlFor="device-name">Device name</label>
            <input id="device-name" className="input" value={deviceName} onChange={(event) => setDeviceName(event.target.value)} placeholder="e.g. Tulip main gate reader" />
          </div>
          <Button variant="primary" onClick={createKey} loading={creating} disabled={!deviceName.trim()}>Create API key</Button>
        </div>
        {createError && <p className="form-error" role="alert">{createError}</p>}

        {revealSecret && lastCreatedKey && (
          <div className="hardware-secret">
            <div>
              <strong>New API key</strong>
              <p>Copy this value now. It will not be shown again and cannot be recovered.</p>
            </div>
            <code className="hardware-secret__value">{lastCreatedKey}</code>
            <div className="hardware-secret__actions">
              <Button variant="secondary" onClick={() => copySecret(lastCreatedKey)}><Copy size={14} aria-hidden="true" />Copy</Button>
              <Button variant="ghost" onClick={() => { setRevealSecret(false); setLastCreatedKey(null); }}><EyeOff size={14} aria-hidden="true" />Dismiss</Button>
            </div>
          </div>
        )}

        <div className="table-toolbar">
          <SearchInput label="Search keys" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>

        {status === 'error' && <EmptyState title="Could not load API keys" description={error ?? 'The hardware key service could not be reached.'} />}
        {status === 'ready' && filteredKeys.length === 0 && <EmptyState title="No API keys" description={query ? 'Try a different search term.' : 'Create a key for each dismissal device.'} />}
        {status === 'ready' && filteredKeys.length > 0 && (
          <DataTable label="Hardware API keys" className="admin-table--keys">
            <thead><tr><th scope="col">Device</th><th scope="col">Prefix</th><th scope="col">Status</th><th scope="col">Last used</th><th scope="col">Action</th></tr></thead>
            <tbody>{filteredKeys.map((item) => (
              <tr key={item.id}>
                <td><span className="table-primary">{item.device_name}</span></td>
                <td><code className="key-prefix">{item.key_prefix}</code></td>
                <td><StatusIndicator label={item.status} tone={item.status === 'active' ? 'success' : 'danger'} /></td>
                <td>{item.last_used_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.last_used_at)) : '—'}</td>
                <td><div className="row-actions"><Button variant="ghost" size="sm" onClick={() => setSelectedKey(item)}>Manage</Button></div></td>
              </tr>
            ))}</tbody>
          </DataTable>
        )}
      </Card>

      <Card className="admin-card">
        <CardHeading title="Integration endpoints" description="Use these endpoints from the ESP32/guardian palm device. Requests must include a valid API key." />
        <div className="hardware-endpoints">
          <div className="endpoint">
            <div className="endpoint__head">
              <span className="endpoint__method">POST</span>
              <code>{ENDPOINT}</code>
            </div>
            <p className="endpoint__desc">Admin API key management. Create, list, update status, or delete device keys. Requires an admin bearer token.</p>
            <div className="endpoint__body">
              <div><strong>Create</strong><code>{"{ \"device_name\": \"Main gate reader\" }"}</code></div>
              <div><strong>Response</strong><code>{"{ \"key\": \"gx_live_...\", \"device_name\": \"...\" }"}</code></div>
            </div>
          </div>
          <div className="endpoint">
            <div className="endpoint__head">
              <span className="endpoint__method">POST</span>
              <code>{DISMISSAL_ENDPOINT}</code>
            </div>
            <p className="endpoint__desc">Dismiss a student using a verified guardian palm read from the device. Authenticate with the device API key.</p>
            <div className="endpoint__body">
              <div><strong>Request</strong><code>{"{ \"student_id\": \"...\", \"guardian_id\": \"...\", \"palm_id\": \"...\", \"device_id\": \"...\" }"}</code></div>
              <div><strong>Success</strong><code>{"{ \"verified\": true, \"request_id\": \"...\", \"dismissed_at\": \"...\", \"student\": {...}, \"guardian\": {...}, \"class\": {...} }"}</code></div>
              <div><strong>Failure</strong><code>{"{ \"verified\": false, \"reason\": \"Palm identifier does not match the registered palm.\" }"}</code></div>
            </div>
          </div>
        </div>
      </Card>

      {selectedKey && (
        <Dialog open={Boolean(selectedKey)} onClose={() => setSelectedKey(null)} title={selectedKey.device_name} description={`API key • ${selectedKey.key_prefix}`} className="dialog--detail">
          <dl className="detail-list">
            <div className="detail-row"><dt>Device name</dt><dd>{selectedKey.device_name}</dd></div>
            <div className="detail-row"><dt>Key prefix</dt><dd><code className="key-prefix">{selectedKey.key_prefix}</code></dd></div>
            <div className="detail-row"><dt>Status</dt><dd><StatusIndicator label={selectedKey.status} tone={selectedKey.status === 'active' ? 'success' : 'danger'} /></dd></div>
            <div className="detail-row"><dt>Last used</dt><dd>{selectedKey.last_used_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(selectedKey.last_used_at)) : '—'}</dd></div>
            <div className="detail-row"><dt>Created</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(selectedKey.created_at))}</dd></div>
          </dl>
          <div className="dialog__actions">
            <Button variant="ghost" onClick={() => setSelectedKey(null)}>Close</Button>
            <Button variant="secondary" onClick={() => updateStatus(selectedKey.id, selectedKey.status === 'active' ? 'revoked' : 'active')}>
              {selectedKey.status === 'active' ? 'Revoke key' : 'Reactivate key'}
            </Button>
            <Button variant="danger" onClick={() => { void deleteKey(selectedKey.id); }}>Delete key</Button>
          </div>
        </Dialog>
      )}

      {toast && <Toast message={toast} tone="success" onDismiss={() => setToast('')} />}
    </div>
  );
}
