const ALLOWED_ORIGINS = new Set([
  'https://www.n8ivpromotions.com',
  'https://n8ivpromotions.com',
]);

// This project's Vercel preview deployments (unique subdomain per build/branch),
// e.g. https://n8iv-cohesive-brand-website-git-main-n8i-v-promotions.vercel.app
const PREVIEW_ORIGIN_PATTERN = /^https:\/\/n8iv-cohesive-brand-website-[a-z0-9-]+\.vercel\.app$/i;

function isAllowedOrigin(origin) {
  if (!origin) return true; // no Origin header (e.g. non-browser callers) - nothing to check against
  return ALLOWED_ORIGINS.has(origin) || PREVIEW_ORIGIN_PATTERN.test(origin);
}

// Rejects cross-site browser requests (form embedded on someone else's page/script).
// Returns true if the request was rejected (caller should stop handling it).
function rejectDisallowedOrigin(req, res) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) return false;
  res.status(403).json({ error: 'Request origin not allowed.' });
  return true;
}

module.exports = { isAllowedOrigin, rejectDisallowedOrigin };
