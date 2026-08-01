import React from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export interface CurrentRankProps {
  /** User's current rank position in active tournament */
  rank: number;
  /** Cumulative PnL percentage */
  totalPnL: number;
  /** Current Tier (BRONZE, SILVER, GOLD, DIAMOND) */
  tier: string;
  /** Percentage progress towards next rank (0 - 100) */
  nextRankProgress?: number;
}

/** Helper to provide dynamic tier styling */
const getTierBadgeStyle = (tierName: string) => {
  const normalized = tierName.toUpperCase();
  switch (normalized) {
    case 'DIAMOND':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'GOLD':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'SILVER':
      return 'bg-slate-300/20 text-slate-200 border-slate-300/30';
    default:
      // Bronze / Default
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
  }
};

const CurrentRank: React.FC<CurrentRankProps> = ({
  rank,
  totalPnL,
  tier,
  nextRankProgress = 65, // Default progress fallback
}) => {
  const safeProgress = Math.min(Math.max(nextRankProgress, 0), 100);
  const isPositivePnL = totalPnL >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="group relative overflow-hidden rounded-2xl sm:rounded-[2rem] border border-indigo-500/30 bg-slate-900/50 p-4 sm:p-5 md:p-6 backdrop-blur-xl select-none"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl transition-colors duration-500 group-hover:bg-indigo-500/20 pointer-events-none" />

      {/* Top Section: Live Standing Header & Icon */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Live Standing
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-mono text-3xl sm:text-4xl font-black italic tracking-tighter text-white">
              #{String(rank).padStart(2, '0')}
            </h2>
            <span
              className={`rounded-md border px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-tighter ${getTierBadgeStyle(
                tier
              )}`}
            >
              {tier} TIER
            </span>
          </div>
        </div>

        {/* Trophy Icon Frame */}
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shadow-inner">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      {/* Middle Section: Tournament PnL & CTA Link */}
      <div className="relative z-10 mt-5 sm:mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
            Tournament PnL
          </p>
          <p
            className={`font-mono text-lg sm:text-xl font-black ${
              isPositivePnL ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositivePnL ? '+' : ''}
            {totalPnL.toFixed(2)}%
          </p>
        </div>

        <Link
          to="/leaderboard"
          className="group/link flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-slate-400 hover:text-white transition-colors py-1"
        >
          <span>View Board</span>
          <ChevronRight
            size={14}
            className="transition-transform duration-200 group-hover/link:translate-x-0.5 text-indigo-400"
          />
        </Link>
      </div>

      {/* Bottom Section: Dynamic Progress Bar to Next Rank */}
      <div className="relative z-10 mt-3 sm:mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safeProgress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        />
      </div>
    </motion.div>
  );
};

export default CurrentRank;