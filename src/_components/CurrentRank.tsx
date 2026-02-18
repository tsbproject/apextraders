import React from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface CurrentRankProps {
  rank: number;
  totalPnL: number;
  tier: string;
}

const CurrentRank: React.FC<CurrentRankProps> = ({ rank, totalPnL, tier }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/50 border border-brand-accent/30 p-6 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-accent/20 transition-colors" />

      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Standing</p>
          <div className="flex items-center gap-2">
            <h2 className="text-4xl font-black text-white italic tracking-tighter">#{String(rank).padStart(2, '0')}</h2>
            <span className="text-[10px] bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded-md font-black uppercase tracking-tighter border border-brand-accent/20">
              {tier} TIER
            </span>
          </div>
        </div>
        <div className="p-3 bg-brand-accent/10 rounded-2xl text-brand-accent">
          <Trophy size={24} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tournament PnL</p>
          <p className={`text-xl font-mono font-black ${totalPnL >= 0 ? 'text-brand-secondary' : 'text-rose-400'}`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}%
          </p>
        </div>
        <Link 
          to="/leaderboard"
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-slate-400 hover:text-white transition-colors"
        >
          View Board <ChevronRight size={14} />
        </Link>
      </div>

      {/* Progress Bar to "Next Rank" */}
      <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '65%' }} // Mock progress for now
          className="h-full bg-gradient-to-r from-brand-accent to-brand-primary"
        />
      </div>
    </motion.div>
  );
};

export default CurrentRank;