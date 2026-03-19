import { EditableUserRow } from '../../components/admin/EditableUserRow';
import type { AdminOverview } from '../../types/app';

interface AdminUsersPanelProps {
  adminOverview: AdminOverview | null;
  onSaveUser: (id: string, payload: Record<string, unknown>) => Promise<void>;
}

export function AdminUsersPanel({ adminOverview, onSaveUser }: AdminUsersPanelProps) {
  return (
    <section className="card table-card">
      <div className="section-header">
        <h2>User management</h2>
        <span className="muted small">Allocate tokens, adjust limits, or restrict access.</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Plan</th>
              <th>Daily limit</th>
              <th>Token balance</th>
              <th>Token cap</th>
              <th>Status</th>
              <th>Usage</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {adminOverview?.users.map((item) => (
              <EditableUserRow key={item.id} user={item} onSave={onSaveUser} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
