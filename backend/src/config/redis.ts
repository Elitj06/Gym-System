import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: RedisClientType;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: REDIS_URL,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

// Cache Helper Functions
export const cacheService = {
  async get(key: string): Promise<string | null> {
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  },

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await redisClient.setEx(key, ttl, value);
      } else {
        await redisClient.set(key, value);
      }
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  },

  async flushAll(): Promise<void> {
    try {
      await redisClient.flushAll();
    } catch (error) {
      logger.error('Error flushing cache:', error);
    }
  },
};

export default redisClient;
