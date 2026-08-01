import React, { useEffect, useState, useMemo } from 'react';
import { History, ArrowUpRight, ArrowDownRight, Search, Inbox } from 'lucide-react';

export interface HistoricTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  pnlPercentage: number;
  closedAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TradeHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoricTrade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    
    // Fetch closed trades for the current user
    fetch(`${API_BASE_URL}/trades/history?userId=user_1`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load history');
        return res.json();
      })
      .then((data: HistoricTrade[]) => {
        if (isMounted) {
          setHistory(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching trade history:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter history based on search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const query = searchQuery.toLowerCase();
    return history.filter(
      (trade) =>
        trade.symbol.toLowerCase().includes(query) ||
        trade.side.toLowerCase().includes(query)
    );
  }, [history, searchQuery]);

  if (loading) {
    return (
      <div className="rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/30 p-8 text-center select-none">
        <div className="mx-auto h-6 w-32 animate-pulse rounded bg-slate-800" />
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-slate-500 animate-pulse">
          Loading Ledger...
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/30 backdrop-blur-md select-none">
      
      {/* --- Section: Header Controls --- */}
      <div className="flex flex-col gap-4 border-b border-white/5 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <History size={18} className="text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Settlement History
          </h3>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={14}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Symbols (e.g. BTC)..."
            className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* --- Section: Desktop Table View (Visible md:block) --- */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-6 py-4">Asset / Side</th>
              <th className="px-6 py-4">Execution</th>
              <th className="px-6 py-4">Settlement</th>
              <th className="px-6 py-4 text-right">Net PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((trade) => {
                const isBuy = trade.side === 'BUY';
                const isProfitable = trade.pnlPercentage >= 0;

                return (
                  <tr
                    key={trade.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg p-2 ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {isBuy ? (
                            <ArrowUpRight size={14} />
                          ) : (
                            <ArrowDownRight size={14} />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            {trade.symbol}
                          </p>
                          <p className="text-[10px] font-black uppercase text-slate-500">
                            {trade.side}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      ${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      ${trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-mono text-xs font-bold ${
                        isProfitable ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfitable ? '+' : ''}
                      {trade.pnlPercentage.toFixed(2)}%
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="py-16 text-center text-xs font-bold uppercase tracking-widest text-slate-600"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox size={24} className="text-slate-600" />
                    <span>No settled positions found.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Section: Mobile List View (Visible md:hidden) --- */}
      <div className="divide-y divide-white/5 md:hidden">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((trade) => {
            const isBuy = trade.side === 'BUY';
            const isProfitable = trade.pnlPercentage >= 0;

            return (
              <div key={trade.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`rounded-lg p-1.5 ${
                        isBuy
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isBuy ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white">
                        {trade.symbol}
                      </span>
                      <span className="ml-2 text-[9px] font-black uppercase text-slate-500">
                        {trade.side}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-xs font-black ${
                      isProfitable ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isProfitable ? '+' : ''}
                    {trade.pnlPercentage.toFixed(2)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950/40 p-2.5 font-mono text-[11px]">
                  <div>
                    <span className="block text-[9px] font-bold uppercase text-slate-500">
                      Execution
                    </span>
                    <span className="text-slate-300">
                      ${trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-bold uppercase text-slate-500">
                      Settlement
                    </span>
                    <span className="text-slate-300">
                      ${trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-slate-600">
            <Inbox size={24} className="mx-auto mb-2 text-slate-600" />
            <span>No settled positions found.</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default TradeHistory;