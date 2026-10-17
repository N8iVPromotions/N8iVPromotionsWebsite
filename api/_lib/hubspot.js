const { sendWithResend } = require('./resend');

// Neither response bodies nor exception messages are logged: they may contain PII.
async function submitToHubSpot({ fields, hutk, pageUri, pageName, ipAddress } = {}) {
  let status;
  try {
    const context = {
      pageUri: String(pageUri || '').slice(0, 2000),
      pageName: String(pageName || '').slice(0, 500),
      ipAddress: String(ipAddress || ''),
    };
    if (typeof hutk === 'string' && /^[a-f0-9]{32}$/i.test(hutk)) context.hutk = hutk;
    const portal = process.env.HUBSPOT_PORTAL_ID || '245566926';
    const form = process.env.HUBSPOT_FORM_GUID || '49fb0c89-a865-4f99-85bf-91de60556c61';
    const response = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${portal}/${form}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2500),
      body: JSON.stringify({
        fields: Object.entries(fields).map(([name, value]) => ({ objectTypeId: '0-1', name, value })),
        context,
      }),
    });
    status = response.status;
    if (response.ok) return { ok: true, status };
  } catch (_) { /* Best effort; email remains the system of record. */ }
  console.error(`HubSpot handoff failed (status: ${status || 'unavailable'}).`);
  if (process.env.HUBSPOT_FAILURE_NOTIFY !== 'false') {
    try {
      await sendWithResend({
        subject: 'HubSpot handoff failed',
        text: `A HubSpot handoff failed. Company: ${String(fields?.company || 'Not provided').replace(/[\r\n]/g, ' ').slice(0, 160)}. The original operator email remains the record; review the inquiry there.`,
        signal: AbortSignal.timeout(2500),
      });
    } catch (_) {
      console.error('HubSpot failure notification could not be sent.');
    }
  }
  return status === undefined ? { ok: false } : { ok: false, status };
}

module.exports = { submitToHubSpot };
