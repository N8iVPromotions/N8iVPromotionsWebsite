# N8iV Promotions Website Audit

**Date:** 2026-10-02 · **Scope:** all HTML pages, `vercel.json`, `api/`, `js/`, assets, deploy workflow.

## Fixed in this pass
- Privacy policy now discloses Google Analytics 4 and the Meta Pixel (the old callout said no ad pixels were active). `/privacy?ga_optout=1` now also disables the Meta Pixel.
- Canonical URLs added to every page; Open Graph and Twitter tags added to every page that lacked them.
- Stronger titles (`services`, `case-studies`, `insights`) and descriptions (`terms`, `privacy`, `security`, `revenue-self-audit`).
- `Organization` + `WebSite` JSON-LD on the home page; `404.html` added.
- `<main id="main-content">` landmark and skip link on every page; empty `alt` on noscript pixel images.
- Deleted the GitHub Pages workflow and five unused images (~1.6 MB). Disable Pages in the repo settings if it is still enabled.

## Hardening pass (2026-10-02)
- All inline scripts moved to `js/ga-init.js`, `js/meta-pixel.js`, and `js/motion-init.js`; the insights newsletter form's inline `onsubmit` moved to `js/main.js`. The CSP `script-src` no longer allows `'unsafe-inline'`. GA4 CSP hosts follow Google's guidance (`*.googletagmanager.com`, `*.google-analytics.com` for images).
- `getClientIp` now prefers `x-real-ip`. Note: Vercel overwrites `x-forwarded-for`, so the earlier "spoofable" finding did not apply in production.
- Logo `<img>` tags on the home page have explicit width/height.

## Still open
1. Convert `assets/dashboard-hero.png` to WebP and compress the 704 KB social image.
2. **Consent banner** for EU/California traffic (GA and the Meta Pixel load without consent; opt-out is manual).
3. **Verify production email setup.** Both forms send through Resend (`RESEND_API_KEY`; SendGrid is only a fallback). Confirm the `n8ivpromotions.com` sending domain is verified in Resend (the `no-reply@` sender is rejected otherwise, and the self-audit also emails visitors), confirm `TURNSTILE_SECRET_KEY` is set (without it every submission is rejected), then submit both forms live.
4. **The insights newsletter form has no backend.** It accepts an email and silently does nothing. Wire it to an email provider or remove it.
5. The in-memory rate limiter is per instance only (Upstash Redis if spam appears). `style-src` still needs `'unsafe-inline'` because of the many inline `style=""` attributes; `styles.css` is one 3,365-line file.
