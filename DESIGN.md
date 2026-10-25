# N8iV Promotions — Revenue clarity design

The homepage follows the approved GPT Site at https://n8iv-revenue-clarity.zajenm.chatgpt.site/.

## Visual system

White and warm stone surfaces, near-black typography, restrained violet accents, generous whitespace, and glass pathway imagery. Inter is hosted locally for headings and body copy. Primary actions are black pills. Keep the original five-pill N8iV mark.

- White: #FFFFFF
- Stone: #F4F3EF
- Ink: #161616
- Violet: #7A63FF (decorative), #6248D6 (interactive)

## Implementation

css/clarity-home.css and js/clarity-home.js power the homepage. Source assets are in assets/clarity/. css/clarity-system.css loads last on the other public pages, adapting existing layouts to the same typography, palette, navigation, and controls.

The existing 15-question revenue self-audit, contact API, tracking scripts, security headers, and route configuration remain in use. Homepage audit calls to action route to /revenue-self-audit; Fit Review links route to /contact. Example receipts are explicitly illustrative, not customer results.

## Validation

Run node --test tests/*.test.cjs, node --check js/clarity-home.js, and git diff --check. Inspect desktop and mobile layouts, evidence tabs, audit routing, and contact form contrast before deployment. Do not submit test leads to production.
