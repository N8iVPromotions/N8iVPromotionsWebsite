const { rejectDisallowedOrigin } = require('./_lib/origin-check');

const TO_EMAIL = process.env.AUDIT_REQUEST_TO || 'zajen@n8ivpromotions.com';
const FROM_EMAIL = process.env.AUDIT_REQUEST_FROM || process.env.EMAIL_FROM || 'N8iV Promotions <no-reply@n8ivpromotions.com>';
const CATEGORY_NAMES = ['Source capture', 'CRM connection', 'Attribution confidence', 'Revenue reconciliation', 'Decision readiness'];
const QUESTION_LABELS = [
  'Consistent UTM naming system',
  'Original source stored on contacts',
  'Channel sources can be distinguished',
  'Contacts and opportunities share an identifier',
  'Deal data is consistently maintained',
  'Offline conversions retain source context',
  'Meaningful touches are visible',
  'Platform conversions are reconciled',
  'Attribution fits the sales cycle',
  'CRM revenue is reconciled with payments',
  'Refunds and duplicates are removed',
  'Unattributed revenue percentage is known',
  'Leadership sees revenue by marketing dimension',
  'Reports flag data-quality gaps',
  'Revenue evidence changes decisions',
];
const ANSWER_LABELS = ['Not in place', 'Partly', 'Mostly', 'Consistently'];

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (rejectDisallowedOrigin(req, res)) return;
  try {
    const body = parseBody(req.body);
    if (body.website) return res.status(200).json({ ok: true });
    const submission = normalize(body);
    if (!submission.name || !submission.email || !submission.company) return res.status(400).json({ error: 'Name, work email, and company are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email)) return res.status(400).json({ error: 'Please enter a valid work email.' });
    if (submission.answers.length !== 15 || submission.answers.some(value => !Number.isInteger(value) || value < 0 || value > 3)) return res.status(400).json({ error: 'Please answer all 15 audit questions.' });
    const result = scoreAudit(submission.answers);
    const emailDelivered = await sendEmails(submission, result);
    return res.status(200).json({ ok: true, emailDelivered, ...result });
  } catch (error) {
    console.error('Self-audit submission failed:', error);
    return res.status(500).json({ error: 'The audit result could not be sent.' });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body !== 'string') return body;
  try { return JSON.parse(body); } catch { return Object.fromEntries(new URLSearchParams(body)); }
}

function normalize(body) {
  return {
    name: clean(body.name), email: clean(body.email).toLowerCase(), company: clean(body.company),
    followUpConsent: body.followUpConsent === true || body.followUpConsent === 'true' || body.followUpConsent === 'yes',
    answers: Array.isArray(body.answers) ? body.answers.map(Number) : [],
    conversionPage: clean(body.conversion_page, 1500), attribution: normalizeAttribution(body.attribution),
    submittedAt: new Date().toISOString()
  };
}

function clean(value, max = 500) { return String(value || '').trim().slice(0, max); }

function normalizeAttribution(value) {
  const input = value && typeof value === 'object' ? value : {};
  return { firstTouch: normalizeTouch(input.first_touch), latestTouch: normalizeTouch(input.latest_touch) };
}

function normalizeTouch(value) {
  if (!value || typeof value !== 'object') return {};
  const allowed = ['utm_source','utm_medium','utm_campaign','utm_id','utm_term','utm_content','utm_source_platform','gclid','gbraid','wbraid','fbclid','msclkid','li_fat_id','ttclid','twclid','sccid','landing_page','referrer','captured_at'];
  return Object.fromEntries(allowed.map(key => [key, clean(value[key], 1500)]).filter(([, item]) => item));
}

function formatTouch(touch) { return Object.entries(touch || {}).map(([key, value]) => `${key}: ${value}`).join('\n') || 'Not captured'; }

function scoreAudit(answers) {
  const categories = CATEGORY_NAMES.map((name, index) => ({ name, score: Math.round(answers.slice(index * 3, index * 3 + 3).reduce((sum, value) => sum + value, 0) / 9 * 100) }));
  const score = Math.round(answers.reduce((sum, value) => sum + value, 0) / 45 * 100);
  if (score >= 80) return { score, categories, band: 'Decision-ready visibility', summary: 'Your revenue receipt is strong. Focus on the lowest category to improve confidence and make the system easier to maintain as you scale.' };
  if (score >= 60) return { score, categories, band: 'Connected, with material gaps', summary: 'You have useful pieces in place, but one or more handoffs can still break the path from marketing activity to revenue. Start with your lowest-scoring category.' };
  if (score >= 35) return { score, categories, band: 'Partial revenue visibility', summary: 'Your team can see activity, but cannot consistently produce a defensible receipt for closed revenue. Repair source capture and CRM connection before adding reporting complexity.' };
  return { score, categories, band: 'Revenue receipt at risk', summary: 'Most marketing and revenue evidence is disconnected or manually reconstructed. Establish a clean source-to-CRM foundation first, then add attribution.' };
}

async function sendEmails(submission, result) {
  const consent = submission.followUpConsent ? 'YES, follow-up permitted' : 'NO, do not follow up';
  const categoryText = result.categories.map(item => `${item.name}: ${item.score}%`).join('\n');
  const answerText = submission.answers.map((answer, index) => `${index + 1}. ${QUESTION_LABELS[index]}: ${ANSWER_LABELS[answer]} (${answer}/3)`).join('\n');
  const ownerText = `New Revenue Receipt Self-Audit\n\nName: ${submission.name}\nEmail: ${submission.email}\nCompany: ${submission.company}\nFollow-up consent: ${consent}\nConversion page: ${submission.conversionPage || 'Not captured'}\nSubmitted: ${submission.submittedAt}\n\nFirst-touch attribution\n${formatTouch(submission.attribution.firstTouch)}\n\nLatest-touch attribution\n${formatTouch(submission.attribution.latestTouch)}\n\nScore: ${result.score}/100 (${result.band})\n\nCategory results\n${categoryText}\n\nAll responses\n${answerText}`;
  const visitorText = `Hi ${submission.name},\n\nYour N8iV Revenue Receipt score is ${result.score}/100: ${result.band}.\n\n${result.summary}\n\n${categoryText}\n\nYou ${submission.followUpConsent ? 'agreed' : 'did not agree'} to follow-up from N8iV Promotions.\n\nN8iV Promotions`;
  await sendEmail({ to: TO_EMAIL, replyTo: submission.email, subject: `[Self-Audit ${result.score}/100] ${submission.company} · ${consent}`, text: ownerText });
  try {
    await sendEmail({ to: submission.email, replyTo: TO_EMAIL, subject: `Your Revenue Receipt score: ${result.score}/100`, text: visitorText });
    return true;
  } catch (error) {
    console.error('Visitor result email failed after owner notification:', error);
    return false;
  }
}

async function sendEmail({ to, replyTo, subject, text }) {
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: FROM_EMAIL, to: [to], reply_to: replyTo, subject, text }) });
    if (!response.ok) throw new Error(`Resend failed with status ${response.status}: ${await response.text()}`);
    return;
  }
  if (process.env.SENDGRID_API_KEY) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', { method: 'POST', headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ personalizations: [{ to: [{ email: to }], subject }], from: parseAddress(FROM_EMAIL), reply_to: { email: replyTo }, content: [{ type: 'text/plain', value: text }] }) });
    if (!response.ok) throw new Error(`SendGrid failed with status ${response.status}: ${await response.text()}`);
    return;
  }
  throw new Error('Email provider is not configured.');
}

function parseAddress(value) {
  const match = value.match(/^(.*)<([^>]+)>$/);
  return match ? { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() } : { email: value };
}

module.exports.scoreAudit = scoreAudit;
