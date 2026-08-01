// import React, { useState } from 'react';
// import { User, Camera, Shield, Bell, Save } from 'lucide-react';
// import { NotifySuccess, NotifyError } from '../utils/notifications';

// const Settings: React.FC = () => {
//   const [username, setUsername] = useState('Tayo Bolarinwa');
//   const [bio, setBio] = useState('Trading my way to the top of the Apex Leaderboard.');

//   const handleSave = async () => {
//   try {
//     const response = await fetch(`http://localhost:3001/api/user/update/user_1`, {
//       method: 'PATCH',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         username: username,
//         bio: bio
//       })
//     });

//     const data = await response.json();

//     if (response.ok) {
//       NotifySuccess(data.message);
//       // In Phase 4, you'd dispatch a Redux action here to update the global user state
//     } else {
//       NotifyError(data.message || "Update failed.");
//     }
//   } catch (err) {
//     NotifyError("Could not connect to the Identity Engine.");
//   }
// };

//   return (
//     <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
//       <header>
//         <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Identity Settings</h1>
//         <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage your global trading presence</p>
//       </header>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//         {/* Sidebar Navigation */}
//         <div className="space-y-2">
//           {[
//             { label: 'Public Profile', icon: User, active: true },
//             { label: 'Security', icon: Shield, active: false },
//             { label: 'Notifications', icon: Bell, active: false },
//           ].map((item) => (
//             <button 
//               key={item.label}
//               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
//                 item.active ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-slate-500 hover:bg-white/5'
//               }`}
//             >
//               <item.icon size={18} />
//               {item.label}
//             </button>
//           ))}
//         </div>

//         {/* Form Area */}
//         <div className="md:col-span-2 space-y-6">
//           <section className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-6">
//             {/* Avatar Selection */}
//             <div className="flex items-center gap-6">
//               <div className="relative group">
//                 <img 
//                   src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} 
//                   className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-brand-accent/30 p-1"
//                   alt="Avatar"
//                 />
//                 <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
//                   <Camera className="text-white" size={20} />
//                 </div>
//               </div>
//               <div>
//                 <h4 className="text-white font-bold text-sm">Profile Picture</h4>
//                 <p className="text-slate-500 text-xs mt-1">Avatar is auto-generated based on your username.</p>
//               </div>
//             </div>

//             <div className="space-y-4">
//               <div>
//                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Public Username</label>
//                 <input 
//                   type="text" 
//                   value={username}
//                   onChange={(e) => setUsername(e.target.value)}
//                   className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-brand-accent outline-none transition-all mt-1"
//                 />
//               </div>

//               <div>
//                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Bio / Strategy</label>
//                 <textarea 
//                   rows={3}
//                   value={bio}
//                   onChange={(e) => setBio(e.target.value)}
//                   className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-brand-accent outline-none transition-all mt-1"
//                 />
//               </div>
//             </div>

//             <button 
//               onClick={handleSave}
//               className="flex items-center gap-2 bg-brand-secondary text-slate-950 font-black px-6 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all"
//             >
//               <Save size={18} />
//               SAVE CHANGES
//             </button>
//           </section>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Settings;



import React, { useState } from 'react';
import { User, Camera, Shield, Bell, Save, Loader2, KeyRound, Smartphone } from 'lucide-react';
import { NotifySuccess, NotifyError } from '../utils/notifications';

export type SettingsTab = 'profile' | 'security' | 'notifications';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [username, setUsername] = useState<string>('Tayo Bolarinwa');
  const [bio, setBio] = useState<string>('Trading my way to the top of the Apex Leaderboard.');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  // Notifications state
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const [tradeNotifications, setTradeNotifications] = useState<boolean>(true);

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      NotifyError('Public Username cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/update/user_1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          bio,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        NotifySuccess(data.message || 'Profile settings updated successfully!');
      } else {
        NotifyError(data.message || 'Update failed.');
      }
    } catch {
      NotifyError('Could not connect to the Identity Engine.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      NotifyError('Please complete all password fields.');
      return;
    }
    NotifySuccess('Security credentials updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
  };

  const navItems = [
    { id: 'profile' as SettingsTab, label: 'Public Profile', icon: User },
    { id: 'security' as SettingsTab, label: 'Security', icon: Shield },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8 animate-in fade-in duration-500 select-none">
      
      {/* Header */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter text-white uppercase">
          Identity Settings
        </h1>
        <p className="mt-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
          Manage your global trading presence
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
            <section className="space-y-6 rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/40 p-5 sm:p-8 backdrop-blur-md">
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
                  <div className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl sm:rounded-3xl bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="text-white" size={20} />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Profile Picture</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Avatar is dynamically generated based on your public handle.
                  </p>
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-4">
                <div>
                  <label className="ml-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Public Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter handle..."
                    className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs sm:text-sm text-white outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="ml-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Bio / Trading Strategy
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your strategy..."
                    className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs sm:text-sm text-white outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 resize-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveProfile}
                className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-emerald-400 px-6 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 transition-all hover:bg-emerald-300 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>Save Changes</span>
              </button>
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

              <form onSubmit={handleSaveSecurity} className="space-y-4">
                <div>
                  <label className="ml-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs sm:text-sm text-white outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="ml-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs sm:text-sm text-white outline-none focus:border-indigo-500/50"
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl sm:rounded-2xl bg-indigo-600 px-6 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white hover:bg-indigo-500"
                >
                  <Shield size={18} />
                  <span>Update Password</span>
                </button>
              </form>
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
                    <p className="text-[10px] sm:text-xs text-slate-500">Receive weekly tournament summaries</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="h-5 w-5 accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-4 border border-white/5">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">Trade Execution Alerts</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">Push notifications on order fills</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={tradeNotifications}
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