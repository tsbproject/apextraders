import React, { useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, PieChart, Award, History, Filter } from 'lucide-react';

export type PortfolioScopeFilter = 'ALL' | 'TOURNAMENT';

const ACTIVE_TOURNAMENT_ID = 'weekly-apex-challenge';

const Portfolio: React.FC = () => {
  // 1. Pull positions from Redux
  const allTrades = useAppSelector((state) => state.trades.positions);
  
  // 2. Filter State
  const [filter, setFilter] = useState<PortfolioScopeFilter>('ALL');

  // 3. Dynamic Filtering Logic
  const filteredTrades = allTrades.filter((t) => {
    if (filter === 'ALL') return t.status === 'CLOSED';
    // Matches trades for the specific active tournament
    return t.status === 'CLOSED' && t.tournamentId === ACTIVE_TOURNAMENT_ID;
  });

  // 4. Aggregate Performance Stats based on filtered results
  const totalHistoricalPnL = filteredTrades.reduce((sum, t) => {
    const pnl = typeof t.pnlPercentage === 'number' ? t.pnlPercentage : Number(t.pnlPercentage) || 0;
    return sum + pnl;
  }, 0);

  const winningTradesCount = filteredTrades.filter(
    (t) => (Number(t.pnlPercentage) || 0) > 0
  ).length;

  const winRate = filteredTrades.length > 0 
    ? (winningTradesCount / filteredTrades.length) * 100 
    : 0;

  const isPositiveHistoricalPnL = totalHistoricalPnL >= 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 select-none">
      
      {/* ========================================================= */}
      {/* 1. FILTER NAVIGATION                                       */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-1 text-indigo-400">
          <Filter size={16} />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            View Scope
          </h2>
        </div>

        <div className="flex w-full sm:w-auto bg-slate-900/50 p-1 rounded-xl border border-white/5 shadow-inner">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Global
          </button>
          <button
            type="button"
            onClick={() => setFilter('TOURNAMENT')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'TOURNAMENT'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tournament
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PERFORMANCE SUMMARY OVERVIEW                            */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Metric 1: Net PnL */}
        <motion.div
          key={`pnl-${filter}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/50 p-5 sm:p-6 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5 mb-3 text-indigo-400">
            {isPositiveHistoricalPnL ? (
              <TrendingUp size={20} className="text-emerald-400" />
            ) : (
              <TrendingDown size={20} className="text-rose-400" />
            )}
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Net Profit / Loss
            </h3>
          </div>
          <p
            className={`font-mono text-2xl sm:text-3xl font-black ${
              isPositiveHistoricalPnL ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositiveHistoricalPnL ? '+' : ''}
            {totalHistoricalPnL.toFixed(2)}%
          </p>
        </motion.div>

        {/* Metric 2: Win Rate */}
        <motion.div
          key={`wr-${filter}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/50 p-5 sm:p-6 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5 mb-3 text-indigo-400">
            <PieChart size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Execution Edge
            </h3>
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-black text-white">
            {winRate.toFixed(1)}%{' '}
            <span className="text-xs text-slate-500 font-bold">WR</span>
          </p>
        </motion.div>

        {/* Metric 3: Settled Count */}
        <motion.div
          key={`count-${filter}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="sm:col-span-2 lg:col-span-1 rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/50 p-5 sm:p-6 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5 mb-3 text-indigo-400">
            <Award size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Settled Positions
            </h3>
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-black text-white">
            {filteredTrades.length}
          </p>
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* 3. SETTLEMENT LEDGER                                       */}
      {/* ========================================================= */}
      <section className="rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/30 overflow-hidden backdrop-blur-md">
        <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <History size={16} className="text-indigo-400" />
            <h3 className="font-bold uppercase tracking-wider text-xs text-slate-200">
              Historical Ledger
            </h3>
          </div>
          <span className="text-[9px] sm:text-[10px] font-black bg-white/5 px-2.5 py-1 rounded text-slate-400 uppercase tracking-widest border border-white/5">
            {filter === 'ALL' ? 'Verified Archive' : 'Tournament Results'}
          </span>
        </div>

        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredTrades.length > 0 ? (
            filteredTrades.map((trade, index) => {
              const currentPnL = Number(trade.pnlPercentage) || 0;
              const isWin = currentPnL >= 0;
              const isBuy = trade.side === 'BUY';

              return (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 sm:p-5 flex justify-between items-center hover:bg-white/[0.02] transition-all group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div
                      className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
                        isWin
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isWin ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-black text-white group-hover:text-indigo-400 transition-colors truncate">
                          {trade.symbol}
                        </p>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {trade.side}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        Entry: ${Number(trade.entryPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`font-mono font-black text-base sm:text-lg ${
                        isWin ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isWin ? '+' : ''}
                      {currentPnL.toFixed(2)}%
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-tight">
                      Realized PnL
                    </p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="py-20 text-center px-4">
              <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
                No settled trades found in {filter.toLowerCase()} ledger
              </p>
              <p className="text-slate-600 text-[10px] mt-1 italic">
                Execute and close a trade to populate history.
              </p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default Portfolio;