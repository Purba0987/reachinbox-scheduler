import Redis from 'ioredis';
import { config } from './index';

const isTls = config.redisUrl.startsWith('rediss://');

export const redisConnection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  tls: isTls ? { rejectUnauthorized: false } : undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

redisConnection.on('error', (err) => {
  console.warn('⚠️ Redis connection error:', err.message);
});
