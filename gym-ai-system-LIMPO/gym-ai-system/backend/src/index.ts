import express, { Application } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { connectMongoDB } from './config/mongodb';
import { logger } from './utils/logger';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { setupWebSocket } from './websocket';

// Carregar variáveis de ambiente
dotenv.config();

const app: Application = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES
// ==========================================

// Segurança
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));

// Compressão
app.use(compression());

// Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// Rate Limiting
app.use(rateLimiter);

// ==========================================
// ROUTES
// ==========================================

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api', routes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl,
  });
});

// Error Handler
app.use(errorHandler);

// ==========================================
// DATABASE CONNECTIONS
// ==========================================

const initializeConnections = async () => {
  try {
    // PostgreSQL
    await connectDatabase();
    logger.info('✓ PostgreSQL connected');

    // Redis
    await connectRedis();
    logger.info('✓ Redis connected');

    // MongoDB
    await connectMongoDB();
    logger.info('✓ MongoDB connected');

    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
};

// ==========================================
// WEBSOCKET
// ==========================================

setupWebSocket(io);
logger.info('✓ WebSocket initialized');

// ==========================================
// SERVER START
// ==========================================

const startServer = async () => {
  try {
    // Inicializar conexões
    const connected = await initializeConnections();
    
    if (!connected) {
      logger.error('Failed to connect to databases. Exiting...');
      process.exit(1);
    }

    // Iniciar servidor
    server.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║       🏋️  GYM AI MANAGEMENT SYSTEM - BACKEND         ║
║                                                        ║
║  Server:      http://localhost:${PORT}                   ║
║  Environment: ${process.env.NODE_ENV?.toUpperCase()}                      ║
║  Version:     1.0.0                                    ║
║                                                        ║
║  Status:      ✓ Running                               ║
║  Database:    ✓ Connected                             ║
║  Cache:       ✓ Ready                                 ║
║  WebSocket:   ✓ Active                                ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful Shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown...');
    process.exit(1);
  }, 10000);
};

// Start the server
startServer();

export { app, io };
