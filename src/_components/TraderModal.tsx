import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, ShieldCheck, Zap, BarChart3, User } from 'lucide-react';

export interface Trader {
  username: string;
  totalPnL: number;
  tradeCount: number;
  rankTier: string;
  /** Optional win rate percentage */
  winRate?: number;
}

export interface TraderModalProps {
  isOpen: boolean;
  onClose: () => void;
  trader: Trader | null;
  /** Optional callback when user clicks "View Full Analysis" */
  onViewAnalysis?: (trader: Trader) => void;
}

/** Helper for dynamic tier color styling */
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

const TraderModal: React.FC<TraderModalProps> = ({
  isOpen,
  onClose,
  trader,
  onViewAnalysis,
}) => {
  const [avatarError, setAvatarError] = useState<boolean>(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset image error state when trader changes
  useEffect(() => {
    setAvatarError(false);
  }, [trader?.username]);

  if (!trader) return null;

  const isPositivePnL = trader.totalPnL >= 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 select-none">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl custom-scrollbar z-10"
          >
            {/* Header / Avatar Cover Banner */}
            <div className="relative h-28 sm:h-32 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close trader modal"
                className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-full bg-slate-950/60 p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-950"
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Content Body */}
            <div className="relative -mt-10 sm:-mt-12 px-5 pb-6 sm:px-8 sm:pb-8">
              
              {/* Avatar with Error Fallback */}
              <div className="relative inline-block">
                {!avatarError ? (
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      trader.username
                    )}`}
                    onError={() => setAvatarError(true)}
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl sm:rounded-3xl border-4 border-slate-900 bg-slate-950 shadow-xl object-cover"
                    alt={`${trader.username} avatar`}
                  />
                ) : (
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl sm:rounded-3xl border-4 border-slate-900 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl">
                    <User size={36} />
                  </div>
                )}
              </div>

              {/* Username & Rank Tier Badge */}
              <div className="mt-3 sm:mt-4 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-white">
                    {trader.username}
                  </h2>
                  <ShieldCheck className="text-indigo-400 shrink-0" size={20} />
                </div>
                <div>
                  <span
                    className={`inline-block rounded-md border px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${getTierBadgeStyle(
                      trader.rankTier
                    )}`}
                  >
                    {trader.rankTier} Rank
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-3.5 sm:p-4">
                  <TrendingUp
                    className={`mb-1.5 sm:mb-2 ${
                      isPositivePnL ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                    size={16}
                  />
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Return PnL
                  </p>
                  <p
                    className={`font-mono text-lg sm:text-xl font-black ${
                      isPositivePnL ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositivePnL ? '+' : ''}
                    {trader.totalPnL.toFixed(2)}%
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-3.5 sm:p-4">
                  <Zap className="mb-1.5 sm:mb-2 text-amber-400" size={16} />
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Executions
                  </p>
                  <p className="font-mono text-lg sm:text-xl font-black text-white">
                    {trader.tradeCount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* View Full Analysis Action */}
              <button
                type="button"
                onClick={() => {
                  if (onViewAnalysis) onViewAnalysis(trader);
                  onClose();
                }}
                className="mt-5 sm:mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-[0.99]"
              >
                <BarChart3 size={18} />
                <span>View Full Analysis</span>
              </button>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TraderModal;