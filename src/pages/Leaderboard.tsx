import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { extractErrorMessage } from '../store/authSlice';
import { useNotification } from '../context/NotificationContext';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  rankTier: string;
  startingBalance: number;
  currentBalance: number;
  totalPnl: number;
  roiPercentage: number;
  totalTrades: number;
  winRate: number;
}

export interface LeaderboardResponse {
  tournamentId: string;
  tournamentName: string;
  leaderboard: LeaderboardEntry[];
}

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tournamentName, setTournamentName] = useState<string>('Apex Arena');
  const [loading, setLoading] = useState<boolean>(true);
  const { notifyError } = useNotification();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await api.get<LeaderboardResponse>('/leaderboard');
        setLeaderboard(response.data.leaderboard);
        setTournamentName(response.data.tournamentName);
      } catch (error: unknown) {
        const msg = extractErrorMessage(error, 'Failed to load leaderboard rankings.');
        notifyError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [notifyError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const remainingTraders = leaderboard.slice(3);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Standings
            </span>
            <span className="text-xs text-slate-400">Updates in real-time</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">{tournamentName}</h1>
        </div>
      </div>

      {/* Podium Display for Top 3 */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Rank 2 - Silver */}
          {topThree[1] && (
            <PodiumCard entry={topThree[1]} badgeColor="bg-slate-300 text-slate-900" rankBadge="🥈 2nd" />
          )}

          {/* Rank 1 - Gold (Centered & Elevated) */}
          {topThree[0] && (
            <div className="md:-translate-y-4">
              <PodiumCard entry={topThree[0]} badgeColor="bg-amber-400 text-amber-950" rankBadge="👑 1st" isFirst />
            </div>
          )}

          {/* Rank 3 - Bronze */}
          {topThree[2] && (
            <PodiumCard entry={topThree[2]} badgeColor="bg-amber-700 text-amber-100" rankBadge="🥉 3rd" />
          )}
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Trader</th>
                <th className="px-6 py-4">Tier</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4">Total PnL</th>
                <th className="px-6 py-4">ROI %</th>
                <th className="px-6 py-4">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(remainingTraders.length > 0 ? remainingTraders : leaderboard).map((trader) => (
                <tr key={trader.userId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">#{trader.rank}</td>
                  <td className="px-6 py-4 font-semibold text-white">{trader.username}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                      {trader.rankTier}
                    </span>
                  </td>
                  <td className="px-6 py-4">${trader.currentBalance.toLocaleString()}</td>
                  <td className={`px-6 py-4 font-semibold ${trader.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trader.totalPnl >= 0 ? '+' : ''}${trader.totalPnl.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 font-bold ${trader.roiPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trader.roiPercentage >= 0 ? '+' : ''}{trader.roiPercentage}%
                  </td>
                  <td className="px-6 py-4">{trader.winRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Podium Card Helper Component
interface PodiumCardProps {
  entry: LeaderboardEntry;
  badgeColor: string;
  rankBadge: string;
  isFirst?: boolean;
}

const PodiumCard: React.FC<PodiumCardProps> = ({ entry, badgeColor, rankBadge, isFirst }) => (
  <div
    className={`p-6 rounded-2xl border text-center transition-all ${
      isFirst
        ? 'bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/40 shadow-xl shadow-amber-500/10'
        : 'bg-slate-900/60 border-slate-800'
    }`}
  >
    <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${badgeColor} mb-4`}>
      {rankBadge}
    </span>
    <h3 className="text-xl font-bold text-white">{entry.username}</h3>
    <p className="text-xs text-slate-400 mt-1">{entry.rankTier} Tier</p>

    <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-left">
      <div>
        <span className="text-xs text-slate-400 block">Current Balance</span>
        <span className="text-sm font-semibold text-white">${entry.currentBalance.toLocaleString()}</span>
      </div>
      <div>
        <span className="text-xs text-slate-400 block">ROI</span>
        <span className={`text-sm font-bold ${entry.roiPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {entry.roiPercentage >= 0 ? '+' : ''}{entry.roiPercentage}%
        </span>
      </div>
    </div>
  </div>
);

export default Leaderboard;