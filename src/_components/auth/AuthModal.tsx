import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setAuthStart, setAuthSuccess, setAuthFailure } from '../../store/authSlice';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { NavigationTab } from '../../App';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  onLoginSuccess?: (role?: string) => void; // 👈 Added callback
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<'forgot' | 'reset' | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const resetToken = new URLSearchParams(window.location.search).get('resetToken');
  const activeRecoveryMode = recoveryMode || (resetToken ? 'reset' : null);
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  const { notifySuccess, notifyError } = useNotification();

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setRecoveryMessage('');
    try {
      const isReset = activeRecoveryMode === 'reset';
      const response = await api.post(isReset ? '/auth/reset-password' : '/auth/forgot-password',
        isReset ? { token: resetToken, password: resetPassword } : { email: formData.email });
      setRecoveryMessage(response.data.message);
      if (isReset) {
        window.history.replaceState({}, '', window.location.pathname);
        setRecoveryMode(null);
        setResetPassword('');
        notifySuccess('Password reset successfully. Please sign in with your new password.');
      }
    } catch (error: any) {
      setRecoveryMessage(error?.response?.data?.message || 'Unable to process the request. Please try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setAuthStart());

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        mode === 'login'
          ? { email: formData.email, password: formData.password }
          : { username: formData.username, email: formData.email, password: formData.password };

      const response = await api.post(endpoint, payload);
      const { user, token, message } = response.data;

      dispatch(setAuthSuccess({ user, token }));
      notifySuccess(message || (mode === 'login' ? 'Welcome back to ApexTraders!' : 'Account created successfully!'));

      // 🎯 Direct tab switch based on user role
      if (onLoginSuccess) {
        onLoginSuccess(user?.role);
      }

      onClose();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Authentication failed. Please check your credentials.';
      dispatch(setAuthFailure(errorMessage));
      notifyError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-xl font-bold cursor-pointer"
        >
          ✕
        </button>

        {/* Header Tabs */}
        {!activeRecoveryMode && <div className="flex border-b border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`pb-3 font-semibold text-lg flex-1 text-center border-b-2 transition-colors cursor-pointer ${
              mode === 'login'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`pb-3 font-semibold text-lg flex-1 text-center border-b-2 transition-colors cursor-pointer ${
              mode === 'register'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>}

        {activeRecoveryMode && <div className="mb-6"><h2 className="text-xl font-bold text-white">{activeRecoveryMode === 'reset' ? 'Choose a new password' : 'Forgot password?'}</h2><p className="mt-2 text-sm text-slate-400">{activeRecoveryMode === 'reset' ? 'Enter a new password to recover your account.' : 'Enter your account email to request a reset link.'}</p></div>}

        {/* Form Body */}
        {activeRecoveryMode ? <form onSubmit={handleRecovery} className="space-y-4">
          {activeRecoveryMode === 'forgot' ? <input type="email" required autoComplete="email" value={formData.email} onChange={e => setFormData(v => ({ ...v, email: e.target.value }))} placeholder="Your email address" aria-label="Account email" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white" /> :
          <div className="relative"><input type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={128} autoComplete="new-password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="New password (at least 8 characters)" aria-label="New password" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 pr-12 text-white" /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>}
          <button type="submit" disabled={recoveryLoading} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-50">{recoveryLoading ? 'Please wait...' : activeRecoveryMode === 'reset' ? 'Reset password' : 'Send reset link'}</button>
          {recoveryMessage && <p role="status" className="text-sm text-slate-300">{recoveryMessage}</p>}
          <button type="button" onClick={() => { window.history.replaceState({}, '', window.location.pathname); setRecoveryMode(null); setRecoveryMessage(''); }} className="w-full text-sm text-indigo-300 hover:text-white">Back to sign in</button>
        </form> : <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="ApexTrader99"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="trader@apextraders.com"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Password
            </label>
            <div className="relative"><input
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full pl-4 pr-12 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition-all shadow-lg shadow-emerald-600/20 flex justify-center items-center cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-5 w-5" />
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Register & Start Trading'
            )}
          </button>
        </form>}
        {!activeRecoveryMode && mode === 'login' && <button type="button" onClick={() => { setRecoveryMode('forgot'); setRecoveryMessage(''); }} className="mt-4 w-full text-center text-sm text-indigo-300 hover:text-white">Forgot password?</button>}
      </div>
    </div>
  );
};