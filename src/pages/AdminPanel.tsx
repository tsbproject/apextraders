// src/pages/AdminPanel.tsx

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
  Loader2,
  Crown,
  AlertTriangle,
} from 'lucide-react';

import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { extractErrorMessage } from '../store/authSlice';
import { useAppSelector } from '../store/hooks';

// ==========================================
// TYPES
// ==========================================

export type UserRole =
  | 'USER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  rankTier: string;
  demoBalance: number;
  createdAt: string;
}

interface UpdateRoleResponse {
  message: string;
  data?: UserRecord;
}

// ==========================================
// ROLE STYLES
// ==========================================

const getRoleStyles = (role: UserRole): string => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'border-purple-500/30 bg-purple-500/20 text-purple-400';

    case 'ADMIN':
      return 'border-amber-500/30 bg-amber-500/20 text-amber-400';

    case 'USER':
    default:
      return 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400';
  }
};

const getRankStyles = (rankTier: string): string => {
  switch (rankTier.toUpperCase()) {
    case 'ELITE':
      return 'border-purple-500/30 bg-purple-500/10 text-purple-300';

    case 'DIAMOND':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';

    case 'GOLD':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';

    case 'SILVER':
      return 'border-slate-400/30 bg-slate-400/10 text-slate-300';

    default:
      return 'border-orange-700/30 bg-orange-700/10 text-orange-300';
  }
};

// ==========================================
// COMPONENT
// ==========================================

