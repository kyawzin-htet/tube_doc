import { format } from 'date-fns';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import { formatCost } from '../../lib/format';
import type { AdminOverview } from '../../types/app';

interface AdminDashboardPanelProps {
  adminOverview: AdminOverview | null;
  adminLoading: boolean;
  onApproveRequest: (requestId: string) => void;
  onCancelRequest: (requestId: string) => void;
  onRefresh: () => void;
}

export function AdminDashboardPanel({
  adminOverview,
  adminLoading,
  onApproveRequest,
  onCancelRequest,
  onRefresh,
}: AdminDashboardPanelProps) {
  return (
    <>
      <section className="card table-card">
        <div className="section-header">
          <h2>Pending premium requests</h2>
          <span className="muted small">
            {adminOverview?.pendingUpgradeRequests.length ?? 0} awaiting review
          </span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Requested plan</th>
                <th>Requested at</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {adminOverview?.pendingUpgradeRequests.length ? (
                adminOverview.pendingUpgradeRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="table-title">{request.user.name || request.user.email}</div>
                      <div className="table-subtitle">{request.user.email}</div>
                    </td>
                    <td>{request.requestedPlan}</td>
                    <td>{format(new Date(request.createdAt), 'MMM d, HH:mm')}</td>
                    <td>
                      <div className="inline-actions">
                        <button
                          className="ghost-btn icon-btn"
                          onClick={() => onApproveRequest(request.id)}
                          aria-label="Approve request"
                          title="Approve request"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="ghost-btn icon-btn danger-outline"
                          onClick={() => onCancelRequest(request.id)}
                          aria-label="Cancel request"
                          title="Cancel request"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">No pending Premium requests.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overview-strip">
        <div className="metric-card accent-card">
          <span>Total users</span>
          <strong>{adminOverview?.totals.totalUsers ?? 0}</strong>
          <small>Registered accounts</small>
        </div>
        <div className="metric-card">
          <span>DAU trend</span>
          <strong>
            {adminOverview?.dailyActiveUsers[adminOverview.dailyActiveUsers.length - 1]?.users ??
              0}
          </strong>
          <small>Today</small>
        </div>
        <div className="metric-card">
          <span>Total token usage</span>
          <strong>{adminOverview?.totals.totalTokens.toLocaleString() ?? 0}</strong>
          <small>Across tracked translations</small>
        </div>
        <div className="metric-card">
          <span>Total cost</span>
          <strong>{formatCost(adminOverview?.totals.totalCostUsd ?? 0)}</strong>
          <small>Estimated</small>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Daily active users</h2>
          <button
            className="ghost-btn icon-btn"
            onClick={onRefresh}
            disabled={adminLoading}
            aria-label="Refresh dashboard"
            title="Refresh dashboard"
          >
            {adminLoading ? <Loader2 className="spinning" size={14} /> : <RefreshCw size={14} />}
          </button>
        </div>
        <div className="dau-list">
          {adminOverview?.dailyActiveUsers.map((item) => (
            <div key={item.date} className="dau-row">
              <span>{format(new Date(item.date), 'EEE, MMM d')}</span>
              <strong>{item.users}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
