import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpCircle, ArrowDownCircle, Wallet, History, Activity, TrendingUp, XCircle } from 'lucide-react';
import { calculatePnL } from '../lib/pnl-Engine';
import { useAppDispatch, useAppSelector } from '../store/hooks'; 
import { openTrade, closeTrade } from '../store/tradeSlice';
import { NotifySuccess, NotifyError } from '../utils/notifications';
import CurrentRank from '../_components/CurrentRank';

interface DashboardProps {
  btcPrice: number | null;
}

const Dashboard: React.FC<DashboardProps> = ({ btcPrice }) => {
  const [amount, setAmount] = useState<string>('1000');
  const [isExecuting, setIsExecuting] = useState(false);
  
  const trades = useAppSelector((state) => state.trades.positions);
  const dispatch = useAppDispatch();

  // Phase 4: Active Tournament ID
  const ACTIVE_TOURNAMENT = 'weekly-apex-challenge';

  const handleTrade = async (side: 'BUY' | 'SELL') => {
    if (!btcPrice) {
      NotifyError("Execution Desk: Waiting for live price feed...");
      return;
    }
    
    setIsExecuting(true);
    try {
      await dispatch(openTrade({
        userId: 'user_1',
        symbol: 'BTC/USDT',
        side,
        entryPrice: btcPrice,
        tournamentId: ACTIVE_TOURNAMENT // Link trade to tournament
      })).unwrap();
      
      NotifySuccess(`${side} Order Filled at $${btcPrice.toLocaleString()}`);
    } catch (err) {
      NotifyError("Order Rejected: Check connectivity or balance.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClosePosition = async (tradeId: string) => {
    if (!btcPrice) {
      NotifyError("Settlement Failed: Price feed required to calculate PnL.");
      return;
    }

    try {
      const result = await dispatch(closeTrade({ 
        tradeId, 
        exitPrice: btcPrice,
        tournamentId: ACTIVE_TOURNAMENT 
      })).unwrap();

      const finalPnL = result.pnlPercentage?.toFixed(2);
      NotifySuccess(`Position Settled! Final PnL: ${finalPnL}%`);
    } catch (err) {
      NotifyError("Database Error: Settlement could not be saved.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Sidebar: Execution & Ranking */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* New: Ranking Widget */}
        <CurrentRank 
          rank={12} 
          totalPnL={8.45} 
          tier="Elite" 
        />

        <section className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-6 text-brand-accent">
            <Activity size={18} />
            <h3 className="font-bold uppercase tracking-wider text-xs">Execution Desk</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Order Size (USD)</label>
              <div className="relative mt-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-8 pr-4 text-white font-mono focus:border-brand-accent/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleTrade('BUY')}
                disabled={isExecuting || !btcPrice}
                className="bg-brand-secondary hover:opacity-90 text-slate-950 font-black py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-tighter"
              >
                Long
              </button>
              <button
                onClick={() => handleTrade('SELL')}
                disabled={isExecuting || !btcPrice}
                className="bg-rose-500 hover:opacity-90 text-white font-black py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-tighter"
              >
                Short
              </button>
            </div>
          </div>
        </section>

        <div className="bg-gradient-to-br from-brand-accent to-indigo-900 rounded-3xl p-6 shadow-xl shadow-brand-accent/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-white/20 rounded-lg"><Wallet size={20} className="text-white" /></div>
            <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">Demo Balance</span>
          </div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-tighter">Buying Power</p>
          <h2 className="text-3xl font-black text-white">$25,400.00</h2>
        </div>
      </div>

      {/* Main: Live Exposure */}
      <div className="lg:col-span-8">
        <div className="bg-slate-900/30 border border-white/5 rounded-3xl min-h-[400px]">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-400">
              <History size={18} />
              <h3 className="font-bold uppercase tracking-wider text-xs">Live Exposure</h3>
            </div>
          </div>

          <div className="p-4">
            <AnimatePresence initial={false}>
              {trades.length > 0 ? (
                trades.map((trade) => {
                  const pnl = btcPrice ? calculatePnL(Number(trade.entryPrice), btcPrice, trade.side) : 0;
                  const isProfit = pnl >= 0;

                  return (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center justify-between p-4 mb-3 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${trade.side === 'BUY' ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-rose-500/10 text-rose-500'}`}>
                          {trade.side === 'BUY' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-none">{trade.symbol}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">${Number(trade.entryPrice).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-6">
                        <div>
                          <div className="flex items-center justify-end gap-1">
                            {isProfit && <TrendingUp size={14} className="text-brand-secondary" />}
                            <p className={`text-sm font-mono font-black ${isProfit ? 'text-brand-secondary' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{pnl.toFixed(2)}%
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Live PnL</p>
                        </div>
                        <button 
                          onClick={() => handleClosePosition(trade.id)}
                          className="text-slate-600 hover:text-rose-500 transition-colors"
                        >
                          <XCircle size={22} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-24 text-center">
                  <Activity size={32} className="text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-600 text-xs font-black uppercase tracking-widest">Market Neutral - No Positions</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;