import React, { useState } from 'react';
import { User, Camera, Shield, Bell, Save } from 'lucide-react';
import { NotifySuccess, NotifyError } from '../utils/notifications';

const Settings: React.FC = () => {
  const [username, setUsername] = useState('Tayo Bolarinwa');
  const [bio, setBio] = useState('Trading my way to the top of the Apex Leaderboard.');

  const handleSave = async () => {
  try {
    const response = await fetch(`http://localhost:3001/api/user/update/user_1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        bio: bio
      })
    });

    const data = await response.json();

    if (response.ok) {
      NotifySuccess(data.message);
      // In Phase 4, you'd dispatch a Redux action here to update the global user state
    } else {
      NotifyError(data.message || "Update failed.");
    }
  } catch (err) {
    NotifyError("Could not connect to the Identity Engine.");
  }
};

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Identity Settings</h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage your global trading presence</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Navigation */}
        <div className="space-y-2">
          {[
            { label: 'Public Profile', icon: User, active: true },
            { label: 'Security', icon: Shield, active: false },
            { label: 'Notifications', icon: Bell, active: false },
          ].map((item) => (
            <button 
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                item.active ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-slate-500 hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Form Area */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-6">
            {/* Avatar Selection */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} 
                  className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-brand-accent/30 p-1"
                  alt="Avatar"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="text-white" size={20} />
                </div>
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Profile Picture</h4>
                <p className="text-slate-500 text-xs mt-1">Avatar is auto-generated based on your username.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Public Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-brand-accent outline-none transition-all mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Bio / Strategy</label>
                <textarea 
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:border-brand-accent outline-none transition-all mt-1"
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-brand-secondary text-slate-950 font-black px-6 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <Save size={18} />
              SAVE CHANGES
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;