const { rejectIfRateLimited } = require('./_lib/rate-limit');
const ORIGINS = new Set(['https://www.n8ivpromotions.com', 'https://n8ivpromotions.com']);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!ORIGINS.has(req.headers.origin)) return res.status(403).json({ ok: false });
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return res.status(415).json({ ok: false });
  if (rejectIfRateLimited(req, res, 'audit-completed')) return;
  const body = req.body;
  if (!body || body.measurementAllowed !== true || body.completed !== true || typeof body.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ||
      !Number.isSafeInteger(body.timestamp) || body.timestamp < Date.now() - 86400000 || body.timestamp > Date.now() + 60000) {
    return res.status(400).json({ ok: false });
  }
  if (process.env.VERCEL_ENV !== 'production' || !process.env.OPENAI_CONVERSIONS_API_KEY) {
    return res.status(503).json({ ok: false });
  }
  // Reuse only the Pixel's attribution cookies, after the client opt-out check.
  const cookies = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const separator = part.indexOf('=');
    const name = part.slice(0, separator).trim();
    if (!['__oppref', '__obref'].includes(name)) continue;
    try {
      const value = decodeURIComponent(part.slice(separator + 1));
      if (value.trim() && value.length <= 2048) cookies[name] = value;
    } catch (_) {}
  }
  const attribution = {};
  if (cookies.__oppref) attribution.oppref = cookies.__oppref;
  if (cookies.__obref) attribution.user = { obref: cookies.__obref };
  try {
    const response = await fetch('https://bzr.openai.com/v1/events?pid=4iyfuQf433Lh2FDov5EPDM', {
      method: 'POST', signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${process.env.OPENAI_CONVERSIONS_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ validate_only: false, events: [{
        ...attribution, id: body.id, type: 'custom', custom_event_name: 'self_audit_completed',
        timestamp_ms: body.timestamp, source_url: 'https://www.n8ivpromotions.com/revenue-self-audit',
        action_source: 'web', data: { type: 'custom' }
      }] })
    });
    return res.status(response.ok ? 200 : 502).json({ ok: response.ok });
  } catch (_) { return res.status(502).json({ ok: false }); }
};
