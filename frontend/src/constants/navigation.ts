import type { AppPanel, PanelMeta } from '../types/app';

export const PANEL_META: Record<AppPanel, PanelMeta> = {
  workspace: {
    eyebrow: 'Workspace',
    title: '',
    description: '',
  },
  account: {
    eyebrow: 'Account',
    title: '',
    description: '',
  },
  'admin-dashboard': {
    eyebrow: 'Admin',
    title: 'Dashboard',
    description: '',
  },
  'admin-logins': {
    eyebrow: 'Admin',
    title: 'Recent login activity',
    description: '',
  },
  'admin-users': {
    eyebrow: 'Admin',
    title: 'User Management',
    description: '',
  },
};

export const USER_NAV_ITEMS: Array<{ id: AppPanel; label: string; description: string }> = [
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Translate and review results',
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Plan, status, and requests',
  },
];

export const ADMIN_NAV_ITEMS: Array<{ id: AppPanel; label: string; description: string }> = [
  {
    id: 'admin-dashboard',
    label: 'Dashboard',
    description: 'Approvals and analytics',
  },
  {
    id: 'admin-logins',
    label: 'Recent login activity',
    description: 'Latest access events',
  },
  {
    id: 'admin-users',
    label: 'User Management',
    description: 'Roles, limits, and tokens',
  },
];
