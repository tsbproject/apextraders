import React from 'react';
import { LayoutDashboard, Briefcase, Trophy, Settings } from 'lucide-react';

interface SidebarProps {
  activeTab: 'trade' | 'portfolio' | 'leaderboard' | 'settings';
  setActiveTab: (tab: 'trade' | 'portfolio' | 'leaderboard' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menu = [
    { id: 'trade', label: 'Trading', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ] as const;

  return (
    <aside className="w-64 border-r border-white/5 bg-brand-dark flex flex-col p-6">
      <div className="mb-10 px-2">
        <h1 className="text-xl font-black tracking-tighter italic text-white">
          APEX<span className="text-brand-accent">TRADERS</span>
        </h1>
      </div>

      <nav className="space-y-2 flex-1">
        {menu.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === item.id 
                ? 'bg-brand-accent/10 text-brand-accent shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                : 'text-slate-500 hover:bg-white/5'
            }`}
          >
            <item.icon size={20} />
            <span className="text-sm uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Settings Footer Section */}
      <div className="mt-auto pt-6 border-t border-white/5">
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'settings' 
              ? 'bg-brand-accent/10 text-brand-accent shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
              : 'text-slate-500 hover:bg-white/5'
          }`}
        >
          <Settings size={20} />
          <span className="text-sm uppercase tracking-wider">Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;