import { Middleware } from '@reduxjs/toolkit';
import { updatePrice, setConnectionStatus } from '../priceSlice';
import { NotifyError } from '../../utils/notifications';

// Create a singleton outside the middleware scope to prevent multiple instances
let socket: WebSocket | null = null;
let isConnecting = false;

export const socketMiddleware: Middleware = (store) => {
  const connect = () => {
    // Prevent overlapping connection attempts
    if (isConnecting || (socket && socket.readyState === WebSocket.OPEN)) return;

    isConnecting = true;
    const STREAM_URL = 'wss://stream.binance.com:443/ws/btcusdt@aggTrade';
    
    // Close existing socket if it's stuck in a weird state
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }

    console.log('🔗 ApexTraders: Initializing Price Feed...');
    socket = new WebSocket(STREAM_URL);
    store.dispatch(setConnectionStatus('connecting'));

    socket.onopen = () => {
      console.log('✅ ApexTraders: Socket Connected');
      isConnecting = false;
      store.dispatch(setConnectionStatus('connected'));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.p) {
        store.dispatch(updatePrice(parseFloat(data.p)));
      }
    };

    socket.onerror = (error) => {
      // Log the full error object for debugging
      console.error('WebSocket Error Object:', error);
      isConnecting = false;
      // Use your instruction-mandated NotifyError
      NotifyError("ApexTraders: Price feed connection failed.");
    };

    socket.onclose = (e) => {
      isConnecting = false;
      store.dispatch(setConnectionStatus('disconnected'));
      console.warn(`🚀 Socket Closed: ${e.code} ${e.reason}`);
      
      // Only auto-reconnect if it wasn't a clean close
      if (e.code !== 1000) {
        setTimeout(connect, 5000);
      }
    };
  };

  return (next) => (action: any) => {
    if (action.type === 'price/startStreaming') {
      connect();
    }
    return next(action);
  };
};