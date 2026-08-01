// // import React, { useEffect, useRef, useState } from 'react';
// // import { motion, AnimatePresence } from 'framer-motion';
// // import { TrendingUp, TrendingDown, Bell, User } from 'lucide-react';

// // interface HeaderProps {
// //   btcPrice: number | null;
// // }

// // /**
// //  * Header component for ApexTraders.
// //  * Features a real-time price ticker with color-coded animations and a sleek Dubai-luxury UI.
// //  */
// // const Header: React.FC<HeaderProps> = ({ btcPrice }) => {
// //   const prevPriceRef = useRef<number | null>(null);
// //   const [priceColor, setPriceColor] = useState<string>('#94a3b8'); // Default: Slate-400

// //   // Effect to handle price direction and color flashing
// //   useEffect(() => {
// //     if (prevPriceRef.current !== null && btcPrice !== null) {
// //       if (btcPrice > prevPriceRef.current) {
// //         setPriceColor('#10b981'); // Emerald-500 (Up)
// //       } else if (btcPrice < prevPriceRef.current) {
// //         setPriceColor('#f43f5e'); // Rose-500 (Down)
// //       }

// //       // Reset to neutral white/slate after pulse animation
// //       const timer = setTimeout(() => setPriceColor('#f8fafc'), 400);
// //       return () => clearTimeout(timer);
// //     }
// //     prevPriceRef.current = btcPrice;
// //   }, [btcPrice]);

// //   // Determine trend for the icon
// //   const isTrendingUp = btcPrice !== null && prevPriceRef.current !== null 
// //     ? btcPrice > prevPriceRef.current 
// //     : true;

// //   return (
// //     <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-8 z-10 select-none">
      
// //       {/* --- Section: Live Market Ticker --- */}
// //       <div className="flex items-center gap-6">
// //         <div className="flex flex-col">
// //           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
// //             Live BTC/USDT
// //           </span>
          
// //           <div className="flex items-center gap-2 h-7 overflow-hidden">
// //             <AnimatePresence mode="wait">
// //               <motion.span
// //                 key={btcPrice} // Triggers animation on every price change
// //                 initial={{ y: 12, opacity: 0 }}
// //                 animate={{ y: 0, opacity: 1, color: priceColor }}
// //                 exit={{ y: -12, opacity: 0 }}
// //                 transition={{ duration: 0.15, ease: "easeOut" }}
// //                 className="text-xl font-mono font-bold tracking-tight text-slate-50"
// //               >
// //                 {btcPrice 
// //                   ? btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
// //                   : '0.00'
// //                 }
// //               </motion.span>
// //             </AnimatePresence>
            
// //             {btcPrice && (
// //               <motion.div
// //                 key={isTrendingUp ? 'up' : 'down'}
// //                 initial={{ scale: 0.5, opacity: 0 }}
// //                 animate={{ scale: 1, opacity: 1 }}
// //                 transition={{ type: "spring", stiffness: 300, damping: 20 }}
// //               >
// //                 {isTrendingUp ? (
// //                   <TrendingUp size={18} className="text-emerald-500" />
// //                 ) : (
// //                   <TrendingDown size={18} className="text-rose-500" />
// //                 )}
// //               </motion.div>
// //             )}
// //           </div>
// //         </div>
        
// //         {/* --- Section: Connection Status --- */}
// //         <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">
// //           <span className="relative flex h-2 w-2">
// //             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
// //             <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
// //           </span>
// //           <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live Feed</span>
// //         </div>
// //       </div>

// //       {/* --- Section: User Profile & Actions --- */}
// //       <div className="flex items-center gap-4">
// //         {/* Notifications */}
// //         <button className="p-2 text-slate-400 hover:text-white transition-all hover:bg-white/5 rounded-lg relative group">
// //           <Bell size={20} />
// //           <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-900 group-hover:scale-110 transition-transform"></span>
// //         </button>

// //         <div className="h-8 w-[1px] bg-white/10 mx-2" />

// //         {/* Profile */}
// //         <button className="flex items-center gap-3 pl-2 group">
// //           <div className="text-right flex flex-col hidden sm:flex">
// //             <span className="text-xs font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
// //               Tayo Bolarinwa
// //             </span>
// //             <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
// //               Elite Trader
// //             </span>
// //           </div>
          
// //           <div className="relative">
// //             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-[2px] shadow-lg group-hover:rotate-12 transition-transform duration-300">
// //               <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
// //                 <User size={20} className="text-white" />
// //               </div>
// //             </div>
// //             {/* Status indicator on avatar */}
// //             <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
// //           </div>
// //         </button>
// //       </div>
// //     </header>
// //   );
// // };

// // export default Header;



