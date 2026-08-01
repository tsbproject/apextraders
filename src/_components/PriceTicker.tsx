import React from 'react';
import { useAppSelector } from '../store/hooks';

export type PriceFeedStatus = 'connected' | 'connecting' | 'disconnected' | string;

const PriceTicker: React.FC = () => {
  // Pulling live data from Redux state
  const btcPrice = useAppSelector((state) => state.price.btc);
  const status = useAppSelector((state) => state.price.status as PriceFeedStatus);

  // Formatting the price for a professional trading look
  const formattedPrice = btcPrice !== null && btcPrice !== undefined
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(btcPrice)
    : '$---.--';

  // Status Indicator helper
  const getStatusColor = (currentStatus: PriceFeedStatus) => {
    switch (currentStatus) {
      case 'connected':
        return {
          dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
          text: 'text-emerald-400',
          label: 'Live',
        };
      case 'connecting':
        return {
          dot: 'bg-amber-500 animate-pulse',
          text: 'text-amber-400',
          label: 'Connecting...',
        };
      default:
        return {
          dot: 'bg-rose-500',
          text: 'text-rose-400',
          label: 'Offline',
        };
    }
  };

  const statusStyle = getStatusColor(status);

  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-xl sm:rounded-2xl border border-white/5 bg-slate-900/60 p-3 sm:p-4 backdrop-blur-md select-none">
      
      {/* Ticker Info */}
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-wider text-slate-500">
          BTC / USDT
        </span>
        <span className={`font-mono text-xl sm:text-2xl font-black tracking-tight ${statusStyle.text} truncate`}>
          {formattedPrice}
        </span>
      </div>

      {/* Connection Status Badge */}
      <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/5 bg-slate-950/40 px-2.5 py-1">
        <div className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {statusStyle.label}
        </span>
      </div>

    </div>
  );
};

export default PriceTicker;