import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, TrendingUp, Users, Target, Activity } from 'lucide-react';
import { NotifySuccess, NotifyError } from '../utils/notifications';
import TraderModal from '../_components/TraderModal';

interface Ranker {
  id: string;
  username: string;
  totalPnL: number;
  tradeCount: number;
  avatar: string;
  rankTier: string;
}

const Leaderboard: React.FC = () => {
  const [rankers, setRankers] = useState<Ranker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  
  // NEW: State for Modal Interaction
  const [selectedTrader, setSelectedTrader] = useState<Ranker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setRankers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Leaderboard fetch error:", err);
        setLoading(false);
      });
  }, []);

  const handleTraderClick = (trader: Ranker) => {
    setSelectedTrader(trader);
    setIsModalOpen(true);
  };

  const handleJoinTournament = async () => {
    setIsJoining(true);
    try {
      const response = await fetch('http://localhost:3001/api/tournaments/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_1', // To be made dynamic in Phase 4
          tournamentId: 'weekly-apex-challenge',
        }),
      });

      if (response.ok) {
        NotifySuccess("Entry Confirmed: You are now a Participant!");
      } else {
        NotifyError("Conflict: Already enrolled in this event.");
      }
    } catch (err) {
      NotifyError("Connection refused by Tournament Engine.");
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 font-mono space-y-4">
        <Activity className="animate-spin text-brand-accent" size={32} />
        <p className="animate-pulse uppercase tracking-widest text-xs font-black">Syncing Global Rankings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Interactive Tournament Header */}
      <div className="relative overflow-hidden bg-slate-900/50 border border-brand-accent/20 rounded-3xl p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 rounded-lg">
                <Trophy className="text-brand-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Global Leaderboard</h2>
            </div>
            <p className="text-slate-400 font-medium ml-1">Top traders by PnL performance across the Apex ecosystem.</p>
          </div>

          <button
            onClick={handleJoinTournament}
            disabled={isJoining}
            className="w-full md:w-auto px-8 py-4 bg-brand-accent hover:bg-indigo-500 text-white font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-brand-accent/20 uppercase tracking-tighter"
          >
            {isJoining ? 'Verifying...' : 'Join Active Tournament'}
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 blur-[100px] -mr-32 -mt-32"></div>
      </div>

      {/* Podium Section (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rankers.slice(0, 3).map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleTraderClick(user)}
            className={`relative p-6 rounded-3xl border border-white/5 backdrop-blur-xl overflow-hidden cursor-pointer group transition-all hover:border-brand-accent/40 ${
              index === 0 
                ? 'bg-gradient-to-br from-brand-accent/20 to-transparent border-brand-accent/30 shadow-[0_0_40px_-15px_rgba(99,102,241,0.4)]' 
                : 'bg-slate-900/40 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={user.avatar} className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 object-cover group-hover:scale-105 transition-transform" alt="avatar" />
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center shadow-lg transform -rotate-12">
                   {index === 0 ? <Trophy size={16} className="text-brand-primary" /> : <Medal size={16} className={index === 1 ? "text-slate-300" : "text-amber-600"} />}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white truncate w-32 group-hover:text-brand-accent transition-colors">{user.username}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Target size={12} className="text-brand-accent" />
                  <span className="text-[10px] text-brand-accent font-black uppercase tracking-tighter">{user.rankTier}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-end">
              <div>
                <div className="flex items-center gap-1 text-slate-500 mb-1">
                   <TrendingUp size={12} />
                   <p className="text-[10px] font-black uppercase tracking-widest">Net Return</p>
                </div>
                <p className={`text-2xl font-black font-mono ${user.totalPnL >= 0 ? 'text-brand-secondary' : 'text-rose-400'}`}>
                  {user.totalPnL > 0 ? '+' : ''}{user.totalPnL.toFixed(2)}%
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-slate-500 mb-1">
                   <Users size={12} />
                   <p className="text-[10px] font-black uppercase tracking-widest">Executions</p>
                </div>
                <p className="text-white font-mono font-black">{user.tradeCount}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Table (Ranks 4+) */}
      <div className="bg-slate-900/30 rounded-3xl border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            <tr>
              <th className="px-6 py-5">Rank</th>
              <th className="px-6 py-5">Trader</th>
              <th className="px-6 py-5"><div className="flex items-center gap-2"><Target size={14} /> Tier</div></th>
              <th className="px-6 py-5"><div className="flex items-center gap-2"><Users size={14} /> Volume</div></th>
              <th className="px-6 py-5 text-right"><div className="flex items-center justify-end gap-2"><TrendingUp size={14} /> Profit</div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence>
              {rankers.slice(3).map((user, index) => (
                <motion.tr 
                  key={user.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => handleTraderClick(user)}
                  className="hover:bg-brand-accent/5 cursor-pointer transition-all duration-200 group"
                >
                  <td className="px-6 py-5 font-mono text-slate-500 group-hover:text-brand-accent transition-colors">
                    #{String(index + 4).padStart(2, '0')}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} className="w-9 h-9 rounded-xl bg-slate-800 group-hover:scale-110 transition-transform object-cover" alt="" />
                      <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-slate-400 font-black border border-white/5 uppercase">
                      {user.rankTier}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-slate-400 font-mono text-sm font-bold">{user.tradeCount} trades</td>
                  <td className="px-6 py-5 text-right">
                    <span className={`font-black font-mono ${user.totalPnL >= 0 ? 'text-brand-secondary' : 'text-rose-400'}`}>
                      {user.totalPnL > 0 ? '+' : ''}{user.totalPnL.toFixed(2)}%
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* NEW: Detail Modal Integration */}
      <TraderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        trader={selectedTrader} 
      />
    </div>
  );
};

export default Leaderboard;