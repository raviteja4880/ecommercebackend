const { createClient } = require("redis");

const isRedisEnabled = process.env.REDIS_ENABLED !== "false";

if (!isRedisEnabled) {
  console.log("⚠️ Redis is disabled.");

  // No-op stub: every cache operation safely returns null / resolves immediately
  const noOpClient = {
    get: async () => null,
    set: async () => null,
    del: async () => null,
    expire: async () => null,
    exists: async () => 0,
    keys: async () => [],
    incr: async () => 0,
    decr: async () => 0,
    hGet: async () => null,
    hSet: async () => null,
    hDel: async () => null,
    hGetAll: async () => ({}),
    sendCommand: async () => null,
    connect: async () => {},
    disconnect: async () => {},
    quit: async () => {},
    on: () => noOpClient,
    isOpen: false,
    isReady: false,
  };

  module.exports = noOpClient;
} else {
  const redisClient = createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: process.env.REDIS_PORT || 6379,
    },
  });

  redisClient.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  redisClient.on("connect", () => {
    console.log("Redis connecting to Cloud...");
  });

  redisClient.on("ready", () => {
    console.log("Redis Cloud Connected and Ready");
  });

  (async () => {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error("Could not connect to Redis Cloud:", err.message);
    }
  })();

  module.exports = redisClient;
}