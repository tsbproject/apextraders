import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Bell, User, Menu, X, LogIn, UserPlus } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { AuthModalMode } from '../../App';

export interface HeaderProps {
  onOpenAuth?: (mode: AuthModalMode) => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

/**
 * Header component for ApexTraders.
 * Features a real-time price ticker with color-coded animations,
 * guest auth triggers, user status, and responsive mobile layout.
 */
const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
}) => {
      const { isAuthenticated, user } =
        useAppSelector((state) => state.auth);

      const btcPrice = useAppSelector(
        (state) => state.price.btc
      );

      const priceStatus = useAppSelector(
        (state) => state.price.status
      );




      


//   // Track previous price and derived states during render


const previousPriceRef = useRef<number | null>(null);

const [priceDirection, setPriceDirection] =
  useState<'up' | 'down' | 'neutral'>('neutral');

useEffect(() => {
  if (btcPrice === null) {
    return;
  }

  const previousPrice = previousPriceRef.current;

  previousPriceRef.current = btcPrice;

  if (previousPrice === null || btcPrice === previousPrice) {
    return;
  }

  const timer = window.setTimeout(() => {
    setPriceDirection(
      btcPrice > previousPrice ? 'up' : 'down'
    );
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [btcPrice]);



const priceColor =
  priceDirection === 'up'
    ? '#10b981'
    : priceDirection === 'down'
      ? '#f43f5e'
      : '#f8fafc';

const isTrendingUp = priceDirection !== 'down';

  const userName = user?.username || 'Trader';
  const userRole = user?.role ? String(user.role).toUpperCase() : 'MEMBER';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full select-none items-center justify-between border-b border-white/5 bg-slate-900/80 px-3 sm:px-6 md:px-8 backdrop-blur-md">
      
      {/* --- Section: Left Controls (Mobile Toggle + Mobile Logo + Live Market Ticker) --- */}
      <div className="flex items-center gap-2.5 sm:gap-6">
        
        {/* Mobile Sidebar Hamburger Toggle */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            type="button"
            aria-label="Toggle navigation menu"
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white md:hidden cursor-pointer"
          >
            {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Mobile Logo */}
        <div className="flex items-center md:hidden shrink-0 pr-1">
          <h1 className="text-[10px] sm:text-lg font-black tracking-tighter italic text-white">
            APEX<span className="text-indigo-500">TRADERS</span>
          </h1>
        </div>

        {/* Ticker & Status */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-500">
              Live BTC/USDT
            </span>
            
            <div className="flex h-7 items-center gap-1.5 sm:gap-2 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={btcPrice ?? 'loading'}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, color: priceColor }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="font-mono text-xs sm:text-lg md:text-xl font-bold tracking-tight text-slate-50"
                >
                  {btcPrice !== null && btcPrice !== undefined
                    ? btcPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '0.00'}
                </motion.span>
              </AnimatePresence>
              
              {btcPrice !== null && (
                <motion.div
                  key={isTrendingUp ? 'up' : 'down'}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex items-center"
                >
                  {isTrendingUp ? (
                    <TrendingUp size={14} className="text-emerald-500 sm:w-[18px] sm:h-[18px]" />
                  ) : (
                    <TrendingDown size={14} className="text-rose-500 sm:w-[18px] sm:h-[18px]" />
                  )}
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Connection Status Badge */}
          <div
            className={`hidden xs:flex items-center gap-1.5 rounded-full border px-2.5 py-1 sm:gap-2 sm:px-3 ${
              priceStatus === 'connected'
                ? 'border-emerald-500/10 bg-emerald-500/5'
                : priceStatus === 'connecting'
                ? 'border-amber-500/10 bg-amber-500/5'
                : 'border-rose-500/10 bg-rose-500/5'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {priceStatus === 'connected' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}

              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  priceStatus === 'connected'
                    ? 'bg-emerald-500'
                    : priceStatus === 'connecting'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
            </span>

            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                priceStatus === 'connected'
                  ? 'text-emerald-500'
                  : priceStatus === 'connecting'
                  ? 'text-amber-500'
                  : 'text-rose-500'
              }`}
            >
              {priceStatus === 'connected'
                ? 'Live Feed'
                : priceStatus === 'connecting'
                ? 'Connecting'
                : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* --- Section: Right Controls (User Profile / Auth Controls) --- */}
      <div className="flex items-center gap-2 sm:gap-4">
        {isAuthenticated ? (
          <>
            {/* Notifications */}
            <button 
              type="button"
              aria-label="Notifications"
              className="group relative rounded-lg p-1.5 sm:p-2 text-slate-400 transition-all hover:bg-white/5 hover:text-white cursor-pointer"
            >
              <Bell size={18} className="sm:w-[20px] sm:h-[20px]" />
              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-2 w-2 rounded-full border-2 border-slate-900 bg-indigo-500 transition-transform group-hover:scale-110"></span>
            </button>

            <div className="mx-1 h-5 sm:h-8 w-[1px] bg-white/10" />

            {/* Profile */}
            <div className="group flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2">
              <div className="hidden flex-col text-right sm:flex">
                <span className="text-xs font-bold text-slate-100 transition-colors group-hover:text-indigo-400">
                  {userName}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-tighter text-indigo-400">
                  {userRole}
                </span>
              </div>
              
              <div className="relative">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg transition-transform duration-300 group-hover:rotate-12">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900">
                    <User size={16} className="text-white sm:w-[20px] sm:h-[20px]" />
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-2 border-slate-950 bg-emerald-500"></div>
              </div>
            </div>
          </>
        ) : (
          /* Unauthenticated Auth Buttons */
          <div className="flex items-center gap-2">
            {onOpenAuth && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span className="hidden sm:inline">Register</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

    </header>
  );
};

export default Header;