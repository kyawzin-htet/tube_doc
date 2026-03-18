import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Check,
  CheckCircle,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  LogOut,
  Save,
  Send,
  Shield,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const STORAGE_KEY = 'tubedoc-auth-token';

interface Video {
  id: string;
  videoUrl: string;
  videoId: string;
  title: string;
  summary: string;
  processingMethod: string;
  createdAt: string;
}

interface StatusData {
  progress?: number;
  currentChunk?: number;
  totalChunks?: number;
  partialSummary?: string;
}

interface StatusPayload {
  jobId: string;
  videoId: string;
  status: string;
  message: string;
  data?: StatusData;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PREMIUM';
  dailyTranslationLimit: number;
  tokenBalance: number;
  tokenCap: number;
  isRestricted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface RecentTranslation {
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

interface AccountUsage {
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

interface AccountResponse {
  user: UserProfile;
  usage: AccountUsage;
}

interface AuthResponse extends AccountResponse {
  accessToken: string;
}

interface AdminUser extends UserProfile {
  translationCount: number;
  loginCount: number;
}

interface AdminOverview {
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
      role: 'USER' | 'ADMIN';
      plan: 'FREE' | 'PREMIUM';
    };
  }>;
  users: AdminUser[];
}

const authHeaders = (token: string | null) =>
  token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};

