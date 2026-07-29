const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis").default;
const redisClient = require("../config/redis");

const isRedisEnabled = process.env.REDIS_ENABLED !== "false";

const limiterOptions = {
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
};

// Use Redis-backed store only when Redis is enabled;
// otherwise fall back to the default in-memory store.
if (isRedisEnabled) {
  limiterOptions.store = new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  });
}

const limiter = rateLimit(limiterOptions);

module.exports = limiter;
