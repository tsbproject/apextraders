// src/pages/AdminTournaments.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  Trophy,
  Plus,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Loader2,
  CalendarDays,
  Users,
  Clock3,
} from 'lucide-react';

import { api } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { extractErrorMessage } from '../store/authSlice';

// ==========================================
// TYPES
// ==========================================

type TournamentStatus =
  | 'UPCOMING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED';

interface Tournament {
  id: string;
  title: string;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  participantCount: number;
}

interface TournamentApiResponse {
  message: string;
  data?: Tournament;
}

// ==========================================
// HELPERS
// ==========================================

const formatDateTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusStyles = (status: TournamentStatus): string => {
  switch (status) {
    case 'ACTIVE':
      return 'border border-emerald-500/20 bg-emerald-500/15 text-emerald-400';

    case 'PAUSED':
      return 'border border-amber-500/20 bg-amber-500/15 text-amber-400';

    case 'UPCOMING':
      return 'border border-indigo-500/20 bg-indigo-500/15 text-indigo-400';

    case 'COMPLETED':
      return 'border border-slate-600/30 bg-slate-700/50 text-slate-300';

    default:
      return 'border border-slate-600/30 bg-slate-700 text-slate-300';
  }
};

// ==========================================
// COMPONENT
// ==========================================

