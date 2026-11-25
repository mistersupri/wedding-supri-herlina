import type { NextFunction, Request, RequestHandler, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

interface Options {
  /** Requests allowed per client within `windowMs`. */
  max: number;
  windowMs: number;
  message?: string;
  /** Separate counters per limiter; defaults to the request path. */
  key?: (req: Request) => string;
}

const limiters = new Set<Map<string, Bucket>>();

// One sweeper for every limiter, so idle clients never accumulate in memory.
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const buckets of limiters) for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60_000);
sweeper.unref();

/**
 * Fixed-window, in-memory rate limiter keyed by client IP (set TRUST_PROXY behind a reverse proxy,
 * otherwise every visitor shares the proxy's address). Fine for the single-instance deployment this app targets;
 * run several replicas and each keeps its own counters.
 */
export function rateLimit({ max, windowMs, message, key }: Options): RequestHandler {
  const buckets = new Map<string, Bucket>();
  limiters.add(buckets);
  const text = message ?? 'Terlalu banyak permintaan. Coba lagi sebentar lagi.';

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const id = key ? key(req) : req.ip || 'unknown';
    let bucket = buckets.get(id);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(id, bucket);
    }
    bucket.count++;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ success: false, code: 'RATE_LIMITED', message: text });
      return;
    }
    next();
  };
}

const MINUTE = 60_000;

/** Limits sized for a wedding venue, where many guests share one Wi-Fi address. */
export const limits = {
  login: rateLimit({ max: 10, windowMs: 15 * MINUTE, message: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' }),
  /**
   * Guesses at the 4-character invitation code. Every guest opening the page makes two of these calls (verify + details),
   * and a wedding hall shares one Wi-Fi address, so the ceiling must fit a few hundred guests arriving together;
   * 32^4 codes keep blind guessing hopeless at this rate anyway.
   */
  verifyCode: rateLimit({ max: 600, windowMs: 10 * MINUTE, message: 'Terlalu banyak percobaan kode. Tunggu beberapa menit lalu coba lagi.' }),
  wish: rateLimit({ max: 60, windowMs: 10 * MINUTE, message: 'Terlalu banyak ucapan dikirim dari jaringan ini. Coba lagi nanti.' }),
  comment: rateLimit({ max: 60, windowMs: 10 * MINUTE, message: 'Terlalu banyak komentar. Coba lagi nanti.' }),
  /** Self check-in: a few honest retries (GPS, permissions), not a loop. */
  checkIn: rateLimit({ max: 40, windowMs: 10 * MINUTE, message: 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.' }),
  /** One ping per opened cover; generous, because a whole wedding party may share one Wi-Fi address. */
  opened: rateLimit({ max: 600, windowMs: 10 * MINUTE }),
  /** Per photo and address: a venue's Wi-Fi may like one photo together, but one phone cannot hammer a counter. */
  react: rateLimit({ max: 30, windowMs: MINUTE, key: (req) => `${req.ip}:${req.params.id}` }),
  guestUpload: rateLimit({ max: 300, windowMs: 10 * MINUTE, message: 'Terlalu banyak unggahan dari jaringan ini. Coba lagi nanti.' }),
  addMoment: rateLimit({ max: 300, windowMs: 10 * MINUTE }),
};
