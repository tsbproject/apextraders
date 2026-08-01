import React, { useEffect } from 'react';
import { LayoutDashboard, Briefcase, Trophy, Settings, X } from 'lucide-react';

export type NavTab = 'trade' | 'portfolio' | 'leaderboard' | 'settings';

export interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  /** Mobile drawer toggle state */
  isOpen?: boolean;
  /** Function to close mobile drawer overlay */
  onClose?: () => void;
}

interface MenuItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const mainMenuItems: MenuItem[] = [
  { id: 'trade', label: 'Trading', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen = false,
  onClose,
}) => {
  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTabClick = (tab: NavTab) => {
    setActiveTab(tab);
    if (onClose) {
      onClose(); // Auto-close drawer on mobile item selection
    }
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. DESKTOP SIDEBAR (Visible md:flex)                        */}
      {/* ========================================================= */}
      <aside className="hidden md:flex w-64 min-h-screen border-r border-white/5 bg-slate-950 flex-col p-6 select-none shrink-0">
        {/* Brand Header */}
        <div className="mb-10 px-2">
          <h1 className="text-xl font-black tracking-tighter italic text-white">
            APEX<span className="text-indigo-500">TRADERS</span>
          </h1>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-2 flex-1">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)] border border-indigo-500/20'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs uppercase tracking-wider">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Settings Footer Section */}
        <div className="mt-auto pt-6 border-t border-white/5">
          <button
            type="button"
            onClick={() => handleTabClick('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-500/10 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)] border border-indigo-500/20'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
            }`}
          >
            <Settings size={20} />
            <span className="text-xs uppercase tracking-wider">Settings</span>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MOBILE OVERLAY DRAWER (Visible when isOpen = true)     */}
      {/* ========================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Drawer Content */}
          <div className="relative flex w-4/5 max-w-xs flex-col bg-slate-950 p-6 shadow-2xl border-r border-white/10 z-10">
            {/* Header & Close Button */}
            <div className="flex items-center justify-between mb-8 px-2">
              <h1 className="text-xl font-black tracking-tighter italic text-white">
                APEX<span className="text-indigo-500">TRADERS</span>
              </h1>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="space-y-2 flex-1">
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs uppercase tracking-wider">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Mobile Footer Settings */}
            <div className="mt-auto pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleTabClick('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                  activeTab === 'settings'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <Settings size={20} />
                <span className="text-xs uppercase tracking-wider">Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR (Fixed at bottom for mobile) */}
      {/* ========================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-white/10 backdrop-blur-md px-2 py-2 flex justify-around items-center">
        {[...mainMenuItems, { id: 'settings' as NavTab, label: 'Settings', icon: Settings }].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-indigo-400 font-bold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] uppercase tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default Sidebar;