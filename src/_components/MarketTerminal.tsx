import React, { useEffect, useState } from 'react';
import { Activity, BarChart3, Wifi, WifiOff } from 'lucide-react';

type Sample = { time: number; price: number };
type Props = {
  price: number | null;
  status: 'connected' | 'disconnected' | 'connecting';
  lastUpdated: string | null;
};

const MAX_SAMPLES = 90;

const MarketTerminal: React.FC<Props> = ({ price, status, lastUpdated }) => {
  const [samples, setSamples] = useState<Sample[]>([]);
  useEffect(() => {
    if (price === null || !Number.isFinite(price) || price <= 0 || status !== 'connected') return;
    setSamples(previous => {
      const now = Date.now();
      const next = [...previous, { time: now, price }];
      return next.slice(-MAX_SAMPLES);
    });
  }, [price, lastUpdated, status]);

  const values = samples.map(s => s.price);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const padding = Math.max((max - min) * 0.18, max * 0.00005);
  const low = min - padding;
  const high = max + padding;
  const points = samples.map((s, index) => {
    const x = samples.length === 1 ? 50 : (index / (samples.length - 1)) * 100;
    const y = 100 - ((s.price - low) / (high - low)) * 100;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const change = samples.length > 1 ? samples[samples.length - 1].price - samples[0].price : 0;
  const changePercent = samples.length > 1 ? (change / samples[0].price) * 100 : 0;
  const rising = change >= 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 shadow-xl shadow-black/10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-2 text-indigo-300"><BarChart3 size={19}/></div>
          <div><h3 className="text-sm font-bold tracking-wide text-white">BTC / USDT</h3><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Market terminal</p></div>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${status === 'connected' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
          {status === 'connected' ? <Wifi size={13}/> : <WifiOff size={13}/>}
          {status === 'connected' ? 'Live feed' : status === 'connecting' ? 'Connecting' : 'Feed offline'}
        </div>
      </div>
      <div className="px-5 pb-5 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Last traded price</p><p className="mt-1 font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">{price !== null ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</p></div>
          <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Since chart opened</p><p className={`mt-1 font-mono text-sm font-bold ${rising ? 'text-emerald-400' : 'text-rose-400'}`}>{samples.length > 1 ? `${rising ? '+' : ''}${changePercent.toFixed(3)}%` : '—'}</p></div>
        </div>
        <div className="relative mt-6 h-56 overflow-hidden rounded-xl border border-white/5 bg-slate-950/55 sm:h-72">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-4 opacity-40">{[0,1,2,3,4].map(n => <div key={n} className="border-t border-dashed border-slate-700/70"/>)}</div>
          {samples.length >= 2 ? (
            <div className="absolute inset-x-3 inset-y-5">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label="Live BTC USDT price samples recorded since opening this page">
                <polyline points={points} fill="none" stroke={rising ? '#34d399' : '#fb7185'} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
              </svg>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"><Activity size={28} className="text-indigo-400/60"/><p className="text-sm font-medium text-slate-300">Waiting for live price samples</p><p className="max-w-xs text-xs text-slate-500">The chart builds from genuine price updates while this page is open.</p></div>
          )}
          {samples.length >= 2 && <div className="absolute right-3 top-3 rounded-md bg-slate-900/85 px-2 py-1 font-mono text-[10px] text-slate-300">High ${max.toFixed(2)} · Low ${min.toFixed(2)}</div>}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500"><span>Session price trace · Not historical candles</span><span>{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Awaiting market data'}</span></div>
      </div>
    </section>
  );
};

export default MarketTerminal;
