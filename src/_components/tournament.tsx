import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Users, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { NotifySuccess, NotifyError } from '../utils/notifications';

export interface Tournament {
  id: string;
  title: string;
  prizePool: number;
  participantsCount: number;
  endDate: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const Tournaments: React.FC = () => {
  const [contests, setContests] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Fetch active tournaments from Prisma API
    fetch(`${API_BASE_URL}/tournaments`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch tournaments');
        return res.json();
      })
      .then((data: Tournament[]) => {
        if (isMounted) {
          setContests(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading tournaments:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleJoin = async (tournamentId: string) => {
    setJoiningId(tournamentId);
    try {
      const res = await fetch(`${API_BASE_URL}/tournaments/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user_1', tournamentId }),
      });

      if (res.ok) {
        NotifySuccess('Entry secured. See you on the Leaderboard!');
        // Increment participant count locally for instant UI update
        setContests((prev) =>
          prev.map((c) =>
            c.id === tournamentId
              ? { ...c, participantsCount: c.participantsCount + 1 }
              : c
          )
        );
      } else {
        const errorData = await res.json().catch(() => ({}));
        NotifyError(errorData.message || "You're already in this race.");
      }
    } catch  {
      NotifyError('Engine error: Could not process entry.');
    } finally {
      setJoiningId(null);
    }
  };

  // --- Loading Skeleton View ---
  if (loading) {
    return (
      <div className="space-y-6 select-none">
        <div className="h-36 sm:h-44 w-full rounded-2xl sm:rounded-[2rem] bg-slate-900/60 border border-white/5 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl sm:rounded-3xl bg-slate-900/40 border border-white/5 animate-pulse p-6"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      
      {/* --- Section: Hero Header --- */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-6 sm:p-8 md:p-10 backdrop-blur-xl">
        {/* Glow Element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles size={16} />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Competitive Arenas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tighter text-white uppercase">
            Pro Arenas
          </h1>
          <p className="max-w-md text-xs sm:text-sm text-slate-400">
            Join global competitions, climb the tiers, and prove your edge in the market.
          </p>
        </div>
      </div>

      {/* --- Section: Grid of Contests --- */}
      {contests.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-300">No Active Arenas</h3>
          <p className="text-xs text-slate-500 mt-1">Check back soon for new tournament announcements!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {contests.map((item) => {
            const isJoining = joiningId === item.id;
            
            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/40 p-5 sm:p-6 md:p-8 transition-all duration-300 hover:border-indigo-500/40 hover:bg-slate-900/70"
              >
                {/* Prize Badge */}
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                  <div className="p-2.5 sm:p-3 bg-white/5 rounded-xl sm:rounded-2xl group-hover:bg-indigo-500/10 transition-colors">
                    <Trophy className="text-indigo-400 w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
                    <span className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
                      ${item.prizePool.toLocaleString()} Prize
                    </span>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-indigo-400" />
                        <span>{item.participantsCount} Joined</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-indigo-400" />
                        <span>Ends {new Date(item.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isJoining || item.status === 'COMPLETED'}
                    onClick={() => handleJoin(item.id)}
                    className="w-full py-3.5 sm:py-4 bg-white/5 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all group-hover:bg-indigo-600 group-hover:scale-[1.01] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Securing Entry...</span>
                      </>
                    ) : item.status === 'COMPLETED' ? (
                      <span>COMPLETED</span>
                    ) : (
                      <>
                        <span>JOIN COMPETITION</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tournaments;