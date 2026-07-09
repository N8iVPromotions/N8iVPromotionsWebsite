const TO_EMAIL = process.env.NEWSLETTER_TO || process.env.AUDIT_REQUEST_TO || 'zajen@n8ivpromotions.com';
const FROM_EMAIL =
  process.env.NEWSLETTER_FROM ||
  process.env.AUDIT_REQUEST_FROM ||
  process.env.EMAIL_FROM ||
  'N8iV Promotions <no-reply@n8ivpromotions.com>';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseBody(req.body);

    if (body.website) {
      return res.status(200).json({ ok: true });
    }

    const submission = normalizeSubmission(body);
    if (!submission.email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (!isValidEmail(submission.email)) {
      return res.status(400).json({ error: 'Please enter a valid email.' });
    }

    await sendNewsletterEmail(submission);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Newsletter subscription failed:', error);
    return res.status(500).json({
      error: 'The subscription could not be saved. Please email zajen@n8ivpromotions.com directly.',
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
    email: clean(body.email).toLowerCase(),
    sourcePage: clean(body.sourcePage || 'N8iV Promotions newsletter form'),
    submittedAt: new Date().toISOString(),
  };
}

function clean(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendNewsletterEmail(submission) {
  const subject = `New N8iV newsletter subscriber: ${submission.email}`;
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

  if (process.env.GMAIL_SENDER && process.env.GMAIL_APP_PASSWORD) {
    await sendWithGmail({ subject, text, html, replyTo: submission.email });
    return;
  }

  throw new Error('Email provider is not configured. Set RESEND_API_KEY, SENDGRID_API_KEY, or Gmail SMTP credentials in Vercel.');
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

async function sendWithGmail({ subject, text, html, replyTo }) {
  const nodemailer = require('nodemailer');
  const sender = process.env.GMAIL_SENDER;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: sender,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `N8iV Promotions <${sender}>`,
    to: TO_EMAIL,
    replyTo,
    subject,
    text,
    html,
  });
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
    'New N8iV Promotions newsletter subscription',
    '',
    `Email: ${submission.email}`,
    `Source Page: ${submission.sourcePage}`,
    `Submitted At: ${submission.submittedAt}`,
  ].join('\n');
}

function buildHtmlEmail(submission) {
  const rows = [
    ['Email', submission.email],
    ['Source Page', submission.sourcePage],
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
      <h1 style="font-size:22px;margin:0 0 16px;">New Newsletter Subscription</h1>
      <table style="border-collapse:collapse;width:100%;max-width:680px;border:1px solid #e5e7eb;">${rowsHtml}</table>
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
