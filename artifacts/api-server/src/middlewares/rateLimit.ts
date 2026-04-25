import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient, type RedisClientType } from "redis";

// Create Redis client (optional - falls back to in-memory if redis not available)
let redisClient: RedisClientType | null = null;
let store: rateLimit.Store;

const createRedisClient = async () => {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
    await redisClient.connect();
    store = new RedisStore({
      client: redisClient,
      prefix: "rate-limit:",
    });
    console.log("âœ“ Redis rate-limit store connected");
  } catch (err) {
    console.warn("âš  Redis not available, using memory store for rate-limiting");
    store = new rateLimit.MemoryStore();
  }
};

// Initialize store
export const initializeRateLimitStore = async () => {
  await createRedisClient();
};

// Strict rate limiter for expensive operations (e.g., OSINT lookups)
export const strictLimiter = rateLimit({
  store: new rateLimit.MemoryStore(), // Will be replaced after redis init
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes per IP
  message: {
    error: "Too many lookup requests, please try again after 15 minutes",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req, _res) => !store, // Skip until store is initialized
  keyGenerator: (req, _res) => {
    // Use sessionId from body if available, otherwise use IP
    const body = req.body as any;
    return body?.sessionId || req.ip || "unknown";
  },
});

// Moderate rate limiter for general API endpoints
export const moderateLimiter = rateLimit({
  store: new rateLimit.MemoryStore(), // Will be replaced after redis init
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req, _res) => !store,
  keyGenerator: (req, _res) => req.ip || "unknown",
});

// Light rate limiter for public endpoints
export const lightLimiter = rateLimit({
  store: new rateLimit.MemoryStore(), // Will be replaced after redis init
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: {
    error: "Rate limit exceeded",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req, _res) => !store,
  keyGenerator: (req, _res) => req.ip || "unknown",
});

// Update stores after initialization
export const updateRateLimitStores = (newStore: rateLimit.Store) => {
  store = newStore;
  (strictLimiter as any).store = newStore;
  (moderateLimiter as any).store = newStore;
  (lightLimiter as any).store = newStore;
};