// import React, { useEffect, useRef, useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { TrendingUp, TrendingDown, Bell, User, Menu, X } from 'lucide-react';

// export interface HeaderProps {
//   btcPrice: number | null;
//   /** Optional username display */
//   userName?: string;
//   /** Optional user tier display */
//   userTier?: string;
//   /** Mobile sidebar toggle handler (if parent sidebar uses overlay) */
//   onToggleMobileSidebar?: () => void;
//   /** Track whether mobile menu is currently expanded */
//   isMobileSidebarOpen?: boolean;
// }

// /**
//  * Header component for ApexTraders.
//  * Features a real-time price ticker with color-coded animations,
//  * responsive layout structure, and a sleek Dubai-luxury UI.
//  */
// const Header: React.FC<HeaderProps> = ({
//   btcPrice,
//   userName = 'Tayo Bolarinwa',
//   userTier = 'Elite Trader',
//   onToggleMobileSidebar,
//   isMobileSidebarOpen = false,
// }) => {
//   const prevPriceRef = useRef<number | null>(null);
//   const [priceColor, setPriceColor] = useState<string>('#94a3b8'); // Default: Slate-400

//   // Effect to handle price direction and color flashing
//   useEffect(() => {
//     if (prevPriceRef.current !== null && btcPrice !== null) {
//       if (btcPrice > prevPriceRef.current) {
//         setPriceColor('#10b981'); // Emerald-500 (Up)
//       } else if (btcPrice < prevPriceRef.current) {
//         setPriceColor('#f43f5e'); // Rose-500 (Down)
//       }

//       // Reset to neutral white/slate after pulse animation
//       const timer = setTimeout(() => setPriceColor('#f8fafc'), 400);
//       return () => clearTimeout(timer);
//     }
//     prevPriceRef.current = btcPrice;
//   }, [btcPrice]);

//   // Determine trend for the icon
//   const isTrendingUp =
//     btcPrice !== null && prevPriceRef.current !== null
//       ? btcPrice > prevPriceRef.current
//       : true;

//   return (
//     <header className="sticky top-0 z-30 flex h-16 w-full select-none items-center justify-between border-b border-white/5 bg-slate-900/80 px-4 sm:px-6 md:px-8 backdrop-blur-md">
      
//       {/* --- Section: Left Controls (Mobile Menu Trigger + Live Market Ticker) --- */}
//       <div className="flex items-center gap-3 sm:gap-6">
        
//         {/* Mobile Sidebar Hamburger Toggle */}
//         {onToggleMobileSidebar && (
//           <button
//             onClick={onToggleMobileSidebar}
//             type="button"
//             aria-label="Toggle navigation menu"
//             className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
//           >
//             {isMobileSidebarOpen ? <X size={22} /> : <Menu size={22} />}
//           </button>
//         )}

//         {/* Ticker & Status */}
//         <div className="flex items-center gap-2 sm:gap-4">
//           <div className="flex flex-col">
//             <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-500">
//               Live BTC/USDT
//             </span>
            
//             <div className="flex h-7 items-center gap-1.5 sm:gap-2 overflow-hidden">
//               <AnimatePresence mode="wait">
//                 <motion.span
//                   key={btcPrice ?? 'loading'} // Triggers animation on every price change
//                   initial={{ y: 12, opacity: 0 }}
//                   animate={{ y: 0, opacity: 1, color: priceColor }}
//                   exit={{ y: -12, opacity: 0 }}
//                   transition={{ duration: 0.15, ease: 'easeOut' }}
//                   className="font-mono text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-50"
//                 >
//                   {btcPrice !== null && btcPrice !== undefined
//                     ? btcPrice.toLocaleString(undefined, {
//                         minimumFractionDigits: 2,
//                         maximumFractionDigits: 2,
//                       })
//                     : '0.00'}
//                 </motion.span>
//               </AnimatePresence>
              
//               {btcPrice !== null && (
//                 <motion.div
//                   key={isTrendingUp ? 'up' : 'down'}
//                   initial={{ scale: 0.5, opacity: 0 }}
//                   animate={{ scale: 1, opacity: 1 }}
//                   transition={{ type: 'spring', stiffness: 300, damping: 20 }}
//                   className="flex items-center"
//                 >
//                   {isTrendingUp ? (
//                     <TrendingUp size={16} className="text-emerald-500 sm:w-[18px] sm:h-[18px]" />
//                   ) : (
//                     <TrendingDown size={16} className="text-rose-500 sm:w-[18px] sm:h-[18px]" />
//                   )}
//                 </motion.div>
//               )}
//             </div>
//           </div>
          
//           {/* Connection Status (Hidden on extra small screens to save room) */}
//           <div className="hidden xs:flex items-center gap-1.5 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-2.5 py-1 sm:gap-2 sm:px-3">
//             <span className="relative flex h-2 w-2">
//               <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
//               <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
//             </span>
//             <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-500">
//               Live Feed
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* --- Section: Right Controls (User Profile & Notifications) --- */}
//       <div className="flex items-center gap-2 sm:gap-4">
//         {/* Notifications */}
//         <button 
//           type="button"
//           aria-label="Notifications"
//           className="group relative rounded-lg p-2 text-slate-400 transition-all hover:bg-white/5 hover:text-white"
//         >
//           <Bell size={18} className="sm:w-[20px] sm:h-[20px]" />
//           <span className="absolute top-2 right-2 h-2 w-2 rounded-full border-2 border-slate-900 bg-indigo-500 transition-transform group-hover:scale-110"></span>
//         </button>

//         <div className="mx-1 h-6 w-[1px] bg-white/10 sm:mx-2 sm:h-8" />

//         {/* Profile */}
//         <button 
//           type="button"
//           className="group flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 focus:outline-none"
//         >
//           <div className="hidden flex-col text-right sm:flex">
//             <span className="text-xs font-bold text-slate-100 transition-colors group-hover:text-indigo-400">
//               {userName}
//             </span>
//             <span className="text-[10px] font-medium uppercase tracking-tighter text-slate-500">
//               {userTier}
//             </span>
//           </div>
          
//           <div className="relative">
//             <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg transition-transform duration-300 group-hover:rotate-12">
//               <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900">
//                 <User size={18} className="text-white sm:w-[20px] sm:h-[20px]" />
//               </div>
//             </div>
//             {/* Online Status indicator on avatar */}
//             <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-2 border-slate-950 bg-emerald-500"></div>
//           </div>
//         </button>
//       </div>

//     </header>
//   );
// };

// export default Header;



import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Bell, User, Menu, X } from 'lucide-react';

export interface HeaderProps {
  btcPrice: number | null;
  /** Optional username display */
  userName?: string;
  /** Optional user tier display */
  userTier?: string;
  /** Mobile sidebar toggle handler (if parent sidebar uses overlay) */
  onToggleMobileSidebar?: () => void;
  /** Track whether mobile menu is currently expanded */
  isMobileSidebarOpen?: boolean;
}

/**
 * Header component for ApexTraders.
 * Features a real-time price ticker with color-coded animations,
 * responsive mobile brand header, and a sleek Dubai-luxury UI.
 */
const Header: React.FC<HeaderProps> = ({
  btcPrice,
  userName = 'Tayo Bolarinwa',
  userTier = 'Elite Trader',
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
}) => {
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
  const isTrendingUp =
    btcPrice !== null && prevPriceRef.current !== null
      ? btcPrice > prevPriceRef.current
      : true;

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
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
          >
            {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Mobile Logo (Visible on mobile screens < md, Hidden on desktop >= md) */}
        <div className="flex items-center md:hidden shrink-0 pr-1">
          <h1 className="text-[9px] sm:text-lg font-black tracking-tighter italic text-white">
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
                  key={btcPrice ?? 'loading'} // Triggers animation on every price change
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
          
          {/* Connection Status Badge (Hidden on extra small screens to save space) */}
          <div className="hidden xs:flex items-center gap-1.5 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-2.5 py-1 sm:gap-2 sm:px-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              Live Feed
            </span>
          </div>
        </div>
      </div>

      {/* --- Section: Right Controls (User Profile & Notifications) --- */}
      <div className="flex items-center gap-1.5 sm:gap-4">
        {/* Notifications */}
        <button 
          type="button"
          aria-label="Notifications"
          className="group relative rounded-lg p-1.5 sm:p-2 text-slate-400 transition-all hover:bg-white/5 hover:text-white"
        >
          <Bell size={18} className="sm:w-[20px] sm:h-[20px]" />
          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-2 w-2 rounded-full border-2 border-slate-900 bg-indigo-500 transition-transform group-hover:scale-110"></span>
        </button>

        <div className="mx-1 h-5 sm:h-8 w-[1px] bg-white/10" />

        {/* Profile */}
        <button 
          type="button"
          className="group flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 focus:outline-none"
        >
          <div className="hidden flex-col text-right sm:flex">
            <span className="text-xs font-bold text-slate-100 transition-colors group-hover:text-indigo-400">
              {userName}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-tighter text-slate-500">
              {userTier}
            </span>
          </div>
          
          <div className="relative">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg transition-transform duration-300 group-hover:rotate-12">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900">
                <User size={16} className="text-white sm:w-[20px] sm:h-[20px]" />
              </div>
            </div>
            {/* Online Status indicator on avatar */}
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-2 border-slate-950 bg-emerald-500"></div>
          </div>
        </button>
      </div>

    </header>
  );
};

export default Header;