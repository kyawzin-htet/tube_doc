import type { FormEvent } from 'react';
import { AlertCircle, Loader2, LogIn, UserPlus, X } from 'lucide-react';
import type { AuthFormState, AuthMode } from '../../types/app';

interface AuthModalProps {
  isOpen: boolean;
  mode: AuthMode;
  form: AuthFormState;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onFormChange: (form: AuthFormState) => void;
  onSubmit: (event: FormEvent) => void;
  onGoogleLogin: () => void;
}

export function AuthModal({
  isOpen,
  mode,
  form,
  loading,
  error,
  onClose,
  onModeChange,
  onFormChange,
  onSubmit,
  onGoogleLogin,
}: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="landing-auth-overlay" onClick={onClose}>
      <aside className="auth-card landing-auth-modal" onClick={(event) => event.stopPropagation()}>
        <div className="landing-auth-header">
          <div className="auth-heading">
            <span className="eyebrow">Continue</span>
            <h1>{mode === 'login' ? 'Login' : 'Create account'}</h1>
            <p>
              {mode === 'login'
                ? 'Access your workspace.'
                : 'Create a new account to continue.'}
            </p>
          </div>
          <button className="ghost-btn icon-btn" onClick={onClose} aria-label="Close login" title="Close login">
            <X size={18} />
          </button>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'tab-active' : 'tab-idle'}
            onClick={() => onModeChange('login')}
          >
            Login
          </button>
          <button
            className={mode === 'signup' ? 'tab-active' : 'tab-idle'}
            onClick={() => onModeChange('signup')}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => onFormChange({ ...form, email: event.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => onFormChange({ ...form, password: event.target.value })}
          />

          {error && (
            <div className="inline-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="primary-btn icon-btn"
            disabled={loading}
            aria-label={mode === 'login' ? 'Login' : 'Create account'}
            title={mode === 'login' ? 'Login' : 'Create account'}
          >
            {loading ? (
              <Loader2 className="spinning" size={16} />
            ) : mode === 'login' ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          className="ghost-btn full-width"
          onClick={onGoogleLogin}
          disabled
          title="Google login is currently disabled"
        >
          Continue with Google
        </button>
      </aside>
    </div>
  );
}
