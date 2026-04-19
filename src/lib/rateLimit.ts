/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Per-IP sliding window counter.
 * Note: resets on each serverless function cold start — good enough for Vercel.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(
  ip: string,
  maxRequests = 10,
  windowMs = 60_000
): { ok: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (entry.count >= maxRequests) {
    return { ok: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { ok: true, remaining: maxRequests - entry.count, resetIn: entry.resetAt - now };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);
