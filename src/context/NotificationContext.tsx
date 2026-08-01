import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface NotificationContextType {
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Standalone event target for non-React contexts (Redux thunks, utility functions)
const notificationEmitter = new EventTarget();

/**
 * Standalone notification function for Redux thunks & external utilities
 */
export const NotifySuccess = (message: string) => {
  notificationEmitter.dispatchEvent(new CustomEvent('notify', { detail: { type: 'success', message } }));
};

export const NotifyError = (message: string) => {
  notificationEmitter.dispatchEvent(new CustomEvent('notify', { detail: { type: 'error', message } }));
};

export const NotifyInfo = (message: string) => {
  notificationEmitter.dispatchEvent(new CustomEvent('notify', { detail: { type: 'info', message } }));
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  // Listen for non-React standalone calls (e.g., from Redux thunks)
  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: 'success' | 'error' | 'info'; message: string }>;
      addNotification(customEvent.detail.type, customEvent.detail.message);
    };

    notificationEmitter.addEventListener('notify', handleCustomEvent);
    return () => {
      notificationEmitter.removeEventListener('notify', handleCustomEvent);
    };
  }, []);

  const notifySuccess = (message: string) => addNotification('success', message);
  const notifyError = (message: string) => addNotification('error', message);
  const notifyInfo = (message: string) => addNotification('info', message);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifySuccess, notifyError, notifyInfo }}>
      {children}

      {/* Floating Toast UI Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-xl text-white border backdrop-blur-md transition-all duration-300 animate-slide-in ${
              n.type === 'success'
                ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100'
                : n.type === 'error'
                ? 'bg-rose-900/90 border-rose-500/50 text-rose-100'
                : 'bg-slate-800/90 border-slate-600/50 text-slate-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">
                {n.type === 'success' && '✅'}
                {n.type === 'error' && '❌'}
                {n.type === 'info' && 'ℹ️'}
              </span>
              <p className="text-sm font-medium">{n.message}</p>
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="ml-4 text-xs font-bold opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};