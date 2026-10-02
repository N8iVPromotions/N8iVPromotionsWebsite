# N8iV Promotions Website Audit

**Date:** 2026-10-02 · **Scope:** all HTML pages, `vercel.json`, `api/`, `js/`, assets, deploy workflow.

## Fixed in this pass
- Privacy policy now discloses Google Analytics 4 and the Meta Pixel (the old callout said no ad pixels were active). `/privacy?ga_optout=1` now also disables the Meta Pixel.
- Canonical URLs added to every page; Open Graph and Twitter tags added to every page that lacked them.
- Stronger titles (`services`, `case-studies`, `insights`) and descriptions (`terms`, `privacy`, `security`, `revenue-self-audit`).
- `Organization` + `WebSite` JSON-LD on the home page; `404.html` added.
- `<main id="main-content">` landmark and skip link on every page; empty `alt` on noscript pixel images.

## Still open
1. **Delete the GitHub Pages workflow** (`.github/workflows/deploy.yml`) and disable Pages: it publishes the whole repo (including `api/`, `.agents/`, `env.example`) as a public duplicate site.
2. **Delete unused images:** `assets/audit-hero.png`, `case-study-1.png`, `case-study-2.png`, `office-hero.png`, `platform-hero.png` (~1.6 MB, unreferenced). Convert `dashboard-hero.png` to WebP and compress the 704 KB social image.
3. **Consent banner** for EU/California traffic (GA and the Meta Pixel load without consent; opt-out is manual).
4. **Verify production env vars** (`RESEND_API_KEY`/`SENDGRID_API_KEY`, `TURNSTILE_SECRET_KEY`) with a live submission of both forms.
5. `getClientIp` trusts the first `x-forwarded-for` hop (spoofable); prefer `x-real-ip` on Vercel. The in-memory rate limiter is per instance only.
6. Inline GA/Pixel scripts force `'unsafe-inline'` in the CSP; `styles.css` is one 3,365-line file with many inline styles; logo `<img>` tags lack width/height.
