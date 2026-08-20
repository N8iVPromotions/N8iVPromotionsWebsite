const { getClientIp } = require('./request-ip');

// Best-effort, in-memory rate limit. Vercel serverless functions can run on
// multiple concurrent instances, so this is per-warm-instance, not a global
// guarantee - it stops a script hammering the endpoint from one client in a
// short burst, which is the realistic abuse case for these forms. For a hard
// guarantee across every instance, swap this for an Upstash Redis-backed
// limiter.
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;
const MAX_TRACKED_KEYS = 5000;

const hits = new Map(); // "bucket:ip" -> timestamps[]

function checkRateLimit(req, bucket) {
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const timestamps = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(key, timestamps);
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - timestamps[0])) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, v] of hits) {
      const fresh = v.filter((t) => now - t < WINDOW_MS);
      if (fresh.length === 0) hits.delete(k);
      else hits.set(k, fresh);
    }
  }

  return { limited: false };
}

// Returns true if the request was rejected (caller should stop handling it).
function rejectIfRateLimited(req, res, bucket) {
  const { limited, retryAfterSeconds } = checkRateLimit(req, bucket);
  if (!limited) return false;
  res.setHeader('Retry-After', String(retryAfterSeconds));
  res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
  return true;
}

module.exports = { rejectIfRateLimited };
