// Vercel sets x-real-ip to the connecting client and overwrites
// x-forwarded-for, so neither can be spoofed in production. Prefer
// x-real-ip (what @vercel/functions' ipAddress() reads) and fall back to the
// first x-forwarded-for hop for other environments.
function getClientIp(req) {
  const realIp = req.headers['x-real-ip'];
  if (realIp) return String(realIp).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

module.exports = { getClientIp };
