import React, { useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, PieChart, Award, History, Filter } from 'lucide-react';

const Portfolio: React.FC = () => {
  // 1. Pull positions from Redux
  const allTrades = useAppSelector((state) => state.trades.positions);
  
  // 2. Filter State
  const [filter, setFilter] = useState<'ALL' | 'TOURNAMENT'>('ALL');

  // 3. Dynamic Filtering Logic
  const filteredTrades = allTrades.filter(t => {
    if (filter === 'ALL') return t.status === 'CLOSED';
    // Matches trades for the specific active tournament
    return t.status === 'CLOSED' && t.tournamentId === 'weekly-apex-challenge';
  });

  // 4. Aggregate Performance Stats based on filtered results
  const totalHistoricalPnL = filteredTrades.reduce((sum, t) => {
    const pnl = typeof t.pnlPercentage === 'number' ? t.pnlPercentage : 0;
    return sum + pnl;
  }, 0);

  const winRate = filteredTrades.length > 0 
    ? (filteredTrades.filter(t => (Number(t.pnlPercentage) || 0) > 0).length / filteredTrades.length) * 100 
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* --- Filter Navigation --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-1">
          <Filter size={14} className="text-brand-accent" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">View Scope</h2>
        </div>
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 shadow-inner">
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'ALL' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Global
          </button>
          <button 
            onClick={() => setFilter('TOURNAMENT')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'TOURNAMENT' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Tournament
          </button>
        </div>
      </div>

      {/* --- Performance Summary Overview --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          key={`pnl-${filter}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 mb-4 text-brand-accent">
            {totalHistoricalPnL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Net Profit / Loss</h3>
          </div>
          <p className={`text-3xl font-black font-mono ${totalHistoricalPnL >= 0 ? 'text-brand-secondary' : 'text-rose-400'}`}>
            {totalHistoricalPnL >= 0 ? '+' : ''}{totalHistoricalPnL.toFixed(2)}%
          </p>
        </motion.div>

        <motion.div 
          key={`wr-${filter}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 mb-4 text-indigo-400">
            <PieChart size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Execution Edge</h3>
          </div>
          <p className="text-3xl font-black font-mono text-white">{winRate.toFixed(1)}% <span className="text-xs text-slate-500 font-bold">WR</span></p>
        </motion.div>

        <motion.div 
          key={`count-${filter}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 mb-4 text-brand-primary">
            <Award size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Settled Positions</h3>
          </div>
          <p className="text-3xl font-black font-mono text-white">{filteredTrades.length}</p>
        </motion.div>
      </div>

      {/* --- Settlement Ledger --- */}
      <section className="bg-slate-900/30 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <h3 className="font-bold uppercase tracking-tighter text-xs text-white">Historical Ledger</h3>
          </div>
          <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded text-slate-500 uppercase tracking-widest border border-white/5">
            {filter === 'ALL' ? 'Verified Archive' : 'Tournament Results'}
          </span>
        </div>
        
        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
          {filteredTrades.length > 0 ? (
            filteredTrades.map((trade, index) => {
              const currentPnL = Number(trade.pnlPercentage) ?? 0;
              const isWin = currentPnL >= 0;

              return (
                <motion.div 
                  key={trade.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 flex justify-between items-center hover:bg-white/[0.02] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${isWin ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-rose-500/10 text-rose-500'}`}>
                      {isWin ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white group-hover:text-brand-accent transition-colors">{trade.symbol}</p>
                        <span className={`text-[9px] font-black px-1.5 rounded-sm ${trade.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {trade.side}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Entry: ${Number(trade.entryPrice).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-mono font-black text-lg ${isWin ? 'text-brand-secondary' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}{currentPnL.toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">Realized Performance</p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="py-24 text-center">
              <p className="text-slate-600 font-black uppercase tracking-[0.2em] text-[10px]">No settled trades found in {filter.toLowerCase()} ledger</p>
              <p className="text-slate-700 text-[10px] mt-1 italic">Execute and close a trade to populate history.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Portfolio;