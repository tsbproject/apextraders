import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom'; // Added Router
import { useAppDispatch, useAppSelector } from './store/hooks';
import Sidebar from './_components/layout/Sidebar';
import Header from './_components/layout/Header';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Leaderboard from './pages/Leaderboard';
import Settings from './pages/Settings'; 
import { NotifySuccess } from './utils/notifications';

const App: React.FC = () => {
  // Updated state to include 'settings'
  const [activeTab, setActiveTab] = useState<'trade' | 'portfolio' | 'leaderboard' | 'settings'>('trade');
  const dispatch = useAppDispatch();
  
  const btcPrice = useAppSelector((state) => state.price.btc);
  const connectionStatus = useAppSelector((state) => state.price.status);

  useEffect(() => {
    dispatch({ type: 'price/startStreaming' });
  }, [dispatch]);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      NotifySuccess("ApexTraders: Market Connection Secured");
    }
  }, [connectionStatus]);

  return (
    /* Wrap everything in Router to satisfy react-router-dom context requirements */
    <Router>
      <div className="flex h-screen bg-brand-dark text-slate-200 font-sans">
        
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Top Header with Live Ticker */}
          <Header btcPrice={btcPrice} />

          {/* Main Viewport */}
          <main className="flex-1 overflow-y-auto p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 to-brand-dark">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'trade' && <Dashboard btcPrice={btcPrice} />}
              {activeTab === 'portfolio' && <Portfolio />}
              {activeTab === 'leaderboard' && <Leaderboard />}
              {activeTab === 'settings' && <Settings />} 
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;