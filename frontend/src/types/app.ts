export type UserRole = 'USER' | 'ADMIN';
export type UserPlan = 'FREE' | 'PREMIUM';
export type UpgradeRequestStatus = 'PENDING' | 'APPROVED' | 'CANCELED';
export type AuthMode = 'login' | 'signup';
export type AppPanel =
  | 'workspace'
  | 'account'
  | 'admin-dashboard'
  | 'admin-logins'
  | 'admin-users';

export interface Video {
  id: string;
  videoUrl: string;
  videoId: string;
  title: string;
  summary: string;
  processingMethod: string;
  createdAt: string;
}

export interface StatusData {
  progress?: number;
  currentChunk?: number;
  totalChunks?: number;
  partialSummary?: string;
}

export interface StatusPayload {
  jobId: string;
  videoId: string;
  status: string;
  message: string;
  data?: StatusData;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  plan: UserPlan;
  dailyTranslationLimit: number;
  tokenBalance: number;
  tokenCap: number;
  isRestricted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface RecentTranslation {
  id: string;
  requestDate: string;
  totalTokens: number;
  estimatedCostUsd: number;
  transcriptCharacters: number;
  summaryCharacters: number;
  video: {
    id: string;
    title: string | null;
    videoUrl: string;
    createdAt: string;
  } | null;
}

export interface AccountUsage {
  translationsUsedToday: number;
  remainingToday: number;
  dailyLimit: number;
  totalTranslations: number;
  totalTokensConsumed: number;
  totalCostUsd: number;
  tokenBalance: number;
  tokenCap: number;
  lastLoginAt: string | null;
  recentTranslations: RecentTranslation[];
}

export interface PremiumUpgradeRequest {
  id: string;
  status: UpgradeRequestStatus;
  requestedPlan: 'PREMIUM';
  createdAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
}

export interface AccountResponse {
  user: UserProfile;
  usage: AccountUsage;
  premiumUpgradeRequest: PremiumUpgradeRequest | null;
}

export interface AuthResponse extends AccountResponse {
  accessToken: string;
}

export interface AdminUser extends UserProfile {
  translationCount: number;
  loginCount: number;
}

export interface AdminOverview {
  totals: {
    totalUsers: number;
    totalTranslations: number;
    totalTokens: number;
    totalCostUsd: number;
  };
  dailyActiveUsers: Array<{ date: string; users: number }>;
  recentLogins: Array<{
    id: string;
    createdAt: string;
    provider: 'EMAIL' | 'GOOGLE';
    ipAddress: string | null;
    userAgent: string | null;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
      plan: UserPlan;
    };
  }>;
  pendingUpgradeRequests: Array<{
    id: string;
    status: 'PENDING';
    requestedPlan: 'PREMIUM';
    createdAt: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
      plan: UserPlan;
    };
  }>;
  users: AdminUser[];
}

export interface AuthFormState {
  name: string;
  email: string;
  password: string;
}

export interface PanelMeta {
  eyebrow: string;
  title: string;
  description: string;
}
