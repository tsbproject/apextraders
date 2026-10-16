import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { updateUserBalance } from '../store/authSlice';

export interface BalanceUpdateEvent {
  userId: string;
  newBalance: number;
  reason:
    | 'TRADE_OPEN'
    | 'TRADE_CLOSE'
    | 'DEPOSIT'
    | 'WITHDRAWAL';
}

let socket: Socket | null = null;

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:3001';

export const connectSocket = (
  token: string
): void => {
  if (socket?.connected) return;

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log(
      '⚡ Connected to real-time WebSocket server'
    );
  });

  socket.on(
    'balance_update',
    (data: BalanceUpdateEvent) => {
      store.dispatch(
        updateUserBalance(data.newBalance)
      );
    }
  );

  socket.on('connect_error', (error) => {
    console.error(
      '⚡ WebSocket connection error:',
      error.message
    );
  });

  socket.on('disconnect', (reason) => {
    console.log(
      '⚡ WebSocket disconnected:',
      reason
    );
  });
};

export const disconnectSocket = (): void => {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};