const AdminTournaments: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Track individual tournament operations
  const [updatingTournamentId, setUpdatingTournamentId] =
    useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { notifySuccess, notifyError } = useNotification();

  // ==========================================
  // FETCH TOURNAMENTS
  // ==========================================

  const fetchTournaments = useCallback(async (): Promise<void> => {
    try {
      const response =
        await api.get<Tournament[]>('/admin/tournaments');

      setTournaments(response.data);
    } catch (error: unknown) {
      notifyError(
        extractErrorMessage(
          error,
          'Failed to load tournaments.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  // ==========================================
  // CREATE TOURNAMENT
  // ==========================================

  const handleCreateTournament = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const cleanTitle = title.trim();

    if (!cleanTitle || !startDate || !endDate) {
      notifyError(
        'Tournament title, start date, and end date are required.'
      );
      return;
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      notifyError('Please provide valid tournament dates.');
      return;
    }

    if (parsedEndDate <= parsedStartDate) {
      notifyError(
        'Tournament end date must be later than the start date.'
      );
      return;
    }

    // If the tournament begins in the future, create it as UPCOMING.
    // Otherwise it may begin immediately.
    const initialStatus: TournamentStatus =
      parsedStartDate.getTime() > Date.now()
        ? 'UPCOMING'
        : 'ACTIVE';

    setIsSubmitting(true);

    try {
      const response =
        await api.post<TournamentApiResponse>(
          '/admin/tournaments',
          {
            title: cleanTitle,
            startDate: parsedStartDate.toISOString(),
            endDate: parsedEndDate.toISOString(),
            status: initialStatus,
          }
        );

      notifySuccess(
        initialStatus === 'UPCOMING'
          ? 'Tournament scheduled successfully!'
          : 'Tournament created and activated successfully!'
      );

      setTitle('');
      setStartDate('');
      setEndDate('');

      // Add returned tournament immediately when possible.
      if (response.data.data) {
        setTournaments((current) => [
          response.data.data as Tournament,
          ...current,
        ]);
      } else {
        await fetchTournaments();
      }
    } catch (error: unknown) {
      notifyError(
        extractErrorMessage(
          error,
          'Could not create tournament.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // STATUS MANAGEMENT
  // ==========================================

  const handleStatusChange = async (
    tournament: Tournament,
    newStatus: TournamentStatus
  ): Promise<void> => {
    if (updatingTournamentId) {
      return;
    }

    // COMPLETED is treated as terminal in the UI.
    if (tournament.status === 'COMPLETED') {
      notifyError(
        'Completed tournaments cannot be modified.'
      );
      return;
    }

    if (newStatus === 'COMPLETED') {
      const confirmed = window.confirm(
        `Complete "${tournament.title}"?\n\n` +
          'This will mark the tournament as finished. ' +
          'Completed tournaments cannot be reactivated from this control panel.'
      );

      if (!confirmed) {
        return;
      }
    }

    setUpdatingTournamentId(tournament.id);

    try {
      const response =
        await api.patch<TournamentApiResponse>(
          `/admin/tournaments/${tournament.id}/status`,
          {
            status: newStatus,
          }
        );

      // Update immediately using backend response.
      if (response.data.data) {
        setTournaments((current) =>
          current.map((item) =>
            item.id === tournament.id
              ? (response.data.data as Tournament)
              : item
          )
        );
      } else {
        await fetchTournaments();
      }

      switch (newStatus) {
        case 'ACTIVE':
          notifySuccess(
            `"${tournament.title}" is now active.`
          );
          break;

        case 'PAUSED':
          notifySuccess(
            `"${tournament.title}" has been paused.`
          );
          break;

        case 'COMPLETED':
          notifySuccess(
            `"${tournament.title}" has been completed.`
          );
          break;

        case 'UPCOMING':
          notifySuccess(
            `"${tournament.title}" is now scheduled as upcoming.`
          );
          break;
      }
    } catch (error: unknown) {
      notifyError(
        extractErrorMessage(
          error,
          'Failed to update tournament status.'
        )
      );
    } finally {
      setUpdatingTournamentId(null);
    }
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="animate-spin text-indigo-400"
            size={32}
          />

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Loading Tournament Control
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="space-y-8 p-6 text-white">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400">
            <Trophy size={28} />
          </div>

          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Tournament Control Center
            </h1>

            <p className="text-xs text-slate-400">
              Manage Apex trading competitions, schedules & statuses
            </p>
          </div>
        </div>
      </div>

      {/* ======================================
          CREATE TOURNAMENT
      ====================================== */}

      <form
        onSubmit={handleCreateTournament}
        className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/50 p-6"
      >
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-400">
          <Plus size={16} />
          Create New Tournament
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* TITLE */}

          <div>
            <label
              htmlFor="tournament-title"
              className="mb-1.5 block text-xs font-semibold text-slate-400"
            >
              Tournament Title
            </label>

            <input
              id="tournament-title"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Weekly Apex Challenge"
              maxLength={100}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* START */}

          <div>
            <label
              htmlFor="tournament-start"
              className="mb-1.5 block text-xs font-semibold text-slate-400"
            >
              Start Date & Time
            </label>

            <input
              id="tournament-start"
              type="datetime-local"
              value={startDate}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              disabled={isSubmitting}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* END */}

          <div>
            <label
              htmlFor="tournament-end"
              className="mb-1.5 block text-xs font-semibold text-slate-400"
            >
              End Date & Time
            </label>

            <input
              id="tournament-end"
              type="datetime-local"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) =>
                setEndDate(event.target.value)
              }
              disabled={isSubmitting}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* Scheduling hint */}

        <div className="flex items-start gap-2 rounded-xl border border-indigo-500/10 bg-indigo-500/5 px-4 py-3">
          <Clock3
            size={15}
            className="mt-0.5 shrink-0 text-indigo-400"
          />

          <p className="text-xs leading-5 text-slate-400">
            A tournament scheduled for a future start time will
            initially be marked{' '}
            <span className="font-bold text-indigo-400">
              UPCOMING
            </span>
            . A tournament whose start time has already arrived
            will be created as{' '}
            <span className="font-bold text-emerald-400">
              ACTIVE
            </span>
            .
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <Plus size={16} />
          )}

          <span>
            {isSubmitting
              ? 'Creating...'
              : 'Create Tournament'}
          </span>
        </button>
      </form>

      {/* ======================================
          TOURNAMENT LIST
      ====================================== */}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Existing Tournaments
          </h2>

          <span className="text-xs text-slate-500">
            {tournaments.length}{' '}
            {tournaments.length === 1
              ? 'Tournament'
              : 'Tournaments'}
          </span>
        </div>

        {tournaments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-12 text-center">
            <Trophy
              size={36}
              className="mx-auto mb-3 text-slate-600"
            />

            <h3 className="font-semibold text-slate-300">
              No tournaments created
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Create the first Apex tournament using the form
              above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tournaments.map((tournament) => {
              const isUpdating =
                updatingTournamentId === tournament.id;

              const isCompleted =
                tournament.status === 'COMPLETED';

              return (
                <div
                  key={tournament.id}
                  className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-white/5 bg-slate-900/40 p-5 transition-colors hover:border-white/10 md:flex-row md:items-center"
                >
                  {/* INFORMATION */}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-white">
                        {tournament.title}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${getStatusStyles(
                          tournament.status
                        )}`}
                      >
                        {tournament.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} />

                        Participants:

                        <span className="font-mono font-semibold text-white">
                          {tournament.participantCount ?? 0}
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={13} />

                        Start:

                        <span className="text-slate-300">
                          {formatDateTime(
                            tournament.startDate
                          )}
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={13} />

                        End:

                        <span className="text-slate-300">
                          {formatDateTime(
                            tournament.endDate
                          )}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {/* UPCOMING / PAUSED -> ACTIVATE */}

                    {(tournament.status === 'UPCOMING' ||
                      tournament.status === 'PAUSED') && (
                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          updatingTournamentId !== null
                        }
                        onClick={() =>
                          void handleStatusChange(
                            tournament,
                            'ACTIVE'
                          )
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <PlayCircle size={14} />
                        )}

                        {tournament.status === 'PAUSED'
                          ? 'Resume'
                          : 'Activate'}
                      </button>
                    )}

                    {/* ACTIVE -> PAUSE */}

                    {tournament.status === 'ACTIVE' && (
                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          updatingTournamentId !== null
                        }
                        onClick={() =>
                          void handleStatusChange(
                            tournament,
                            'PAUSED'
                          )
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <PauseCircle size={14} />
                        )}

                        Pause
                      </button>
                    )}

                    {/* COMPLETE */}

                    {!isCompleted && (
                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          updatingTournamentId !== null
                        }
                        onClick={() =>
                          void handleStatusChange(
                            tournament,
                            'COMPLETED'
                          )
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <CheckCircle size={14} />
                        )}

                        Complete
                      </button>
                    )}

                    {/* COMPLETED STATE */}

                    {isCompleted && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-1.5 text-xs font-semibold text-slate-500">
                        <CheckCircle size={14} />
                        Finished
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTournaments;