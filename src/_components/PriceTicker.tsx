import React from 'react';
import { useAppSelector } from '../store/hooks';

const PriceTicker: React.FC = () => {
  // Pulling live data from our Redux state
  const btcPrice = useAppSelector((state) => state.price.btc);
  const status = useAppSelector((state) => state.price.status);

  // Formatting the price for a professional trading look
  const formattedPrice = btcPrice 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(btcPrice)
    : '---';

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex flex-col">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          BTC / USDT
        </span>
        <span className={`text-2xl font-mono font-bold ${status === 'connected' ? 'text-green-400' : 'text-yellow-500'}`}>
          {formattedPrice}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Connection Status Indicator */}
        <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
        <span className="text-[10px] text-slate-500 uppercase font-medium">
          {status}
        </span>
      </div>
    </div>
  );
};

export default PriceTicker;