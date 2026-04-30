import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory per-key sliding window rate limiter.
 * Suitable for single-process deployments. For multi-instance, swap with Redis.
 */
export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string | null;
  message?: string;
}) {
  const store = new Map<string, Bucket>();

  // Periodic cleanup of expired buckets to prevent unbounded growth
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (v.resetAt <= now) store.delete(k);
    }
  }, Math.max(opts.windowMs, 60_000)).unref?.();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const key = opts.keyFn(req);
    if (!key) {
      next();
      return;
    }
    const now = Date.now();
    const bucket = store.get(key);
    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      res.setHeader("X-RateLimit-Limit", String(opts.max));
      res.setHeader("X-RateLimit-Remaining", String(opts.max - 1));
      next();
      return;
    }
    if (bucket.count >= opts.max) {
      const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(opts.max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({
        error: opts.message ?? `Rate limit exceeded. Try again in ${retryAfter}s.`,
        retryAfter,
      });
      return;
    }
    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(opts.max));
    res.setHeader("X-RateLimit-Remaining", String(opts.max - bucket.count));
    next();
  };
}
