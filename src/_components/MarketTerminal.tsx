import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { api } from '../services/api';

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type Props = { price: number | null; status: 'connected' | 'disconnected' | 'connecting'; lastUpdated: string | null };
const intervals = [{ label: '1m', value: 1 }, { label: '5m', value: 5 }, { label: '15m', value: 15 }, { label: '1H', value: 60 }, { label: '4H', value: 240 }, { label: '1D', value: 1440 }];
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ma = (candles: Candle[], length: number, index: number): number | null => {
  if (index < length - 1) return null;
  let total = 0;
  for (let i = index - length + 1; i <= index; i++) total += candles[i].close;
  return total / length;
};

const MarketTerminal: React.FC<Props> = ({ price, status, lastUpdated }) => {
  const [interval, setIntervalValue] = useState(5);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await api.get<{ candles: Candle[] }>(`/market/candles/btcusdt?interval=${interval}`);
        if (!alive) return;
        setCandles(response.data.candles);
        setError('');
      } catch {
        if (alive) setError('Historical chart unavailable. Live ticker remains separate.');
      } finally { if (alive) setLoading(false); }
    };
    setLoading(true);
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => { alive = false; clearInterval(timer); };
  }, [interval, refresh]);
  const data = useMemo(() => candles.slice(-70), [candles]);
  const bounds = useMemo(() => {
    if (!data.length) return { low: 0, high: 1, maxVolume: 1 };
    const low = Math.min(...data.map(c => c.low));
    const high = Math.max(...data.map(c => c.high));
    const padding = Math.max((high - low) * 0.08, high * 0.0001);
    return { low: low - padding, high: high + padding, maxVolume: Math.max(1, ...data.map(c => c.volume)) };
  }, [data]);
  const y = (v: number) => 8 + ((bounds.high - v) / (bounds.high - bounds.low)) * 66;
  const selected = hover !== null ? data[hover] : data[data.length - 1];
  const first = data[0], last = data[data.length - 1];
  const change = first && last ? (last.close - first.open) / first.open * 100 : 0;
  const plotMA = (length: number) => data.map((c, i) => {
    const v = ma(data, length, i);
    return v === null ? '' : `${(i + .5) * 100 / data.length},${y(v)}`;
  }).filter(Boolean).join(' ');
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl shadow-black/10">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
      <div className="flex items-center gap-3"><div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-2 text-indigo-300"><BarChart3 size={19}/></div><div><h3 className="text-sm font-bold text-white">BTC / USDT <span className="ml-2 rounded bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-300">SPOT</span></h3><p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">Advanced market terminal</p></div></div>
      <div className="flex items-center gap-2"><span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold ${status === 'connected' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>{status === 'connected' ? <Wifi size={12}/> : <WifiOff size={12}/>} {status === 'connected' ? 'Ticker live' : 'Ticker offline'}</span><button type="button" title="Refresh candles" onClick={() => setRefresh(v => v + 1)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
      <div><p className="font-mono text-xl font-bold text-white">{price ? `$${fmt(price)}` : '—'}</p><p className="text-[10px] text-slate-500">Live ticker · Quidax</p></div>
      <div className="flex flex-wrap gap-1">{intervals.map(t => <button key={t.value} type="button" onClick={() => { setIntervalValue(t.value); setHover(null); }} className={`rounded-md px-2.5 py-1.5 font-mono text-[11px] font-semibold transition ${interval === t.value ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{t.label}</button>)}</div>
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-white/5 px-5 py-3 font-mono text-[11px]">
      {selected ? <><span className="text-slate-500">O <b className="text-slate-200">{fmt(selected.open)}</b></span><span className="text-slate-500">H <b className="text-emerald-400">{fmt(selected.high)}</b></span><span className="text-slate-500">L <b className="text-rose-400">{fmt(selected.low)}</b></span><span className="text-slate-500">C <b className="text-slate-200">{fmt(selected.close)}</b></span><span className="text-slate-500">VOL <b className="text-slate-200">{selected.volume.toFixed(3)}</b></span></> : <span className="text-slate-500">Waiting for historical candles</span>}
      <span className={`ml-auto font-bold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{data.length ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}% chart range` : '—'}</span>
    </div>
    <div className="relative mx-4 mt-4 h-72 overflow-hidden rounded-xl border border-white/5 bg-slate-950/70 sm:h-96">
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-5 opacity-35">{[0,1,2,3,4,5].map(i => <div key={i} className="border-t border-dashed border-slate-700" />)}</div>
      {data.length ? <div className="absolute inset-3">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Kraken historical BTC USDT candlestick chart with volume and moving averages">
          {data.map((c, i) => { const x = (i + .5) * 100 / data.length; const green = c.close >= c.open; const color = green ? '#34d399' : '#fb7185'; const top = y(Math.max(c.open,c.close)); const bottom = y(Math.min(c.open,c.close)); const body = Math.max(bottom-top, .35); const width = 72 / data.length; return <g key={c.time}><line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth=".18"/><rect x={x-width/2} y={top} width={width} height={body} fill={color} rx=".08"/><rect x={x-width/2} y={96-(c.volume/bounds.maxVolume)*17} width={width} height={(c.volume/bounds.maxVolume)*17} fill={color} opacity=".45"/></g>; })}
          {data.length >= 9 && <polyline points={plotMA(9)} fill="none" stroke="#fbbf24" strokeWidth=".34" strokeLinejoin="round" opacity=".95"/>}
          {data.length >= 21 && <polyline points={plotMA(21)} fill="none" stroke="#a78bfa" strokeWidth=".34" strokeLinejoin="round" opacity=".95"/>}
          {hover !== null && data[hover] && <line x1={(hover+.5)*100/data.length} x2={(hover+.5)*100/data.length} y1="0" y2="100" stroke="#94a3b8" strokeDasharray="1 1" strokeWidth=".18"/>}
          {data.map((c,i) => <rect key={`hit-${c.time}`} x={i*100/data.length} y="0" width={100/data.length} height="100" fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}/>)}
        </svg>
        <div className="pointer-events-none absolute right-2 top-2 space-y-1 text-right font-mono text-[10px] text-slate-400"><p>{fmt(bounds.high)}</p><p className="mt-16">{fmt((bounds.high+bounds.low)/2)}</p><p className="mt-16">{fmt(bounds.low)}</p></div>
        <div className="pointer-events-none absolute bottom-1 left-2 flex gap-3 text-[10px]"><span className="text-amber-300">━ MA 9</span><span className="text-violet-300">━ MA 21</span><span className="text-slate-500">▥ Volume</span></div>
      </div> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"><Activity size={30} className="text-indigo-400/50"/><p className="text-sm text-slate-300">{loading ? 'Loading authentic market candles…' : error || 'No candle data available'}</p></div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-[10px] text-slate-500"><span>Historical candles: Kraken · Live ticker: Quidax · Prices may differ between exchanges</span><span>{lastUpdated ? `Ticker updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Awaiting ticker'}</span></div>
  </section>;
};
export default MarketTerminal;
