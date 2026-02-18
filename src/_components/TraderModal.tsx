import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

interface TraderModalProps {
  isOpen: boolean;
  onClose: () => void;
  trader: {
    username: string;
    totalPnL: number;
    tradeCount: number;
    rankTier: string;
  } | null;
}

const TraderModal: React.FC<TraderModalProps> = ({ isOpen, onClose, trader }) => {
  if (!trader) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            {/* Header / Avatar Section */}
            <div className="h-32 bg-gradient-to-r from-brand-accent/20 to-brand-primary/20 relative">
              <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-950/50 rounded-full text-white/50 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-8 pb-8 -mt-12 relative">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${trader.username}`} 
                className="w-24 h-24 rounded-3xl bg-slate-900 border-4 border-slate-900 shadow-xl"
                alt="trader avatar"
              />
              
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{trader.username}</h2>
                  <ShieldCheck className="text-brand-accent" size={20} />
                </div>
                <span className="text-[10px] font-black bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded uppercase tracking-widest">
                  {trader.rankTier} Rank
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <TrendingUp className="text-brand-secondary mb-2" size={16} />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Return</p>
                  <p className="text-xl font-black text-white">+{trader.totalPnL}%</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <Zap className="text-amber-400 mb-2" size={16} />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Executions</p>
                  <p className="text-xl font-black text-white">{trader.tradeCount}</p>
                </div>
              </div>

              <button className="w-full mt-6 py-4 bg-brand-accent hover:bg-indigo-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-tighter">
                <BarChart3 size={18} />
                View Full Analysis
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TraderModal;