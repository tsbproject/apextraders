import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, X } from 'lucide-react';

export interface TradeRowProps {
  /** Current ticker market price */
  currentPrice: number;
  /** Trade entry price */
  entryPrice: number;
  /** Position side */
  side: 'BUY' | 'SELL';
  /** Ticker symbol e.g., BTC/USDT */
  symbol: string;
  /** Optional trade position ID */
  id?: string;
  /** Optional position size/amount */
  amount?: number;
  /** Optional callback to close open position */
  onClosePosition?: (id: string) => void;
}

const TradeRow: React.FC<TradeRowProps> = ({
  currentPrice,
  entryPrice,
  side,
  symbol,
  id,
  amount,
  onClosePosition,
}) => {
  const [flash, setFlash] = useState<boolean>(false);

  // Trigger visual pulse when price updates
  useEffect(() => {
    if (currentPrice > 0) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 200);
      return () => clearTimeout(timer);
    }
  }, [currentPrice]);

  // Safe PnL calculation (prevents division by zero)
  const pnl =
    entryPrice > 0
      ? side === 'BUY'
        ? ((currentPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - currentPrice) / entryPrice) * 100
      : 0;

  const isProfit = pnl >= 0;
  const isBuy = side === 'BUY';

  return (
    <motion.div
      animate={{
        backgroundColor: flash
          ? isProfit
            ? 'rgba(16, 185, 129, 0.12)' // Emerald flash
            : 'rgba(244, 63, 94, 0.12)' // Rose flash
          : 'rgba(15, 23, 42, 0.4)', // Base bg
      }}
      transition={{ duration: 0.2 }}
      className="group relative flex items-center justify-between gap-3 rounded-xl sm:rounded-2xl border border-white/5 p-3 sm:p-4 transition-colors select-none"
    >
      {/* Left Column: Asset Symbol & Side Badge */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div
          className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${
            isBuy
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {isBuy ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {symbol}
            </span>
            <span
              className={`rounded px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black uppercase tracking-tighter ${
                isBuy
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {side}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] sm:text-xs text-slate-400">
            <span>
              Entry: ${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            {amount !== undefined && (
              <span className="text-slate-500 hidden xs:inline">
                • {amount} units
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Live Price & Net PnL */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col text-right">
          <span
            className={`font-mono text-base sm:text-lg font-black tracking-tight ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isProfit ? '+' : ''}
            {pnl.toFixed(2)}%
          </span>

          <div className="flex items-center justify-end gap-1 font-mono text-[10px] font-bold text-slate-500">
            <span>Mark:</span>
            <span className="text-slate-300">
              ${currentPrice > 0
                ? currentPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '0.00'}
            </span>
          </div>
        </div>

        {/* Optional Action: Close Position Button */}
        {onClosePosition && id && (
          <button
            type="button"
            onClick={() => onClosePosition(id)}
            title="Close position"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-slate-400 opacity-80 transition-all hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 group-hover:opacity-100"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default TradeRow;