const formatCost = (value: number) => `$${value.toFixed(4)}`;

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  title: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}> = ({ isOpen, title, onConfirm, onClose, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content compact-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Confirm Deletion</h3>
          <button className="ghost-btn icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-copy">Delete this record permanently?</p>
          <p className="muted small">{title}</p>
        </div>
        <div className="modal-footer">
          <button className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="danger-btn" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="spinning" size={16} /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const VideoDetailModal: React.FC<{
  token: string;
  video: Video;
  onClose: () => void;
}> = ({ token, video, onClose }) => {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null);

  const processingLabel =
    video.processingMethod === 'transcript_api'
      ? 'Transcript API'
      : video.processingMethod === 'gemini'
        ? 'Gemini'
        : 'Whisper';

  const handleCopy = () => {
    navigator.clipboard.writeText(video.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleDownload = async (formatType: 'pdf' | 'docx') => {
    try {
      setDownloading(formatType);
      const response = await axios.get(`${API_BASE}/videos/${video.id}/download`, {
        params: { format: formatType },
        responseType: 'blob',
        headers: authHeaders(token),
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeTitle = (video.title || video.videoId || 'summary')
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 80);
      link.href = url;
      link.download = `${safeTitle}.${formatType}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{video.title}</h2>
            <div className="modal-meta">
              <span className="badge subtle-badge">{processingLabel}</span>
              <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                View on YouTube <ExternalLink size={13} />
              </a>
            </div>
          </div>
          <button className="ghost-btn icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="section-header">
            <h3>Summary</h3>
            <div className="inline-actions">
              <button className={`ghost-btn ${copiedSummary ? 'success-outline' : ''}`} onClick={handleCopy}>
                {copiedSummary ? <Check size={14} /> : <Copy size={14} />}
                {copiedSummary ? 'Copied' : 'Copy'}
              </button>
              <button className="ghost-btn" onClick={() => handleDownload('pdf')} disabled={downloading !== null}>
                <Download size={14} />
                {downloading === 'pdf' ? 'Downloading...' : 'PDF'}
              </button>
              <button className="ghost-btn" onClick={() => handleDownload('docx')} disabled={downloading !== null}>
                <Download size={14} />
                {downloading === 'docx' ? 'Downloading...' : 'DOCX'}
              </button>
            </div>
          </div>

          <div className="content-box">{video.summary}</div>
        </div>

        <div className="modal-footer">
          <button className="ghost-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const EditableUserRow: React.FC<{
  user: AdminUser;
  onSave: (id: string, payload: Record<string, unknown>) => Promise<void>;
}> = ({ user, onSave }) => {
  const [form, setForm] = useState({
    role: user.role,
    plan: user.plan,
    dailyTranslationLimit: String(user.dailyTranslationLimit),
    tokenBalance: String(user.tokenBalance),
    tokenCap: String(user.tokenCap),
    isRestricted: user.isRestricted,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(user.id, {
        role: form.role,
        plan: form.plan,
        dailyTranslationLimit: Number(form.dailyTranslationLimit),
        tokenBalance: Number(form.tokenBalance),
        tokenCap: Number(form.tokenCap),
        isRestricted: form.isRestricted,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td>
        <div className="table-title">{user.name || user.email}</div>
        <div className="table-subtitle">{user.email}</div>
      </td>
      <td>
        <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as 'USER' | 'ADMIN' }))}>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </td>
      <td>
        <select value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value as 'FREE' | 'PREMIUM' }))}>
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium</option>
        </select>
      </td>
      <td>
        <input value={form.dailyTranslationLimit} onChange={(event) => setForm((current) => ({ ...current, dailyTranslationLimit: event.target.value }))} />
      </td>
      <td>
        <input value={form.tokenBalance} onChange={(event) => setForm((current) => ({ ...current, tokenBalance: event.target.value }))} />
      </td>
      <td>
        <input value={form.tokenCap} onChange={(event) => setForm((current) => ({ ...current, tokenCap: event.target.value }))} />
      </td>
      <td>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.isRestricted}
            onChange={(event) => setForm((current) => ({ ...current, isRestricted: event.target.checked }))}
          />
          Restricted
        </label>
      </td>
      <td>
        <div className="table-subtitle">
          {user.translationCount} translations
          <br />
          {user.loginCount} logins
        </div>
      </td>
      <td>
        <button className="ghost-btn" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="spinning" size={14} /> : <Save size={14} />}
          Save
        </button>
      </td>
    </tr>
  );
};

const App: React.FC = () => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [activePanel, setActivePanel] = useState<'workspace' | 'admin'>('workspace');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('auto');
  const [videos, setVideos] = useState<Video[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_LIMIT = 10;

  const user = account?.user ?? null;
  const usage = account?.usage ?? null;
  const progress = Math.max(0, Math.min(100, currentStatus?.data?.progress ?? 0));
  const hasPartialSummary = Boolean(currentStatus?.data?.partialSummary?.trim());
  const canUseAdmin = user?.role === 'ADMIN';

  const tierMessage = useMemo(() => {
    if (!usage || !user) return '';
    if (user.plan === 'PREMIUM') {
      return `Premium tier gives you ${usage.dailyLimit} translations per day and expanded token allocation.`;
    }
    return `Free tier is limited to ${usage.dailyLimit} translation per day. Upgrade to Premium for more capacity.`;
  }, [usage, user]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && event.origin !== new URL(API_BASE).origin) {
        return;
      }

      if (event.data?.type === 'google-auth-success') {
        applyAuth(event.data.payload as AuthResponse);
      }

      if (event.data?.type === 'google-auth-error') {
        setAuthError((event.data.payload?.message as string) || 'Google authentication failed');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!token) {
      setAccount(null);
      setVideos([]);
      return;
    }

    void refreshAccount(token);
  }, [token]);

  useEffect(() => {
    if (!token || !account) {
      return;
    }

    void fetchVideos(currentPage);
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [token, account, currentPage]);

  useEffect(() => {
    if (activePanel === 'admin' && canUseAdmin && token) {
      void fetchAdminOverview();
    }
  }, [activePanel, canUseAdmin, token]);

  const applyAuth = (payload: AuthResponse) => {
    localStorage.setItem(STORAGE_KEY, payload.accessToken);
    setToken(payload.accessToken);
    setAccount({
      user: payload.user,
      usage: payload.usage,
    });
    setAuthError(null);
    setAuthForm({ name: '', email: '', password: '' });
  };

  const clearAuth = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setAccount(null);
    setAdminOverview(null);
    setCurrentStatus(null);
    setError(null);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const withAuthErrorHandling = async <T,>(task: Promise<T>) => {
    try {
      return await task;
    } catch (err: any) {
      if (err.response?.status === 401) {
        clearAuth();
      }
      throw err;
    }
  };

  const refreshAccount = async (activeToken = token) => {
    if (!activeToken) return;

    try {
      const response = await withAuthErrorHandling(
        axios.get<AccountResponse>(`${API_BASE}/account/me`, {
          headers: authHeaders(activeToken),
        }),
      );
      setAccount(response.data);
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Failed to load account');
    }
  };

  const fetchVideos = async (page = 1) => {
    if (!token) return;

    try {
      const response = await withAuthErrorHandling(
        axios.get(`${API_BASE}/videos`, {
          params: { page, limit: PAGE_LIMIT },
          headers: authHeaders(token),
        }),
      );
      const { data, totalPages: totalPagesValue, total } = response.data;
      setVideos(data);
      setTotalPages(totalPagesValue);
      setTotalCount(total);
    } catch (err) {
      console.error('Failed to fetch videos', err);
    }
  };

  const fetchAdminOverview = async () => {
    if (!token || !canUseAdmin) return;

    try {
      setAdminLoading(true);
      const response = await withAuthErrorHandling(
        axios.get<AdminOverview>(`${API_BASE}/admin/overview`, {
          headers: authHeaders(token),
        }),
      );
      setAdminOverview(response.data);
    } catch (err) {
      console.error('Failed to fetch admin overview', err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const endpoint = authMode === 'login' ? 'login' : 'signup';
      const response = await axios.post<AuthResponse>(`${API_BASE}/auth/${endpoint}`, authForm);
      applyAuth(response.data);
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setAuthError(null);
    const popup = window.open(
      `${API_BASE}/auth/google/start?origin=${encodeURIComponent(window.location.origin)}`,
      'google-login',
      'width=520,height=640,menubar=no,toolbar=no,status=no',
    );

    if (!popup) {
      setAuthError('Popup blocked. Please allow popups and try again.');
    }
  };

  const handleProcess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url || !token) return;

    setIsProcessing(true);
    setError(null);
    setCurrentStatus(null);

    try {
      const response = await withAuthErrorHandling(
        axios.post(
          `${API_BASE}/videos/process`,
          { url, language },
          {
            headers: authHeaders(token),
          },
        ),
      );

      const { jobId, videoId } = response.data;
      await refreshAccount(token);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const streamUrl = `${API_BASE}/videos/process/status/${jobId}?accessToken=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;
      setCurrentStatus({
        jobId,
        videoId,
        status: 'queued',
        message: 'Job queued. Waiting for a worker...',
      });

      eventSource.onmessage = (message) => {
        const payload: StatusPayload = JSON.parse(message.data);
        setCurrentStatus(payload);

        if (payload.status === 'completed') {
          eventSource.close();
          setIsProcessing(false);
          setUrl('');
          setCurrentPage(1);
          void fetchVideos(1);
          void refreshAccount(token);
          if (canUseAdmin) {
            void fetchAdminOverview();
          }
        } else if (payload.status === 'error') {
          eventSource.close();
          setIsProcessing(false);
          setError(payload.message);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsProcessing(false);
        setError('Connection lost while streaming status updates.');
      };
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.response?.data?.message || 'Failed to start processing');
    }
  };

  const handleCancel = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsProcessing(false);
    setCurrentStatus(null);
    setError(null);
  };

  const handleDelete = async () => {
    if (!videoToDelete || !token) return;

    setIsDeleting(true);
    try {
      await withAuthErrorHandling(
        axios.delete(`${API_BASE}/videos/${videoToDelete.id}`, {
          headers: authHeaders(token),
        }),
      );
      setVideoToDelete(null);
      const newPage = videos.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      await fetchVideos(newPage);
    } catch (err) {
      console.error('Failed to delete video', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpgrade = async () => {
    if (!token) return;

    setIsUpgrading(true);
    try {
      const response = await withAuthErrorHandling(
        axios.post<AccountResponse>(
          `${API_BASE}/account/upgrade`,
          {},
          {
            headers: authHeaders(token),
          },
        ),
      );
      setAccount(response.data);
    } catch (err) {
      console.error('Failed to upgrade account', err);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleAdminSaveUser = async (id: string, payload: Record<string, unknown>) => {
    if (!token) return;

    await withAuthErrorHandling(
      axios.patch(`${API_BASE}/admin/users/${id}`, payload, {
        headers: authHeaders(token),
      }),
    );

    await fetchAdminOverview();
    await refreshAccount(token);
  };

  if (!token || !account) {
    return (
      <div className="auth-shell">
        <div className="auth-panel">
          <div className="auth-intro">
            <span className="eyebrow">TubeDoc Control Center</span>
            <h1>Authenticate, track usage, and manage translation access.</h1>
            <p>
              Sign in with Google or email/password, translate YouTube links under your account,
              and unlock higher daily limits with Premium.
            </p>

            <div className="feature-grid">
              <div className="feature-card">
                <Shield size={18} />
                <div>
                  <strong>Role-aware access</strong>
                  <span>Separate user and admin permissions.</span>
                </div>
              </div>
              <div className="feature-card">
                <Sparkles size={18} />
                <div>
                  <strong>Daily limits</strong>
                  <span>Free tier is capped, Premium expands throughput.</span>
                </div>
              </div>
              <div className="feature-card">
                <Users size={18} />
                <div>
                  <strong>Usage visibility</strong>
                  <span>Track token spend, cost, and recent activity.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-card">
            <div className="auth-tabs">
              <button
                className={authMode === 'login' ? 'tab-active' : 'tab-idle'}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                className={authMode === 'signup' ? 'tab-active' : 'tab-idle'}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <input
                  type="text"
                  placeholder="Full name"
                  value={authForm.name}
                  onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                />
              )}
              <input
                type="email"
                placeholder="Email address"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              />
              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              />

              {authError && (
                <div className="inline-error">
                  <AlertCircle size={16} />
                  <span>{authError}</span>
                </div>
              )}

              <button type="submit" className="primary-btn" disabled={authLoading}>
                {authLoading ? <Loader2 className="spinning" size={16} /> : authMode === 'login' ? 'Login' : 'Create account'}
              </button>
            </form>

            <div className="divider">
              <span>or</span>
            </div>

            <button className="ghost-btn full-width" onClick={handleGoogleLogin}>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = account.user;
  const currentUsage = account.usage;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">TubeDoc</span>
          <h1>Authenticated translation workspace</h1>
          <p>{tierMessage}</p>
        </div>

        <div className="topbar-actions">
          <div className="profile-chip">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.name || currentUser.email} className="avatar" />
            ) : (
              <div className="avatar fallback-avatar">{(currentUser.name || currentUser.email).slice(0, 1).toUpperCase()}</div>
            )}
            <div>
              <strong>{currentUser.name || currentUser.email}</strong>
              <div className="profile-meta">
                <span className="badge">{currentUser.plan}</span>
                <span className="badge muted-badge">{currentUser.role}</span>
              </div>
            </div>
          </div>

          {canUseAdmin && (
            <div className="panel-tabs">
              <button
                className={activePanel === 'workspace' ? 'tab-active' : 'tab-idle'}
                onClick={() => setActivePanel('workspace')}
              >
                Workspace
              </button>
              <button
                className={activePanel === 'admin' ? 'tab-active' : 'tab-idle'}
                onClick={() => setActivePanel('admin')}
              >
                Admin
              </button>
            </div>
          )}

          <button className="ghost-btn" onClick={clearAuth}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="main-grid">
        <section className="overview-strip">
          <div className="metric-card accent-card">
            <span>Translations left today</span>
            <strong>{currentUsage.remainingToday}</strong>
            <small>
              {currentUsage.translationsUsedToday} of {currentUsage.dailyLimit} used
            </small>
          </div>
          <div className="metric-card">
            <span>Available tokens</span>
            <strong>{currentUsage.tokenBalance.toLocaleString()}</strong>
            <small>Cap: {currentUsage.tokenCap.toLocaleString()}</small>
          </div>
          <div className="metric-card">
            <span>Total usage</span>
            <strong>{currentUsage.totalTranslations}</strong>
            <small>{currentUsage.totalTokensConsumed.toLocaleString()} tokens consumed</small>
          </div>
          <div className="metric-card">
            <span>Estimated cost</span>
            <strong>{formatCost(currentUsage.totalCostUsd)}</strong>
            <small>
              Last login:{' '}
              {currentUsage.lastLoginAt ? format(new Date(currentUsage.lastLoginAt), 'MMM d, HH:mm') : 'n/a'}
            </small>
          </div>
        </section>

        {activePanel === 'workspace' && (
          <>
            <section className="card feature-band">
              <div>
                <h2>Translate a new YouTube link</h2>
                <p className="muted">
                  Processing is tracked per user, and usage is applied against your daily limit and
                  token balance.
                </p>
              </div>

              {currentUser.plan === 'FREE' && (
                <button className="primary-btn" onClick={handleUpgrade} disabled={isUpgrading}>
                  {isUpgrading ? <Loader2 className="spinning" size={16} /> : <Sparkles size={16} />}
                  Upgrade to Premium
                </button>
              )}
            </section>

            <section className="card">
              <form onSubmit={handleProcess}>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Paste a YouTube URL"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    disabled={isProcessing || currentUser.isRestricted}
                  />
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    disabled={isProcessing || currentUser.isRestricted}
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="en">English</option>
                    <option value="my">Burmese</option>
                    <option value="ko">Korean</option>
                    <option value="ja">Japanese</option>
                    <option value="zh">Chinese</option>
                    <option value="th">Thai</option>
                    <option value="ar">Arabic</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="es">Spanish</option>
                    <option value="pt">Portuguese</option>
                    <option value="hi">Hindi</option>
                    <option value="ru">Russian</option>
                    <option value="id">Indonesian</option>
                    <option value="vi">Vietnamese</option>
                  </select>
                  <button type="submit" className="primary-btn" disabled={isProcessing || !url || currentUser.isRestricted}>
                    {isProcessing ? <Loader2 className="spinning" size={16} /> : <Send size={16} />}
                    <span>Process</span>
                  </button>
                  {isProcessing && (
                    <button type="button" className="ghost-btn" onClick={handleCancel}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {currentUser.isRestricted && (
                <div className="inline-error top-space">
                  <AlertCircle size={16} />
                  <span>Your account is restricted by an administrator.</span>
                </div>
              )}

              {currentStatus && (isProcessing || currentStatus.status === 'completed' || currentStatus.status === 'error' || hasPartialSummary) && (
                <div className="status-box">
                  <div className="status-message">
                    {currentStatus.status === 'completed' ? (
                      <CheckCircle className="text-success" size={16} />
                    ) : currentStatus.status === 'error' ? (
                      <AlertCircle className="text-error" size={16} />
                    ) : (
                      <Loader2 className="spinning" size={16} />
                    )}
                    <span>{currentStatus.message}</span>
                  </div>

                  {(currentStatus.data?.currentChunk || currentStatus.data?.totalChunks || progress > 0) && (
                    <div className="progress-block">
                      <div className="progress-meta">
                        <span>
                          {currentStatus.data?.currentChunk && currentStatus.data?.totalChunks
                            ? `Chunk ${currentStatus.data.currentChunk} of ${currentStatus.data.totalChunks}`
                            : 'Processing'}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  {hasPartialSummary && (
                    <div className="top-space">
                      <div className="section-label">Live summary draft</div>
                      <div className="content-box scroll-box">{currentStatus.data?.partialSummary}</div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="inline-error top-space">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </section>

            <section className="two-column">
              <div className="card">
                <div className="section-header">
                  <h2>Your activity</h2>
                  <span className="muted small">{tierMessage}</span>
                </div>

                <div className="activity-list">
                  {currentUsage.recentTranslations.length ? (
                    currentUsage.recentTranslations.map((item) => (
                      <div key={item.id} className="activity-item">
                        <div>
                          <strong>{item.video?.title || 'Processed link'}</strong>
                          <div className="table-subtitle">
                            {format(new Date(item.requestDate), 'MMM d, HH:mm')} · {item.totalTokens.toLocaleString()} tokens · {formatCost(item.estimatedCostUsd)}
                          </div>
                        </div>
                        <a
                          href={item.video?.videoUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ghost-link"
                        >
                          Open
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No translations recorded for this account yet.</div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="section-header">
                  <h2>Plan controls</h2>
                  <span className={`badge ${currentUser.plan === 'PREMIUM' ? 'premium-badge' : 'subtle-badge'}`}>{currentUser.plan}</span>
                </div>
                <div className="plan-grid">
                  <div className="plan-point">
                    <strong>Daily limit</strong>
                    <span>{currentUsage.dailyLimit} translations/day</span>
                  </div>
                  <div className="plan-point">
                    <strong>Token balance</strong>
                    <span>{currentUsage.tokenBalance.toLocaleString()} remaining</span>
                  </div>
                  <div className="plan-point">
                    <strong>Restriction status</strong>
                    <span>{currentUser.isRestricted ? 'Restricted by admin' : 'Active'}</span>
                  </div>
                </div>

                {currentUser.plan === 'FREE' ? (
                  <button className="primary-btn top-space" onClick={handleUpgrade} disabled={isUpgrading}>
                    {isUpgrading ? <Loader2 className="spinning" size={16} /> : <Sparkles size={16} />}
                    Upgrade account
                  </button>
                ) : (
                  <div className="success-panel top-space">
                    <CheckCircle size={18} />
                    <span>Premium is active with higher limits and more tokens.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="card table-card">
              <div className="section-header">
                <h2>Saved translations</h2>
                <span className="muted small">
                  {totalCount} record{totalCount !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Preview</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.length === 0 ? (
                      <tr>
                        <td colSpan={4}>
                          <div className="empty-state">No saved translations yet.</div>
                        </td>
                      </tr>
                    ) : (
                      videos.map((video) => (
                        <tr key={video.id} onClick={() => setSelectedVideo(video)}>
                          <td>
                            <div className="table-title">{video.title}</div>
                            <div className="table-subtitle">{video.videoId}</div>
                          </td>
                          <td>
                            <div className="summary-text">{video.summary}</div>
                          </td>
                          <td>{format(new Date(video.createdAt), 'MMM d')}</td>
                          <td>
                            <div className="inline-actions" onClick={(event) => event.stopPropagation()}>
                              <button className="ghost-btn" onClick={() => setSelectedVideo(video)}>
                                View
                              </button>
                              <button className="ghost-btn danger-outline" onClick={() => setVideoToDelete(video)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <span className="muted small">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="inline-actions">
                    <button className="ghost-btn" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                      Previous
                    </button>
                    <button className="ghost-btn" onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {activePanel === 'admin' && canUseAdmin && (
          <>
            <section className="overview-strip">
              <div className="metric-card accent-card">
                <span>Total users</span>
                <strong>{adminOverview?.totals.totalUsers ?? 0}</strong>
                <small>Registered accounts</small>
              </div>
              <div className="metric-card">
                <span>DAU trend</span>
                <strong>
                  {adminOverview?.dailyActiveUsers[adminOverview.dailyActiveUsers.length - 1]?.users ?? 0}
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

            <section className="two-column">
              <div className="card">
                <div className="section-header">
                  <h2>Daily active users</h2>
                  <button className="ghost-btn" onClick={() => void fetchAdminOverview()} disabled={adminLoading}>
                    {adminLoading ? <Loader2 className="spinning" size={14} /> : 'Refresh'}
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
              </div>

              <div className="card">
                <div className="section-header">
                  <h2>Recent login activity</h2>
                  <span className="muted small">Latest 12 events</span>
                </div>
                <div className="activity-list">
                  {adminOverview?.recentLogins.map((entry) => (
                    <div key={entry.id} className="activity-item">
                      <div>
                        <strong>{entry.user.name || entry.user.email}</strong>
                        <div className="table-subtitle">
                          {entry.provider} · {format(new Date(entry.createdAt), 'MMM d, HH:mm')}
                        </div>
                      </div>
                      <span className="badge muted-badge">{entry.user.plan}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

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
                      <th>Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminOverview?.users.map((item) => (
                      <EditableUserRow key={item.id} user={item} onSave={handleAdminSaveUser} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {selectedVideo && token && (
        <VideoDetailModal token={token} video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}

      <ConfirmationModal
        isOpen={Boolean(videoToDelete)}
        title={videoToDelete?.title || ''}
        onConfirm={() => void handleDelete()}
        onClose={() => setVideoToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default App;
