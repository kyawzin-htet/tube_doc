import { format } from 'date-fns';
import { Loader2, RefreshCw } from 'lucide-react';
import type { AdminOverview } from '../../types/app';

interface AdminLoginsPanelProps {
  adminOverview: AdminOverview | null;
  adminLoading: boolean;
  onRefresh: () => void;
}

export function AdminLoginsPanel({
  adminOverview,
  adminLoading,
  onRefresh,
}: AdminLoginsPanelProps) {
  return (
    <section className="card">
      <div className="section-header">
        <h2>Recent login activity</h2>
        <button
          className="ghost-btn icon-btn"
          onClick={onRefresh}
          disabled={adminLoading}
          aria-label="Refresh login activity"
          title="Refresh login activity"
        >
          {adminLoading ? <Loader2 className="spinning" size={14} /> : <RefreshCw size={14} />}
        </button>
      </div>
      <div className="activity-list">
        {adminOverview?.recentLogins.length ? (
          adminOverview.recentLogins.map((entry) => (
            <div key={entry.id} className="activity-item">
              <div>
                <strong>{entry.user.name || entry.user.email}</strong>
                <div className="table-subtitle">
                  {entry.provider} · {format(new Date(entry.createdAt), 'MMM d, HH:mm')}
                </div>
              </div>
              <span className="badge muted-badge">{entry.user.plan}</span>
            </div>
          ))
        ) : (
          <div className="empty-state">No login activity yet.</div>
        )}
      </div>
    </section>
  );
}
