import React, { useState } from 'react';
import { User, Shield, Bell, KeyRound, Smartphone, Eye, EyeOff } from 'lucide-react';
import { useAppSelector } from '../store/hooks';

export type SettingsTab = 'profile' | 'security' | 'notifications';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const user = useAppSelector(state => state.auth.user);
  const username = user?.username || 'Trader';

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notifications state
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const [tradeNotifications, setTradeNotifications] = useState<boolean>(true);

  const navItems = [
    { id: 'profile' as SettingsTab, label: 'Public Profile', icon: User },
    { id: 'security' as SettingsTab, label: 'Security', icon: Shield },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8 animate-in fade-in duration-500 select-none">
      
      {/* Header */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Account settings
        </h1>
        <p className="mt-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
          Your profile and account preferences
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        
        {/* ========================================================= */}
        {/* TAB NAVIGATION (Mobile horizontal pills / Desktop vertical) */}
        {/* ========================================================= */}
        <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex shrink-0 items-center gap-2.5 sm:gap-3 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB CONTENT PANEL                                          */}
        {/* ========================================================= */}
        <div className="md:col-span-2 space-y-6">
          
          {/* TAB 1: PUBLIC PROFILE */}
          {activeTab === 'profile' && (
            <section className="space-y-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-[#111b2c] p-5 sm:p-8 shadow-lg">
              {/* Avatar Section */}
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="group relative shrink-0">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                      username
                    )}`}
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl sm:rounded-3xl border-2 border-indigo-500/30 bg-slate-800 p-1 object-cover"
                    alt="User Avatar"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Profile Picture</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Avatar is dynamically generated based on your public handle.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#080e1c] p-4">
                <p className="text-xs font-semibold text-slate-400">Username</p>
                <p className="mt-1 text-sm font-bold text-white">{username}</p>
                <p className="mt-3 text-xs font-semibold text-slate-400">Email</p>
                <p className="mt-1 break-all text-sm text-white">{user?.email || 'Not available'}</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">Profile editing will be available when secure account-update endpoints are connected.</p>
            </section>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <section className="space-y-6 rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/40 p-5 sm:p-8 backdrop-blur-md">
              <div className="flex items-center gap-3 text-indigo-400">
                <KeyRound size={20} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Password & Credentials
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="ml-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Current Password
                  </label>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 pr-12 text-xs sm:text-sm text-white outline-none focus:border-indigo-500/50"
                  /><button type="button" onClick={() => setShowCurrentPassword(v => !v)} className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-white" aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}>{showCurrentPassword ? <EyeOff size={15}/> : <Eye size={15}/>} {showCurrentPassword ? "Hide" : "Show"} current password</button>
                </div>

                <div>
                  <label className="ml-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                    New Password
                  </label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs sm:text-sm text-white outline-none focus:border-indigo-500/50"
                  /><button type="button" onClick={() => setShowNewPassword(v => !v)} className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-white" aria-label={showNewPassword ? "Hide new password" : "Show new password"}>{showNewPassword ? <EyeOff size={15}/> : <Eye size={15}/>} {showNewPassword ? "Hide" : "Show"} new password</button>
                </div>

                <button
                  type="button" disabled
                  className="flex items-center gap-2 rounded-xl sm:rounded-2xl bg-indigo-600 px-6 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white hover:bg-indigo-500"
                >
                  <Shield size={18} />
                  <span>Password updates coming soon</span>
                </button>
                <p className="text-xs leading-relaxed text-slate-500">Password changes and email recovery require secure backend endpoints. This control is disabled until they are available.</p>
              </div>
            </section>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <section className="space-y-6 rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/40 p-5 sm:p-8 backdrop-blur-md">
              <div className="flex items-center gap-3 text-indigo-400">
                <Smartphone size={20} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Alert Preferences
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-4 border border-white/5">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">Email Digest</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Email digests are not yet connected</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    disabled
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="h-5 w-5 accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-4 border border-white/5">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">Trade Execution Alerts</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Push alerts are not yet connected</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={tradeNotifications}
                    disabled
                    onChange={(e) => setTradeNotifications(e.target.checked)}
                    className="h-5 w-5 accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;