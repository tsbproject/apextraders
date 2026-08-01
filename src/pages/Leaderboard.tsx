import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, TrendingUp, Users, Target, Loader2, Activity } from 'lucide-react';
import { api } from '../services/api';
import { extractErrorMessage } from '../store/authSlice';
import { useNotification } from '../context/NotificationContext';
import TraderModal, { Trader } from '../_components/TraderModal';

export interface Ranker {
  id: string;
  username: string;
  totalPnL: number;
  tradeCount: number;
  avatar: string;
  rankTier: string;
}

export interface JoinTournamentPayload {
  userId: string;
  tournamentId: string;
}

export interface JoinTournamentResponse {
  message: string;
  success?: boolean;
}

const Leaderboard: React.FC = () => {
  const [rankers, setRankers] = useState<Ranker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // State for Trader Inspection Modal
  const [selectedTrader, setSelectedTrader] = useState<Ranker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const { notifySuccess, notifyError } = useNotification();

  useEffect(() => {
    let isMounted = true;

    const fetchLeaderboard = async (): Promise<void> => {
      try {
        const response = await api.get<Ranker[] | { leaderboard?: Ranker[] }>('/leaderboard');
        
        if (isMounted) {
          // Defensive check: Handle both raw array OR wrapped { leaderboard: [...] } responses
          const data = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.leaderboard)
            ? response.data.leaderboard
            : [];

          setRankers(data);
          setLoading(false);
        }
      } catch (error: unknown) {
        if (isMounted) {
          const msg = extractErrorMessage(error, 'Failed to fetch global leaderboard.');
          notifyError(msg);
          setRankers([]); // Ensure state is safely reset to empty array on error
          setLoading(false);
        }
      }
    };

    fetchLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [notifyError]);

  const handleTraderClick = (trader: Ranker): void => {
    setSelectedTrader(trader);
    setIsModalOpen(true);
  };

  const handleJoinTournament = async (): Promise<void> => {
    setIsJoining(true);
    try {
      const payload: JoinTournamentPayload = {
        userId: 'user_1',
        tournamentId: 'weekly-apex-challenge',
      };

      const response = await api.post<JoinTournamentResponse>('/tournaments/join', payload);
      notifySuccess(response.data.message || 'Entry Confirmed: You are now a Participant!');
    } catch (error: unknown) {
      const message = extractErrorMessage(error, 'Conflict: Already enrolled in this event.');
      notifyError(message);
    } finally {
      setIsJoining(false);
    }
  };

  // ✅ 1. Added Loading State Guard
  if (loading) {
    return (
      <div className="flex h-80 flex-col items-center justify-center space-y-4 font-mono text-slate-500 select-none">
        <Activity className="animate-spin text-indigo-400" size={32} />
        <p className="animate-pulse text-xs font-black uppercase tracking-widest">
          Syncing Global Rankings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 select-none">
      
      {/* ========================================================= */}
      {/* 1. INTERACTIVE TOURNAMENT HERO HEADER                     */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-indigo-500/20 bg-slate-900/50 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="rounded-xl bg-indigo-500/10 p-2 sm:p-2.5">
                <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white">
                Global Leaderboard
              </h2>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-400 pl-1">
              Top traders by PnL performance across the Apex ecosystem.
            </p>
          </div>

          <button
            type="button"
            onClick={handleJoinTournament}
            disabled={isJoining}
            className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-indigo-600 px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            {isJoining ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Join Active Tournament</span>
            )}
          </button>
        </div>
        <div className="absolute top-0 right-0 -mt-32 -mr-32 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      </div>

      {/* ========================================================= */}
      {/* 2. PODIUM SECTION (TOP 3 RANKERS)                         */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {rankers.slice(0, 3).map((user, index) => {
          const isTopRank = index === 0;
          const isPositivePnL = user.totalPnL >= 0;

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleTraderClick(user)}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl border p-5 sm:p-6 backdrop-blur-xl transition-all hover:border-indigo-500/40 ${
                isTopRank
                  ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 via-slate-900/60 to-slate-950 shadow-[0_0_40px_-15px_rgba(99,102,241,0.4)]'
                  : 'border-white/5 bg-slate-900/40 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="relative shrink-0">
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-white/10 bg-slate-800 object-cover transition-transform group-hover:scale-105"
                    alt={user.username}
                  />
                  <div className="absolute -top-2 -left-2 flex h-7 w-7 sm:h-8 sm:w-8 -rotate-12 items-center justify-center rounded-full border border-white/10 bg-slate-950 shadow-lg">
                    {index === 0 ? (
                      <Trophy size={16} className="text-amber-400" />
                    ) : (
                      <Medal
                        size={16}
                        className={index === 1 ? 'text-slate-300' : 'text-amber-600'}
                      />
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-base sm:text-lg text-white transition-colors group-hover:text-indigo-400">
                    {user.username}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Target size={12} className="text-indigo-400 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-indigo-400">
                      {user.rankTier}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 flex items-end justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-1 text-slate-500">
                    <TrendingUp size={12} />
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                      Net Return
                    </p>
                  </div>
                  <p
                    className={`font-mono text-xl sm:text-2xl font-black ${
                      isPositivePnL ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositivePnL ? '+' : ''}
                    {user.totalPnL.toFixed(2)}%
                  </p>
                </div>

                <div className="text-right">
                  <div className="mb-1 flex items-center justify-end gap-1 text-slate-500">
                    <Users size={12} />
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                      Executions
                    </p>
                  </div>
                  <p className="font-mono text-sm sm:text-base font-black text-white">
                    {user.tradeCount}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 3. MAIN DESKTOP TABLE & MOBILE CARDS (RANKS 4+)           */}
      {/* ========================================================= */}
      
      {/* Desktop Table (Visible md:block) */}
      <div className="hidden md:block overflow-hidden rounded-3xl border border-white/5 bg-slate-900/30">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-6 py-5">Rank</th>
              <th className="px-6 py-5">Trader</th>
              <th className="px-6 py-5">
                <div className="flex items-center gap-2">
                  <Target size={14} /> Tier
                </div>
              </th>
              <th className="px-6 py-5">
                <div className="flex items-center gap-2">
                  <Users size={14} /> Volume
                </div>
              </th>
              <th className="px-6 py-5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <TrendingUp size={14} /> Profit
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence>
              {rankers.slice(3).map((user, index) => {
                const isPositivePnL = user.totalPnL >= 0;

                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => handleTraderClick(user)}
                    className="group cursor-pointer transition-all duration-200 hover:bg-indigo-500/5"
                  >
                    <td className="px-6 py-5 font-mono text-xs text-slate-500 transition-colors group-hover:text-indigo-400">
                      #{String(index + 4).padStart(2, '0')}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                          className="h-9 w-9 rounded-xl border border-white/5 bg-slate-800 object-cover transition-transform group-hover:scale-110"
                          alt={user.username}
                        />
                        <span className="font-bold text-sm text-slate-200 transition-colors group-hover:text-white">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="rounded-md border border-white/5 bg-white/5 px-2 py-1 text-[10px] font-black uppercase text-slate-400">
                        {user.rankTier}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-mono text-xs font-bold text-slate-400">
                      {user.tradeCount} trades
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span
                        className={`font-mono text-xs font-black ${
                          isPositivePnL ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositivePnL ? '+' : ''}
                        {user.totalPnL.toFixed(2)}%
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (Visible md:hidden) */}
      <div className="md:hidden space-y-3">
        {rankers.slice(3).map((user, index) => {
          const isPositivePnL = user.totalPnL >= 0;

          return (
            <div
              key={user.id}
              onClick={() => handleTraderClick(user)}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/40 p-3.5 transition-colors active:bg-slate-800/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs font-bold text-slate-500 w-7">
                  #{String(index + 4).padStart(2, '0')}
                </span>
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                  className="h-8 w-8 rounded-lg bg-slate-800 object-cover"
                  alt={user.username}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">
                    {user.username}
                  </p>
                  <p className="text-[9px] font-black uppercase text-slate-500">
                    {user.rankTier} • {user.tradeCount} trades
                  </p>
                </div>
              </div>

              <span
                className={`font-mono text-xs font-black ${
                  isPositivePnL ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositivePnL ? '+' : ''}
                {user.totalPnL.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Detail Modal Integration */}
      <TraderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        trader={selectedTrader as Trader | null}
      />

    </div>
  );
};

export default Leaderboard;