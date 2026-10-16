const { getRedis } = require("../config/redis");
const logger = require("../utils/logger");

// Small TTL cache. Uses Redis when REDIS_URL is set so all serverless
// instances share one entry; otherwise falls back to process memory.
const memory = new Map();

const get = async (key) => {
  const redis = getRedis();
  if (redis) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error("Shared cache read failed", error);
    }
  }
  const hit = memory.get(key);
  return hit && hit.expires > Date.now() ? hit.value : null;
};

const set = async (key, value, ttlSeconds) => {
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

module.exports = { get, set };
