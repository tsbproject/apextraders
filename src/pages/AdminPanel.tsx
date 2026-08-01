import React, { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';

// Explicit type for user roles
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

// Explicit type for user records
export interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  rankTier: string;
  createdAt: string;
}

// Explicit type for API error responses from backend
export interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { notifySuccess, notifyError } = useNotification();

  // Helper function to extract type-safe error messages without using `any`
  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof AxiosError) {
      const serverData = error.response?.data as ApiErrorResponse | undefined;
      return serverData?.message || serverData?.error || error.message || fallback;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  };

  // Memoized fetch handler using Axios Generics: api.get<T>()
  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.get<UserRecord[]>('/admin/users');
      setUsers(response.data);
    } catch (err: unknown) {
      notifyError(getErrorMessage(err, 'Failed to load system users.'));
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: UserRole): Promise<void> => {
    try {
      await api.patch<{ message: string; user: UserRecord }>(
        `/admin/users/${userId}/role`, 
        { role: newRole }
      );
      
      notifySuccess(`User role updated to ${newRole}`);
      setUsers((prev: UserRecord[]) =>
        prev.map((u: UserRecord) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: unknown) {
      notifyError(getErrorMessage(err, 'Failed to update user role.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
              RESTRICTED AREA
            </span>
            <span className="text-xs text-slate-400">System Governance</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white">Super Admin Control Center</h1>
          <p className="text-sm text-slate-400">
            Manage user roles, platform permissions, and oversee platform performance.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      {/* User Management Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6">
        <h2 className="text-lg font-bold text-white mb-4">User Accounts & Roles</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rank Tier</th>
                  <th className="px-4 py-3">Current Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u: UserRecord) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-white">{u.username}</td>
                    <td className="px-4 py-3.5 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 border border-slate-700">
                        {u.rankTier}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : u.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <select
                        value={u.role}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleRoleChange(u.id, e.target.value as UserRole)
                        }
                        className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                      >
                        <option value="USER">Make USER</option>
                        <option value="ADMIN">Promote to ADMIN</option>
                        <option value="SUPER_ADMIN">Grant SUPER_ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;