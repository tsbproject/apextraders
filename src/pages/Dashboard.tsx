import React, { useEffect, useState } from 'react';
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
import { calculatePnL } from '../../server/lib/pnl-Engine';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { openTrade, closeTrade } from '../store/tradeSlice';
import { NotifySuccess, NotifyError } from '../utils/notifications';

import MarketTerminal from '../_components/MarketTerminal';
import TradingActivity from '../_components/TradingActivity';
import { api } from '../services/api';

const Dashboard: React.FC = () => {
  
  const btcPrice = useAppSelector(
    (state) => state.price.btc
  );

  const priceStatus = useAppSelector(
    (state) => state.price.status
  );
  const lastPriceUpdate = useAppSelector(state => state.price.lastUpdated);

 

  const dispatch = useAppDispatch();

  const [accounts, setAccounts] = useState<{ tournamentId: string; title: string; startDate: string; endDate: string; currentBalance: number; pnlPercentage: number }[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [accountError, setAccountError] = useState('');
  const refreshAccounts = async () => {
    if (!localStorage.getItem('apex_token')) {
      setAccounts([]);
      setAccountError('');
      return;
    }
    try {
      const response = await api.get<typeof accounts>('/tournaments/mine');
      setAccounts(response.data);
      setAccountError('');
    } catch { setAccountError('Could not load tournament accounts.'); }
  };
  useEffect(() => { void refreshAccounts(); }, []);
  const selectedAccount = accounts.find(a => a.tournamentId === selectedTournamentId);
  const activeAccount = selectedAccount && Date.now() >= new Date(selectedAccount.startDate).getTime() && Date.now() < new Date(selectedAccount.endDate).getTime();
  const orderDisabled = isExecuting || !btcPrice || (Boolean(selectedTournamentId) && !activeAccount);

  const [amount, setAmount] =
    useState<string>('1000');

  const [isExecuting, setIsExecuting] =
    useState<boolean>(false);

  const [activityVersion, setActivityVersion] = useState(0);
  const [closingId, setClosingId] =
    useState<string | null>(null);




  const trades = useAppSelector((state) => state.trades.positions);


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

    if (selectedTournamentId && !activeAccount) {
      NotifyError('This tournament is not within its trading window.');
      return;
    }
    setIsExecuting(true);
    try {
      await dispatch(
        openTrade({
          symbol: 'BTC/USDT',
          side,
          entryPrice: btcPrice,
          ...(selectedTournamentId ? { tournamentId: selectedTournamentId, allocatedCapital: numericAmount } : {}),
        })
      ).unwrap();
        

      await refreshAccounts();
      setActivityVersion(v => v + 1);
      NotifySuccess(
        `${side} Order Filled at $${btcPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`
      );
    } catch  {
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
          })
        ).unwrap();

      const finalPnL = result?.pnlPercentage
        ? result.pnlPercentage.toFixed(2)
        : '0.00';
      await refreshAccounts();
      setActivityVersion(v => v + 1);
      NotifySuccess(`Position Settled! Final PnL: ${finalPnL}%`);
    } catch  {
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
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-5 shadow-xl">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Trading overview</span><TrendingUp size={18} className="text-indigo-300" /></div>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-white">Your trading desk</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">Follow BTC/USDT on Quidax, manage demo positions, and select a tournament account below.</p>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-xs text-slate-400">Tournament performance</span><span className="font-mono text-sm font-semibold text-white">{selectedAccount ? `${Number(selectedAccount.pnlPercentage).toFixed(2)}%` : 'Select an account'}</span></div>
        </section>

        {/* Execution Desk Card */}
        <section className="rounded-2xl border border-white/10 bg-[#111b2c] p-5 sm:p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between gap-3 text-indigo-400"><div className="flex items-center gap-2">
            <Activity size={18} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Execution Desk
            </h3></div><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400">DEMO</span>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="trade-tournament" className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Trading account</label>
              <select id="trade-tournament" value={selectedTournamentId} onChange={e => setSelectedTournamentId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#080e1c] p-3.5 text-sm text-white outline-none focus:border-indigo-400/60">
                <option value="">General demo (non-tournament)</option>
                {accounts.map(a => <option key={a.tournamentId} value={a.tournamentId}>{a.title}</option>)}
              </select>
              {accountError && <p className="mt-1 text-xs text-rose-400">{accountError}</p>}
              {selectedAccount && <p className="mt-1 text-xs text-slate-400">Tournament balance: {Number(selectedAccount.currentBalance).toFixed(2)} credits · PnL: {Number(selectedAccount.pnlPercentage).toFixed(2)}%</p>}
            </div>
            <div>
              <label className="ml-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                {selectedTournamentId ? 'Allocated Capital (Demo Credits)' : 'Order Size (USD)'}
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
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-xl border border-white/10 bg-[#080e1c] py-3.5 pl-10 pr-4 font-mono text-sm text-white outline-none transition-all focus:border-indigo-400/60 focus:ring-1 focus:ring-indigo-400/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => handleTrade('BUY')}
                disabled={orderDisabled}
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
                disabled={orderDisabled}
                className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-rose-500 py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-rose-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              >
                {isExecuting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>Short</span>
                )}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">Simulated positions only. Orders require a live Quidax price; tournament orders are available during the tournament trading window.</p>
          </div>
        </section>

        {/* Demo Balance Card */}
        <div className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-[#273b69] via-[#19294a] to-[#111b2c] p-5 sm:p-6 shadow-xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-white/20 p-2">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
              Tournament account balance
            </span>
          </div>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/60">
            Available demo credits
          </p>
          <h2 className="font-mono text-xl sm:text-2xl font-black text-white mt-1 break-words">
            {selectedAccount ? `${Number(selectedAccount.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })} credits` : 'Select a tournament account'}
          </h2>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Live Exposure & Open Positions               */}
      {/* ========================================================= */}
      <div className="lg:col-span-8 space-y-4 sm:space-y-6">
        <MarketTerminal price={btcPrice} status={priceStatus} lastUpdated={lastPriceUpdate} />
        <TradingActivity onClose={handleClosePosition} closingId={closingId} refreshKey={activityVersion} />
      </div>

    </div>
  );
};

export default Dashboard;