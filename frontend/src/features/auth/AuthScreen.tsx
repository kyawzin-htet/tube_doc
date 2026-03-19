import { format } from 'date-fns';
import type { FormEvent } from 'react';
import { AlertCircle, Loader2, LogIn, Send, UserPlus, X } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '../../constants/languages';
import type { AuthFormState, AuthMode, Video } from '../../types/app';

type LandingSection = 'summaries' | 'pricing';

interface AuthScreenProps {
  url: string;
  language: string;
  authMode: AuthMode;
  authForm: AuthFormState;
  authLoading: boolean;
  authError: string | null;
  authOpen: boolean;
  landingSection: LandingSection;
  latestSummaries: Video[];
  latestSummariesLoading: boolean;
  onUrlChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onAuthModeChange: (mode: AuthMode) => void;
  onAuthFormChange: (value: AuthFormState) => void;
  onOpenAuth: (mode: AuthMode) => void;
  onCloseAuth: () => void;
  onLandingSectionChange: (section: LandingSection) => void;
  onGuestProcess: (event: FormEvent) => void;
  onAuthSubmit: (event: FormEvent) => void;
  onGoogleLogin: () => void;
}

export function AuthScreen({
  url,
  language,
  authMode,
  authForm,
  authLoading,
  authError,
  authOpen,
  landingSection,
  latestSummaries,
  latestSummariesLoading,
  onUrlChange,
  onLanguageChange,
  onAuthModeChange,
  onAuthFormChange,
  onOpenAuth,
  onCloseAuth,
  onLandingSectionChange,
  onGuestProcess,
  onAuthSubmit,
  onGoogleLogin,
}: AuthScreenProps) {
  return (
    <div className="landing-screen">
      <section className="landing-hero">
        <header className="landing-nav">
          <div className="landing-brand">
            <span className="eyebrow">TubeDoc</span>
          </div>
          <div className="landing-nav-links">
            <button
              className={`landing-nav-pill ${landingSection === 'summaries' ? 'landing-nav-pill-active' : ''}`}
              onClick={() => onLandingSectionChange('summaries')}
            >
              Summaries
            </button>
            <button
              className={`landing-nav-pill ${landingSection === 'pricing' ? 'landing-nav-pill-active' : ''}`}
              onClick={() => onLandingSectionChange('pricing')}
            >
              Pricing
            </button>
          </div>
          <button className="ghost-btn landing-nav-cta" onClick={() => onOpenAuth('login')}>
            Login
          </button>
        </header>

        <div className="landing-hero-body">
          <div className="landing-copy-block">
            <span className="eyebrow">AI-assisted transcription</span>
            <h1>Turn YouTube videos into transcripts and summaries with a clean workflow.</h1>
            <p className="landing-copy">
              Start with a link, choose a language, and move into a secure workspace with usage
              tracking and exports.
            </p>

            {/* <div className="landing-cta-row">
              <button className="ghost-btn landing-secondary-cta" onClick={() => onOpenAuth('login')}>
                Login
              </button>
            </div> */}

            <form className="landing-form landing-form-hero" onSubmit={onGuestProcess}>
              <div className="landing-form-row landing-form-row-single">
                <input
                  type="text"
                  placeholder="Paste a YouTube URL"
                  value={url}
                  onChange={(event) => onUrlChange(event.target.value)}
                />
                <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="primary-btn icon-btn"
                  aria-label="Process link"
                  title="Process link"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>

            <div className="landing-note">
              <span>Login is required before processing begins.</span>
            </div>

            <section className="landing-section">
              {landingSection === 'summaries' ? (
                <div className="landing-section-card table-card">
                  <div className="section-header">
                    <h2>Latest summaries</h2>
                    <span className="muted small">5 latest</span>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Preview</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestSummariesLoading ? (
                          <tr>
                            <td colSpan={3}>
                              <div className="empty-state">Loading summaries...</div>
                            </td>
                          </tr>
                        ) : latestSummaries.length ? (
                          latestSummaries.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <div className="table-title">{item.title}</div>
                                <div className="table-subtitle">{item.videoId}</div>
                              </td>
                              <td>
                                <div className="summary-text">{item.summary}</div>
                              </td>
                              <td>{format(new Date(item.createdAt), 'MMM d')}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3}>
                              <div className="empty-state">No summaries yet.</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="landing-section-card landing-coming-soon">
                  <h2>Pricing</h2>
                  <div className="muted">Comming soon</div>
                </div>
              )}
            </section>
          </div>
        </div>
        {authOpen && (
          <div className="landing-auth-overlay" onClick={onCloseAuth}>
            <aside className="auth-card landing-auth-modal" onClick={(event) => event.stopPropagation()}>
              <div className="landing-auth-header">
                <div className="auth-heading">
                  <span className="eyebrow">Continue</span>
                  <h1>{authMode === 'login' ? 'Login' : 'Create account'}</h1>
                  <p>
                    {authMode === 'login'
                      ? 'Access your workspace.'
                      : 'Create a new account to continue.'}
                  </p>
                </div>
                <button className="ghost-btn icon-btn" onClick={onCloseAuth} aria-label="Close login" title="Close login">
                  <X size={18} />
                </button>
              </div>

              <div className="auth-tabs">
                <button
                  className={authMode === 'login' ? 'tab-active' : 'tab-idle'}
                  onClick={() => onAuthModeChange('login')}
                >
                  Login
                </button>
                <button
                  className={authMode === 'signup' ? 'tab-active' : 'tab-idle'}
                  onClick={() => onAuthModeChange('signup')}
                >
                  Sign Up
                </button>
              </div>

              <form className="auth-form" onSubmit={onAuthSubmit}>
                {authMode === 'signup' && (
                  <input
                    type="text"
                    placeholder="Full name"
                    value={authForm.name}
                    onChange={(event) => onAuthFormChange({ ...authForm, name: event.target.value })}
                  />
                )}
                <input
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={(event) => onAuthFormChange({ ...authForm, email: event.target.value })}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(event) => onAuthFormChange({ ...authForm, password: event.target.value })}
                />

                {authError && (
                  <div className="inline-error">
                    <AlertCircle size={16} />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-btn icon-btn"
                  disabled={authLoading}
                  aria-label={authMode === 'login' ? 'Login' : 'Create account'}
                  title={authMode === 'login' ? 'Login' : 'Create account'}
                >
                  {authLoading ? (
                    <Loader2 className="spinning" size={16} />
                  ) : authMode === 'login' ? (
                    <LogIn size={16} />
                  ) : (
                    <UserPlus size={16} />
                  )}
                </button>
              </form>

              <div className="divider">
                <span>or</span>
              </div>

              <button className="ghost-btn full-width" onClick={onGoogleLogin}>
                Continue with Google
              </button>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
