# Completed self-audit measurement

A visitor completing all 15 questions and seeing their score triggers the custom
OpenAI event `self_audit_completed`. Requesting an email copy is independent.
The integration sends no revenue value, score, answers, or contact information
to OpenAI. The server validates the answers locally and forwards only the fixed
event metadata and available Pixel attribution cookies (`__oppref`, `__obref`).

Browser and server use the same UUID and custom event name for OpenAI deduplication.
Session storage suppresses repeated completions and restored results in the same
tab. If session storage is blocked, suppression lasts for the current page only.
Delivery is best effort, without automatic retries or a durable delivery queue.

Both paths respect `n8iv_ga_opt_out=1`. If the browser cannot read that preference,
measurement is skipped. Browser reporting is restricted to the two production
hostnames. Server forwarding also requires `VERCEL_ENV=production` and the sensitive,
server-only `OPENAI_CONVERSIONS_API_KEY` variable. No secret values are returned
or logged. A redeployment is needed after environment-variable changes.

The endpoint accepts only same-origin JSON POSTs with valid completion answers,
a UUID and a recent timestamp, and uses the existing per-instance rate limiter.
These checks reduce accidental or casual misuse; this public self-assessment is
not an authenticated or independently verified business transaction.

Tests use mocked transport, never synthetic production conversions. Verify actual
receipt in Ads Manager after a real eligible completion. A successful deployment
does not prove an event has been accepted or attributed by OpenAI.

References:
- https://developers.openai.com/ads/measurement-pixel
- https://developers.openai.com/ads/conversions-api
- https://developers.openai.com/ads/supported-events
