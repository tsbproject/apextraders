import React, { useEffect, useState } from 'react';
import { History, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
// import { useAppSelector } from '../store/hooks';

interface HistoricTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  pnlPercentage: number;
  closedAt: string;
}

const TradeHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoricTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch closed trades for the current user
    fetch('http://localhost:3001/api/trades/history?userId=user_1')
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse font-mono text-xs uppercase">Loading Ledger...</div>;

  return (
    <div className="bg-slate-900/30 border border-white/5 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <History size={18} />
          <h3 className="font-bold uppercase tracking-wider text-xs">Settlement History</h3>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Search Symbols..." 
            className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-brand-accent/50 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Asset / Side</th>
              <th className="px-6 py-4">Execution</th>
              <th className="px-6 py-4">Settlement</th>
              <th className="px-6 py-4 text-right">Net PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {history.length > 0 ? history.map((trade) => (
              <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${trade.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {trade.side === 'BUY' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{trade.symbol}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase">{trade.side}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-400">
                  ${trade.entryPrice.toLocaleString()}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-400">
                  ${trade.exitPrice.toLocaleString()}
                </td>
                <td className={`px-6 py-4 text-right font-mono text-xs font-bold ${trade.pnlPercentage >= 0 ? 'text-brand-secondary' : 'text-rose-400'}`}>
                  {trade.pnlPercentage > 0 ? '+' : ''}{trade.pnlPercentage.toFixed(2)}%
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="py-20 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">
                  No settled positions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeHistory;