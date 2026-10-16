import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Clock3, History, LockKeyhole, RefreshCw, TrendingUp, Wallet } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { api } from '../services/api';
import { calculatePnL } from '../../server/lib/pnl-Engine';
import type { Trade } from '../store/tradeSlice';

type Tab = 'open' | 'history' | 'performance';
type Props = { onClose: (id: string) => void; closingId: string | null; refreshKey: number };
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TradingActivity: React.FC<Props> = ({ onClose, closingId, refreshKey }) => {
  const [tab, setTab] = useState<Tab>('open');
  const [journal, setJournal] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(true);
  const livePrice = useAppSelector(state => state.price.btc);
  const localPositions = useAppSelector(state => state.trades.positions);
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Trade[]>('/trades/mine');
      setJournal(data);
      setAuthenticated(true);
      setError('');
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setAuthenticated(status !== 401);
      setError(status === 401 ? '' : 'Trading records are temporarily unavailable.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [refreshKey]);
  const trades = useMemo(() => {
    const ids = new Set(journal.map(t => t.id));
    return [...localPositions.filter(t => !ids.has(t.id)), ...journal];
  }, [journal, localPositions]);
  const open = trades.filter(t => t.status === 'OPEN');
  const closed = trades.filter(t => t.status === 'CLOSED');
  const realized = closed.reduce((sum, t) => sum + Number(t.realizedPnl ?? 0), 0);
  const sized = closed.filter(t => t.realizedPnl !== null && t.realizedPnl !== undefined);
  const wins = sized.filter(t => Number(t.realizedPnl) > 0).length;
  const winRate = sized.length ? (wins / sized.length) * 100 : 0;
  const equity = useMemo(() => {
    let running = 0;
    return closed.slice().reverse().filter(t => t.realizedPnl !== null && t.realizedPnl !== undefined).map(t => {
      running += Number(t.realizedPnl);
      return running;
    });
  }, [closed]);
  const chartValues = [0, ...equity];
  const min = Math.min(...chartValues), max = Math.max(...chartValues);
  const span = Math.max(max - min, 1);
  const path = chartValues.map((v, i) => `${chartValues.length === 1 ? 0 : (i / (chartValues.length - 1)) * 100},${85 - ((v - min) / span) * 70}`).join(' ');
  const stats = [
    { label: 'Open positions', value: String(open.length), icon: Activity, accent: 'text-indigo-300' },
    { label: 'Closed trades', value: String(closed.length), icon: History, accent: 'text-sky-300' },
    { label: 'Realized tournament P&L', value: `${realized >= 0 ? '+' : '-'}${money(Math.abs(realized))}`, icon: Wallet, accent: realized >= 0 ? 'text-emerald-300' : 'text-rose-300' },
  ];
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl shadow-black/10">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
      <div className="flex items-center gap-3"><div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-2 text-indigo-300"><BarChart3 size={19}/></div><div><h3 className="text-sm font-bold text-white">Trading Activity</h3><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Positions · Journal · Performance</p></div></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh</button>
    </div>
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
      {stats.map(s => <div key={s.label} className="rounded-xl border border-white/5 bg-slate-950/60 p-4"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><s.icon size={14} className={s.accent}/>{s.label}</div><p className={`mt-3 font-mono text-xl font-bold ${s.accent}`}>{authenticated ? s.value : '—'}</p></div>)}
    </div>
    <div className="flex gap-1 overflow-x-auto border-b border-white/5 px-4">
      {([['open','Open Positions'],['history','Trade History'],['performance','Performance']] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold transition ${tab === id ? 'border-indigo-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>{label}</button>)}
    </div>
    <div className="min-h-56 p-4 sm:p-5">
      {!authenticated ? <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center"><LockKeyhole className="text-indigo-300" size={25}/><p className="font-semibold text-white">Your private trading workspace</p><p className="text-xs text-slate-400">Sign in to view positions, trading history and performance.</p></div> :
      error ? <p className="py-12 text-center text-sm text-rose-300">{error}</p> :
      tab === 'open' ? open.length ? <div className="space-y-2">{open.map(t => {
        const pnl = livePrice && t.symbol === 'BTC/USDT' ? calculatePnL(Number(t.entryPrice), livePrice, t.side) : null;
        return <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-4">
          <div className="flex items-center gap-3">{t.side === 'BUY' ? <ArrowUpRight className="text-emerald-400"/> : <ArrowDownRight className="text-rose-400"/>}<div><p className="text-sm font-bold text-white">{t.symbol} <span className="text-xs font-normal text-slate-400">{t.side}</span></p><p className="mt-1 font-mono text-[11px] text-slate-500">Entry $${money(Number(t.entryPrice))}{t.allocatedCapital ? ` · ${money(Number(t.allocatedCapital))} credits` : ''}</p></div></div>
          <div className="flex items-center gap-4"><p className={`font-mono text-sm font-bold ${pnl === null ? 'text-slate-400' : pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pnl === null ? '—' : `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`}</p><button type="button" disabled={closingId === t.id} onClick={() => onClose(t.id)} className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50">Close</button></div>
        </div>;
      })}</div> : <Empty icon={Activity} title="No open positions" subtitle="Open a demo trade to see its live performance here."/> :
      tab === 'history' ? closed.length ? <div className="space-y-2">{closed.map(t => <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-4"><div><p className="text-sm font-semibold text-white">{t.symbol} <span className="text-xs text-slate-400">{t.side}</span></p><p className="mt-1 text-[11px] text-slate-500">{t.closedAt ? new Date(t.closedAt).toLocaleString() : 'Closed'} · $${money(Number(t.entryPrice))} → $${money(Number(t.exitPrice ?? 0))}</p></div><div className="text-right"><p className={`font-mono text-sm font-bold ${Number(t.pnlPercentage ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{Number(t.pnlPercentage ?? 0) >= 0 ? '+' : ''}{Number(t.pnlPercentage ?? 0).toFixed(2)}%</p><p className="mt-1 text-[10px] text-slate-500">{t.realizedPnl == null ? 'No allocated P&L' : `${money(Number(t.realizedPnl))} credits`}</p></div></div>)}</div> : <Empty icon={Clock3} title="No closed trades yet" subtitle="Your completed trades will form a searchable-ready journal here."/> :
      <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest text-slate-500">Cumulative realized P&L · sized tournament trades</p><p className={`mt-1 font-mono text-2xl font-bold ${realized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{realized >= 0 ? '+' : '-'}{money(Math.abs(realized))} <span className="text-xs text-slate-500">credits</span></p></div><div className="text-right"><p className="text-[10px] uppercase tracking-widest text-slate-500">Win rate</p><p className="font-mono text-xl font-bold text-white">{sized.length ? `${winRate.toFixed(1)}%` : '—'}</p></div></div>
      <div className="relative h-36 overflow-hidden rounded-xl border border-white/5 bg-slate-950/60 p-3"><div className="absolute inset-x-3 top-1/2 border-t border-dashed border-slate-700/70"/>{equity.length ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full" role="img" aria-label="Cumulative realized profit and loss"><polyline points={path} fill="none" stroke={realized >= 0 ? '#34d399' : '#fb7185'} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/></svg> : <div className="relative flex h-full flex-col items-center justify-center gap-2 text-center"><TrendingUp size={24} className="text-indigo-400/60"/><p className="text-xs text-slate-400">Your performance curve appears after closing a sized tournament trade.</p></div>}</div>
      <p className="text-[10px] text-slate-500">Based on the latest 150 trade records. General demo trades without allocated capital are excluded from credit P&L and win rate.</p></div>}
    </div>
  </section>;
};

const Empty: React.FC<{ icon: typeof Activity; title: string; subtitle: string }> = ({ icon: Icon, title, subtitle }) => <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center"><div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-4"><Icon size={25} className="text-indigo-300/60"/></div><p className="text-sm font-semibold text-slate-200">{title}</p><p className="max-w-xs text-xs text-slate-500">{subtitle}</p></div>;
export default TradingActivity;
