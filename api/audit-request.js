const { rejectDisallowedOrigin } = require('./_lib/origin-check');
const { rejectIfRateLimited } = require('./_lib/rate-limit');
const { verifyTurnstile } = require('./_lib/turnstile');
const { getClientIp } = require('./_lib/request-ip');

const TO_EMAIL = process.env.AUDIT_REQUEST_TO || 'zajen@n8ivpromotions.com';
const FROM_EMAIL =
  process.env.AUDIT_REQUEST_FROM ||
  process.env.EMAIL_FROM ||
  'N8iV Promotions <no-reply@n8ivpromotions.com>';

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'company', 'role', 'investment', 'crm', 'challenge'];

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rejectDisallowedOrigin(req, res)) return;
  if (rejectIfRateLimited(req, res, 'audit-request')) return;

  try {
    const body = parseBody(req.body);

    if (body.website) {
      return res.status(200).json({ ok: true });
    }

    const submission = normalizeSubmission(body);
    const missing = REQUIRED_FIELDS.filter((field) => !submission[field]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!isValidEmail(submission.email)) {
      return res.status(400).json({ error: 'Please enter a valid work email.' });
    }

    const verified = await verifyTurnstile(body['cf-turnstile-response'], getClientIp(req));
    if (!verified) {
      return res.status(400).json({ error: 'We could not verify you are human. Please retry the form.' });
    }

    await sendAuditRequestEmail(submission);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Audit request failed:', error);
    return res.status(500).json({
      error: 'The audit request could not be sent. Please email zajen@n8ivpromotions.com directly.',
    });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return Object.fromEntries(new URLSearchParams(body));
    }
  }
  return body;
}

function normalizeSubmission(body) {
  return {
    firstName: clean(body.firstName),
    lastName: clean(body.lastName),
    email: clean(body.email).toLowerCase(),
    company: clean(body.company),
    role: clean(body.role),
    investment: clean(body.investment),
    crm: clean(body.crm),
    challenge: clean(body.challenge, 3000),
    sourcePage: clean(body.sourcePage || 'N8iV Promotions contact page'),
    conversionPage: clean(body.conversion_page, 1500),
    attribution: normalizeAttribution(body.attribution),
    submittedAt: new Date().toISOString(),
  };
}

function clean(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeAttribution(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    firstTouch: normalizeTouch(input.first_touch),
    latestTouch: normalizeTouch(input.latest_touch),
  };
}

function normalizeTouch(value) {
  if (!value || typeof value !== 'object') return {};
  const allowed = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term',
    'utm_content', 'utm_source_platform', 'gclid', 'gbraid', 'wbraid',
    'fbclid', 'msclkid', 'li_fat_id', 'ttclid', 'twclid', 'sccid',
    'landing_page', 'referrer', 'captured_at'
  ];
  return Object.fromEntries(allowed.map(key => [key, clean(value[key], 1500)]).filter(([, item]) => item));
}

function formatTouch(touch) {
  return Object.entries(touch || {}).map(([key, value]) => `${key}: ${value}`).join('\n') || 'Not captured';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendAuditRequestEmail(submission) {
  const subject = `New ARIE audit request: ${submission.company}`;
  const text = buildTextEmail(submission);
  const html = buildHtmlEmail(submission);

  if (process.env.RESEND_API_KEY) {
    await sendWithResend({ subject, text, html, replyTo: submission.email });
    return;
  }

  if (process.env.SENDGRID_API_KEY) {
    await sendWithSendGrid({ subject, text, html, replyTo: submission.email });
    return;
  }

  throw new Error('Email provider is not configured. Set RESEND_API_KEY or SENDGRID_API_KEY in Vercel.');
}

async function sendWithResend({ subject, text, html, replyTo }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend failed with status ${response.status}: ${await response.text()}`);
  }
}

async function sendWithSendGrid({ subject, text, html, replyTo }) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: TO_EMAIL }], subject }],
      from: parseEmailAddress(FROM_EMAIL),
      reply_to: { email: replyTo },
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid failed with status ${response.status}: ${await response.text()}`);
  }
}

function parseEmailAddress(value) {
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (!match) return { email: value };
  return {
    name: match[1].trim().replace(/^"|"$/g, ''),
    email: match[2].trim(),
  };
}

function buildTextEmail(submission) {
  return [
    'New N8iV Promotions Revenue Intelligence Audit Request',
    '',
    `Name: ${submission.firstName} ${submission.lastName}`,
    `Email: ${submission.email}`,
    `Company: ${submission.company}`,
    `Role: ${submission.role}`,
    `Monthly Marketing Investment: ${submission.investment}`,
    `CRM Platform: ${submission.crm}`,
    `Source Page: ${submission.sourcePage}`,
    `Conversion Page: ${submission.conversionPage || 'Not captured'}`,
    `Submitted At: ${submission.submittedAt}`,
    '',
    'First-touch attribution:',
    formatTouch(submission.attribution.firstTouch),
    '',
    'Latest-touch attribution:',
    formatTouch(submission.attribution.latestTouch),
    '',
    'Biggest Marketing Visibility Challenge:',
    submission.challenge,
  ].join('\n');
}

function buildHtmlEmail(submission) {
  const rows = [
    ['Name', `${submission.firstName} ${submission.lastName}`],
    ['Email', submission.email],
    ['Company', submission.company],
    ['Role', submission.role],
    ['Monthly Marketing Investment', submission.investment],
    ['CRM Platform', submission.crm],
    ['Source Page', submission.sourcePage],
    ['Conversion Page', submission.conversionPage || 'Not captured'],
    ['First-touch Attribution', formatTouch(submission.attribution.firstTouch).replace(/\n/g, '; ')],
    ['Latest-touch Attribution', formatTouch(submission.attribution.latestTouch).replace(/\n/g, '; ')],
    ['Submitted At', submission.submittedAt],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${escapeHtml(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.5;">
      <h1 style="font-size:22px;margin:0 0 16px;">New Revenue Intelligence Audit Request</h1>
      <table style="border-collapse:collapse;width:100%;max-width:680px;border:1px solid #e5e7eb;">${rowsHtml}</table>
      <h2 style="font-size:16px;margin:24px 0 8px;">Biggest Marketing Visibility Challenge</h2>
      <p style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;padding:14px 16px;border-radius:8px;">${escapeHtml(submission.challenge)}</p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
