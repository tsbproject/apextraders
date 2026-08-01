import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setAuthStart, setAuthSuccess, setAuthFailure } from '../../store/authSlice';
import { api } from '../../services/api';

// Access notification context helpers based on project standards
import { useNotification } from '../../context/NotificationContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const dispatch = useDispatch();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  const { notifySuccess, notifyError } = useNotification();

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setAuthStart());

    try {
      if (mode === 'login') {
        const response = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password,
        });

        const { user, token, message } = response.data;
        dispatch(setAuthSuccess({ user, token }));
        notifySuccess(message || 'Welcome back to ApexTraders!');
        onClose();
      } else {
        const response = await api.post('/auth/register', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });

        const { user, token, message } = response.data;
        dispatch(setAuthSuccess({ user, token }));
        notifySuccess(message || 'Account created successfully!');
        onClose();
      }
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
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-xl font-bold"
        >
          ✕
        </button>

        {/* Header Tabs */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`pb-3 font-semibold text-lg flex-1 text-center border-b-2 transition-colors ${
              mode === 'login'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`pb-3 font-semibold text-lg flex-1 text-center border-b-2 transition-colors ${
              mode === 'register'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition-all shadow-lg shadow-emerald-600/20 flex justify-center items-center"
          >
            {isLoading ? (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-5 w-5" />
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Register & Start Trading'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};