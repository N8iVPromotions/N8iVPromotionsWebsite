const TO_EMAIL = process.env.AUDIT_REQUEST_TO || 'zajen@n8ivpromotions.com';
const FROM_EMAIL =
  process.env.AUDIT_REQUEST_FROM ||
  process.env.EMAIL_FROM ||
  'N8iV Promotions <no-reply@n8ivpromotions.com>';

async function sendWithResend({ subject, text, html, replyTo, signal }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal,
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


module.exports = { sendWithResend };
