import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  History,
  Activity,
  TrendingUp,
  XCircle,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { calculatePnL } from '../lib/pnl-engine';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { openTrade, closeTrade } from '../store/tradeSlice';
import { NotifySuccess, NotifyError } from '../utils/notifications';
import CurrentRank from '../_components/CurrentRank';

export interface DashboardProps {
  btcPrice: number | null;
}

const ACTIVE_TOURNAMENT = 'weekly-apex-challenge';

const Dashboard: React.FC<DashboardProps> = ({ btcPrice }) => {
  const [amount, setAmount] = useState<string>('1000');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const trades = useAppSelector((state) => state.trades.positions);
  const dispatch = useAppDispatch();

  const handleTrade = async (side: 'BUY' | 'SELL') => {
    if (!btcPrice) {
      NotifyError('Execution Desk: Waiting for live price feed...');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      NotifyError('Execution Desk: Please enter a valid order size.');
      return;
    }

    setIsExecuting(true);
    try {
      await dispatch(
        openTrade({
          userId: 'user_1',
          symbol: 'BTC/USDT',
          side,
          entryPrice: btcPrice,
          tournamentId: ACTIVE_TOURNAMENT,
        })
      ).unwrap();

      NotifySuccess(
        `${side} Order Filled at $${btcPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`
      );
    } catch (err) {
      NotifyError('Order Rejected: Check connectivity or balance.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClosePosition = async (tradeId: string) => {
    if (!btcPrice) {
      NotifyError('Settlement Failed: Price feed required to calculate PnL.');
      return;
    }

    setClosingId(tradeId);
    try {
      const result = await dispatch(
        closeTrade({
          tradeId,
          exitPrice: btcPrice,
          tournamentId: ACTIVE_TOURNAMENT,
        })
      ).unwrap();

      const finalPnL = result?.pnlPercentage
        ? result.pnlPercentage.toFixed(2)
        : '0.00';
      NotifySuccess(`Position Settled! Final PnL: ${finalPnL}%`);
    } catch (err) {
      NotifyError('Database Error: Settlement could not be saved.');
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 select-none">
      
      {/* ========================================================= */}
      {/* LEFT COLUMN: Ranking Widget & Execution Desk               */}
      {/* ========================================================= */}
      <div className="lg:col-span-4 space-y-4 sm:space-y-6">
        
        {/* Current Standing */}
        <CurrentRank rank={12} totalPnL={8.45} tier="Elite" />

        {/* Execution Desk Card */}
        <section className="rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/50 p-4 sm:p-6 backdrop-blur-xl">
          <div className="mb-4 sm:mb-6 flex items-center gap-2 text-indigo-400">
            <Activity size={18} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Execution Desk
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="ml-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                Order Size (USD)
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                  <DollarSign size={16} />
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950 py-3.5 pl-10 pr-4 font-mono text-sm text-white outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => handleTrade('BUY')}
                disabled={isExecuting || !btcPrice}
                className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-emerald-500 py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                {isExecuting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>Long</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTrade('SELL')}
                disabled={isExecuting || !btcPrice}
                className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-rose-500 py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-rose-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              >
                {isExecuting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>Short</span>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Demo Balance Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600 to-slate-900 p-5 sm:p-6 shadow-xl shadow-indigo-500/10">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-white/20 p-2">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
              Demo Balance
            </span>
          </div>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/60">
            Buying Power
          </p>
          <h2 className="font-mono text-2xl sm:text-3xl font-black text-white mt-0.5">
            $25,400.00
          </h2>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Live Exposure & Open Positions               */}
      {/* ========================================================= */}
      <div className="lg:col-span-8">
        <div className="min-h-[350px] sm:min-h-[400px] rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/30 backdrop-blur-md overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-white/5 p-4 sm:p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <History size={18} className="text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Live Exposure
              </h3>
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] font-bold text-slate-400">
              {trades.length} Open Position{trades.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="p-3 sm:p-4">
            <AnimatePresence initial={false}>
              {trades.length > 0 ? (
                trades.map((trade) => {
                  const pnl = btcPrice
                    ? calculatePnL(Number(trade.entryPrice), btcPrice, trade.side)
                    : 0;
                  const isProfit = pnl >= 0;
                  const isBuy = trade.side === 'BUY';
                  const isClosing = closingId === trade.id;

                  return (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="group mb-3 flex items-center justify-between rounded-xl sm:rounded-2xl border border-white/5 bg-white/[0.02] p-3 sm:p-4 transition-all hover:bg-white/[0.04]"
                    >
                      {/* Left: Trade Symbol & Side */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-xl p-2 ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {isBuy ? (
                            <ArrowUpCircle size={20} />
                          ) : (
                            <ArrowDownCircle size={20} />
                          )}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-white leading-none">
                            {trade.symbol}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-slate-400">
                            Entry: ${Number(trade.entryPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Right: Live PnL & Settlement Action */}
                      <div className="flex items-center gap-4 sm:gap-6 text-right">
                        <div>
                          <div className="flex items-center justify-end gap-1">
                            {isProfit && (
                              <TrendingUp size={14} className="text-emerald-400" />
                            )}
                            <p
                              className={`font-mono text-xs sm:text-sm font-black ${
                                isProfit ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isProfit ? '+' : ''}
                              {pnl.toFixed(2)}%
                            </p>
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-tight text-slate-500">
                            Live PnL
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isClosing}
                          onClick={() => handleClosePosition(trade.id)}
                          title="Settle Position"
                          className="text-slate-500 transition-colors hover:text-rose-400 disabled:opacity-50"
                        >
                          {isClosing ? (
                            <Loader2 size={20} className="animate-spin text-rose-400" />
                          ) : (
                            <XCircle size={20} />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 text-center">
                  <Activity
                    size={32}
                    className="mx-auto mb-3 text-slate-700"
                  />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Market Neutral - No Open Positions
                  </p>
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