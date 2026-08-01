import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken, JwtPayload } from '../../server/lib/auth';

interface BalanceUpdatePayload {
  userId: string;
  newBalance: number;
  reason: 'TRADE_OPEN' | 'TRADE_CLOSE' | 'DEPOSIT' | 'WITHDRAWAL';
}

class SocketService {
  private io: Server | null = null;

  public init(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
      },
    });

    // Authenticate WebSocket connections via JWT
    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      try {
        const decoded = verifyToken(token);
        socket.data.user = decoded;
        next();
      } catch {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as JwtPayload;
      // Join a private room dedicated to this user ID
      socket.join(`user:${user.id}`);
      console.log(`🔌 WebSocket connected: User ${user.id}`);

      socket.on('disconnect', () => {
        console.log(`🔌 WebSocket disconnected: User ${user.id}`);
      });
    });
  }

  /**
   * Broadcast balance updates directly to a specific user's private room
   */
  public emitBalanceUpdate(payload: BalanceUpdatePayload): void {
    if (!this.io) return;
    this.io.to(`user:${payload.userId}`).emit('balance_update', payload);
  }
}

export const socketService = new SocketService();