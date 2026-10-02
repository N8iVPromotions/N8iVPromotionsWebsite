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

  const response = await fetch('https://api.resend.com/contacts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.ok) return;

  const text = await response.text();
  // Signing up again with an address that is already a contact is not an error for the visitor.
  if (response.status === 409 || (response.status === 422 && /already exist/i.test(text))) return;
  throw new Error(`Resend contact create failed with status ${response.status}: ${text}`);
}
