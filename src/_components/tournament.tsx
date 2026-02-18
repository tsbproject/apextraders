import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Users, ArrowRight, } from 'lucide-react';
import { NotifySuccess, NotifyError } from '../utils/notifications';

interface Tournament {
  id: string;
  title: string;
  prizePool: number;
  participantsCount: number;
  endDate: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

const Tournaments: React.FC = () => {
  const [contests, setContests] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Phase 3: Fetch active tournaments from Prisma
    fetch('http://localhost:3001/api/tournaments')
      .then(res => res.json())
      .then(data => {
        setContests(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleJoin = async (tournamentId: string) => {
    try {
      const res = await fetch('http://localhost:3001/api/tournaments/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user_1', tournamentId })
      });

      if (res.ok) {
        NotifySuccess("Entry secured. See you on the Leaderboard!");
      } else {
        NotifyError("You're already in this race.");
      }
    } catch (err) {
      NotifyError("Engine error: Could not process entry.");
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse font-mono text-slate-500">Scanning for Active Arenas...</div>;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-brand-accent/20 to-slate-900 border border-brand-accent/20 p-10 rounded-[2rem]">
        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">Pro Arenas</h1>
        <p className="text-slate-400 mt-2 max-w-md">Join global competitions, climb the tiers, and prove your edge in the market.</p>
      </div>

      {/* Grid of Contests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contests.map((item) => (
          <div key={item.id} className="group relative bg-slate-900/40 border border-white/5 p-8 rounded-3xl hover:border-brand-accent/40 transition-all duration-500 overflow-hidden">
            {/* Prize Badge */}
            <div className="absolute top-6 right-6 px-3 py-1 bg-brand-secondary/10 border border-brand-secondary/20 rounded-full">
              <span className="text-brand-secondary text-[10px] font-black uppercase tracking-widest">${item.prizePool.toLocaleString()} Prize</span>
            </div>

            <div className="space-y-6">
              <div className="p-3 bg-white/5 w-fit rounded-2xl group-hover:bg-brand-accent/10 transition-colors">
                <Trophy className="text-brand-accent" size={24} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <div className="flex items-center gap-4 mt-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5"><Users size={14} /> {item.participantsCount} Joined</div>
                  <div className="flex items-center gap-1.5"><Calendar size={14} /> Ends {new Date(item.endDate).toLocaleDateString()}</div>
                </div>
              </div>

              <button 
                onClick={() => handleJoin(item.id)}
                className="w-full py-4 bg-white/5 group-hover:bg-brand-accent text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all group-hover:scale-[1.02] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                JOIN COMPETITION <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tournaments;