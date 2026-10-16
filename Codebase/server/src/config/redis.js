const { createClient } = require("redis");
const config = require("./config");
const logger = require("../utils/logger");

// Shared state (rate-limit counters, small caches) must live outside the
// process on serverless hosts, where every instance has its own memory.
// REDIS_URL is any Redis-protocol endpoint, e.g. Upstash's rediss:// URL.
let client = null;

const getRedis = () => {
  if (!config.redisUrl) return null;
  if (!client) {
    client = createClient({ url: config.redisUrl });
    client.on("error", (error) => logger.error("Redis client error", error));
    // Commands issued before the connection is ready are queued by the client.
    client.connect().catch((error) => logger.error("Redis connection failed", error));
  }
  return client;
};

module.exports = { getRedis };