const AdminPanel: React.FC = () => {
  const [users, setUsers] =
    useState<UserRecord[]>([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [refreshing, setRefreshing] =
    useState<boolean>(false);

  const [updatingUserId, setUpdatingUserId] =
    useState<string | null>(null);

  const { notifySuccess, notifyError } =
    useNotification();

  // Logged-in admin
  const currentUser = useAppSelector(
    (state) => state.auth.user
  );

  const currentUserRole =
    currentUser?.role
      ? String(currentUser.role).toUpperCase()
      : '';

  const isSuperAdmin =
    currentUserRole === 'SUPER_ADMIN' ||
    currentUserRole === 'SUPERADMIN';

  // ==========================================
  // FETCH USERS
  // ==========================================

  const fetchUsers = useCallback(
    async (showRefreshLoader = false): Promise<void> => {
      try {
        if (showRefreshLoader) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await api.get<UserRecord[]>(
            '/admin/users'
          );

        setUsers(response.data);
      } catch (error: unknown) {
        notifyError(
          extractErrorMessage(
            error,
            'Failed to load system users.'
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [notifyError]
  );

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // ==========================================
  // ROLE CHANGE
  // ==========================================

  const handleRoleChange = async (
    targetUser: UserRecord,
    newRole: UserRole
  ): Promise<void> => {
    // ------------------------------------------
    // Only SUPER_ADMIN can delegate roles
    // ------------------------------------------

    if (!isSuperAdmin) {
      notifyError(
        'Only a Super Admin can modify platform roles.'
      );
      return;
    }

    // ------------------------------------------
    // No-op
    // ------------------------------------------

    if (targetUser.role === newRole) {
      return;
    }

    // ------------------------------------------
    // Prevent self-demotion
    // ------------------------------------------

    if (
      currentUser?.id === targetUser.id &&
      newRole !== 'SUPER_ADMIN'
    ) {
      notifyError(
        'You cannot revoke your own Super Admin privilege.'
      );
      return;
    }

    // ------------------------------------------
    // Build confirmation message
    // ------------------------------------------

    let confirmationMessage =
      `Change ${targetUser.username}'s role from ` +
      `${targetUser.role} to ${newRole}?`;

    if (newRole === 'SUPER_ADMIN') {
      confirmationMessage =
        `Grant SUPER_ADMIN access to "${targetUser.username}"?\n\n` +
        'This grants full administrative control, including the ability ' +
        'to manage user roles and privileged platform operations.';
    } else if (
      targetUser.role === 'SUPER_ADMIN'
    ) {
      confirmationMessage =
        `Remove SUPER_ADMIN access from "${targetUser.username}"?\n\n` +
        `Their new role will be ${newRole}.`;
    } else if (newRole === 'ADMIN') {
      confirmationMessage =
        `Promote "${targetUser.username}" to ADMIN?\n\n` +
        'Admins can access administrative platform controls.';
    } else if (
      targetUser.role === 'ADMIN' &&
      newRole === 'USER'
    ) {
      confirmationMessage =
        `Remove ADMIN privileges from "${targetUser.username}"?\n\n` +
        'They will return to a standard USER account.';
    }

    const confirmed =
      window.confirm(confirmationMessage);

    if (!confirmed) {
      return;
    }

    // ------------------------------------------
    // Update role
    // ------------------------------------------

    setUpdatingUserId(targetUser.id);

    try {
      const response =
        await api.patch<UpdateRoleResponse>(
          `/admin/users/${targetUser.id}/role`,
          {
            role: newRole,
          }
        );

      // Prefer authoritative backend response.
      if (response.data.data) {
        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === targetUser.id
              ? response.data.data as UserRecord
              : user
          )
        );
      } else {
        // Fallback if backend response changes.
        await fetchUsers();
      }

      notifySuccess(
        `${targetUser.username} is now ${newRole}.`
      );
    } catch (error: unknown) {
      notifyError(
        extractErrorMessage(
          error,
          'Failed to update user role.'
        )
      );

      // Reload authoritative state in case
      // request partially succeeded.
      await fetchUsers();
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ==========================================
  // STATS
  // ==========================================

  const totalUsers = users.length;

  const adminCount = users.filter(
    (user) => user.role === 'ADMIN'
  ).length;

  const superAdminCount = users.filter(
    (user) => user.role === 'SUPER_ADMIN'
  ).length;

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="space-y-6">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400">
              RESTRICTED AREA
            </span>

            <span className="text-xs text-slate-400">
              System Governance
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-white">
            {isSuperAdmin
              ? 'Super Admin Control Center'
              : 'Admin Control Center'}
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Manage user accounts, platform permissions
            and administrative access.
          </p>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() =>
            void fetchUsers(true)
          }
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />

          {refreshing
            ? 'Refreshing...'
            : 'Refresh'}
        </button>
      </div>

      {/* ======================================
          ACCESS NOTICE
      ====================================== */}

      {!isSuperAdmin && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <Shield
            size={19}
            className="mt-0.5 shrink-0 text-amber-400"
          />

          <div>
            <p className="text-sm font-semibold text-amber-300">
              Read-only role management
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Your ADMIN account can view system
              users, but only a SUPER_ADMIN can
              promote, demote or delegate
              administrative roles.
            </p>
          </div>
        </div>
      )}

      {/* ======================================
          SUMMARY
      ====================================== */}

      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                <Users size={18} />
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Total Users
                </p>

                <p className="text-xl font-bold text-white">
                  {totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <ShieldCheck size={18} />
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Admins
                </p>

                <p className="text-xl font-bold text-white">
                  {adminCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                <Crown size={18} />
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Super Admins
                </p>

                <p className="text-xl font-bold text-white">
                  {superAdminCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          USER TABLE
      ====================================== */}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
        <div className="mb-5 flex items-center gap-2">
          <UserCog
            size={20}
            className="text-indigo-400"
          />

          <h2 className="text-lg font-bold text-white">
            User Accounts & Roles
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2
              size={30}
              className="animate-spin text-emerald-500"
            />

            <p className="text-xs uppercase tracking-widest text-slate-500">
              Loading system users
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users
              size={34}
              className="mx-auto mb-3 text-slate-600"
            />

            <p className="font-semibold text-slate-300">
              No users found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">
                    User
                  </th>

                  <th className="px-4 py-3">
                    Email
                  </th>

                  <th className="px-4 py-3">
                    Rank Tier
                  </th>

                  <th className="px-4 py-3">
                    Current Role
                  </th>

                  <th className="px-4 py-3 text-right">
                    Role Delegation
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {users.map((user) => {
                  const isCurrentUser =
                    currentUser?.id === user.id;

                  const isUpdating =
                    updatingUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-800/30"
                    >
                      {/* USERNAME */}

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {user.username}
                          </span>

                          {isCurrentUser && (
                            <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-indigo-400">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* EMAIL */}

                      <td className="px-4 py-3.5 text-slate-400">
                        {user.email}
                      </td>

                      {/* RANK */}

                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded border px-2 py-1 text-xs font-medium ${getRankStyles(
                            user.rankTier
                          )}`}
                        >
                          {user.rankTier}
                        </span>
                      </td>

                      {/* ROLE */}

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-bold ${getRoleStyles(
                            user.role
                          )}`}
                        >
                          {user.role ===
                            'SUPER_ADMIN' && (
                            <Crown size={11} />
                          )}

                          {user.role ===
                            'ADMIN' && (
                            <ShieldCheck
                              size={11}
                            />
                          )}

                          {user.role}
                        </span>
                      </td>

                      {/* ROLE CONTROL */}

                      <td className="px-4 py-3.5 text-right">
                        {isUpdating ? (
                          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs text-slate-400">
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />

                            Updating...
                          </div>
                        ) : !isSuperAdmin ? (
                          <span className="text-xs text-slate-600">
                            SUPER_ADMIN required
                          </span>
                        ) : isCurrentUser &&
                          user.role ===
                            'SUPER_ADMIN' ? (
                          <div
                            className="inline-flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-400"
                            title="You cannot demote your own Super Admin account."
                          >
                            <Shield size={13} />
                            Protected
                          </div>
                        ) : (
                          <select
                            value={user.role}
                            disabled={
                              updatingUserId !== null
                            }
                            onChange={(
                              event: React.ChangeEvent<HTMLSelectElement>
                            ) => {
                              const newRole =
                                event.target
                                  .value as UserRole;

                              void handleRoleChange(
                                user,
                                newRole
                              );
                            }}
                            className="min-w-[175px] cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="USER">
                              USER
                            </option>

                            <option value="ADMIN">
                              ADMIN
                            </option>

                            <option value="SUPER_ADMIN">
                              SUPER_ADMIN
                            </option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================
          SECURITY NOTICE
      ====================================== */}

      {isSuperAdmin && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/10 bg-rose-500/5 p-4">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-rose-400"
          />

          <p className="text-xs leading-5 text-slate-400">
            <span className="font-semibold text-rose-300">
              Privileged operation:
            </span>{' '}
            SUPER_ADMIN grants should only be
            assigned to trusted platform operators.
            Role changes are enforced by the backend
            and require SUPER_ADMIN authorization.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;