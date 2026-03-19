import type { FormEvent } from 'react';
import { AlertCircle, Loader2, LogIn, Send, UserPlus } from 'lucide-react';
import { LANGUAGE_OPTIONS } from '../../constants/languages';
import type { AuthFormState, AuthMode } from '../../types/app';

interface AuthScreenProps {
  url: string;
  language: string;
  authMode: AuthMode;
  authForm: AuthFormState;
  authLoading: boolean;
  authError: string | null;
  onUrlChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onAuthModeChange: (mode: AuthMode) => void;
  onAuthFormChange: (value: AuthFormState) => void;
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
  onUrlChange,
  onLanguageChange,
  onAuthModeChange,
  onAuthFormChange,
  onGuestProcess,
  onAuthSubmit,
  onGoogleLogin,
}: AuthScreenProps) {
  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel-landing">
        <div className="landing-card">
          <span className="eyebrow">TubeDoc</span>
          <h1>Translate YouTube links into clean transcripts and summaries.</h1>
          <p className="landing-copy">
            Start with a link. We&apos;ll ask you to login only when you&apos;re ready to continue
            processing.
          </p>

          <form className="landing-form" onSubmit={onGuestProcess}>
            <input
              type="text"
              placeholder="Paste a YouTube URL"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
            />
            <div className="landing-form-row">
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
        </div>

        <div className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow">Continue</span>
            <h1>{authMode === 'login' ? 'Login' : 'Create account'}</h1>
            <p>
              {authMode === 'login'
                ? 'Access your workspace.'
                : 'Create a new account to continue.'}
            </p>
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
                onChange={(event) =>
                  onAuthFormChange({ ...authForm, name: event.target.value })
                }
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
              onChange={(event) =>
                onAuthFormChange({ ...authForm, password: event.target.value })
              }
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
        </div>
      </div>
    </div>
  );
}
