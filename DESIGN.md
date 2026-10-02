# N8iV Promotions Design System (v2, executive SaaS)

Implemented in `css/saas.css`, which loads last on every page. It redefines the
brand tokens and restyles the shared components; older layers in `styles.css`,
`editorial.css`, `trust-pages.css`, `landing.css` and per-page `<style>` blocks
stay in place underneath it.

## Scene

A founder or CMO on a laptop in a bright office, between meetings, deciding
whether to trust a partner with budget. Light theme, generous space, one clear
action per view. Calm and precise, never loud.

## Brand (unchanged)

- Logo: five-bar mark (Signal Purple + Ink) and the "N8iV Promotions" wordmark.
- Action Purple `#5F42FB`, Signal Purple `#7860FC`.
- Helvetica Now Display for headings, Inter for everything read or clicked.
- Pill-shaped buttons, sentence-case UI text, all existing copy.

## Tokens

| Role | Token | Value |
|---|---|---|
| Page | `--paper` | `#FAFAFD` (neutral tinted toward the brand violet) |
| Surface | `--white` | `#FFFFFF` |
| Ink | `--black` | `#191920` |
| Secondary text | `--ink-2` | `#3D3D49` |
| Muted text | `--dark-grey` | `#5A5A66` (6.0:1 on page) |
| Hairline | `--light-grey` | `#E6E6EE` |
| Strong hairline | `--hairline-strong` | `#D4D4DE` |
| Dark band | `--band` | `#0E0D1C` |
| Success / error | `--success` / `--error` | `#0E7A55` / `#B42318` |

### AI gradient

Four stops, each keeping white text at WCAG AA (5.1:1 to 6.3:1):

`--ai-1 #2867E4` electric blue, `--ai-2 #5F42FB` Action Purple,
`--ai-3 #862BE2` ultraviolet, `--ai-4 #BB29A6` magenta.

- `--ai-gradient`: the static 4-stop gradient.
- `--ai-gradient-loop`: a mirrored version, drawn at 300% width and drifted
  slowly (`ai-drift`, 14s) so primary actions feel alive. The drift stops under
  `prefers-reduced-motion` and the site's Motion toggle.
- `--ai-glow` / `--ai-glow-strong`: colored, blurred shadows made from the same
  stops. The glow is the "light" of the gradient; there is no blur on surfaces.

## Where the gradient goes (and nowhere else)

1. **Primary actions**: `.btn-primary`, `.btn-green`, `.pilot-btn`, `.audit-btn`,
   submit buttons. Gradient fill, white text, glow that strengthens on hover.
2. **Interactive state**: focus rings, the active nav link (2px gradient
   underline), the active capability tab, selected self-audit and landing
   answers, the self-audit progress bar, form focus.
3. **AI anchors**: elements that show the product's intelligence or output.
   They get a 1px gradient ring and a soft glow: the evidence-desk output
   (`.ed-output`), the Revenue Receipt (`.receipt-sheet`) and its decision memo,
   the visible capability board, the pilot ticket, the self-audit result, the
   landing question card and "What you get" panel, the services report card, the
   N8iV comparison column, the carried-over self-audit context on the contact
   form, and small "live" status dots on board headers.

Rules: never gradient text, never a gradient on decorative surfaces, at most
one gradient-filled button per view where possible (repeated in-body CTAs
render as the secondary button).

## Type

- Display (H1): `clamp(40px, 5.4vw, 76px)`, tracking -0.035em.
- H2: `clamp(30px, 3.4vw, 48px)`. H3: `clamp(18px, 1.5vw, 22px)`.
- Lead 17-19px, body 16px, small 14px, labels 12-13px minimum.
- Eyebrows and labels: sentence case, no letter-spacing, muted. No 9-11px
  uppercase micro labels.

## Components

- Cards: `--r-lg` (16px) radius, 1px hairline, `--shadow-sm`; hover only on
  real links (border tint + `--shadow-md`). No zig-zag "receipt" edges, no
  side-stripe borders.
- Secondary button: white pill, strong hairline, ink text; hover draws a
  gradient ring.
- Inputs: 12px radius, strong hairline, violet border and soft ring on focus.
- Status: success and error each have their own color, tint and border.

## Reduced cognitive load

Hidden as redundant: chapter counters ("02 / 08") and act labels
("Act 1 · Problem"), the fixed chapter rail, tab and panel numbers, the rotated
"Sample" stamp (kept as a flat label). Display sizes are capped so a headline
never fills the viewport, and the dark chapter no longer forces a full-screen
height.
