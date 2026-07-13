# N8iV Promotions Website Audit

**Date:** 2026-07-13 · **Scope:** all 6 HTML pages, `css/styles.css`, `js/main.js`, `api/audit-request.js`, assets, and the GitHub Pages deploy workflow.

The site is a well-built static marketing site: clean semantic HTML, one `<h1>` per page, good titles/meta descriptions, no framework bloat, decorative images correctly hidden from screen readers, `prefers-reduced-motion` honored, and a form handler with honeypot, input caps, and HTML escaping. The findings below are ordered by severity.

---

## 1. Critical — the primary CTA (audit request form) likely does not work in production

Every page funnels visitors to the contact form, which posts to `/api/audit-request` (`contact.html:100`). That endpoint is a **Vercel-style serverless function** (`api/audit-request.js`), but the repo's only deploy pipeline is **GitHub Pages** (`.github/workflows/deploy.yml`), which serves static files only. On GitHub Pages the POST returns 404, so **every submission fails**.

- If the production domain is actually served by Vercel (with `RESEND_API_KEY` or `SENDGRID_API_KEY` set), this is a non-issue — but then the GitHub Pages workflow is deploying a second, broken copy of the site.
- If production is GitHub Pages, the form has never delivered a lead except via the mailto fallback.

**Action:** confirm which host serves n8ivpromotions.com; either move hosting to Vercel (and delete the Pages workflow) or point the form at a hosted endpoint (Vercel function URL, Formspree, etc.).

## 2. High — form failure UX hijacks the browser

`js/main.js:242-247`: on any failure the script sets an error status **and immediately navigates to a `mailto:` URL**. The user never sees the message, and on machines with no mail client they get a blank/confusing handoff. Worse, validation errors (HTTP 400, e.g. "invalid email") also trigger the mailto redirect instead of letting the user fix the field.

**Action:** only offer mailto as a visible link in the status message; never auto-navigate. Treat 400 responses as field errors, not transport failures.

## 3. High — dead links across the site

- **insights.html:** all 7 "Read Article" links (featured + 6 cards) are `href="#"`. The Insights page promises content that doesn't exist — bad for trust and SEO.
- **Footer, every page:** LinkedIn, Google Business Profile, Privacy, Terms of Service, and Imprint are all `href="#"`. A **Privacy page is not optional** once the form collects names, emails, and business details.
- Footers are also inconsistent: `index.html` has Terms/Imprint/extra "Email" link; other pages have Privacy/Contact.

**Action:** publish a real Privacy page, link the real LinkedIn/GBP profiles, and either publish the articles or remove/label the Insights cards ("coming soon"). Unify the footer.

## 4. Medium — SEO/meta gaps

Missing on every page:

- **Favicon** (none anywhere — browser tabs show the default globe)
- **Open Graph / Twitter Card tags** — shared links render with no preview image or description
- **Canonical URLs**
- `robots.txt`, `sitemap.xml`, `404.html`
- **Structured data** (Organization/LocalBusiness JSON-LD — relevant for a Scottsdale, AZ agency, and cheap to add)

Titles and meta descriptions themselves are good.

## 5. Medium — deploy workflow publishes the whole repository

`deploy.yml` uploads `path: '.'`, so the published artifact includes `.agents/` (~60 internal skill/tooling files), `api/`, `env.example`, and `skills-lock.json`. Nothing secret, but internal tooling and the serverless source become world-readable at predictable URLs.

Also: the workflow still triggers on the stale branch `claude/add-animations-effects-Ogg5y` in addition to `main`.

**Action:** build the artifact from an allowlist (HTML, css/, js/, assets/) or add exclusions; drop the stale branch trigger.

## 6. Medium — ~2 MB of unused images shipped in the repo

`assets/audit-hero.png`, `case-study-1.png`, `case-study-2.png`, `dashboard-hero.png`, `office-hero.png`, `platform-hero.png` (~2 MB total) are referenced by **no** HTML/CSS/JS. They don't slow page loads but bloat the repo and the Pages artifact. Delete or use them.

## 7. Low — accessibility gaps

Good baseline (aria-expanded on the menu toggle, `aria-live` form status, sr-only honeypot, reduced-motion support). Remaining gaps:

- No **skip-to-content** link.
- The mobile menu declares `role="dialog" aria-modal="true"` but never moves or traps focus; keyboard/screen-reader users stay in the page behind it. Toggle label stays "Open menu" while open.
- The animated hero flow diagram's figures (847 conv, 623 conv, 312 deals) are invisible to screen readers — acceptable if decorative, but consider an `aria-label` summary on the container.
- `index.html` hardcodes `class="active"` on the Home nav link while other pages rely on the JS in `main.js` — works, but inconsistent.

## 8. Low — polish and code-quality items

- **Counter leading zeros:** stats rendered as `07`, `05`, `04` etc. (`data-count` elements in index/about/case-studies) lose the leading zero once the JS counter runs — "07" becomes "7" mid-view.
- **Duplicate CTA buttons:** the final CTA on `index.html` has "Book Revenue Audit" and "Get Revenue Audit" side by side, both linking to `contact.html`. Keep one primary + one secondary with distinct intent (e.g. "See Services").
- **Inline styles:** ~80 `style=""` attributes on `index.html` alone; move recurring patterns into `styles.css`.
- `main.js` has two sections numbered "6" in comments.
- No rate limiting or CAPTCHA on `/api/audit-request` beyond the honeypot — fine for launch, worth watching for spam.
- Google Fonts loads 3 families with many weights; trimming unused weights (e.g. Inter 500/900) shaves render-blocking bytes.

---

## Suggested priority order

1. Verify/fix the form's production endpoint (finding 1) and the mailto redirect (2).
2. Add favicon, OG tags, Privacy page; fix or remove dead links (3, 4).
3. Restrict the Pages artifact and remove the stale branch trigger (5).
4. Delete unused images (6), then the accessibility and polish items (7, 8).
