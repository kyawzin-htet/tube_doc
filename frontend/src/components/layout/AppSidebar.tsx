import { ADMIN_NAV_ITEMS, USER_NAV_ITEMS } from '../../constants/navigation';
import type { AppPanel, UserProfile } from '../../types/app';

interface AppSidebarProps {
  currentUser: UserProfile;
  activePanel: AppPanel;
  canUseAdmin: boolean;
  onSelectPanel: (panel: AppPanel) => void;
}

export function AppSidebar({
  currentUser,
  activePanel,
  canUseAdmin,
  onSelectPanel,
}: AppSidebarProps) {
  const navItems = canUseAdmin ? [...USER_NAV_ITEMS, ...ADMIN_NAV_ITEMS] : USER_NAV_ITEMS;

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="eyebrow">TubeDoc</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePanel === item.id ? 'nav-item-active' : ''}`}
              onClick={() => onSelectPanel(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-profile">
        <div className="profile-chip">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name || currentUser.email}
              className="avatar"
            />
          ) : (
            <div className="avatar fallback-avatar">
              {(currentUser.name || currentUser.email).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <strong>{currentUser.name || currentUser.email}</strong>
            <div className="profile-meta">
              <span className="badge">{currentUser.plan}</span>
              {/* <span className="badge muted-badge">{currentUser.role}</span> */}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
