// Verifies a Cloudflare Turnstile token server-side.
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set; rejecting submission.');
    return false;
  }
  if (!token || typeof token !== 'string') return false;

  try {
    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);
    if (remoteIp) params.set('remoteip', remoteIp);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification request failed:', error);
    return false;
  }
}

module.exports = { verifyTurnstile };
