import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Bell, User } from 'lucide-react';

interface HeaderProps {
  btcPrice: number | null;
}

/**
 * Header component for ApexTraders.
 * Features a real-time price ticker with color-coded animations and a sleek Dubai-luxury UI.
 */
const Header: React.FC<HeaderProps> = ({ btcPrice }) => {
  const prevPriceRef = useRef<number | null>(null);
  const [priceColor, setPriceColor] = useState<string>('#94a3b8'); // Default: Slate-400

  // Effect to handle price direction and color flashing
  useEffect(() => {
    if (prevPriceRef.current !== null && btcPrice !== null) {
      if (btcPrice > prevPriceRef.current) {
        setPriceColor('#10b981'); // Emerald-500 (Up)
      } else if (btcPrice < prevPriceRef.current) {
        setPriceColor('#f43f5e'); // Rose-500 (Down)
      }

      // Reset to neutral white/slate after pulse animation
      const timer = setTimeout(() => setPriceColor('#f8fafc'), 400);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = btcPrice;
  }, [btcPrice]);

  // Determine trend for the icon
  const isTrendingUp = btcPrice !== null && prevPriceRef.current !== null 
    ? btcPrice > prevPriceRef.current 
    : true;

  return (
    <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-8 z-10 select-none">
      
      {/* --- Section: Live Market Ticker --- */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Live BTC/USDT
          </span>
          
          <div className="flex items-center gap-2 h-7 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={btcPrice} // Triggers animation on every price change
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1, color: priceColor }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="text-xl font-mono font-bold tracking-tight text-slate-50"
              >
                {btcPrice 
                  ? btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                  : '0.00'
                }
              </motion.span>
            </AnimatePresence>
            
            {btcPrice && (
              <motion.div
                key={isTrendingUp ? 'up' : 'down'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isTrendingUp ? (
                  <TrendingUp size={18} className="text-emerald-500" />
                ) : (
                  <TrendingDown size={18} className="text-rose-500" />
                )}
              </motion.div>
            )}
          </div>
        </div>
        
        {/* --- Section: Connection Status --- */}
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live Feed</span>
        </div>
      </div>

      {/* --- Section: User Profile & Actions --- */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 text-slate-400 hover:text-white transition-all hover:bg-white/5 rounded-lg relative group">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-900 group-hover:scale-110 transition-transform"></span>
        </button>

        <div className="h-8 w-[1px] bg-white/10 mx-2" />

        {/* Profile */}
        <button className="flex items-center gap-3 pl-2 group">
          <div className="text-right flex flex-col hidden sm:flex">
            <span className="text-xs font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
              Tayo Bolarinwa
            </span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
              Elite Trader
            </span>
          </div>
          
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-[2px] shadow-lg group-hover:rotate-12 transition-transform duration-300">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
            </div>
            {/* Status indicator on avatar */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;