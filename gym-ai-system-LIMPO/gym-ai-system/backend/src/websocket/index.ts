import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  gymId?: string;
}

export const setupWebSocket = (io: SocketIOServer) => {
  // Middleware de autenticação
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`WebSocket client connected: ${socket.id} (User: ${socket.userId})`);

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join gym room
    socket.on('join-gym', (gymId: string) => {
      socket.gymId = gymId;
      socket.join(`gym:${gymId}`);
      logger.info(`Client ${socket.id} joined gym: ${gymId}`);
    });

    // Leave gym room
    socket.on('leave-gym', (gymId: string) => {
      socket.leave(`gym:${gymId}`);
      logger.info(`Client ${socket.id} left gym: ${gymId}`);
    });

    // Pose detection stream
    socket.on('pose-detection', (data) => {
      // Broadcast to gym members
      if (socket.gymId) {
        socket.to(`gym:${socket.gymId}`).emit('pose-update', {
          userId: socket.userId,
          ...data,
          timestamp: new Date(),
        });
      }
    });

    // Alert events
    socket.on('send-alert', (alert) => {
      if (socket.gymId) {
        io.to(`gym:${socket.gymId}`).emit('alert', {
          ...alert,
          senderId: socket.userId,
          timestamp: new Date(),
        });
      }
    });

    // Analytics updates
    socket.on('analytics-update', (data) => {
      if (socket.gymId) {
        socket.to(`gym:${socket.gymId}`).emit('analytics-data', data);
      }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id} (Reason: ${reason})`);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`WebSocket error for client ${socket.id}:`, error);
    });
  });

  return io;
};

// Helper function to emit to specific user
export const emitToUser = (io: SocketIOServer, userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

// Helper function to emit to gym
export const emitToGym = (io: SocketIOServer, gymId: string, event: string, data: any) => {
  io.to(`gym:${gymId}`).emit(event, data);
};

export default setupWebSocket;
