import { type FormEvent, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { LogOut } from 'lucide-react';
import { PANEL_META } from './constants/navigation';
import { ConfirmationModal } from './components/modals/ConfirmationModal';
import { VideoDetailModal } from './components/modals/VideoDetailModal';
import { AppSidebar } from './components/layout/AppSidebar';
import { AccountPanel } from './features/account/AccountPanel';
import { AdminDashboardPanel } from './features/admin/AdminDashboardPanel';
import { AdminLoginsPanel } from './features/admin/AdminLoginsPanel';
import { AdminUsersPanel } from './features/admin/AdminUsersPanel';
import { AuthScreen } from './features/auth/AuthScreen';
import { WorkspacePanel } from './features/workspace/WorkspacePanel';
import { API_BASE, PAGE_LIMIT, STORAGE_KEY } from './lib/config';
import { authHeaders } from './lib/http';
import type {
  AccountResponse,
  AdminOverview,
  AppPanel,
  AuthFormState,
  AuthMode,
  AuthResponse,
  StatusPayload,
  Video,
} from './types/app';

type LandingSection = 'summaries' | 'pricing';

function App() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [activePanel, setActivePanel] = useState<AppPanel>('workspace');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [landingSection, setLandingSection] = useState<LandingSection>('summaries');
  const [latestSummaries, setLatestSummaries] = useState<Video[]>([]);
  const [latestSummariesLoading, setLatestSummariesLoading] = useState(false);
  const [authForm, setAuthForm] = useState<AuthFormState>({ name: '', email: '', password: '' });
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

  const user = account?.user ?? null;
  const premiumUpgradeRequest = account?.premiumUpgradeRequest ?? null;
  const progress = Math.max(0, Math.min(100, currentStatus?.data?.progress ?? 0));
  const hasPartialSummary = Boolean(currentStatus?.data?.partialSummary?.trim());
  const canUseAdmin = user?.role === 'ADMIN';
  const hasPendingUpgradeRequest = premiumUpgradeRequest?.status === 'PENDING';

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
    if (token) {
      return;
    }

    void fetchLatestSummaries();
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
    if (activePanel.startsWith('admin') && canUseAdmin && token) {
      void fetchAdminOverview();
    }
  }, [activePanel, canUseAdmin, token]);

  const applyAuth = (payload: AuthResponse) => {
    localStorage.setItem(STORAGE_KEY, payload.accessToken);
    setToken(payload.accessToken);
    setAccount({
      user: payload.user,
      usage: payload.usage,
      premiumUpgradeRequest: payload.premiumUpgradeRequest,
    });
    setIsAuthOpen(false);
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

  const fetchLatestSummaries = async () => {
    try {
      setLatestSummariesLoading(true);
      const response = await axios.get<Video[]>(`${API_BASE}/videos/latest`, {
        params: { limit: 5 },
      });
      setLatestSummaries(response.data);
    } catch (err) {
      console.error('Failed to fetch latest summaries', err);
    } finally {
      setLatestSummariesLoading(false);
    }
  };

  const handleAuthSubmit = async (event: FormEvent) => {
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

  const handleGuestProcess = (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) {
      setIsAuthOpen(false);
      setAuthError('Paste a YouTube link first.');
      return;
    }

    setAuthMode('login');
    setIsAuthOpen(true);
    setAuthError('Login to continue processing this link.');
  };

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthOpen(true);
    setAuthError(null);
  };

  const closeAuth = () => {
    setIsAuthOpen(false);
    setAuthError(null);
  };

  const handleProcess = async (event: FormEvent) => {
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

  const handleUpgradeRequest = async () => {
    if (!token) return;

    setIsUpgrading(true);
    try {
      const response = await withAuthErrorHandling(
        axios.post<AccountResponse>(
          `${API_BASE}/account/upgrade-request`,
          {},
          {
            headers: authHeaders(token),
          },
        ),
      );
      setAccount(response.data);
    } catch (err) {
      console.error('Failed to request premium upgrade', err);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleApproveUpgradeRequest = async (requestId: string) => {
    if (!token) return;

    await withAuthErrorHandling(
      axios.post(
        `${API_BASE}/admin/upgrade-requests/${requestId}/approve`,
        {},
        {
          headers: authHeaders(token),
        },
      ),
    );

    await fetchAdminOverview();
  };

  const handleCancelUpgradeRequest = async (requestId: string) => {
    if (!token) return;

    await withAuthErrorHandling(
      axios.post(
        `${API_BASE}/admin/upgrade-requests/${requestId}/cancel`,
        {},
        {
          headers: authHeaders(token),
        },
      ),
    );

    await fetchAdminOverview();
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
      <AuthScreen
        url={url}
        language={language}
        authMode={authMode}
        authForm={authForm}
        authLoading={authLoading}
        authError={authError}
        authOpen={isAuthOpen}
        landingSection={landingSection}
        latestSummaries={latestSummaries}
        latestSummariesLoading={latestSummariesLoading}
        onUrlChange={setUrl}
        onLanguageChange={setLanguage}
        onAuthModeChange={setAuthMode}
        onAuthFormChange={setAuthForm}
        onOpenAuth={openAuth}
        onCloseAuth={closeAuth}
        onLandingSectionChange={setLandingSection}
        onGuestProcess={handleGuestProcess}
        onAuthSubmit={handleAuthSubmit}
        onGoogleLogin={handleGoogleLogin}
      />
    );
  }

  const currentUser = account.user;
  const currentUsage = account.usage;
  const activePanelMeta = PANEL_META[activePanel];

  return (
    <div className="app-shell">
      <div className="dashboard-shell">
        <AppSidebar
          currentUser={currentUser}
          activePanel={activePanel}
          canUseAdmin={canUseAdmin}
          onSelectPanel={setActivePanel}
        />

        <div className="content-shell">
          <header className="content-topbar">
            <div>
              <span className="eyebrow">{activePanelMeta.eyebrow}</span>
              <h1>{activePanelMeta.title}</h1>
              {activePanelMeta.description ? <p>{activePanelMeta.description}</p> : null}
            </div>
            <button className="ghost-btn icon-btn" onClick={clearAuth} aria-label="Logout" title="Logout">
              <LogOut size={16} />
            </button>
          </header>

          <main className="content-stack">
            {activePanel === 'workspace' && (
              <WorkspacePanel
                currentUser={currentUser}
                currentUsageRemainingToday={currentUsage.remainingToday}
                url={url}
                language={language}
                isProcessing={isProcessing}
                currentStatus={currentStatus}
                hasPartialSummary={hasPartialSummary}
                progress={progress}
                error={error}
                videos={videos}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                onUrlChange={setUrl}
                onLanguageChange={setLanguage}
                onProcess={handleProcess}
                onCancel={handleCancel}
                onSelectVideo={setSelectedVideo}
                onRequestDelete={setVideoToDelete}
                onPreviousPage={() => setCurrentPage((value) => Math.max(1, value - 1))}
                onNextPage={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
              />
            )}

            {activePanel === 'account' && (
              <AccountPanel
                currentUser={currentUser}
                currentUsage={currentUsage}
                premiumUpgradeRequest={premiumUpgradeRequest}
                hasPendingUpgradeRequest={hasPendingUpgradeRequest}
                isUpgrading={isUpgrading}
                onUpgradeRequest={() => void handleUpgradeRequest()}
              />
            )}

            {activePanel === 'admin-dashboard' && canUseAdmin && (
              <AdminDashboardPanel
                adminOverview={adminOverview}
                adminLoading={adminLoading}
                onApproveRequest={(requestId) => void handleApproveUpgradeRequest(requestId)}
                onCancelRequest={(requestId) => void handleCancelUpgradeRequest(requestId)}
                onRefresh={() => void fetchAdminOverview()}
              />
            )}

            {activePanel === 'admin-logins' && canUseAdmin && (
              <AdminLoginsPanel
                adminOverview={adminOverview}
                adminLoading={adminLoading}
                onRefresh={() => void fetchAdminOverview()}
              />
            )}

            {activePanel === 'admin-users' && canUseAdmin && (
              <AdminUsersPanel
                adminOverview={adminOverview}
                onSaveUser={handleAdminSaveUser}
              />
            )}
          </main>
        </div>
      </div>

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
}

export default App;
