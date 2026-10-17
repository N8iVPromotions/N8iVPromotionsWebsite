# N8iV campaign tracking standard

Use lowercase values, hyphens between words, and the same names across ad platforms, CRM fields, and reporting.

## Required parameters

- `utm_source`: platform or partner, such as `google`, `linkedin`, `meta`, or `newsletter`
- `utm_medium`: channel type, such as `cpc`, `paid-social`, `email`, `organic-social`, or `referral`
- `utm_campaign`: durable campaign name, such as `revenue-audit-2026-q3`

## Optional parameters

- `utm_content`: creative, placement, or CTA variant
- `utm_term`: paid-search keyword or audience label
- `utm_id`: stable campaign ID from the source platform
- `utm_source_platform`: buying platform when it differs from the source label

Example:

```text
https://www.n8ivpromotions.com/contact?utm_source=linkedin&utm_medium=paid-social&utm_campaign=revenue-audit-2026-q3&utm_content=founder-video
```

Do not use UTMs on links between pages of this website. Internal UTMs overwrite acquisition context in many analytics systems. The site captures the original qualified touch, the latest qualified touch, ad click IDs, landing page, referrer, and conversion page and includes them with both lead forms.

## Captured ad click IDs

Google: `gclid`, `gbraid`, `wbraid`; Meta: `fbclid`; Microsoft: `msclkid`; LinkedIn: `li_fat_id`; TikTok: `ttclid`; X: `twclid`; Snapchat: `sccid`.

## Conversion events

- `audit_request_submitted`
- `self_audit_completed`

These Vercel Analytics events intentionally exclude names, email addresses, company names, and full campaign payloads.

## HubSpot tracking

Every public page loads the na2 tracking script for portal `245566926`. Server submissions use
`HUBSPOT_PORTAL_ID` (default `245566926`) and `HUBSPOT_FORM_GUID` (default
`49fb0c89-a865-4f99-85bf-91de60556c61`). `HUBSPOT_FAILURE_NOTIFY=false` disables failure
alerts; otherwise alerts use the existing Resend configuration and operator recipient.
The CSP host allowlist is kept in the Content-Security-Policy header in `vercel.json`.

The existing `/privacy?ga_optout=1` switch sets `n8iv_ga_opt_out=1`, suppressing the
HubSpot loader and server handoff. Neither cookie nor page context is submitted on opt-out.
Self-Audit submissions reach HubSpot only with follow-up consent. Email remains the
system of record; HubSpot errors do not change visitor success responses.

At production go-live (not before), turn off HubSpot → Settings → Forms → Non-HubSpot
Forms → "Collect data from website forms" to prevent duplicate collection. Confirm the
CSP hosts and tracked attribution on the Vercel preview before production.
