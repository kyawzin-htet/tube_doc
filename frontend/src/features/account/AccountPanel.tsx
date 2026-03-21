import { format } from 'date-fns';
import { CheckCircle, Crown, Loader2 } from 'lucide-react';
import type { AccountUsage, PremiumUpgradeRequest, UserProfile } from '../../types/app';

interface AccountPanelProps {
  currentUser: UserProfile;
  currentUsage: AccountUsage;
  premiumUpgradeRequest: PremiumUpgradeRequest | null;
  hasPendingUpgradeRequest: boolean;
  isUpgrading: boolean;
  onUpgradeRequest: () => void;
}

export function AccountPanel({
  currentUser,
  currentUsage,
  premiumUpgradeRequest,
  hasPendingUpgradeRequest,
  isUpgrading,
  onUpgradeRequest,
}: AccountPanelProps) {
  return (
    <section className="card">
      <div className="section-header">
        <h2>Account overview</h2>
        <span
          className={`badge ${
            currentUser.plan === 'PREMIUM' ? 'premium-badge' : 'subtle-badge'
          }`}
        >
          {currentUser.plan}
        </span>
      </div>
      <div className="detail-list">
        <div className="detail-row">
          <span>Email</span>
          <strong>{currentUser.email}</strong>
        </div>
        <div className="detail-row">
          <span>Usage today</span>
          <strong>
            {currentUsage.remainingToday} of {currentUsage.dailyLimit} left
          </strong>
        </div>
        <div className="detail-row">
          <span>Access</span>
          <strong>{currentUser.isRestricted ? 'Restricted' : 'Active'}</strong>
        </div>
      </div>

      {currentUser.plan === 'FREE' && !hasPendingUpgradeRequest ? (
        <button
          className="primary-btn top-space icon-btn"
          onClick={onUpgradeRequest}
          disabled={isUpgrading}
          aria-label="Request premium upgrade"
          title="Request premium upgrade"
        >
          {isUpgrading ? <Loader2 className="spinning" size={16} /> : <Crown size={16} />}
        </button>
      ) : currentUser.plan === 'FREE' && premiumUpgradeRequest ? (
        <div className="status-box top-space">
          <div className="status-message">
            {/* <Loader2 className="spinning" size={16} /> */}
            <span className="text-warning">
              Premium request pending since{' '}
              {format(new Date(premiumUpgradeRequest.createdAt), 'MMM d, HH:mm')}
            </span>
          </div>
        </div>
      ) : (
        <div className="success-panel top-space">
          <CheckCircle size={18} />
          <span>Premium is active with higher limits and more tokens.</span>
        </div>
      )}
    </section>
  );
}
