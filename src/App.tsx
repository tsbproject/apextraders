import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import Sidebar from './_components/layout/Sidebar';
import Header from './_components/layout/Header';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Leaderboard from './pages/Leaderboard';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import { AuthModal } from './_components/auth/AuthModal';
import { useAuthInit } from './hooks/useAuthInit';
import { useNotification } from './context/NotificationContext';
import { connectSocket, disconnectSocket } from './services/socket';

// --- Explicit Type Definitions ---
export type NavigationTab = 'trade' | 'portfolio' | 'leaderboard' | 'settings' | 'admin';
export type AuthModalMode = 'login' | 'register';

interface AuthPromptProps {
  title: string;
  description: string;
  onOpenAuth: (mode: AuthModalMode) => void;
}

const App: React.FC = () => {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<NavigationTab>('trade');
  
  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const dispatch = useAppDispatch();
  const { notifySuccess } = useNotification();

  // Re-hydrate session from localStorage JWT
  useAuthInit();

  const btcPrice = useAppSelector((state) => state.price.btc);
  const connectionStatus = useAppSelector((state) => state.price.status);
  const { isAuthenticated, user, token } = useAppSelector((state) => state.auth);

  // Market Ticker Streaming Engine
  useEffect(() => {
    dispatch({ type: 'price/startStreaming' });
  }, [dispatch]);

  // Market Connection Notification
  useEffect(() => {
    if (connectionStatus === 'connected') {
      notifySuccess('ApexTraders: Market Connection Secured');
    }
  }, [connectionStatus, notifySuccess]);

  // Real-time WebSocket Balance & Order Feed Sync
  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, token]);

  const handleOpenAuth = (mode: AuthModalMode): void => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <Router>
      <div className="flex h-screen bg-brand-dark text-slate-200 font-sans">
        
        {/* Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenAuth={handleOpenAuth} 
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Top Header with Live Ticker & Auth Controls */}
          <Header 
            btcPrice={btcPrice} 
            onOpenAuth={handleOpenAuth} 
          />

          {/* Main Viewport */}
          <main className="flex-1 overflow-y-auto p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 to-brand-dark">
            <div className="max-w-7xl mx-auto">
              {/* Tab Rendering with Guest Prompt fallback */}
              {activeTab === 'trade' && <Dashboard btcPrice={btcPrice} />}
              
              {activeTab === 'portfolio' && (
                isAuthenticated ? (
                  <Portfolio />
                ) : (
                  <AuthPrompt 
                    title="Portfolio Locked" 
                    description="Sign in or register to view your open positions, trade history, and account performance." 
                    onOpenAuth={handleOpenAuth} 
                  />
                )
              )}

              {activeTab === 'leaderboard' && <Leaderboard />}

              {activeTab === 'settings' && (
                isAuthenticated ? (
                  <Settings />
                ) : (
                  <AuthPrompt 
                    title="Settings Locked" 
                    description="Please sign in to update your profile bio, Metamask wallet, and trading preferences." 
                    onOpenAuth={handleOpenAuth} 
                  />
                )
              )}

              {activeTab === 'admin' && (
                isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? (
                  <AdminPanel />
                ) : (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-8 text-center text-rose-200">
                    <span className="text-4xl">🚫</span>
                    <h2 className="mt-4 text-xl font-bold">Access Denied</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      This panel requires Admin or Super Admin administrative privileges.
                    </p>
                  </div>
                )
              )}
            </div>
          </main>
        </div>

        {/* Auth Modal Component */}
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          defaultMode={authModalMode} 
        />

      </div>
    </Router>
  );
};

// Helper component for unauthenticated views
const AuthPrompt: React.FC<AuthPromptProps> = ({
  title,
  description,
  onOpenAuth,
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md">
    <div className="text-4xl mb-4">🔐</div>
    <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
    <p className="text-slate-400 max-w-md mb-6">{description}</p>
    <div className="flex space-x-4">
      <button
        onClick={() => onOpenAuth('login')}
        className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-white transition-all shadow-lg shadow-emerald-600/20"
      >
        Sign In
      </button>
      <button
        onClick={() => onOpenAuth('register')}
        className="px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold text-slate-200 border border-slate-700 transition-all"
      >
        Create Account
      </button>
    </div>
  </div>
);

export default App;