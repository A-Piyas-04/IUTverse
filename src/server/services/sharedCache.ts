import "server-only";
import { getRedis } from "../config/redis";
import logger from "../utils/logger";

// Small TTL cache. Uses Redis when REDIS_URL is set so all serverless
// instances share one entry; otherwise falls back to process memory.
const memory = new Map<string, { value: unknown; expires: number }>();

export const get = async <T = unknown>(key: string): Promise<T | null> => {
  const redis = getRedis();
  if (redis) {
    try {
      const value = await redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      logger.error("Shared cache read failed", error);
    }
  }
  const hit = memory.get(key);
  return hit && hit.expires > Date.now() ? (hit.value as T) : null;
};

export const set = async (key: string, value: unknown, ttlSeconds: number) => {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return;
    } catch (error) {
      logger.error("Shared cache write failed", error);
    }
  }
  memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
};
