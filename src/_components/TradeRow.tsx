import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TradeRowProps {
  currentPrice: number;
  entryPrice: number;
  side: 'BUY' | 'SELL';
  symbol: string;
}

const TradeRow: React.FC<TradeRowProps> = ({ currentPrice, entryPrice, side, symbol }) => {
  const [flash, setFlash] = useState(false);

  // Trigger visual pulse when price updates (Phase 2: UI Feedback)
  useEffect(() => {
    if (currentPrice > 0) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 200);
      return () => clearTimeout(timer);
    }
  }, [currentPrice]);

  const pnl = side === 'BUY' 
    ? ((currentPrice - entryPrice) / entryPrice) * 100 
    : ((entryPrice - currentPrice) / entryPrice) * 100;

  const isProfit = pnl >= 0;

  return (
    <motion.div
      animate={{ 
        backgroundColor: flash 
          ? (isProfit ? 'rgba(45, 212, 191, 0.1)' : 'rgba(244, 63, 94, 0.1)') 
          : 'rgba(15, 23, 42, 0)' 
      }}
      className="p-4 rounded-2xl border border-white/5 flex justify-between items-center transition-colors duration-300"
    >
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">
          {symbol} • {side}
        </span>
        <span className="font-mono text-sm font-bold text-white">
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="text-right flex flex-col">
        <span className={`font-mono font-black text-lg ${isProfit ? 'text-brand-secondary' : 'text-rose-400'}`}>
          {isProfit ? '+' : ''}{pnl.toFixed(2)}%
        </span>
        <span className="text-[10px] uppercase font-bold text-slate-500">Live PnL</span>
      </div>
    </motion.div>
  );
};

export default TradeRow;