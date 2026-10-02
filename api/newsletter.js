const { rejectDisallowedOrigin } = require('./_lib/origin-check');
const { rejectIfRateLimited } = require('./_lib/rate-limit');
const { verifyTurnstile } = require('./_lib/turnstile');
const { getClientIp } = require('./_lib/request-ip');

const GENERIC_ERROR = 'We could not add you to the list. Please try again in a moment.';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (rejectDisallowedOrigin(req, res)) return;
  if (rejectIfRateLimited(req, res, 'newsletter')) return;

  try {
    const body = parseBody(req.body);
    if (body.website) return res.status(200).json({ ok: true });

    const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const verified = await verifyTurnstile(body['cf-turnstile-response'], getClientIp(req));
    if (!verified) {
      return res.status(400).json({ error: 'We could not verify you are human. Please try again.' });
    }

    await addContact(email);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Newsletter signup failed:', error);
    return res.status(500).json({ error: GENERIC_ERROR });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body !== 'string') return body;
  try { return JSON.parse(body); } catch { return Object.fromEntries(new URLSearchParams(body)); }
}

// Creates a global Resend contact, optionally placed in a segment so it can
// receive Broadcasts. The Contacts API needs a full-access key; set
// RESEND_CONTACTS_API_KEY if RESEND_API_KEY is restricted to sending.
async function addContact(email) {
  const apiKey = process.env.RESEND_CONTACTS_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set.');

  const payload = { email, unsubscribed: false };
  const segmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID;
  if (segmentId) payload.segments = [{ id: segmentId }];

  const created = await resendRequest(apiKey, 'POST', '/contacts', payload);
  if (created.ok) return;
  if (!created.alreadyExists) throw new Error(`Resend contact create failed: ${created.detail}`);

  // The address is already a contact. Signing up again is an explicit request for the
  // newsletter, so clear any earlier unsubscribe and make sure it is in the segment;
  // only then does the visitor get told they are subscribed.
  const contact = encodeURIComponent(email);
  const updated = await resendRequest(apiKey, 'PATCH', `/contacts/${contact}`, { unsubscribed: false });
  if (!updated.ok) throw new Error(`Resend contact re-subscribe failed: ${updated.detail}`);

  if (segmentId) {
    const added = await resendRequest(apiKey, 'POST', `/contacts/${contact}/segments/${encodeURIComponent(segmentId)}`);
    if (!added.ok && !added.alreadyExists) throw new Error(`Resend add to segment failed: ${added.detail}`);
  }
}

async function resendRequest(apiKey, method, path, body) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`https://api.resend.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.ok) return { ok: true };

  const text = await response.text();
  return {
    ok: false,
    alreadyExists: response.status === 409 || (response.status === 422 && /already exist/i.test(text)),
    detail: `${method} ${path} returned ${response.status}: ${text}`,
  };
}
