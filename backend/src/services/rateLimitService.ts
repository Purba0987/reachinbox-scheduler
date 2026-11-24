import { redisConnection } from '../config/redis';

export interface RateLimitStatus {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  hourWindow: string;
  secondsUntilReset: number;
  nextAvailableTime: Date;
}

/**
 * Returns current UTC hour window string e.g. "2026-11-24-10"
 */
export function getCurrentHourWindow(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${d}-${h}`;
}

/**
 * Calculates milliseconds remaining until the start of the next hour
 */
export function getMillisecondsUntilNextHour(date = new Date()): number {
  const nextHour = new Date(date);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return Math.max(1000, nextHour.getTime() - date.getTime());
}

/**
 * Atomic Redis-backed Rate Limiter per Sender per Hour.
 * Safe across multiple workers and instances.
 */
export async function checkAndIncrementRateLimit(
  senderEmail: string,
  hourlyLimit: number
): Promise<RateLimitStatus> {
  const now = new Date();
  const hourWindow = getCurrentHourWindow(now);
  const key = `ratelimit:sender:${senderEmail}:${hourWindow}`;

  // Multi / pipeline to atomically increment counter and set expiry if key is new
  const results = await redisConnection
    .multi()
    .incr(key)
    .ttl(key)
    .exec();

  if (!results) {
    throw new Error('Redis transaction failed during rate limit check');
  }

  const count = (results[0][1] as number) || 1;
  let ttl = (results[1][1] as number) || -1;

  // If this key just got created (no TTL set), set TTL to 2 hours (7200 seconds)
  if (ttl === -1) {
    await redisConnection.expire(key, 7200);
    ttl = 7200;
  }

  const msUntilReset = getMillisecondsUntilNextHour(now);
  const secondsUntilReset = Math.ceil(msUntilReset / 1000);
  const nextAvailableTime = new Date(now.getTime() + msUntilReset);

  if (count > hourlyLimit) {
    return {
      allowed: false,
      currentCount: count,
      limit: hourlyLimit,
      remaining: 0,
      hourWindow,
      secondsUntilReset,
      nextAvailableTime,
    };
  }

  return {
    allowed: true,
    currentCount: count,
    limit: hourlyLimit,
    remaining: Math.max(0, hourlyLimit - count),
    hourWindow,
    secondsUntilReset,
    nextAvailableTime,
  };
}

/**
 * Decrement counter in case a job was rejected before sending
 */
export async function decrementRateLimit(senderEmail: string) {
  const hourWindow = getCurrentHourWindow();
  const key = `ratelimit:sender:${senderEmail}:${hourWindow}`;
  await redisConnection.decr(key);
}
