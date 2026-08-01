import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface ProtectedRouteProps {
  allowedRoles?: Array<'USER' | 'ADMIN' | 'SUPER_ADMIN'>;
  redirectPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  redirectPath = '/',
}) => {
  const { isAuthenticated, user, isLoading } = useSelector(
    (state: RootState) => state.auth
  );
  const location = useLocation();

  // 1. Show loading spinner during session auto-hydration
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-400">Authenticating session...</p>
        </div>
      </div>
    );
  }

  // 2. Redirect unauthenticated users to home page (or trigger login)
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // 3. Role-Based Access Control (RBAC) check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="max-w-md rounded-2xl border border-rose-500/20 bg-rose-950/20 p-8 text-rose-200">
          <span className="text-4xl">🚫</span>
          <h2 className="mt-4 text-xl font-bold">Access Denied</h2>
          <p className="mt-2 text-sm text-slate-400">
            You do not have permission to view this section. Requires{' '}
            <span className="font-semibold text-rose-400">{allowedRoles.join(' or ')}</span> privilege.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Render child routes
  return <Outlet />;
};