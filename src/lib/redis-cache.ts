import { Redis } from '@upstash/redis';

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function getUtcDateString(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function getSecondsUntilEndOfUtcDay(date = new Date()): number {
  const nextDayStart = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );

  return Math.max(60, Math.ceil((nextDayStart - date.getTime()) / 1000));
}

export function getTodayCacheKey(userId: string, date = getUtcDateString()): string {
  return `cache:today:${userId}:${date}`;
}

export function getCurrentEodCacheKey(userId: string, date = getUtcDateString()): string {
  return `cache:eod-current:${userId}:${date}`;
}

export async function readJsonCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const cachedValue = await client.get<string>(key);
    if (!cachedValue) return null;
    return JSON.parse(cachedValue) as T;
  } catch {
    return null;
  }
}

export async function writeJsonCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {
    // Cache failures must not break the API path.
  }
}

export async function deleteCacheKeys(keys: string[]): Promise<void> {
  const client = getRedisClient();
  if (!client || keys.length === 0) return;

  try {
    await client.del(...keys);
  } catch {
    // Cache invalidation failures must not break the API path.
  }
}

export async function clearLiveDayCaches(userId: string): Promise<void> {
  const today = getUtcDateString();
  await deleteCacheKeys([getTodayCacheKey(userId, today), getCurrentEodCacheKey(userId, today)]);
}