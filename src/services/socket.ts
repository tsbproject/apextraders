import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { updateUserBalance } from '../store/authSlice';

export interface BalanceUpdateEvent {
  userId: string;
  newBalance: number;
  reason: 'TRADE_OPEN' | 'TRADE_CLOSE' | 'DEPOSIT' | 'WITHDRAWAL';
}

let socket: Socket | null = null;

export const connectSocket = (token: string): void => {
  if (socket?.connected) return;

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('⚡ Connected to real-time WebSocket server');
  });

  // Listen for balance updates and automatically update Redux auth state
  socket.on('balance_update', (data: BalanceUpdateEvent) => {
    store.dispatch(updateUserBalance(data.newBalance));
  });

  socket.on('disconnect', () => {
    console.log('⚡ WebSocket disconnected');
  });
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};