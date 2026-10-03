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
   One gradient fill leads each view: the header CTA is an ink pill with a
   chevron (its hover adds the gradient's glow), so the hero or section CTA
   carries the fill. On mobile pages with the sticky conversion bar, the bar is the one
   gradient action and repeated in-page self-audit CTAs become secondary.
2. **Interactive state**: focus rings, the active nav link (2px gradient
   underline), selected self-audit and landing answers, the self-audit
   progress bar, form focus (the request form's underline draws it).
3. **AI anchors**: elements that show the product's intelligence or output.
   They get a 1px gradient ring and a soft glow: the evidence-desk output
   (`.ed-output`), the Revenue Receipt (`.receipt-sheet`) and its decision memo,
   every capability board, the hero's decision brief, the pilot ticket, the self-audit result, the
   landing question card and "What you get" panel, the services report card, the
   N8iV comparison column, the carried-over self-audit context on the contact
   form, the insights signal-chain visual ("One report, one decision path"),
   and small "live" status dots on board headers. The finance problem card
   (the one source that resolves the conflicting numbers) gets a 3px gradient
   bar. The "After N8iV" result columns get a flat violet tint, not the
   gradient.
4. **Ambient light**: the hero fields and the dark band carry a soft radial
   glow built from the same stops (10% opacity or less on light, up to 35% on
   the dark band). It is the only decorative use, and it never sits behind
   body text at a strength that changes contrast.

Rules: never gradient text, no gradient on decorative surfaces beyond the
ambient light above, at most one gradient-filled button per view.

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
- Inputs: 12px radius, `#868694` border (3:1 against white, as form controls
  require), violet border and soft ring on focus, error border when invalid.
- Status: success and error each have their own color, tint and border.

## Depth: three planes

The page is built on three planes so the eye reads distance, not just layout.

| Plane | What lives there | Treatment |
|---|---|---|
| 0, ground | The page canvas | `--paper` with a fixed field of ambient AI light (the gradient stops at 6 to 11% opacity) and a faint 24px dot grid that fades out down the page. It stays still while content scrolls over it. Sections are transparent so the ground shows through. |
| 1, surface | Content sheets, stages and cards | White, 1px hairline, `--elev-1` (soft, ink-tinted). Sections that used to carry a white field (`.bg-surface`) become rounded sheets inset from the viewport (`--sheet-inset`, `--sheet-radius`); the dark chapters are dark sheets. On the home page every product visual sits on a stage: a rounded panel with a soft wash of the gradient stops and a fine 32px grid. Cards inside a sheet sit on the same plane: hairline, no shadow. |
| 2, float | What the visitor acts on, or what the product produces | `--elev-2`. The header is a floating pill (the trust pages too), AI anchors add the gradient glow on top of `--elev-2`, primary buttons glow, the mobile conversion bar floats as a rounded bar, the article aside floats, and link cards rise from plane 1 to plane 2 on hover (2px lift, off under reduced motion). |

Full-bleed section rules are removed; separation between sections comes from
the strip of ground between sheets.

## Layout

A product-led layout, built from a few repeated parts:

- **Header**: a floating rounded bar (18px radius). The wordmark, a hairline
  divider, the links beside it, and one ink action on the right with a
  chevron. Over a dark chapter the bar turns dark and the action turns white.
- **Label pills**: eyebrows and chapter names are small hairline pills in
  sentence case. A centered label draws a hairline out to each side
  (`.pill-rule`).
- **Hero**: copy beside a layered product scene. The stage (plane 1) holds the
  workspace window (plane 2); the decision brief, insight chips and app tiles
  sit in front (plane 3, the far tiles smaller and slightly out of focus). The
  front plane drifts a few pixels, still under reduced motion and the Motion
  toggle. The scene reuses the page's illustrative example and says so.
- **Proof row**: the pilot facts, centered, split by hairlines.
- **Integrations**: a label pill, one line, and the stack as logo chips in a
  continuous horizontal scroll that fades out at both edges. Hover and a
  visible Pause button stop it; under reduced motion, the Motion toggle, or
  without JavaScript it is a static, centered row. The copies that close the
  loop are hidden from assistive tech, so screen readers hear one list.
- **Feature rows**: copy beside a stage, alternating sides. The product board
  rests on the stage and runs off its far edge. Rows replace the old tabs, so
  every view is visible without a click.
- **Dark chapters**: dark sheets with a fine 56px grid fading from the top. The
  problem chapter is a centered statement among the platforms that disagree,
  shown as glowing tiles at different depths (hidden below 1100px).
- **FAQ**: rounded rows, each with a round plus button that becomes a minus.
- **Request form** (`/contact`): one focused dark screen. A numbered prompt,
  three required fields (first name, work email, company) as large
  underlined inputs whose underline draws the gradient on focus, one action
  (Enter submits), then a confirmation step. The Turnstile check only shows
  itself when it needs the visitor. The honeypot, origin check, rate limit,
  Turnstile verification and server validation all stay.

Page compositions live in their own layers after `saas.css`: `css/home.css`
(home) and `css/request.css` (`/contact`).

## Reduced cognitive load

Headers are opaque (no see-through text behind the wordmark). The site's
Motion toggle and `prefers-reduced-motion` stop the gradient drift on every
page.

Hidden as redundant: chapter counters ("02 / 08") and act labels
("Act 1 · Problem"), the fixed chapter rail, tab and panel numbers, the rotated
"Sample" stamp (kept as a flat label). Display sizes are capped so a headline
never fills the viewport, and the dark chapter no longer forces a full-screen
height.
