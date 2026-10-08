# A & S Urbanseat — Design System

The reference every build prompt (02–34) reads for token names, values and usage rules. Written by Prompt 01 on 2026-10-07. Later prompts **append** sections (Prompt 06: "Primitives"; Prompt 29: "Voice and microcopy") and update a value here whenever they change it in the CSS.

- **Source of truth:** `src/theme/storefront-tokens.css`. If this document and the CSS disagree, the CSS wins; fix the document.
- **Mirrors:** `src/theme/colors.js` (storefront MUI palette) and `src/theme/tokens.js` (`TOKENS`, the JS mirror for framer-motion and inline styles).
- **Verification:** `node scripts/check-contrast.js` checks every pairing in section 14 and fails if `colors.js` or `tokens.js` drift from the CSS. Add your component-level pairs to it and re-run before you finish a prompt.

---

## 1. Purpose and how to look up a token

The storefront is a premium, editorial, warm-minimalist boutique: warm paper surfaces, near-black ink, a deep navy taken from the logo's chair and a caramel accent taken from its wordmark; Playfair Display for display type (with a true italic for accent words) and Inter for UI; hairlines, sharp radii, generous whitespace, slow and quiet motion. No gradients (one exception: the photo scrim), no glassmorphism, no neon, no purple.

> **"Primary" is the ink, not a hue.** `--sf-color-primary` is the ink: primary buttons are ink with paper text and turn navy on hover. `--sf-color-secondary` is the navy, `--sf-color-accent` is the caramel. The boilerplate used `primary` for a purple; every consumer of `--sf-color-primary` now renders ink (light) or warm off-white (dark).

**Naming.**

| Prefix | Meaning | Mode-aware? |
|---|---|---|
| `--sf-color-*` | colour roles (page, surface, text, primary, accent, semantic…) | yes: light on `:root`, dark on `body.dark` |
| `--sf-color-surface-dark`, `--sf-color-on-dark*`, `--sf-color-scrim`, `--sf-gradient-scrim` | always-dark surfaces (footer, hero, navy bands) | no, identical in both modes |
| `--sf-brand-*` | the four fixed brand colours | no |
| `--sf-font-*`, `--sf-text-*`, `--sf-leading-*`, `--sf-tracking-*`, `--sf-measure` | typography | no |
| `--sf-space-*`, `--sf-section-y`, `--sf-gutter`, `--sf-container*`, `--sf-tap-target` | spacing and layout | no |
| `--sf-radius-*`, `--sf-hairline`, `--sf-shadow-*` | shape and depth | shadows and hairline: yes |
| `--sf-ease-*`, `--sf-duration*`, `--sf-transition*`, `--sf-reveal-distance`, `--sf-stagger` | motion (collapse under reduced motion) | no |
| `--sf-z-*` | stacking | no |

**How to use.** CSS Modules: `color: var(--sf-color-text)`. JS (framer-motion, inline styles): `import { TOKENS } from "../../theme/tokens"`. MUI (only the header uses MUI on the storefront): `theme.palette.*`, built from `colors.js` in `ThemeContext`.

**How dark mode works.** `ThemeContext` toggles `body.dark` / `body.light` and persists the choice in `localStorage["theme"]`. Colour tokens are overridden in `body.dark`; everything else is mode-invariant. A custom property inherits its *computed* value, so any token that reads another colour token (aliases, `--sf-hairline`, `--sf-shadow-focus`, the flat gradients) is declared in the shared `:root, body.dark` block so it re-resolves in dark mode. If you add such a composite, put it there too.

**I need… → use…**

| Need | Token |
|---|---|
| page background | `--sf-color-bg` |
| card, drawer, menu, input background | `--sf-color-surface` |
| quiet panel, image placeholder, skeleton | `--sf-color-sand` |
| body text / secondary / helper text | `--sf-color-text` / `--sf-color-text-secondary` / `--sf-color-text-muted` |
| hairline rule or card outline | `--sf-hairline` (or `--sf-color-border`) |
| input, checkbox, select boundary | `--sf-color-border-strong` |
| primary button | bg `--sf-color-primary`, text `--sf-color-primary-contrast`, hover bg `--sf-color-primary-hover` |
| caramel text at small size (links, sale price, "Save ₹X") | `--sf-color-accent-text` |
| caramel at display size, icons, selected borders | `--sf-color-accent` |
| selected-state fill | `--sf-color-accent-soft` |
| focus | `box-shadow: var(--sf-shadow-focus)` |
| navy footer / band | `--sf-color-surface-dark` + `--sf-color-on-dark*` |
| form field on navy (footer newsletter) | fill `--sf-color-on-dark-soft`, boundary `--sf-color-on-dark-border-strong`, errors `--sf-color-on-dark-error` (section 18) |
| text over photography | `--sf-gradient-scrim` (or `--sf-color-scrim`) + `--sf-color-on-dark` |
| drawer / modal backdrop | `--sf-color-overlay` |

---

## 2. Sampled logo colours

Both PNGs were downloaded to a scratch folder outside the repository and their opaque pixels (alpha ≥ 250) sampled with Pillow, grouped by hue family and by region. Both are **1286 × 426 RGBA** (ratio 3.019 : 1).

| Element (light logo) | Sampled value | Notes |
|---|---|---|
| "A&S" lettering | `#1c1c1c` | one flat colour, 19,067 px; neutral (0 % saturation) |
| Tagline "Trusted Comfort for Every Home" | `#1e1e1e` | flat, 2,643 px |
| Chair silhouette | `#051a3f` median (`#041b40` most frequent) | 34,784 px, HSL 218° 85 % 13 %; 5th–95th percentile `#05132f`–`#09244c` |
| Chair inner shell | `#e2b380` (left, lightest) → `#ca9359` (right, darkest); median `#d4a06b` | a left-to-right caramel gradient |
| "Urbanseat" wordmark and the hairline under it | `#ddb185` | one flat colour, HSL 30° 56 % 69 % |
| **White logo** | `#ffffff` | one flat colour, 93,426 px; its semi-transparent edge pixels carry a faint tan fringe (median `#f2e2d2`) |

Differences from the brief's expectations, recorded as instructed: the lettering is `#1c1c1c` (expected ≈ `#181818`) and the white logo is pure `#ffffff` (expected `#f8f8f8`). Navy and caramel fall inside the expected ranges.

What the logo itself teaches the system: a high-contrast transitional serif ("A&S"), a widely tracked geometric sans (the wordmark and tagline) and a caramel hairline rule. The system reuses all three ideas: a serif display face, tracked uppercase eyebrows and hairline rules.

---

## 3. Palette

### 3.1 Brand constants (identical in both modes)

| Token | Value | Derived from | Use directly only for… |
|---|---|---|---|
| `--sf-brand-ink` | `#1c1a17` | lettering `#1c1c1c`, given a warm cast (HSL 36° 10 % 10 %) so it reads as ink beside paper and caramel and stays distinct from navy | fixed pairings, e.g. ink text on a paper button over a photo |
| `--sf-brand-navy` | `#0b1f3f` | chair `#051a3f`, a touch lighter and calmer (HSL 217° 70 % 15 %) so a large navy surface reads quiet rather than electric | — (use `--sf-color-surface-dark` / `--sf-color-secondary`) |
| `--sf-brand-caramel` | `#ddb185` | the wordmark, exact | decorative caramel rules (like the logo's own hairline); it is the accent on dark surfaces. **Never text on a light surface (1.84 : 1).** |
| `--sf-brand-paper` | `#faf7f2` | a warm off-white (HSL 38° 44 % 96 %) | fixed pairings, e.g. a paper button over a photo |

Everything else uses the role tokens below, so it flips with the theme.

### 3.2 Roles

Contrast is against the role's usual background, light / dark (full list in section 14).

| Role | Token | Light | Dark | Contrast |
|---|---|---|---|---|
| Page (paper) | `--sf-color-bg` | `#faf7f2` | `#0a1426` (navy-ink) | — |
| Surface (cards, drawers, menus, inputs) | `--sf-color-surface` | `#ffffff` | `#111d34` (lighter navy) | — |
| Sand (quiet panels, placeholders, skeletons) | `--sf-color-sand` | `#f1ebe1` | `rgba(243, 238, 230, 0.06)` | panel vs page 1.11 / 1.27 |
| Surface hover | `--sf-color-surface-hover` | `#f6f2ec` | `rgba(243, 238, 230, 0.08)` | — |
| Stone (hairlines; decorative) | `--sf-color-stone` | `#d9d0c3` | `rgba(243, 238, 230, 0.14)` | 1.43 / 1.44 vs page (ΔL\* 13.5 in light) |
| Control boundary | `--sf-color-border-strong` | `#8a8278` | `rgba(243, 238, 230, 0.4)` | 3.54 / 3.45 vs page (WCAG 1.4.11) |
| Text (ink) | `--sf-color-text` | `#1c1a17` | `#f3eee6` (warm off-white) | 16.25 / 15.94 on page |
| Secondary text | `--sf-color-text-secondary` | `#4d463e` | `#cfc6b9` | 8.69 / 10.90 on page |
| Muted text (the lightest text tone) | `--sf-color-text-muted` | `#686158` | `#a39a8e` | 5.71 / 6.63 on page, 5.15 / 5.21 on sand |
| Primary (ink) | `--sf-color-primary` | `#1c1a17` | `#f3eee6` | — |
| Primary hover (navy) | `--sf-color-primary-hover` | `#0b1f3f` | `#ffffff` | — |
| Text on primary | `--sf-color-primary-contrast` | `#faf7f2` | `#0a1426` | 16.25 / 15.94; on hover 15.33 / 18.41 |
| Primary soft (ink tint: ghost hover, subtle fills) | `--sf-color-primary-soft` | `rgba(28, 26, 23, 0.06)` | `rgba(243, 238, 230, 0.08)` | ink on it 14.44 / 13.24 |
| Secondary (navy surface) | `--sf-color-secondary` | `#0b1f3f` | `#0b1f3f` | — |
| Text on secondary | `--sf-color-secondary-contrast` | `#faf7f2` | `#faf7f2` | 15.33 |
| Accent (caramel) | `--sf-color-accent` | `#ae773d` | `#ddb185` | 3.57 / 9.38 on page, 3.22 / 7.37 on sand |
| Accent text (small caramel text) | `--sf-color-accent-text` | `#8a5d2e` | `#e8c9a2` | 5.33 / 11.66 on page, 4.81 / 9.16 on sand |
| Accent soft (selected-state fill) | `--sf-color-accent-soft` | `rgba(174, 119, 61, 0.12)` | `rgba(221, 177, 133, 0.14)` | accent-text on it 4.69 / 9.07 |
| Text on a solid accent | `--sf-color-accent-contrast` | `#1c1a17` | `#0a1426` | 4.55 / 9.38 |
| Focus ring | `--sf-color-focus` (= accent) + `--sf-color-focus-halo` | `#ae773d` + `rgba(174, 119, 61, 0.45)` | `#ddb185` + `rgba(221, 177, 133, 0.45)` | ring 3.57 / 9.38 on page, 3.22 / 7.37 on sand |
| Overlay (drawer and modal backdrop) | `--sf-color-overlay` | `rgba(11, 31, 63, 0.6)` (navy) | `rgba(3, 8, 18, 0.7)` | — |

Why the light accent is `#ae773d` and not the logo's `#ddb185`: no caramel from the logo reaches 3 : 1 on a warm paper (the darkest shell stop `#ca9359` measures 2.6 : 1, the wordmark 1.84 : 1). The accent keeps the logo's hue (31°) and is deepened just enough to clear 3 : 1 on paper, surface and sand, so it can carry display-size italic words, icons, selected borders and the focus ring. `--sf-color-accent-text` (HSL 31° 50 % 36 %) clears 4.5 : 1 for small text. In dark mode the raw logo caramel is the accent (9.38 : 1 on the navy-ink page).

### 3.3 Always-dark surfaces (identical in both modes)

| Token | Value | Contrast on `--sf-color-surface-dark` |
|---|---|---|
| `--sf-color-surface-dark` | `#0b1f3f` (navy) | — |
| `--sf-color-on-dark` | `#faf7f2` | 15.33 |
| `--sf-color-on-dark-muted` | `rgba(250, 247, 242, 0.72)` | 8.46 |
| `--sf-color-on-dark-border` | `rgba(250, 247, 242, 0.16)` | hairline, decorative |
| `--sf-color-on-dark-accent` | `#ddb185` | 8.35 (focus ring on navy too) |
| `--sf-color-on-dark-soft` | `rgba(250, 247, 242, 0.08)` | field fill and subtle tint on navy; on-dark text on it 12.35, on-dark muted 7.18 |
| `--sf-color-on-dark-border-strong` | `rgba(250, 247, 242, 0.4)` | 3.53 (control boundary on navy, WCAG 1.4.11) |
| `--sf-color-on-dark-error` | `#ec9483` | 7.12 (error text and invalid border on navy; the light-mode brick `--sf-color-error` measures 2.45 there) |
| `--sf-color-scrim` | `rgba(11, 31, 63, 0.7)` | — |
| `--sf-gradient-scrim` | `linear-gradient(to top right, rgba(11, 31, 63, 0.72) 0%, rgba(11, 31, 63, 0.7) 35%, rgba(11, 31, 63, 0) 80%)` | — |

- Use them for the footer (always dark, also in dark mode), the hero, and navy bands (`tone="navy"`). Always pair them with the white logo.
- Text on navy uses `--sf-color-on-dark` (the brand paper rather than the logo's pure white: the warm cast avoids glare and lets the white logo stay the brightest element).
- **Photography:** text must sit where the scrim is at least `--sf-color-scrim` strength (the bottom-left 35 % of `--sf-gradient-scrim`). Measured over a pure-white photograph: on-dark text 5.77 : 1, the caramel accent 3.14 : 1 (display size only), the focus ring 3.14 : 1. Small text on photography (eyebrows, support lines) uses `--sf-color-on-dark` at full strength; the muted tone drops to 3.88 : 1 there. The scrim gradient is the only gradient the system allows.
- `--sf-gradient-scrim` suits photography whose text fits its bottom-left 35 % (a tile with a short caption). A copy block too large for that zone gets a scrim built from `--sf-color-scrim` around the copy itself, as the home hero does (section 20.2).

### 3.4 Legacy names (kept so existing components keep working)

| Legacy token | Now resolves to | Prefer |
|---|---|---|
| `--sf-color-primary-dark` | `--sf-color-primary-hover` | `--sf-color-primary-hover` |
| `--sf-color-primary-light` | `--sf-color-text-secondary` | `--sf-color-text-secondary` |
| `--sf-color-surface-2` | `--sf-color-sand` | `--sf-color-sand` |
| `--sf-color-border` | `--sf-color-stone` | `--sf-hairline` / `--sf-color-border` |
| `--sf-color-danger`, `--sf-color-danger-bg` | `--sf-color-error`, `--sf-color-error-bg` | the `error` names |
| `--sf-color-price` / `--sf-color-compare` | `--sf-color-text` / `--sf-color-text-muted` | — |
| `--sf-color-discount` / `--sf-color-sale` | `--sf-color-accent-text` | — |
| `--sf-color-badge-bg` | `--sf-color-sand` | — |
| `--sf-gradient-primary`, `--sf-gradient-primary-hover` | **flat** `linear-gradient(primary, primary)` / `(primary-hover, primary-hover)` | `background: var(--sf-color-primary)` |
| `--sf-font-family` | `--sf-font-sans` | `--sf-font-sans` |
| `--sf-transition-fast` / `--sf-transition` / `--sf-transition-slow` | `duration + --sf-ease-out` (160 / 320 / 640 ms) | — |

---

## 4. Semantic and commerce tokens

| Role | Token | Light | Dark | Text on page | Text on its tint |
|---|---|---|---|---|---|
| Success (deep green) | `--sf-color-success` / `-bg` | `#2f6b46` / `#e6efe8` | `#7fbf95` / `rgba(127, 191, 149, 0.16)` | 5.93 / 8.58 | 5.40 / 5.77 |
| Warning (warm amber-brown) | `--sf-color-warning` / `-bg` | `#975f05` / `#f8eedc` | `#e9a94f` / `rgba(233, 169, 79, 0.16)` | 4.97 / 8.99 | 4.62 / 6.10 |
| Error (brick) | `--sf-color-error` / `-bg` | `#a2382b` / `#f7e5e1` | `#ec9483` / `rgba(236, 148, 131, 0.16)` | 6.26 / 8.00 | 5.50 / 5.55 |
| Info (slate blue) | `--sf-color-info` / `-bg` | `#3c5a80` / `#e6ecf3` | `#9db4d6` / `rgba(157, 180, 214, 0.16)` | 6.62 / 8.71 | 5.95 / 5.81 |

| Commerce role | Token | Light | Dark | Notes |
|---|---|---|---|---|
| Price | `--sf-color-price` | = text | = text | sans; tabular figures recommended (`font-variant-numeric: tabular-nums`) |
| Compare-at price | `--sf-color-compare` | = muted | = muted | struck through; 6.11 / 6.06 on surface |
| Sale price | `--sf-color-sale` | = accent-text | = accent-text | **never a loud red** |
| Discount ("Save 12%", "Save ₹X", "% off") | `--sf-color-discount` | = accent-text | = accent-text | **decision: discount uses accent-text, not success**, so savings and sale read as one caramel voice |
| Discount chip | `--sf-color-discount-bg` | `#f3e9dc` | `rgba(232, 201, 162, 0.14)` | discount text on it 4.75 / 7.76 |
| Rating star | `--sf-color-star` | `#b08309` | `#e5c055` | gold, distinct from caramel; a graphic, 3.44 / 9.61 on surface. On sand, show stars in ink |
| Neutral chip | `--sf-color-badge-bg` | = sand | = sand | — |

Rules:
- Prefer **soft** status badges (the `-bg` tint behind the matching text colour); they pass in both modes.
- A **solid** semantic or primary fill takes `--sf-color-primary-contrast` text (paper in light, navy-ink in dark), never `#fff`: the dark-mode semantic colours are light, so white text on them fails. Prompt 01 fixed the six existing occurrences this way.

---

## 5. Typography

### 5.1 Families

| Role | Family | Token | Why |
|---|---|---|---|
| Display | **Playfair Display** | `--sf-font-display`: `"Playfair Display", Georgia, "Times New Roman", serif` | The logo's "A&S" is a high-contrast transitional serif with ball terminals; Playfair Display shares that DNA, so headlines sit naturally beside the logo. It has a true italic with cursive forms for accent words, and ships as a variable font (one file per style). |
| UI and body | **Inter** | `--sf-font-sans`: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif` | Highly legible at UI sizes, has tabular figures for prices, and was already loaded. The admin hardcodes Inter, and `<CssBaseline />` couples the admin's `<body>` to the storefront theme, so Inter is the only UI sans with zero admin risk. The storefront looks different through the serif display scale, palette, hairlines and layout, not through a different UI sans. |

### 5.2 Files loaded

- One stylesheet, linked in `public/index.html` with `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com` (the duplicate CSS `@import` and the unused Material Icons stylesheet were removed):
  `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap`
- `display=swap` on every face. Google serves one variable `woff2` per face per unicode subset and the browser downloads only the subsets a page uses. Measured on a cold load: Inter latin + latin-ext (the ₹ sign lives in latin-ext) + Playfair roman latin (+ latin-ext when a serif line contains ₹) + Playfair italic latin = **4–5 files**. The hard ceiling for Latin-script content is 6 (3 faces × 2 subsets). Playfair downloads only on pages that render it.
- **Weights.** Playfair Display: 400, 400 italic, 500. Inter on the storefront: 400, 500, 600 (`--sf-font-bold` is 600). Inter 300 and 700 stay loaded **for the admin**: 300 renders SweetAlert's validation message (Admin → Returns), 700 the admin headings. All weights come from the same variable file, so they cost nothing extra. Storefront CSS must not use 300, 800 or 900; 800/900 in un-migrated modules currently render as 700.

### 5.3 Scale

Display sizes are fluid between 360 px and 1440 px viewports (`clamp()` with a `rem` base, so they also follow the user's font size).

| Token | Size (360 → 768 → 1024 → 1440 px) | Line height | Tracking | Weight | Use |
|---|---|---|---|---|---|
| `--sf-text-display-xl` | 56 → 68 → 76 → 88 px | `--sf-leading-display` 1.04 | `--sf-tracking-display` −0.015em | 400 | hero headline |
| `--sf-text-display-lg` | 40 → 46 → 50 → 56 px | 1.04 | −0.015em | 400 | section titles |
| `--sf-text-display-md` | 28 → 31 → 33 → 36 px | `--sf-leading-heading` 1.1 | −0.015em | 400 | sub-sections, editorial blocks, `h1` on content pages |
| `--sf-text-display-sm` | 22 → 23.5 → 24.5 → 26 px | 1.1 | −0.015em | 500 | small serif headings, product names in feature blocks |

| UI token | Size | Typical use |
|---|---|---|
| `--sf-text-2xs` | 11px (0.6875rem) | badges |
| `--sf-text-xs` | 12px | captions, legal |
| `--sf-text-eyebrow` | 12px | eyebrows (see 5.5) |
| `--sf-text-sm` | 14px | UI labels, buttons, meta |
| `--sf-text-base` | 16px | body copy (never smaller for paragraphs) |
| `--sf-text-md` | 17px | intros and leads |
| `--sf-text-lg` / `-xl` / `-2xl` / `-3xl` | 20 / 24 / 30 / 36px | sans UI headings and prices |

Line heights: `--sf-leading-tight` 1.25 · `--sf-leading-normal` 1.5 · `--sf-leading-body` 1.6 (body copy, 16px) · `--sf-leading-relaxed` 1.7 (long prose). Measure: `--sf-measure` 66ch. Weights: `--sf-font-normal` 400 · `--sf-font-medium` 500 · `--sf-font-semibold` 600 · `--sf-font-bold` 600. Tracking: `--sf-tracking-display` −0.015em · `--sf-tracking-eyebrow` 0.16em · `--sf-tracking-button` 0.02em.

### 5.4 Usage

- Page and section headings use the display serif (`font-family: var(--sf-font-display)`) at the display scale. UI headings (drawer titles, form legends, filter groups) stay in the sans at 600.
- Body copy: `--sf-text-base` / `--sf-leading-body`, `max-width: var(--sf-measure)`. The page-level default line-height is still 1.5 (unchanged by Prompt 01 so existing layouts don't shift); primitives and migrated components set `--sf-leading-body` explicitly.
- Prices and numbers: sans, `font-variant-numeric: tabular-nums` in tables and summaries.
- MUI (the header): `h1`–`h4` map to the display scale in Playfair; `h5`/`h6` are sans 600; `overline` is the eyebrow; `button` is sans 500 with no text-transform.
- Give display headings `overflow-wrap: break-word` so a long word can never force horizontal scroll at 360 px (display-xl is 56px there).

### 5.5 The accent-italic rule

One word in a display headline may be the accent, marked in copy as `*word*` and rendered as `<em>` (Prompt 06's `renderAccent`):

```css
.headline em {
  font-family: var(--sf-font-display);
  font-style: italic;            /* the true Playfair italic, weight 400 */
  font-weight: var(--sf-font-normal);
  color: var(--sf-color-accent);
  text-decoration: none;         /* never underlined */
}
```

- The accent colour applies only at **display-md and larger** (≥ 28px, i.e. WCAG large text, where 3 : 1 suffices; the accent measures 3.57 on paper and 3.22 on sand). In `display-sm` (22–26px) and below, the `<em>` stays italic but uses `--sf-color-accent-text` (or simply inherits the ink).
- On always-dark surfaces and photography use `--sf-color-on-dark-accent`.
- One accent word per headline; never the whole line; never in body copy.

### 5.6 Eyebrow

Sans, `--sf-text-eyebrow` (12px), weight 500, `text-transform: uppercase`, `letter-spacing: var(--sf-tracking-eyebrow)` (0.16em), colour `--sf-color-text-muted`. A coloured eyebrow uses `--sf-color-accent-text`, never the raw accent. On navy use `--sf-color-on-dark-muted`; on photography `--sf-color-on-dark`. An optional short caramel rule may precede it (24px × 1px, `--sf-color-accent` or `--sf-brand-caramel`; decorative).

---

## 6. Spacing, containers, radius, hairlines

**Spacing** (4px base): `--sf-space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-8` 32 · `-10` 40 · `-12` 48 · `-16` 64 · `-20` 80 · `-24` 96 · `-32` 128 (px).

| Token | Value | Measured (360 / 768 / 1024 / 1440) | Use |
|---|---|---|---|
| `--sf-section-y` | `clamp(64px, 9vw, 128px)` | 64 / 69 / 92 / 128px | vertical padding of every page section |
| `--sf-gutter` | `clamp(16px, 4vw, 48px)` | 16 / 31 / 41 / 48px | page side padding |
| `--sf-header-height` | runtime (written on `<html>` by the header; `0px` default) | 60 / 64 / 212 / 168px at rest; 156 at 1024 and 112 from 1280 when compact | sticky offsets below the header: `top: calc(var(--sf-header-height) + 24px)` (section 17) |

**Containers:** `--sf-container-max` 1280px (content; `--sf-container` is an alias) · `--sf-container-wide` 1440px (editorial and full-bleed inner) · `--sf-container-narrow` 720px (prose and forms). Pattern: `max-width: var(--sf-container-max); margin-inline: auto; padding-inline: var(--sf-gutter);`.

**Radius** (editorial = sharp; nothing larger exists): `--sf-radius-sm` 2px (buttons, inputs, cards, menus: the default) · `--sf-radius-md` 4px (sheets, modals, tooltips) · `--sf-radius-lg` 8px (large media frames) · `--sf-radius-xl` 12px (rare) · `--sf-radius-pill` 999px (chips, counters, avatars).

**Hairlines:** `--sf-hairline` = `1px solid var(--sf-color-border)`. This is the primary structural device: between sections, under headers, around tables and on card hover. Stone is decorative (1.43 : 1); an interactive boundary uses `--sf-color-border-strong`.

**Tap target:** `--sf-tap-target` 44px minimum on every control.

---

## 7. Shadows

| Token | Light (navy-tinted, soft) | Dark | Use |
|---|---|---|---|
| `--sf-shadow-xs` | `0 1px 2px rgba(11, 31, 63, 0.06)` | `0 1px 2px rgba(0, 0, 0, 0.4)` | hairline-level lift (sticky bars) |
| `--sf-shadow-sm` | `0 2px 8px rgba(11, 31, 63, 0.07)` | `0 2px 8px rgba(0, 0, 0, 0.45)` | menus, popovers, floating buttons |
| `--sf-shadow-md` | `0 8px 24px rgba(11, 31, 63, 0.1)` | `0 8px 24px rgba(0, 0, 0, 0.5)` | mega-menu panel, toasts |
| `--sf-shadow-lg` | `0 20px 48px rgba(11, 31, 63, 0.14)` | `0 20px 48px rgba(0, 0, 0, 0.6)` | drawers, modals |
| `--sf-shadow-focus` | `0 0 0 2px var(--sf-color-focus), 0 0 0 5px var(--sf-color-focus-halo)` | same composite, caramel | keyboard focus |

Cards carry **no** shadow by default (a hairline on hover instead). No coloured glows, no neon. The focus ring is a 2px solid caramel ring (3 : 1 on paper, sand, surface and navy) inside the soft 45 % accent halo the brief asked for: the halo alone would measure ≈ 1.7 : 1, so it can't be the only indicator. Where `box-shadow` is clipped, use `outline: 2px solid var(--sf-color-focus); outline-offset: 2px`.

---

## 8. Motion

| Token | Value | Use |
|---|---|---|
| `--sf-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | entrances, reveals, hovers |
| `--sf-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | state changes (open/close, toggles) |
| `--sf-duration-fast` | 160ms | hover, press, colour changes |
| `--sf-duration` | 320ms | state changes, drawers, menus |
| `--sf-duration-slow` | 640ms | image crossfades |
| `--sf-duration-reveal` | 900ms | scroll reveals, hero entrance |
| `--sf-reveal-distance` | 20px | reveal rise |
| `--sf-stagger` | 90ms | delay between items in a sequence (cap groups at 8 items) |
| `--sf-transition-fast` / `--sf-transition` / `--sf-transition-slow` | `160ms` / `320ms` / `640ms` + `--sf-ease-out` | shorthand: `transition: color var(--sf-transition-fast)` |

**Reduced motion.** Under `@media (prefers-reduced-motion: reduce)` every duration becomes `0.01ms`, `--sf-stagger` 0ms and `--sf-reveal-distance` 0, so CSS transitions built from tokens collapse on their own. framer-motion: Prompt 06 wraps the storefront in `<MotionConfig reducedMotion="user">`; components also check `useReducedMotion()` for transforms (parallax, scale). Custom `@keyframes` must be disabled under the media query.

**Language.** Subtle, slow, elegant: fades and short rises, image scale 1.03 on hover, colour-only button hovers, press scale 0.99. No springs, bounces, `translateY` lifts on cards, pulsing or attention-seeking loops. Animate only `opacity` and `transform`.

**Standard reveal recipe (framer-motion).** JS reads the mirror in `TOKENS.motion` (seconds and cubic-bezier arrays):

```jsx
import { motion, useReducedMotion } from "framer-motion";
import { TOKENS } from "../../theme/tokens";

const { duration, easeOut, revealDistance } = TOKENS.motion;
const reduce = useReducedMotion();

<motion.div
  initial={{ opacity: 0, y: reduce ? 0 : revealDistance }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-10% 0px" }}
  transition={{ duration: duration.reveal, ease: easeOut }}
/>
```

Stagger children with `staggerChildren: TOKENS.motion.stagger` (0.09s).

---

## 9. z-index

| Token | Value | Layer |
|---|---|---|
| `--sf-z-sticky` | 40 | sticky in-page elements (the listing's filter rail and phone toolbar, the product page's in-page nav, §27.2) |
| `--sf-z-header` | 50 | site header |
| `--sf-z-megamenu` | 55 | mega-menu flyout (desktop) |
| `--sf-z-bottomnav` | 58 | mobile bottom nav (≤ 768px; Prompt 09): above content and the header, below the sticky bar, every drawer and every modal |
| `--sf-z-stickybar` | 60 | mobile sticky Add-to-Cart bar (`AddToCartBar`, up to 768px; Prompt 16): above the bottom nav, which it covers while shown, below every drawer and modal (section 26.6) |
| `--sf-z-overlay` | 1000 | drawer and sheet backdrops, the drawers themselves |
| `--sf-z-modal` | 1100 | modals (auth) |
| `--sf-z-search` | 1400 | the full-screen search overlay (Prompt 15): above every drawer and modal, including the cart drawer's legacy 1200/1300 still in the code (section 25.1) |
| (SweetAlert2) | 2000 | set in `index.css`; above everything, including MUI dialogs (1300) |

`--sf-z-bottomnav` was defined by Prompt 09 (58, as suggested), `--sf-z-search` by Prompt 15 (1400, section 25.1). The sidebar menu and the bottom sheet use `--sf-z-overlay` for their backdrops and panels.

---

## 10. Logo usage and `BrandLogo`

**Assets** (`LOGO_URLS` in `src/utils/constants.js`; 1286 × 426 PNG, transparent):
- `LOGO_URLS.light`: `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo.png`
- `LOGO_URLS.white`: `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo-white.png`

**Rules**
- The light logo goes on paper, surface and sand. The white logo goes on navy, on dark-mode surfaces, on image scrims and on the dark footer. Never recolour, filter or tint the PNGs; never place the light logo on a dark surface.
- Minimum rendered height: **28px** (mobile header), **40–48px** (desktop header), **56px** (auth modal, invoice).
- Clear space on all sides equal to the cap height of the "A": 34 % of the rendered logo height (≈ 10px at 28px, 14px at 40px, 19px at 56px).
- The artwork already contains "Trusted Comfort for Every Home". Never repeat that line as text beside the logo.

**`<BrandLogo />`** (`src/components/ui/BrandLogo.js`) always renders `alt="A & S Urbanseat"`, explicit `width`/`height` from the 3.019 : 1 ratio (no layout shift) and `decoding="async"`.

| Prop | Type / default | Behaviour |
|---|---|---|
| `variant` | `"auto"` \| `"light"` \| `"white"`, default `"auto"` | `"light"` = full-colour artwork, `"white"` = one-colour artwork. `"auto"` follows `onDark`, else the theme (dark mode → white). |
| `onDark` | boolean, optional | auto mode only: `true` when the logo sits on a dark surface whatever the theme (footer, scrim), `false` on a light one. |
| `height` | number (px), default 40 | width is derived: 28 → 85, 40 → 121, 48 → 145, 56 → 169. |
| `priority` | boolean, default `false` | `true` (the header logo only): `loading="eager"` + `fetchpriority="high"`. Otherwise `loading="lazy"`. |
| `className` | string | appended to the module class (`display: block; max-width: 100%; height: auto`). |
| other props | — | passed to the `<img>` (e.g. `style`, `data-*`). |

```jsx
<BrandLogo priority height={44} />                 {/* header: follows the theme */}
<BrandLogo variant="white" height={40} />          {/* footer: always navy */}
<BrandLogo onDark height={48} />                   {/* over a photo scrim */}
```

It also renders outside `ThemeContextProvider` (it falls back to the `body.dark` class), so an error fallback can use it. The admin never imports it (Prompt 33 handles the admin's logos).

---

## 11. Image placeholder tones

| Where | Background | Text | Contrast |
|---|---|---|---|
| `PLACEHOLDER_IMG` (inline SVG data URI in `src/utils/helpers.js`, label "Image coming soon") | `#f1ebe1` (sand) | `#686158` (muted) | 5.15 : 1 |
| Seeded placeholder URLs | `f1ebe1` | `686158` | same |

- These two hex values are the **only colour literals permitted outside the token files** (a data URI cannot read CSS variables). They are the light-mode tokens, so placeholders stay light in dark mode too, which is accepted.
- Seed pattern: `https://placehold.co/{w}x{h}/f1ebe1/686158?text=Name+With+Plus+Signs`. Sizes: products 1200x1500 (4:5 portrait), categories 1600x1000, hero 2400x1350.
- While an image loads, its slot shows `--sf-color-sand` and reserves its box with `aspect-ratio`.

---

## 12. Values for files that cannot read tokens

Copy these literally. Prompt 34 verifies they still match.

| Use | Value |
|---|---|
| `<meta name="theme-color">` (light) / `media="(prefers-color-scheme: dark)"` | `#faf7f2` / `#0a1426` |
| `manifest.json` `background_color` / `theme_color` | `#faf7f2` / `#faf7f2` |
| Pre-paint script `document.body.style.backgroundColor` (= `colors.js` `background.default`) | light `#faf7f2`, dark `#0a1426` |
| Loading screen | light: `#faf7f2` + light logo + progress hairline `#ae773d`; dark: `#0a1426` + white logo + hairline `#ddb185` |
| `db.json` `banners[].gradient` (must stay a string) | `#0b1f3f` |
| `ErrorBoundary` fallbacks | `var(--sf-color-bg, #faf7f2)`, `var(--sf-color-text, #1c1a17)`, `var(--sf-font-display, Georgia, serif)` |

---

## 13. Usage rules

**Tokens only.** No hex, `rgb()` or font-family literals in components. Allowed exceptions: the two `PLACEHOLDER_IMG` values, `var(--token, fallback)` in `ErrorBoundary`, glyph SVGs drawn with `currentColor`, and the static files in section 12.

**Buttons.**
- Primary: ink background (`--sf-color-primary`), paper text (`--sf-color-primary-contrast`), hover `--sf-color-primary-hover` (navy; white in dark mode).
- Ghost: transparent with a 1px `--sf-color-primary` border; hover `--sf-color-primary-soft`.
- On navy or photography: brand paper background with brand ink text (`--sf-brand-paper` / `--sf-brand-ink`).
- Text link: ink (or accent-text) with an underline in `--sf-color-accent`.
- All buttons: 44px minimum, radius sm, sans 14px medium, tracking 0.02em; colour-only hover, press scale 0.99. Never a gradient or a lift.

**Links.** Body links are `--sf-color-accent-text` or ink with a 1px `--sf-color-accent` underline (`text-underline-offset: 0.2em`); hover thickens or reveals the underline. Never raw `--sf-color-accent` or `--sf-brand-caramel` for small text on a light surface.

**Inputs.** 44px tall, 1px `--sf-color-border-strong` boundary, radius sm, surface background, 15–16px text. Focus: 1px `--sf-color-accent` border plus `--sf-shadow-focus`. Errors: `--sf-color-error` border and message (with an icon, never colour alone). Placeholder text: `--sf-color-text-muted`. Labels sit above the field and stay visible.

**Cards.** Surface or transparent on the page, no border and no shadow by default; a hairline (`--sf-hairline`) on hover. Media slots use sand. Radius sm.

**Panels and sections.** Quiet panels are sand with no shadow. Every page section uses `padding-block: var(--sf-section-y)`. Separate sections with hairlines or whitespace rather than coloured bands (at most one sand band per page; navy bands use the always-dark tokens).

**Focus.** Every interactive element gets a visible `:focus-visible` style from `--sf-shadow-focus` (or the outline variant). Never `outline: none` without a replacement.

**Dark mode.** Never hand-pick light/dark pairs; the tokens flip. Always-dark surfaces use `--sf-color-surface-dark` + `--sf-color-on-dark*` in both modes. Sand and stone are translucent in dark mode, so they sit correctly on any dark surface.

**Admin coupling. Never break these.**
1. Scope every new global rule with `body:not(.admin-area)` or `.App`.
2. In `App.css`, never edit, re-scope, reorder or delete the existing `::-webkit-scrollbar*`, `body.light …`, `body.dark …` or `body.admin-area …` rules. Append storefront rules after them, scoped `body:not(.admin-area)`, as Prompt 01 did for scrollbars.
3. `<CssBaseline />` is built from the storefront MUI theme but also styles the admin's `<body>`. `buildStorefrontTheme` in `ThemeContext.js` pins the `MuiCssBaseline` `body` rule to its pre-rebrand values (MUI's default body1 in Inter plus `BASELINE_BODY` from `colors.js`). **Keep that override when you edit the storefront MUI theme** (Prompt 06). Without it, admin page titles change colour and admin line-heights shift (verified: 20 of 24 admin screenshots changed).
4. Keep Inter 300–700 in the Google Fonts URL and the `theme` localStorage key with its `"light"`/`"dark"` values.
5. `BASELINE_BODY` is not a storefront colour; components never use it.

---

## 14. Contrast results

Output of `node scripts/check-contrast.js --markdown` (WCAG 2.2: 4.5 : 1 text, 3 : 1 display text ≥ 24px and non-text UI; translucent layers are composited onto the background they sit on; dark-mode sand is measured over the dark surface):

| Pairing | Light | Dark | Min |
|---|---|---|---|
| Text (ink) on page (paper) — brief: >= 12:1 | 16.25 ✓ | 15.94 ✓ | 12:1 |
| Text on surface | 17.36 ✓ | 14.56 ✓ | 4.5:1 |
| Text on sand | 14.64 ✓ | 12.52 ✓ | 4.5:1 |
| Secondary text on page | 8.69 ✓ | 10.90 ✓ | 4.5:1 |
| Secondary text on surface | 9.29 ✓ | 9.95 ✓ | 4.5:1 |
| Secondary text on sand | 7.83 ✓ | 8.56 ✓ | 4.5:1 |
| Muted text on page | 5.71 ✓ | 6.63 ✓ | 4.5:1 |
| Muted text on surface | 6.11 ✓ | 6.06 ✓ | 4.5:1 |
| Muted text on sand | 5.15 ✓ | 5.21 ✓ | 4.5:1 |
| Accent-text (links, sale) on page | 5.33 ✓ | 11.66 ✓ | 4.5:1 |
| Accent-text on surface | 5.70 ✓ | 10.65 ✓ | 4.5:1 |
| Accent-text on sand | 4.81 ✓ | 9.16 ✓ | 4.5:1 |
| Accent-text on accent-soft (selected) | 4.69 ✓ | 9.07 ✓ | 4.5:1 |
| Accent (display italic >= 24px, icons) on page | 3.57 ✓ | 9.38 ✓ | 3:1 |
| Accent on surface | 3.81 ✓ | 8.57 ✓ | 3:1 |
| Accent on sand | 3.22 ✓ | 7.37 ✓ | 3:1 |
| Text on solid accent (accent-contrast) | 4.55 ✓ | 9.38 ✓ | 4.5:1 |
| Focus ring on page | 3.57 ✓ | 9.38 ✓ | 3:1 |
| Focus ring on surface | 3.81 ✓ | 8.57 ✓ | 3:1 |
| Focus ring on sand | 3.22 ✓ | 7.37 ✓ | 3:1 |
| Control border (border-strong) on page | 3.54 ✓ | 3.45 ✓ | 3:1 |
| Control border on surface | 3.79 ✓ | 3.41 ✓ | 3:1 |
| Primary button text (primary-contrast on primary) | 16.25 ✓ | 15.94 ✓ | 4.5:1 |
| Primary button hover (primary-contrast on primary-hover) | 15.33 ✓ | 18.41 ✓ | 4.5:1 |
| Ink on primary-soft (ghost hover) | 14.44 ✓ | 13.24 ✓ | 4.5:1 |
| Secondary (navy) contrast text | 15.33 ✓ | 15.33 ✓ | 4.5:1 |
| Price on surface | 17.36 ✓ | 14.56 ✓ | 4.5:1 |
| Compare-at price on surface | 6.11 ✓ | 6.06 ✓ | 4.5:1 |
| Sale / discount on surface | 5.70 ✓ | 10.65 ✓ | 4.5:1 |
| Discount on discount-bg | 4.75 ✓ | 7.76 ✓ | 4.5:1 |
| Rating star on surface (graphic) | 3.44 ✓ | 9.61 ✓ | 3:1 |
| Rating star on page (graphic) | 3.22 ✓ | 10.52 ✓ | 3:1 |
| Success text on page | 5.93 ✓ | 8.58 ✓ | 4.5:1 |
| Success on success-bg | 5.40 ✓ | 5.77 ✓ | 4.5:1 |
| Warning text on page | 4.97 ✓ | 8.99 ✓ | 4.5:1 |
| Warning on warning-bg | 4.62 ✓ | 6.10 ✓ | 4.5:1 |
| Error text on page | 6.26 ✓ | 8.00 ✓ | 4.5:1 |
| Error on error-bg | 5.50 ✓ | 5.55 ✓ | 4.5:1 |
| Info text on page | 6.62 ✓ | 8.71 ✓ | 4.5:1 |
| Info on info-bg | 5.95 ✓ | 5.81 ✓ | 4.5:1 |
| Badge text on solid error fill (primary-contrast) | 6.26 ✓ | 8.00 ✓ | 4.5:1 |
| Badge text on solid success fill (primary-contrast) | 5.93 ✓ | 8.58 ✓ | 4.5:1 |
| On-dark text on navy surface (both modes) | 15.33 ✓ | 15.33 ✓ | 4.5:1 |
| On-dark muted (translucent) on navy (both modes) | 8.46 ✓ | 8.46 ✓ | 4.5:1 |
| On-dark accent (caramel) on navy (both modes) | 8.35 ✓ | 8.35 ✓ | 4.5:1 |
| Focus ring (on-dark accent) on navy (both modes) | 8.35 ✓ | 8.35 ✓ | 3:1 |
| Paper button text (brand ink on brand paper) (both modes) | 16.25 ✓ | 16.25 ✓ | 4.5:1 |
| Hero: on-dark text on scrim over white photo (both modes) | 5.77 ✓ | 5.77 ✓ | 4.5:1 |
| Hero: caramel accent (display) on scrim over white photo (both modes) | 3.14 ✓ | 3.14 ✓ | 3:1 |
| Hero: focus ring on scrim over white photo (both modes) | 3.14 ✓ | 3.14 ✓ | 3:1 |
| Placeholder image text (muted on sand) | 5.15 ✓ | n/a | 4.5:1 |
| Hairline (stone) vs page | 1.43 | 1.44 | info |
| Hairline vs surface | 1.53 | 1.48 | info |
| Sand panel vs page | 1.11 | 1.27 | info |
| Brand caramel vs paper (decorative only, never text) | 1.84 | 1.84 | info |
| Hero: on-dark muted on scrim over white photo (not for text) | 3.88 | 3.88 | info |

Mirror check: colors.js and tokens.js match storefront-tokens.css ✓ · Contrast: every pairing meets its minimum ✓

---

## 15. Checklist for later prompts

- [ ] Read `00_INDEX.md`, `BUILD_LOG.md` and this document before editing.
- [ ] Use tokens only (section 13). Grep your files for `#[0-9a-f]{3,8}`, `rgb(`, `font-family:` before you finish; only the listed exceptions may remain.
- [ ] Primary is ink; caramel text at small sizes is `--sf-color-accent-text`; accent italics only at display-md and up.
- [ ] Display headings in `--sf-font-display` on the display scale; UI in `--sf-font-sans` at 400/500/600 only.
- [ ] Sections use `--sf-section-y`, containers `--sf-container-*` with `--sf-gutter`, separations `--sf-hairline`, radii from the scale.
- [ ] Every control is ≥ 44px and shows `--sf-shadow-focus` on `:focus-visible`, in both modes, including on sand, navy and photography.
- [ ] Logos only through `<BrandLogo />` with the right variant for the background.
- [ ] Motion from the motion tokens / `TOKENS.motion`; verify with reduced motion on.
- [ ] Check light and dark mode, and 360 / 768 / 1024 / 1440px.
- [ ] Add new component-level colour pairs to `scripts/check-contrast.js` and run it (it must exit 0); if a token value changes, update sections 3–4, 12 and 14 here.
- [ ] Keep the admin identical: scoped globals, no edits to the shared `App.css` rules, keep the `MuiCssBaseline` pin; compare admin screenshots before and after.

---

## 16. Primitives

Written by Prompt 06. The shared building blocks every later prompt composes from: the `.sf-*` classes in `src/theme/storefront-base.css` (imported by `src/index.css` right after the tokens), three React primitives in `src/components/ui/`, the storefront MUI component overrides in `ThemeContext.js`, the storefront SweetAlert2 theme at the end of `App.css`, and `<MotionConfig reducedMotion="user">` around the storefront route.

### 16.1 How the CSS primitives are built

- **Scoped away from the admin.** Every selector starts with `:where(body:not(.admin-area))`. The `:where()` wrapper adds no specificity, so a primitive weighs exactly one class.
- **Extend, don't fight.** Because of that, a component's CSS Module class (loaded after `storefront-base.css`) overrides a primitive on the same element without `!important`: ``className={`sf-btn sf-btn--primary ${styles.cta}`}`` with `.cta { padding-inline: 32px; }`.
- **Variants are custom properties.** Buttons read `--sf-btn-bg`, `--sf-btn-fg`, `--sf-btn-border`, `--sf-btn-bg-hover`, `--sf-btn-fg-hover`, `--sf-btn-border-hover`, `--sf-btn-focus`, `--sf-btn-size` (and `--sf-btn-underline` on `--link`); badges read `--sf-badge-bg` / `--sf-badge-fg`. Set them on your own class to restyle one instance.
- **Tokens only.** No hex or `rgb()` in the file; glyphs (select chevron, check mark, error mark) are drawn in `currentColor`, so they follow the tokens in both modes.
- **Class-only.** No bare element selectors outside an `.sf-*` container, so nothing can reach the admin even in the first frame before `body.admin-area` is set.
- **Dark mode and reduced motion are automatic:** colours flip on `body.dark`, transitions use the duration tokens, and the skeleton shimmer is switched off under `prefers-reduced-motion`.
- **Focus:** interactive primitives show `--sf-shadow-focus` on `:focus-visible` with a transparent 2px outline (it becomes a real outline in Windows contrast themes). Links and tabs use a 2px `--sf-color-focus` outline instead (a box-shadow would wrap across lines or clip in a scrolling strip).

### 16.2 Class inventory

| Group | Class | What it gives you |
|---|---|---|
| Layout | `.sf-container` (+ `--wide`, `--narrow`) | `max-width` 1280 / 1440 / 720px, centred, `padding-inline: var(--sf-gutter)` |
| | `.sf-section`, `.sf-section--tight` | `padding-block: var(--sf-section-y)` / half of it |
| | `.sf-grid` | `repeat(var(--cols, 4), minmax(0, 1fr))`; `--cols-tablet` (2) at ≤ 768px; `--cols-mobile` (defaults to the tablet count) at ≤ 480px; `--gap` overrides the fluid 16–32px gap. A one-column grid sets `--cols-tablet: 1`. |
| Type | `.sf-eyebrow` (+ `--accent`, `--rule`) | 12px sans 500, uppercase, 0.16em, muted; `--accent` = accent-text; `--rule` adds the 24px caramel rule before it |
| | `.sf-display-xl/lg/md/sm` | Playfair on the display scale; inherits its colour (works on navy); `<em>` = the accent italic (accent from md up, accent-text at sm); `text-wrap: balance` |
| | `.sf-prose` | 66ch measure, 17px / 1.7, secondary text; serif `h2` (display-sm, hairline above) and `h3`/`h4` (20px); lists, `strong`, `hr`; links ink with a 1px accent underline (2px on hover) |
| | `.sf-muted`, `.sf-price`, `.sf-compare`, `.sf-sale` | muted text; price (sans 500, tabular, no wrap); compare-at (muted, 1px strike: add `<span class="sf-visually-hidden">Was</span>`); sale (accent-text 500) |
| Buttons | `.sf-btn` | 44px, sans 14px 500, 0.02em, radius sm, `0 20px`; colour-only hover (`--sf-duration`, `--sf-ease-out`), press `scale(0.99)`, focus ring, `:disabled` / `[aria-disabled="true"]` 50% + `not-allowed` |
| | `--primary` | ink, paper text; hover navy (white in dark mode) |
| | `--ghost` | transparent, 1px ink border; hover ink 6% tint (`--sf-color-primary-soft`) |
| | `--paper`, `--paper-ghost` | for navy bands, the footer and photo scrims: brand paper with ink text (hover caramel) / paper border and text (hover paper 16%); on-dark caramel focus ring |
| | `--link` | inline text link: stone underline at rest, accent on hover; no padding; a 44px invisible hit area |
| | `--sm` (36px; 44px on touch screens), `--lg` (52px, 16px text), `--block` (full width), `--icon` (square, needs `aria-label`), `.sf-btn__icon` (1.25em icon slot; MUI icons fit) | |
| Fields | `.sf-field` | grid: label, control, hint, error (8px gap) |
| | `.sf-field__label` (or a bare `<label>` child), `.sf-field__hint`, `.sf-field__error` | 13px 500 ink label; 13px muted hint; 13px error text with a circled "!" (never colour alone) |
| | `.sf-input`, `.sf-select`, `.sf-textarea` | 44px (textarea 120px min), 1px `--sf-color-border-strong`, radius sm, surface, 15px (16px on touch screens, so iOS never zooms); hover darkens the border; focus = 1px accent border + ring; `[aria-invalid="true"]` = error border (kept while focused); `[readonly]` / `:disabled` = sand; dark mode sets `color-scheme: dark` for native pickers |
| | `.sf-select` chevron | two 1.5px strokes in `currentColor` (see 16.8) |
| | `.sf-check`, `.sf-radio`, `.sf-switch` | on the `<label>`: 44px row, 12px gap; the native `<input>` inside becomes a 20px box / circle (accent when checked, check mark in accent-contrast, `:indeterminate` dash) or a 36 × 20 pill (ink when on) |
| Badges | `.sf-badge` (+ `--ink`, `--paper`, `--sand`, `--accent`, `--success`, `--warning`, `--error`, `--info`) | 11px uppercase tracked label, radius sm; default = sand; `--accent` = discount tint; semantic = soft tint + matching text; `--paper` is fixed (photos, dark surfaces) |
| Chips | `.sf-chip` (+ `--selected`) | 32px hairline pill, 14px; hover ink border; `--selected`, `[aria-pressed="true"]` and `[aria-checked="true"]` = ink fill with paper text |
| Counts | `.sf-count` | 18px ink disc, 10px paper digits, tabular |
| Surfaces | `.sf-card` (+ `--hairline`), `.sf-panel` (+ `--hairline`) | surface / sand, radius sm, no shadow, fluid 16–24px padding (`--sf-card-padding`, e.g. `0` for media cards) |
| | `.sf-hairline` | a 1px `--sf-hairline` rule (on `<hr>` or any block) |
| | `.sf-divider--dot` | inline `·` separator: `<span class="sf-divider--dot" aria-hidden="true"></span>` |
| Tabs | `.sf-tabs`, `.sf-tab`, `.sf-tabpanel` | hairline strip (scrolls sideways without a scrollbar), 44px eyebrow-style tabs, `[aria-selected="true"]` = ink text + 1px ink underline, 24px panel spacing; roving focus and arrow keys are the consumer's job |
| Skeletons | `.sf-skeleton` (+ `--text`, `--image`, `--circle`) | sand block with a slow (1.6s) surface shimmer, static under reduced motion; `--text` 0.75em lines (the last of several at 60%), `--image` uses `aspect-ratio: var(--ratio, 4 / 5)`, `--circle` uses `--size` (40px). Mark skeletons `aria-hidden="true"`; set `aria-busy="true"` on the loading region |
| A11y | `.sf-visually-hidden`, `.sf-skip-link`, `.sf-focus` | screen-reader-only text; the "Skip to content" link (off-screen until focused, then an ink tab top-left above everything; Prompt 31 adds it to `App.js`); the focus ring for custom focusable elements |

### 16.3 Markup patterns

```jsx
<button className="sf-btn sf-btn--primary sf-btn--lg sf-btn--block">
  Checkout <span className="sf-btn__icon"><ArrowForward /></span>
</button>
<Link className="sf-btn sf-btn--link" to="/products">View all</Link>

<div className="sf-field">
  <label className="sf-field__label" htmlFor="email">Email address</label>
  <input className="sf-input" id="email" type="email" autoComplete="email"
         aria-invalid={!!error} aria-describedby="email-hint email-error" />
  <p className="sf-field__hint" id="email-hint">We send the receipt here.</p>
  {error && <p className="sf-field__error" id="email-error">{error}</p>}
</div>

<label className="sf-check"><input type="checkbox" /> Set as default</label>
<label className="sf-radio"><input type="radio" name="rating" /> 4★ and up</label>
<label className="sf-switch"><input type="checkbox" role="switch" /> In stock only</label>

<div className="sf-tabs" role="tablist" aria-label="Product information">
  <button className="sf-tab" role="tab" aria-selected="true" aria-controls="p-desc" id="t-desc">Description</button>
</div>
<div className="sf-tabpanel" role="tabpanel" id="p-desc" aria-labelledby="t-desc" tabIndex={0}>…</div>

<div className="sf-grid" style={{ "--cols": 3, "--cols-mobile": 1 }}>…</div>
<span className="sf-skeleton sf-skeleton--image" aria-hidden="true" />
```

### 16.4 React primitives (`src/components/ui`)

Import from the barrel: `import { BrandLogo, Reveal, SectionHeading, renderAccent } from "../../components/ui";` (it also exports `staggerDelay` and `stripAccent`, since Prompt 09 `BottomDrawer`, `useFocusTrap`, `useBodyScrollLock`, `useBodyScrollLocked` and `getFocusableElements` (section 19), and since Prompt 12 `Marquee` (section 22.6)).

**`<Reveal>`**: the standard scroll reveal (section 8). Fades in with a 20px rise once the element is 10% inside the viewport (`whileInView`, `viewport={{ once, margin: "-10% 0px" }}`, `TOKENS.motion` duration 0.9s and ease-out). With reduced motion (`useReducedMotion()`, and `MotionConfig` around the storefront) it only fades: no transform.

| Prop | Default | Notes |
|---|---|---|
| `as` | `"div"` | any tag (`"section"`, `"li"`…) or component |
| `delay` | `0` | seconds; use `staggerDelay(index)` for groups |
| `distance` | `TOKENS.motion.revealDistance` (20) | rise in px (`--sf-reveal-distance`) |
| `once` | `true` | reveal the first time only |
| `className`, other props | — | passed through (`id`, `style`, `role`, `aria-*`, `data-*`); the ref is forwarded |
| `onInView` | — | called with the `IntersectionObserverEntry` when it enters view (e.g. start a lazy fetch) |

`staggerDelay(index, cap = 8)` returns `index × 0.09s` (`--sf-stagger`) for the first `cap` items and `0` after that, so long grids never wait.

```jsx
{products.slice(0, 6).map((p, i) => (
  <Reveal key={p.id} as="li" delay={staggerDelay(i)}><ProductCard product={p} /></Reveal>
))}
```

**`<SectionHeading>`**: eyebrow, serif `display-lg` title, intro, optional action. Left-aligned with the action on the right from 768px up (below the text on phones); `align="center"` centres everything in a 640px measure. It has a fluid 32–48px bottom margin (override with `className`).

| Prop | Default | Notes |
|---|---|---|
| `eyebrow` | — | `.sf-eyebrow` above the title |
| `title` | — | string with an optional `*accent*` word, or a node |
| `intro` | — | 17px secondary, 56ch |
| `align` | `"left"` | `"left"` \| `"center"` |
| `action` | — | a ready element, or `{ label, to }` (router `<Link>`) / `{ label, href }` (`<a>`), rendered as `.sf-btn--link`; other keys pass through |
| `as` | `"h2"` | heading level |
| `id` | — | on the heading, for `aria-labelledby` on the section |
| `className` | — | on the wrapper |

```jsx
<section className="sf-section" aria-labelledby="spaces-title">
  <div className="sf-container">
    <SectionHeading id="spaces-title" eyebrow="Shop by space" title="Furniture for every *room*."
      action={{ label: "View all", to: "/products" }} />
  </div>
</section>
```

**`renderAccent(text)`** turns `"Seating for the way you *live*."` into text with the marked word in `<em>` (an array of strings and keyed `<em>`s, ready for JSX). Text without a complete pair, and non-strings, come back unchanged. **`stripAccent(text)`** returns the plain sentence for `aria-label`, document titles and alt text.

### 16.5 Storefront MUI overrides (`ThemeContext.js`)

Only the controls the storefront shell renders (today the header: `IconButton`, `Badge`, `Avatar`, `Menu`, `MenuItem`, `Typography`, `Divider`), plus the few a later prompt might reach for. Every value is a `var(--sf-*)`, so the overrides flip with `body.dark` and collapse with the reduced-motion tokens. The admin has its own `ThemeProvider` and never sees them. The `MuiCssBaseline` body pin (section 13) and `MuiPaper` `backgroundImage: none` stay exactly as Prompt 01 left them.

| Component | Override |
|---|---|
| `MuiButtonBase` | ripple off (colour-only feedback); `.Mui-focusVisible` = `--sf-shadow-focus` |
| `MuiButton` | `.sf-btn` metrics; contained primary = ink → navy hover; outlined primary = ghost; text = link (stone underline, accent on hover); `size` small 36 / large 52; press 0.99; disabled 50%; other `color`s keep their palette colour |
| `MuiIconButton` | 44px (medium), radius sm, ink unless a `color` is set, sand hover (none on touch); the small-size touch override is kept |
| `MuiBadge` | 18px ink disc, paper 10px digits, whatever the `color` prop (the header's counts) |
| `MuiAvatar` | sand, ink serif monogram, hairline |
| `MuiPopover`, `MuiMenu` | surface, hairline, `--sf-shadow-sm`, radius sm (no blur, no translucency) |
| `MuiMenuItem` | 44px at every breakpoint, sans 14px, sand hover; keyboard focus = sand + inset ring; selected = accent-soft |
| `MuiDivider` | `--sf-color-border` |
| `MuiDrawer` | solid surface, `--sf-shadow-lg`, navy overlay backdrop |
| `MuiOutlinedInput`, `MuiTextField` | border-strong boundary, radius sm, surface; focus = 1px accent border + ring; error border; disabled sand; label muted → accent-text when focused |
| `MuiChip` | 32px pill; default filled = sand, outlined = hairline; `color="primary"` = ink (selected) |
| `MuiSkeleton` | sand, `wave` by default (no pulse), wave off under reduced motion |
| `MuiTabs`, `MuiTab` | hairline strip, 24px gap, 1px ink indicator; eyebrow-style 44px tabs, muted → ink; focus outline inside |
| `MuiTooltip` | ink, paper 12px text, radius md |

### 16.6 SweetAlert2 storefront theme (`App.css`)

Appended after the shared SweetAlert block and scoped `body.light:not(.admin-area)` / `body.dark:not(.admin-area)`, so the admin keeps the rules above it. Everything goes through SweetAlert's CSS variables, set from the tokens.

- **Popup:** `--swal2-background` surface, `--swal2-color` ink, `--swal2-border` hairline, `--swal2-border-radius` radius md, `--sf-shadow-lg`; title in Playfair 22px 500; body sans 15px secondary; icons at 75% (`--swal2-icon-zoom`); backdrop `--sf-color-overlay`.
- **Buttons:** 44px, sans 14px 500. Confirm = ink with paper text, navy on hover (white in dark mode). Cancel = ghost (1px ink inset border, `--sf-color-primary-soft` hover). Focus = `--sf-shadow-focus`. Press 0.99.
- **Per-call colours still win.** A `confirmButtonColor` is set inline on the button by SweetAlert; the ink text and navy hover apply only to confirms *without* one (`:not([style*="--swal2-confirm-button-background-color"])`), so a per-call destructive colour keeps SweetAlert's white text and darkening hover. The hex literals in `OrderHistory.js`, `Profile.js` and `WishlistContext.js` are left for their prompts (switch them to the error token read with `getComputedStyle`, or to `customClass`).
- **Toasts** (cart, wishlist, auth; bottom-end): surface, hairline, `--sf-shadow-md`, radius md, sans 14px title (600) and text, a 2px accent timer bar.
- **Icons:** SweetAlert 11 has no icon-colour variables, so its icons keep their own colours (only `--swal2-icon-zoom` and `--swal2-icon-animations` exist).
- **Reduced motion:** show/hide/toast animations and icon animations are off (SweetAlert closes at once when there is no animation).

### 16.7 Reduced motion

- `src/App.js` wraps the storefront route's `<div className="App">` (inside `DealsConfigProvider`) in `<MotionConfig reducedMotion="user">`: with the OS setting on, every storefront framer-motion animation skips transforms and layout animation and keeps opacity. The admin routes are not wrapped.
- CSS transitions built from the duration tokens collapse on their own; the skeleton keyframes, the MUI skeleton wave and the SweetAlert animations are switched off explicitly.
- `Reveal` also reads `useReducedMotion()`, so it starts without a transform.

### 16.8 Decisions and exceptions

- **Select chevron without an SVG.** A data-URI SVG cannot inherit `currentColor` from the page (it renders black and disappears on dark surfaces), so the chevron is two 1.5px hard-stop strokes drawn with `linear-gradient(… currentColor …)`. It follows `color` (ink, muted when disabled) with no literal. Forced-colours mode restores the native arrow.
- **The skeleton shimmer** (`transparent → --sf-color-surface → transparent`) is the second permitted gradient after the photo scrim: transient and functional.
- **Input, popup and toast backgrounds are `--sf-color-surface`** (the brief's "paper" read as MUI's `background.paper`, as section 1 maps it); only `.sf-btn--paper` and `.sf-badge--paper` use the fixed brand paper.
- **`.sf-chip` is 32px** as specified (≥ 24px meets WCAG 2.5.8); chip rows need ≥ 8px gaps. `.sf-btn--sm` grows to 44px on touch screens.
- **The old header** (until Prompt 07): its CSS Module sets most MUI colours with `!important`, so it mostly keeps its look; the new overrides show through where it set nothing (ink count discs on its dark bar, a sand hover square behind its white icons, ring focus). Prompt 07 rebuilds it on these overrides.

New contrast pairs (`node scripts/check-contrast.js`):

| Pairing | Light | Dark | Min |
|---|---|---|---|
| Field error text on surface (.sf-field__error in a card) | 6.69 ✓ | 7.31 ✓ | 4.5:1 |
| Invalid field border (error) on surface | 6.69 ✓ | 7.31 ✓ | 3:1 |
| Selected menu item: ink on accent-soft over surface | 15.18 ✓ | 11.10 ✓ | 4.5:1 |
| Accent badge (.sf-badge--accent): discount on discount-bg over page | 4.75 ✓ | 8.69 ✓ | 4.5:1 |
| Paper button hover (brand ink on on-dark accent) (both modes) | 8.85 ✓ | 8.85 ✓ | 4.5:1 |
| Paper-ghost hover (on-dark on on-dark-border over navy) (both modes) | 9.57 ✓ | 9.57 ✓ | 4.5:1 |

Every other primitive pairing is already in section 14 (ink on sand for hover states, primary-contrast on primary for selected chips, counts, tooltips and the skip link, accent-contrast on accent for the check mark, muted on surface for the switch thumb, focus ring and accent on page/surface/sand, on-dark tokens on navy for the paper variants).

---

## 17. Header and the `--sf-header-height` contract

Written by Prompt 07. Files: `src/components/Header/Header.js` (shell), `MegaMenu.js` (department row and flyout), `useHeaderHeight.js`, `groupCategoryTree.js`; copy overrides in `src/content/navigationContent.js`.

### 17.1 Structure and metrics

| Width | Rows (height at rest → compact) | Main row |
|---|---|---|
| < 768px | main 60 | menu · logo 28px · search, cart |
| 768–1023px | main 64 | menu · logo 40px · search, theme, account, cart |
| ≥ 1024px | utility strip 32 → out of view · main 88 → 64 visible · department row 48 (two lines, 92, at 1024–1279 with the seeded six departments) | search trigger · logo 48 → 36px · account, wishlist, cart (labels under the icons from 1280px) |

- Surface `--sf-color-bg` (paper / navy-ink), hairlines `--sf-hairline`, no gradient, no shadow at rest; `--sf-shadow-sm` only when compact. The mega-menu panel uses `--sf-color-bg`, `--sf-shadow-md` and a bottom hairline.
- Stacking: the header is `--sf-z-header` (50); the panel sits inside it at `--sf-z-megamenu` (55). Drawers and modals (≥ 1000) stay above both. Page content must stay below 50.
- Department row type: sans 13px / 500 / uppercase / 0.12em from 1440px; 12px / 0.1em at 1024–1439px and 0.08em at 1024–1279px, so long department names fit before the row has to wrap.

### 17.2 Sticky header, compaction and `--sf-header-height`

- The header is `position: sticky; top: 0` and in the page flow, so there is no spacer. Pages start right under it; never add top margins or paddings that assume a fixed header.
- Past 80px of scroll it compacts **with transforms only**: it slides up by `--hdr-compact-shift` (56px at ≥ 1024px), so the utility strip leaves the viewport (then `visibility: hidden`), the main row shows 64px with its content re-centred, and the logo scales to 36px. Its box never changes size, so nothing below it moves and no layout shift is recorded. Below 1024px compaction only adds the shadow. Never hidden on scroll down.
- **Contract:** `--sf-header-height` on `<html>` is the visible header height, updated before paint on resize and on every frame of the slide. Use it for every offset below the header:
  - sticky elements: `top: calc(var(--sf-header-height) + 24px)` (listing rail, checkout summary, product gallery, account rail);
  - anchor targets: `scroll-margin-top: calc(var(--sf-header-height) + 16px)`;
  - JS: `parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sf-header-height"))`.
  `storefront-tokens.css` declares `--sf-header-height: 0px` for the first frame and for pages without the header.

### 17.3 Mega-menu

- Data: `groupCategoryTree(categories)` (exported from `Header/groupCategoryTree.js` and re-exported by `MegaMenu.js`) turns the `categories.getAll()` list into departments (`getMainMenuCategories`) → groups (direct children) → links (descendants, depth-first, in `orderCategoriesHierarchically` order). Every link is `/products?category=${categoryParam(category)}`.
- Panel: one instance under the department row, in the DOM only while open; a column per group (eyebrow link + its children), four to a row; a flat department gets a serif introduction (name, description, "Shop all"); the feature column shows the department's admin-managed `image` at 4:5 (`object-fit: cover`, lazy, `onImageError`) with the eyebrow/line/"Shop all <Department>" copy (`navigationContent.js` overrides by slug); every panel ends with "View all departments" (`/products`).
- Motion: opacity 0 → 1 and `y` −8 → 0 over `--sf-duration` (`TOKENS.motion.duration.base`) with `--sf-ease-out`; exit `duration.fast`; nothing under reduced motion.
- Interaction model (keyboard and pointer) is documented at the top of `MegaMenu.js` and in `BUILD_LOG.md` (Prompt 07).

---

## 18. Footer and newsletter

Written by Prompt 08. Files: `src/components/Footer/Footer.js` + `.module.css`, `src/components/Newsletter/Newsletter.js` + `.module.css` (the site's only sign-up form).

### 18.1 Structure and grid

| Block | Content | Layout |
|---|---|---|
| Newsletter band | `Newsletter` inside a `Reveal`: eyebrow `h2` "Newsletter", the serif `NEWSLETTER_LINE`, labelled email field, `.sf-btn--paper` "Subscribe" | stacked below 1024px; on the 12-column grid from 1024px (intro 1–6, form 7–12) and from 1280px (intro 1–7, form 9–12, in line with the Contact column) |
| Columns | brand (white `BrandLogo` at 40px linking home, `BRAND_PROMISE`, social icons) · Shop · Help · Contact | stacked below 768px, where Shop, Help and Contact collapse; two columns at 768–1023px (Brand, Shop / Help, Contact, in DOM order); 12 columns from 1024px, spans 4 / 2 / 2 / 4 |
| Trust bar | the promises the data backs (18.3) and the "We accept" marks (18.4) | wraps; a hairline above and below |
| Bottom bar | © year `APP_NAME` · Terms · Privacy · Cookies · "Prices in INR" | wraps |

- `.sf-container--wide` (1440px + gutter), like the header. `--sf-color-surface-dark` in both modes; text `--sf-color-on-dark`; links and secondary text `--sf-color-on-dark-muted`; rules `1px solid var(--sf-color-on-dark-border)`. No fills, shadows or gradients.
- Vertical rhythm: the band and the columns are each padded by half of `--sf-section-y`, so one full `--sf-section-y` separates the newsletter from the columns with the hairline between them. The band has no rule on the navy edge itself: on paper pages a rule there reads as a seam.
- Column headings are `h2`s styled as eyebrows (12px, 500, 0.16em, uppercase) in `--sf-color-on-dark`; the newsletter eyebrow uses `--sf-color-on-dark-muted` (section 5.6).
- Links: 15px muted; on hover `--sf-color-on-dark` with a 1px `--sf-color-on-dark-accent` underline (the only motion besides the band's `Reveal`); focus is a 2px `--sf-color-on-dark-accent` outline. Rows are 32px on desktop and 44px below 768px and on touch screens (`pointer: coarse`).
- Phones: each link column is `<h2><button aria-expanded aria-controls>` over a panel with the `hidden` attribute; the plus/minus is drawn in `currentColor` and swaps without animating. The switch is `useMediaQuery("(max-width: 767.98px)", { noSsr: true })`, so the first paint is already right.
- Forced colours: the white logo keeps a navy ground (`forced-color-adjust: none`), icons follow `CanvasText`, and the payment marks inherit the forced text colour.

### 18.2 Form fields on navy

`.sf-field`, `.sf-input` and `.sf-btn--paper`, restyled by module classes (the same weight as the primitives' states and later in the bundle, so no `!important`). Reuse this for any form on navy or photography.

| Part | Tokens |
|---|---|
| field fill | `--sf-color-on-dark-soft` (paper 8%) |
| boundary | `--sf-color-on-dark-border-strong` (3.53 : 1); hover `--sf-color-on-dark-muted` |
| text / placeholder / caret | `--sf-color-on-dark` / `--sf-color-on-dark-muted` / `--sf-color-on-dark-accent` |
| focus | border `--sf-color-on-dark-accent` + `0 0 0 2px var(--sf-color-on-dark-accent), 0 0 0 5px var(--sf-color-focus-halo)` (the paper button's ring) |
| invalid | border and `.sf-field__error` text `--sf-color-on-dark-error` (7.12 : 1) |
| label | `.sf-field__label` in `--sf-color-on-dark-muted` |
| native UI | `color-scheme: dark` (autofill, spellcheck) |

### 18.3 Trust bar rules

An item renders only when the data backs it, and stays absent until its read settles (no flash of a claim). The rules are the product page's (`resolveTrustBadgeDetail` in `tokens.js`).

| Item | Shown when | Source |
|---|---|---|
| Secure payment | always (store-attested policy) | — |
| Cash on Delivery | `resolveTrustBadgeDetail("cod", { settings })` is not null, i.e. `settings.payment.codEnabled` | `apiService.settings.get()`, read once |
| Easy returns · N days | `resolveTrustBadgeDetail("easyReturns")` is not null, i.e. `STOREFRONT_CONFIG.returnsWindowDays` > 0 | config |
| Free delivery · Above ₹X | `resolveTrustBadgeDetail("freeShipping", { shipping })` is not null (the lowest positive `freeAbove`); its string is shown as is | `apiService.shipping.getMethods()`, read once |

The COD payment mark follows the COD rule. No "24/7", guarantees, counts or other unbacked claims.

### 18.4 Payment marks

Four one-colour line marks on a 48 × 32 card (VISA, two rings for Mastercard, UPI, COD), 28px tall, each `role="img"` with a name, in a list labelled by the visible "We accept". The colour is set on the list (`--sf-color-on-dark`) and inherited by the SVGs (so a contrast theme's text colour reaches them); the frame is `currentColor` at 40% (= `--sf-color-on-dark-border-strong`); the texts use `font-family: inherit` at 600.

### 18.5 BottomNav clearance

Up to 768px the footer adds `padding-bottom: calc(var(--sf-space-24) + env(safe-area-inset-bottom, 0px))`, so the fixed BottomNav never covers the bottom bar; the navy runs on beneath it. Since Prompt 09 the nav is 57px (56px items and the 1px top hairline) plus the inset, inside the 96px reserve. A nav that grows past 96px must raise this value.

### 18.6 New contrast pairs

| Pairing | Light | Dark | Min |
|---|---|---|---|
| Footer field text (on-dark on the paper-8% fill over navy) (both modes) | 12.35 ✓ | 12.35 ✓ | 4.5:1 |
| Footer field placeholder (on-dark muted on the fill) (both modes) | 7.18 ✓ | 7.18 ✓ | 4.5:1 |
| Footer field boundary (on-dark-border-strong) on navy (both modes) | 3.53 ✓ | 3.53 ✓ | 3:1 |
| Footer error text and invalid border (on-dark-error) on navy (both modes) | 7.12 ✓ | 7.12 ✓ | 4.5:1 |

Every other footer pairing is already in section 14 (on-dark, on-dark muted and the caramel focus ring on navy, the paper button and its hover).

---

## 19. Mobile navigation and overlays

Written by Prompt 09. Files: `src/components/SidebarMenu/*`, `src/components/BottomNav/*`, `src/components/BottomDrawer/*` (the shared bottom sheet, also exported from `ui/`), and `src/components/ui/useFocusTrap.js` (the focus-trap helper).

### 19.1 The overlay contract

Every drawer, sheet and modal on the storefront should behave the same way. The sidebar and the bottom sheet follow this contract, and later overlays (cart drawer, search, auth modal) can adopt it with the same helper.

| Concern | Rule |
|---|---|
| Semantics | `role="dialog"`, `aria-modal="true"` and a name (`aria-label`, or `aria-labelledby` pointing at a visible title) |
| Focus | `useFocusTrap(ref, { active, onEscape, initialFocusRef, returnFocusRef, returnFocus })`: on open, focus moves to `initialFocusRef`, else the first focusable element, else the container (give it `tabIndex={-1}`). Tab and Shift+Tab cycle inside. On close, focus returns to the element that opened the layer, unless another layer has taken focus in the meantime. Only the most recently opened trap handles keys, so nested layers work. Focus is not forcibly pulled back into the layer: `aria-modal` hides the page from assistive technology, and portalled popovers and SweetAlert dialogs opened from inside the layer keep their own focus. |
| Escape | `onEscape` (usually `onClose`), handled by the topmost trap only |
| Page scroll | `useBodyScrollLock(active)` sets an inline `overflow: hidden` on `<body>` and restores the previous value. This is the same signal the cart drawer, search and auth modal already set, and the one BottomNav listens to through `useBodyScrollLocked()`. |
| Stacking | Backdrops and panels at `--sf-z-overlay` (1000); modals at `--sf-z-modal` (1100); the full-screen search at `--sf-z-search` (1400, section 25.1); BottomNav (58) is always beneath them |
| Backdrop | `--sf-color-overlay`, no blur; a click closes the layer |
| Motion | Enter with `--sf-ease-out`; exit in `--sf-duration` with `--sf-ease-in-out`; under reduced motion, opacity only (an explicit `useReducedMotion()` variant, on top of `MotionConfig`) |

### 19.2 SidebarMenu

| Part | Spec |
|---|---|
| Panel | Fixed on the left, `min(360px, 88vw)` wide, full height; `--sf-color-bg` (paper / navy-ink); `border-right: var(--sf-hairline)`, square corners, `--sf-shadow-lg`; safe-area padding. It slides in over `--sf-duration-slow` with `--sf-ease-out` (no spring) and out over `--sf-duration` with `--sf-ease-in-out`. |
| Top row | 60px plus the top inset, with a hairline below: `<BrandLogo height={28} />` (auto variant: the white logo in dark mode) and a 44px "Close menu" button, which takes focus on open |
| Account block | **Guest:** the serif line "Sign in for faster checkout and order tracking." (20px), a `.sf-btn--primary --block` "Sign in" (`onClose(); onOpenAuth()`) and a `.sf-btn--ghost --block` "Create account" (`onOpenAuth("signup")`). **Signed in:** a 48px hairline circle with the serif initial (or the user's image), name, email, and a "My account" link (`/profile`). |
| Shop | An accordion built by `groupCategoryTree` (`Header/groupCategoryTree.js`), the same grouping as the mega-menu. Department rows are 48px, in the display serif at 20px, with a plus/minus glyph (a swap, as in the footer). Only one department is open at a time (`aria-expanded`, `aria-controls`). The open panel (`role="group"`, named by its department) is indented 16px and lists "Shop all <Department>" (or the `navigationContent.js` `ctaLabel`), then each group as an eyebrow link (12px, 600, 0.16em, uppercase, ink) with its leaves beneath (sans 15px, secondary, 48px rows; deeper levels indented 16px more). A flat department is a plain link. "View all products" (`/products`) closes the section. A loading skeleton shows on the first read; on failure, a message and "Try again". |
| Discover | New arrivals `/products?sort=newest` · Best sellers `/products?sort=popular` · Offers `/special-offers` (only while the deals page is enabled and its config has loaded) · Our story `/about` |
| Account | "My orders" (signed in) or "Track order" (guest) → `/orders` · "My wishlist" → `/wishlist`, with a `.sf-count` and an `aria-label` that carries the number · "Sign out" (signed in: `logout()`, then `navigate("/")`) |
| Settings | Help & support `/support` · "Dark mode": a `<button role="switch" aria-checked>` that calls `toggleTheme`, drawn as the `.sf-switch` pill |
| Legal | Terms · Privacy · Cookies (13px, muted, 44px targets) and `© {year} {APP_NAME}` |
| Rhythm | Sections are separated by a hairline, have 20px vertical padding and use `.sf-eyebrow` `h2` titles. Rows are 48px. Rows get an accent underline on hover and on the current page. |

Behaviour:

- Categories are read on every open. The last good list stays in state, so a re-open renders at once and a failed refresh keeps it.
- Each opening starts with the department of the current listing expanded (`?category=`), or none.
- `aria-current`: `"page"` goes on the link to the current category and on path links to the current page. `"true"` goes on the department button that holds the current category.
- A plain click on a link closes the menu as it navigates; a modified click (new tab or window) leaves it open. Any route change also closes it.
- IDs: `sf-sidebar-department-<slug>`, `sf-sidebar-panel-<slug>`, `sf-sidebar-group-<slug>`.

### 19.3 BottomNav

| Part | Spec |
|---|---|
| When | Up to 768px: `display: block` under `@media (max-width: 768px)`, the same query as the footer's reserve, so from 769px it is gone |
| Items | Home `/` · Shop `/products` (the chair glyph) · Search (opens the bar's own search overlay) · Wishlist `/wishlist` (`.sf-count`, "99+" above 99; the link's `aria-label` reads "Wishlist, N items") · Account (`/profile` when signed in; `openAuthModal("login")` for guests). The cart stays in the header. |
| Look | Paper with a top hairline; no blur, no shadow. Items are 56px tall in a grid of five, capped at 560px and centred on tablets. Glyphs are 24px outline icons; labels are 11px, 500, uppercase, 0.08em (0.04em below 360px). Items are muted; the current one is ink, with a 2px caramel mark on the hairline (drawn as a border, so it also shows in forced-colours mode). Keyboard focus shows a 2px focus outline inset by 4px. |
| Height | 57px plus the bottom inset, within the footer's 96px reserve (§18.5) |
| `aria-current` | `"page"` on `/`, `/products`, `/wishlist`, `/profile`; `"true"` for Shop on `/products/:slug` and for Account on `/orders` |
| Scroll | Past 80px, a scroll down of 6px or more slides the bar away (transform only, `--sf-duration`, `--sf-ease-out`); a scroll up brings it back. Keyboard focus inside the bar (`:focus-visible`, not the focus a tapped link keeps) keeps it on screen, and focusing it brings it back. |
| Overlays | While any overlay holds the body scroll lock, the bar is shown, stays put (scroll is ignored) and is `inert`. It is beneath every overlay and out of the tab order and the accessibility tree. |
| Search | It keeps its own `SearchModal` instance; the header owns the other. The modal caches the catalogue at module level, so both instances share one fetch, and they can never be open together. When the overlay closes, focus returns to the Search button. |

### 19.4 BottomDrawer (the shared bottom sheet)

```jsx
import { BottomDrawer } from "../../components/ui";

<BottomDrawer
  open={open}
  onClose={() => setOpen(false)}
  title="Filters"
  footer={<button className="sf-btn sf-btn--primary sf-btn--block" onClick={apply}>Show 24 results</button>}
>
  …
</BottomDrawer>
```

| Prop | Default | Notes |
|---|---|---|
| `open`, `onClose` | — | required |
| `title` | — | string or node, shown as the serif `h2`; a string title names the dialog, a node title is referenced with `aria-labelledby` |
| `ariaLabel` | the string title | the dialog's name (required when there is no title) |
| `initialFocusRef` | the close button | what takes focus on open |
| `maxHeight` | `"80vh"` | any CSS length, inline on the sheet |
| `footer` | — | a fixed row under the scrolling body (hairline above; flex, 12px gap; clears the home indicator) |
| `className`, `children` | — | the class goes on the sheet; children go in the scrolling body (20px padding) |

- **Rendering:** a portal on `<body>`, so a transformed ancestor can never re-anchor it.
- **Size:** full width up to `--sf-container-narrow` (720px), centred.
- **Surface:** paper (`--sf-color-bg`), `--sf-shadow-lg`. The top corners use `--sf-radius-lg`, the one place a larger radius is allowed.
- **Handle:** a 36 × 4px drag handle in `--sf-color-border-strong`. It is visual only; there is no drag-to-dismiss.
- **Header:** 56px with a hairline below, holding the title (display-sm serif) and a 44px "Close" button.
- **Body:** scrolls with `overscroll-behavior: contain`.
- **Motion:** slides up (`y: 100% → 0`) over `--sf-duration` with `--sf-ease-out`; fades under reduced motion.

### 19.5 Notes for later prompts

- **14 (listing):** `BottomDrawer` covers the filter sheet's semantics: dialog, Escape, focus on the close button, focus back to the trigger, scroll lock. Its `footer` slot holds "Clear all" and "Show N results". The sheet's old `z-index: 1300` was there to beat a bottom nav at 1200 and is no longer needed.
- **15 (search):** the bar's Search button is `aria-haspopup="dialog"`. If the overlay starts returning focus to its opener itself, the bar's own restore becomes a no-op.
- **16 (product page):** `AddToCartBar` overrides its z-index to 1300 on mobile to beat the old 1200 bar. `--sf-z-stickybar` (60) is now enough (the bar is 58). Done in Prompt 16 (section 26.6).
- **18, 20 (cart drawer, auth modal):** reuse `useFocusTrap` and `useBodyScrollLock` from `src/components/ui`.
- **21 (account):** the Profile toast's `z-index: 1300` comment refers to the old 1200 bar.

---

## 20. Home hero and assurance strip

Written by Prompt 10. Files: `src/components/HeroSection/HeroSection.js` + `.module.css`, `src/components/storefront/AssuranceStrip.js` + `.module.css`, `src/components/storefront/trustIcons.js` (the shared trust-icon drawings), and the content in `src/content/homeContent.js`.

### 20.1 Content: `HERO` in `homeContent.js`

| Key | Notes |
|---|---|
| `eyebrow` | optional (`""` hides it); today "A & S Urbanseat" |
| `headline` | `HERO_HEADLINES[0]` from `brandContent.js` (imported, not copied); one `*accent*` word |
| `support` | `HERO_SUPPORT_LINES[0]`; 14 words or fewer |
| `primaryCta`, `secondaryCta` | `{ label, to }` router paths; `secondaryCta: null` hides the second button |
| `media.image` | `{ src, alt, width, height }` plus optional `srcSet`/`sizes` for real photography. The file is 2400 × 1350 (16:9); the URL is the `HERO_IMAGE` constant, so swapping the photograph is one line (and its alt text) |
| `media.video` | `{ src, poster }`: `src: null` shows the photograph only. A film should be a short, loopable, muted MP4 (H.264); the poster defaults to the photograph |
| `media.focalPoint` | CSS `object-position` (default `"50% 60%"`): the point that stays in frame as the hero crops the photograph to wide desktops and tall phones |

### 20.2 Hero layout and scrim

| Width | Height (a minimum: taller copy grows the section) | Copy |
|---|---|---|
| < 768px | `max(520px, 72vh)` | full width, 24px side insets, bottom-aligned 32px from the edge; CTAs stacked, full width |
| 768–1023px | `clamp(560px, 86vh, 920px)` | full width (headline capped at 640px), CTAs in a row |
| 1024–1279px | `clamp(560px, 72vh, 920px)` | bottom-left, 640px column. 72vh because the header is 212px tall at these widths (its department row wraps), and 86vh would push the CTAs below the fold |
| ≥ 1280px | `clamp(560px, 86vh, 920px)` | bottom-left, 640px column, aligned with the header's `.sf-container--wide` |

- **Type:** eyebrow `.sf-eyebrow` in `--sf-color-on-dark` (full strength, not 80%: section 3.3); `h1` `.sf-display-xl` in `--sf-color-on-dark` with the `<em>` in `--sf-color-on-dark-accent`; support line sans 18px (1.125rem), `--sf-leading-normal`, `--sf-color-on-dark`, max 34em.
- **CTAs:** router `Link`s, `.sf-btn--paper` (primary) and `.sf-btn--paper-ghost`, 48px tall (`--sf-btn-size`), 32px side padding; the on-dark caramel focus ring.
- **Media:** an `<img>` with `width`/`height`, `loading="eager"`, `fetchpriority="high"` (lowercase: React 18 passes it through), `decoding="async"`, `onError={onImageError}`; `object-fit: cover` around `focalPoint`. The media layer is absolutely positioned and 7% taller than the hero (overflowing upward, for the parallax), so the image arriving can never move anything; the sand behind it shows while it loads. With a film, the `<video autoPlay muted loop playsInline preload="metadata">` sits over the photograph (which stays as its fallback; a load error removes the film) with a 44px paper Pause/Play button (bottom right; top right on phones), as WCAG 2.2.2 asks of moving content.
- **The scrim** is drawn by `.copy::before`, built from `--sf-color-scrim`: full strength behind the copy block and out to the hero's bottom and left edges, with each ramp starting 8px clear of the copy; it fades out over `--hero-scrim-fade-y` above the copy (a `mask-image` ramp) and, from 1024px, over `--hero-scrim-fade-x` to its right (the background ramp). A colour hint at 60% of each ramp eases its outer end so the fade has no visible edge. Below 1024px the copy is about as wide as the hero, so the scrim runs edge to edge and only fades upward. `--sf-gradient-scrim` is not used here: at 1440 × 900 the 640px column's top-right corner sits about halfway along its diagonal, where it has faded to about 0.43 strength (paper text about 2.5 : 1 over a white photograph).
- **Measured** (Chromium, the hero photograph replaced by pure white, the lightest pixel behind each text box, 320–1920px, both modes): eyebrow, headline, support line and ghost CTA 5.78 : 1; the caramel accent 3.15 : 1. The hero is identical in light and dark mode.

### 20.3 Motion

| What | Values | Reduced motion |
|---|---|---|
| Media entrance | scale 1.04 → 1 on mount, `TOKENS.motion.duration.reveal` (0.9s), ease-out | none |
| Copy entrance | eyebrow, `h1`, support line, CTA row: opacity 0 → 1 with a 20px rise, 0.9s ease-out, `--sf-stagger` (90ms) apart; on mount (not on scroll), once the copy's fonts have loaded (20.4) | shown at once |
| Parallax | `translateY` 0 → 6% of the media's height as the page scrolls from the top to the hero's bottom edge (window `scrollY` over the hero's measured bottom); transform only; `will-change: transform` on the media only while motion is allowed | none |
| Film | autoplays muted and looping | does not autoplay; the poster shows, Play is offered |

`useScroll({ target })` is not used: framer measures it against `<html>` and warns unless `<html>` is positioned, which the admin shares.

### 20.4 Font wait: no layout shift from the hero

The copy is bottom-aligned, so when `font-display: swap` replaces a fallback face and a line box changes, every line above it would move (measured 0.001–0.018 CLS before this rule). The copy and its scrim are therefore laid out but `visibility: hidden` until the faces they use (Playfair Display 400 and italic, Inter 400 and 500) report loaded through `document.fonts`, for at most 1s; then the copy enters and the scrim fades in (`--sf-duration-slow`). Fonts already loaded (any later visit) mean no wait. The media never waits, so LCP is unaffected. Fonts slower than 1s still swap in view (0.002–0.018 measured with fonts delayed 3s); size-adjusted fallback faces would remove that (Prompt 32).

### 20.5 Assurance strip

| Item (from `ASSURANCE_ITEMS`) | Shown when | Detail |
|---|---|---|
| Free delivery | `resolveTrustBadgeDetail("freeShipping", { shipping })` is not null | that string ("Above ₹9,999"), the footer's and the product page's |
| Easy returns | `STOREFRONT_CONFIG.returnsWindowDays` > 0 | `{days}-day returns on eligible pieces` |
| Secure payment | always (a stated policy) | the static line from `ASSURANCE_ITEMS` |
| Cash on delivery | `settings.payment.codEnabled` | the static line from `ASSURANCE_ITEMS` |

- **Data:** `apiService.settings.get()` and `apiService.shipping.getMethods()`, once each on mount (`Promise.allSettled`). A failed read counts as no data, so it only drops the items that depend on it; with both failing, Easy returns and Secure payment remain.
- **Layout:** paper (`--sf-color-bg`) between two hairlines, inside `.sf-container--wide`. From 1024px one 56px row (hairlines included), content-sized columns spread from the left content edge to the right; below 1024px a 2 × 2 grid (the details wrap on phones). Each item: a 16px outline icon (stroke 1.5) in `--sf-color-accent`, the label in sans 13px 500 ink, the detail in 12px `--sf-color-text-muted`, with a visually hidden comma between them for screen readers. `ul aria-label="Our assurances"`; no focusable elements.
- **Loading:** until both reads settle, the full list is laid out invisibly (`visibility: hidden`, `aria-hidden`) under one `.sf-skeleton` line, and the strip carries `aria-busy`. The strip is therefore already at its loaded height (measured equal at 320–1440px), then the items fade in over `--sf-duration-slow` (no animation under reduced motion).
- **Icons:** `trustIcons.js` holds the outline drawings `TrustBadges` used, keyed by the `TRUST_BADGE_CATALOG` icon names; `TrustBadges` and the strip import it. The footer still has its own copy of four of them.

### 20.6 New contrast pairs

| Pairing | Light | Dark | Min |
|---|---|---|---|
| Hero: paper-ghost CTA border (on-dark) on scrim over white photo (both modes) | 5.77 ✓ | 5.77 ✓ | 3:1 |
| Hero: paper at 80% on scrim over white photo (not for text) | 4.37 | 4.37 | info |
| Hero: on-dark text with --sf-color-overlay as the scrim, white photo (not used) | 4.15 | 7.32 | info |

Every other hero and strip pairing is already in section 14 (on-dark text, the caramel accent and the focus ring on the scrim; the paper button and its hover; ink, muted text and the accent on the page in both modes).

---

## 21. Home discovery sections and `ProductRail`

Written by Prompt 11. Files: `src/pages/Home/Home.js` + `.module.css` (the sections), `src/components/FeaturedProducts/*` (Featured Collections), `src/components/storefront/ProductRail.js` + `.module.css` (the site's one product rail), and the content in `src/content/homeContent.js`.

### 21.1 Page rhythm

Order after the assurance strip: Shop by space · story block 1 · Featured Collections · Complete the space · story block 2 · Trending · Recently viewed, then Prompt 12's sections (§22).

- Every section is `.sf-section` (Recently viewed: `.sf-section--tight`) inside `.sf-container .sf-container--wide`, the left edge the header, hero and strip share.
- Neighbouring sections are separated by a full-width hairline (`.section + .section { border-top: var(--sf-hairline) }`). The one sand band, Complete the space, has none on it or after it. A later home section joins the rhythm by adding the page's `styles.section` class.
- Every section title is an `h2` (`SectionHeading`, or `.sf-display-lg` in the story blocks); Recently viewed's `h2` is set as an eyebrow. Headings below them are `h3`.
- Each section's own data decides whether it renders; nothing is shown in place of missing data.

### 21.2 Content (`homeContent.js`)

| Export | Shape | Notes |
|---|---|---|
| `HOME_SECTIONS` | `{ spaces, featured, trending, recentlyViewed }`, each `{ eyebrow, title?, viewAll?: { label, to }, railLabel? }` | `viewAll` targets: `/products`, `?sort=newest`, `?sort=popular`, `?sort=rating` only; `railLabel` names the carousel |
| `SPACES` | `[{ key, label, line, categorySlug }]` ×4 | the tile shows the category's admin-managed `image`; a space whose category is missing or inactive is skipped |
| `STORY` | `[{ eyebrow, title, body, cta: { label, to }, image: { src, alt, width, height } }]` | `STORY[0]` image left, `STORY[1]` mirrored; images 1200 × 1500 |
| `COMPLETE_THE_SPACE` | `{ anchorProductSlug, eyebrow, title, intro, companionsLabel, viewLabel, addAllLabel, addAvailableLabel, totalLabel }` | rules in 21.5 |

### 21.3 Shop by space tiles

- Grid: 4 across from 1024px, 2 × 2 below; tiles 4:5 everywhere (the frame's `aspect-ratio` reserves the box). One `<Link>` per tile to `/products?category=<slug>`, with the `sf-focus` ring.
- Image: `object-fit: cover`, lazy, `onImageError`, alt = the category name; hover scales it to 1.03 over `--sf-duration-slow` (pointer devices, not under reduced motion).
- Text: the label in the display serif (22px on phones, 28px from 768px) and the line in sans 12/14px, both `--sf-color-on-dark`. Visually hidden commas separate the alt text, label and line for screen readers.
- Scrim: the hero's construction (§20.2): `--sf-color-scrim` at full strength behind the text block, fading out over 40px (phones) / 64px above it, so the text keeps 5.77 : 1 over a white photograph. `--sf-gradient-scrim` is not used: a caption that spans the tile does not fit its bottom-left 35%.

### 21.4 Story blocks

Image 7 / text 5 from 768px (mirrored: text 5 / image 7), stacked below with the image first; text vertically centred. Eyebrow `.sf-eyebrow--rule`, title `.sf-display-lg` with the accent, body 17px / `--sf-leading-relaxed` / secondary / 48ch, ghost CTA. The image frame is 4:5 on sand. `Reveal` on both halves (the text 90ms later).

### 21.5 Complete the space

- **Anchor:** `products.getBySlug(anchorProductSlug)`. If that is missing or inactive, the first featured product with `frequentlyBoughtTogetherIds` anchors.
- **Companions:** `products.getFrequentlyBoughtTogether(anchor, 4)`. When that gives fewer than two, `products.getRelated(anchor, 4)` tops it up (de-duplicated, at most four). With no anchor or fewer than two companions the section is hidden.
- **Layout:** the sand band. Phones: image, details, companions. From 768px: the anchor's image (4:5, a hairline frame over its edge so a sand photograph cannot dissolve into the band) on the left, sticky at `calc(var(--sf-header-height) + 24px)`; on the right its details (name `h3` serif 28 / 32px, short description, `PriceBlock size="md"`, a "View" link whose name includes the product) and "Pairs well with" (`h3` eyebrow) over a 2 × 2 of `ProductCard`s. The image link is `tabIndex={-1}` and `aria-hidden`; the "View" link is its accessible equivalent.
- **Add all to cart:** a ghost button under the companions with `"{count} pieces, {total}"` beside it (and as its description). It adds the anchor and each companion in turn with `addToCart(buildCartItem(p), 1, { openDrawer: false })`, then calls `setIsCartOpen(true)` once. Sold-out pieces (`stock === 0`) are left out, as their cards disable quick add; the label then reads "Add the available pieces". Each piece is added at its card's price (the cheapest variant), so choose an anchor whose companions do not depend on a size (21.7).

### 21.6 `ProductRail`

```jsx
import { ProductRail } from "../../components/storefront";

<ProductRail
  products={items}            // renders nothing when empty and not loading
  label="Related pieces"      // or labelledBy="<heading id>"
  loading={loading}           // ProductCardSkeletons (§23.2); skeletonCount
  compact={false}             // compact: smaller cards, more per view
  onAddToCart={(cartItem) => addToCart(cartItem, 1)}
  onToggleWishlist={toggleWishlist}
  isInWishlist={isInWishlist}
/>
```

| Width | Cards per view (compact) |
|---|---|
| < 768px | 2.2 (2.6), and the track runs to the screen edges |
| 768–1023px | 3.2 (4.3), still edge to edge |
| ≥ 1024px | 4 (6), inside the container |

- **Structure:** a `role="group"` with `aria-roledescription="carousel"` and a name, holding a `<ul>` of cards (list semantics keep the count and positions) and, when the track overflows, a controls row: a decorative hairline progress line (ink thumb, sized and placed by `--rail-visible` / `--rail-progress`) and two 44px hairline buttons, "Previous pieces" and "Next pieces" (`aria-controls` the list).
- **Scrolling:** `scroll-snap-type: x mandatory`, cards snap to their start, with `scroll-padding` keeping them on the content edge. A button scrolls one page of whole cards (smooth, instant under reduced motion). At either end its button gets `aria-disabled="true"`, so focus is never dropped. The track adds no tab stop: Tab walks the cards, each scrolling into view, and the arrow keys scroll the track while focus is inside it.
- **Focus room:** the track keeps 8px of padding (cancelled by negative margins) so focus rings are not clipped by its overflow.
- **Loading:** while `loading`, `ProductCardSkeleton`s (each in an `aria-hidden` list item) and an empty `aria-hidden` row of the controls' height hold the rail's place; the group is `aria-busy`. The rail keeps its height when cards arrive whose tallest has a brand and a two-line name (§23.2).
- **Measuring:** the scroll position is read in a layout effect, on scroll (one rAF per frame) and on resize (`ResizeObserver`). The progress line is written to the element directly, so scrolling never re-renders the cards.

### 21.7 Decisions to keep

- The anchor is an office set (Ergonomic High-Back Chair with Headrest + Cushioned 3-Seater Waiting Bench + Winsome Office Table). The King Size Bed's companion mattress would be added in Single size, and the sofa sets have a single curated companion.
- "Trending" lists the admin's `trending` flag; its copy states no numbers.
- No page-level fade: the hero is the page's entrance, and the sections reveal as they scroll in.

No new colour pairs: the tiles use the hero's on-dark-on-scrim pair, and the sand band uses the ink, secondary, muted, accent, accent-text and focus-ring pairs on sand already in §14.

---

## 22. Home social proof, explainer and closing CTA

Written by Prompt 12. Files: `src/pages/Home/Home.js` + `.module.css` (sections 8–13), `src/pages/Home/homeData.js` (the data rules), `src/hooks/useNearViewport.js`, `src/components/storefront/BrandStrip.js` (+ `WordmarkStrip`), `PressStrip.js`, `ReviewCarousel.js` (each with its module), `src/components/ui/Marquee.js` + `.module.css`, `src/components/CTASection/*`, and the content in `src/content/homeContent.js` (`HOME_SECTIONS.brands/reviews/press/promise`, `PROMISE_STEPS`, `MARQUEE_PHRASES`, `CLOSING_CTA`).

### 22.1 Page rhythm (the closing half)

Order after Recently viewed: Brands we carry · As featured in (renders nothing today) · From our customers · Our promise · the marquee · the closing CTA. Then `.main-content`'s own bottom padding (80px; 70px up to 768px) and the footer's navy newsletter band.

- **Strips draw their own hairlines.** `BrandStrip`, `PressStrip` and `Marquee` are thin rows with a hairline above and below. They do not carry the page's `.section` class, so the section after a strip gets no second rule; a section that follows a section keeps the page's `.section + .section` hairline. Two strips side by side share one rule (`.strip + .strip`).
- **One sand band per page (§13) still holds.** The reviews section is paper between hairlines; each review slide is a sand panel.
- **The closing CTA is a contained navy panel** inside `.sf-container--wide`: `--sf-section-y` of paper above it, nothing below but `.main-content`'s padding, so the navy panel and the navy footer never touch (no seam) and the paper between them reads as a deliberate gap.

### 22.2 Lazy reads: `useNearViewport`

```jsx
import useNearViewport from "../../hooks/useNearViewport";

const [ref, near] = useNearViewport();          // rootMargin "100% 0px" by default
<section ref={ref}>…</section>                  // a callback ref; it may mount later
useEffect(() => { if (near) startTheRead(); }, [near]);
```

- `near` turns true once the element is within `rootMargin` of the viewport (one viewport height above or below by default, so a section the page opens on, e.g. after scroll restoration, loads at once) and stays true. Without `IntersectionObserver` it is true at once.
- The home page starts each closing-half read from its own section: the brands strip → `products.getAll()` (once); the reviews section → `products.getReviews(id)` for the featured products (at most 8, after the featured list has resolved); the promise section → `settings.get()` + `shipping.getMethods()`. None of them is in the initial network. Every read falls back to "no data".
- While a read is pending its section holds its final height (22.8): skeleton lines and skeleton slides, `aria-busy` on the region or list.

### 22.3 `BrandStrip`, `WordmarkStrip`, `PressStrip`

| Prop | Notes |
|---|---|
| `brands` | `string[]` in display order; blank entries are dropped. The home page passes `collectBrands(products)` (`homeData.js`): the distinct non-empty `brand` values of the active products (case, spacing and punctuation ignored), alphabetical, with the store's own brand (`APP_NAME`) last. Seeded result: Carlton · Nilkamal · Winsome · A & S Urbanseat. |
| `label` | the row's heading: an `h2` set as `.sf-eyebrow`; it names the region |
| `loading` | skeleton lines in a box as tall as the names will be (two lines on phones, one from 768px); `aria-busy` |
| `headingId`, `className`, `ref` | the ref reaches the `<section>` (the lazy-load trigger) |

- **Layout:** from 768px one 56px row (hairlines included), the label on the left, the names on the right; on phones the label sits above the names, which wrap. Names: sans 13px, 500, uppercase, `--sf-tracking-eyebrow`, muted.
- **Separators:** a `·` drawn in each name's leading gap. The list is pulled one gap to the left inside a clipping wrapper, so the first name on every line (also after wrapping) loses its dot. The dot uses `content: "\00B7" / ""`, so it stays out of the accessible name where supported.
- **Names only:** no logos (none are licensed), no links, no "trusted by" wording. Returns `null` with no names once loaded.
- **`PressStrip`** ("As featured in") renders the same row for `items: [{ name, logo? }]` (a logo shows instead of the name, with the name as its `alt`) and returns `null` unless at least one item has a name. The home page hands it `[]`: no press or client data source exists and the schema cannot be extended (`00_INDEX.md`, §5 item 7). Never hardcode names.

### 22.4 `ReviewCarousel`

| Prop | Default | Notes |
|---|---|---|
| `reviews` | `[]` | each `{ id, userName, rating, body, isVerifiedPurchase, createdAt, product: { id, name, slug } }` |
| `loading`, `error` | `false` | skeleton slides / an honest error line (only when there are no reviews) |
| `label` or `labelledBy` | — | names the carousel |
| `previousLabel`, `nextLabel` | "Previous reviews", "Next reviews" | the buttons' names |
| `slideLabel` | "Review {index} of {count}" | the slides' and the dots' names |
| `verifiedLabel`, `emptyLabel`, `errorLabel` | "Verified purchase", "No customer reviews yet.", "Reviews could not be loaded just now." | the empty and error lines are muted eyebrows |
| `skeletonCount`, `className` | 3, — | |

- **Slide** (a sand panel, radius sm, 24–32px padding): the review text as a serif quote (Playfair 22px, `--sf-leading-tight`, typographic quotes) of at most 240 characters (`clampQuote`: cut at a word, ellipsis); then, above a hairline, the stars (`StarRating` 14px), the reviewer's name as stored, "Verified purchase" (success tone, check mark) only when `isVerifiedPurchase === true`, and the product's name (ink link with an accent underline) beside the short date (`formatDate(…, "short")` in a `<time>`). No avatar, title, place or invented date; a missing name, product or date is left out. The quote fills the slide, so every caption sits on the same line.
- **Stars on sand are ink** (§4): each slide sets `--sf-color-star: var(--sf-color-text)`, which `StarRating` reads; the empty stars keep `--sf-color-border-strong` (3.19 : 1 on sand).
- **Per view:** 1 below 768px, 2 at 768–1023px, 3 from 1024px; snap scrolling, no bleed.
- **Controls** (only when the track overflows): one dot per review (a 24px-wide, 44px-tall target around a 6px mark: hollow border-strong, filled ink for the slides in view; WCAG 2.5.8 asks for 24 × 24) on the left, the hairline previous/next squares on the right (the rail's). A dot scrolls its slide into view (as far as the track goes); the buttons scroll one page of whole slides; smooth, instant under reduced motion. While loading, an empty row of the controls' height holds their place.
- **Accessibility:** a group with `aria-roledescription="carousel"`; slides are `role="group"` + `aria-roledescription="slide"` + "Review N of M"; dots and buttons carry `aria-controls`; the dots of the slides in view carry `aria-current="true"` (a window, not a single item, when several are in view); the buttons use `aria-disabled` at either end, so focus is never dropped. Every slide stays in the reading order. Forced colours keep the dot states.
- **Data rule (home):** `loadFeaturedReviews(featured)` → `selectReviews`: approved reviews only (the endpoint's filter, and any other `status` is dropped again), at least 40 characters of text, newest first, at most 10, from at most 8 reads in parallel (a failed read counts as none). With none left the home page hides the whole section; the component's own empty state stays available for other pages.

### 22.5 Our promise

- **Content:** `PROMISE_STEPS`, three `{ dataKey, eyebrow, title, body, fallback?, image: { src, alt, width, height } }`, numbered 01–03 by order (Order → Delivery → After delivery). `body` is a list of sentences; a sentence with `{placeholders}` shows only when each has a live value, `{ text, requires: "cod" }` only while COD is on; `fallback` is used when no sentence survives. A step only sees its own `dataKey`'s values:

  | `dataKey` | Values | Source |
  |---|---|---|
  | `payment` | `cod` (gates sentences, never printed) | `resolveTrustBadgeDetail("cod", { settings })` |
  | `delivery` | `{days}` "7–10"; `{threshold}` "above ₹9,999" | the active method named "Standard…" (`estimatedDays`, hyphen → en dash; "0"/text rejected); `resolveTrustBadgeDetail("freeShipping", { shipping })` in sentence case, the strip's and footer's amount |
  | `returns` | `{returns}` 7 | `STOREFRONT_CONFIG.returnsWindowDays`, only when `resolveTrustBadgeDetail("easyReturns")` is not null (> 0) |

- **Layout:** three columns from 768px, stacked on phones. Each step: a 4:5 image frame (sand while it loads, lazy image with `width`/`height`), the serif numeral (20px, `--sf-color-accent-text`, `aria-hidden`: the `<ol>` numbers the steps) beside the step's `.sf-eyebrow`, the title (`h3`, Playfair 24px, 400), the body (sans 15px, `--sf-leading-body`, secondary, 40ch). `Reveal` per step, 90ms apart.
- **The page's one lift:** the image rises 4px (`translateY(-4px)`, `--sf-duration-slow`, `--sf-ease-out`) while the pointer rests on the step (or focus is inside it), only under `(hover: hover)` and without reduced motion. The steps carry no links, so in practice it is a hover cue.
- **Loading:** each body is laid out invisibly with `promiseBodyLayout(step)` (every sentence, fillers in place of the values; `visibility: hidden`, `aria-hidden`) under two skeleton lines, so the step already has its height.

### 22.6 `Marquee`

```jsx
import { Marquee } from "../../components/ui";

<Marquee items={MARQUEE_PHRASES} speed={60} />   // speed: seconds per pass through the phrases
```

- 48px tall (border-box, hairlines included), full width, eyebrow type in the muted tone; a `·` after every phrase. The track holds two identical halves, each repeating the phrases as often as the width needs (measured with a `ResizeObserver`), and slides left by one half per loop over `speed × copies` seconds, so the pace is the same at every width and the seam never shows.
- **Pauses** while the pointer rests on it (`hover: hover` devices), while its control has focus, and for good with its Pause/Play control (44px, at the right end behind a hairline; label "Pause the moving text" / "Play the moving text"). WCAG 2.2.2 asks for a way to pause moving content that runs longer than five seconds.
- **Assistive technology:** the moving track is `aria-hidden`; the phrases are also a visually hidden plain list, read once. That list keeps the phrases' own casing (`text-transform: none`), because browsers pass `text-transform` on to assistive technology.
- **Reduced motion:** no track and no control; the list shows instead, centred and still, wrapping on narrow screens.
- Phrases only, no claims, numbers or offers; an empty list renders nothing.

### 22.7 `CTASection`

| Prop | Notes |
|---|---|
| `eyebrow`, `title` (required, one `*accent*`), `line` | the copy |
| `primary`, `secondary` | `{ label, to }` router links; `secondary: null` hides it |
| `tone` | `"paper"` (on the page, no panel padding at the sides) · `"sand"` (sand panel) · `"navy"` (navy panel, both modes) |
| `as`, `headingId`, `className` | heading level (`h2`), its id (it names the region), an extra class |

- A centred panel: eyebrow, `.sf-display-xl` title (max 13em, balanced), one line (17px, `--sf-leading-body`, 34em), buttons 48px tall with 32px sides (stacked full width below 480px). From 1024px the panel is at least 420px tall. Radius sm, no shadow, no gradient.
- Buttons: paper and sand use `.sf-btn--primary` + `.sf-btn--ghost`; navy uses `.sf-btn--paper` + `.sf-btn--paper-ghost` (brand ink on brand paper, 16.25 : 1; hover caramel, 8.85 : 1; caramel ring on navy, 8.35 : 1).
- Navy text: `--sf-color-on-dark`; eyebrow and line `--sf-color-on-dark-muted`; the accent word `--sf-color-on-dark-accent`. Identical in light and dark mode. Forced colours draw the panel's edge.
- The home page passes `CLOSING_CTA` with `tone="navy"` and removes the section's bottom padding (`section.closing`); it never carries a form (the footer's newsletter band follows).

### 22.8 Measurements (Chromium, mock-mode production build)

- **Heights, pending vs loaded** (the lazy reads held back): brands strip and promise steps identical at 360/768/1024/1440px; the reviews section within 4–31px (its skeleton height is tuned per width to the seeded reviews; real reviews vary).
- **CLS** while scrolling the whole page: 0 at 360 and 1440px and under reduced motion. With every API call delayed 1.5s and a fast scroll, 0.007–0.015 in some runs, all of it from the Featured, Complete the space and Trending cards growing 33–39px as their images load (the same growth measures identically on the Prompt 11 build); the closing-half sections only move with it. Prompt 13's card with a reserved image box removes it.

### 22.9 New contrast pairs

| Pairing | Light | Dark | Min |
|---|---|---|---|
| Review slide: stars (ink) on sand (graphic) | 14.64 ✓ | 12.52 ✓ | 3:1 |
| Review slide: empty star (border-strong) on sand (graphic) | 3.19 ✓ | 3.27 ✓ | 3:1 |
| Review slide: verified mark (success) on sand | 5.35 ✓ | 6.74 ✓ | 4.5:1 |
| Review slide: gold star on sand (not used) | 2.91 | 8.26 | info |
| Review slide: filled star (ink) vs empty star (border-strong) on sand | 4.58 | 3.83 | info |

Every other pairing in this half is already in §14 and §16.8: ink, secondary and muted text on page and sand (the slides' product links are ink), accent-text on the page (the step numerals), the accent underline and the focus ring on sand, the control border on the page (the hollow dots), and the on-dark tokens, paper buttons and caramel ring on navy.

---

## 23. Product card, price block and stars

Written by Prompt 13. Files: `src/components/storefront/ProductCard.js` (+ the `ProductCardSkeleton` export) + `.module.css`, `PriceBlock.js` + `.module.css`, `StarRating.js` + `.module.css`. All four are exported from `src/components/storefront`.

### 23.1 `ProductCard`

```jsx
import { ProductCard, ProductCardSkeleton } from "../../components/storefront";

<ProductCard
  product={product}                                   // required (a wishlist snapshot works as { ...item, id: item.productId, images: [item.image] })
  onAddToCart={(cartItem) => addToCart(cartItem, 1)}  // omit to hide the quick add
  onToggleWishlist={toggleWishlist}                   // omit to hide the heart
  isWishlisted={isInWishlist(product.id)}
  showAddToCart                                       // default true
/>
```

The props are the pre-Prompt 13 props, unchanged. The card makes no API calls. Its quick add hands the page's handler `buildCartItem(product)`: the cheapest variant, line id `productId-variantId`, so it merges with a product-page add of the same variant.

| Part | Spec |
|---|---|
| Root | `<article aria-labelledby>` (named by the product name); no border, shadow or fill; `isolation: isolate` keeps the overlay's z-index inside it |
| Link | one router `Link` to `productPath(product)` around the image frame, the brand and the name. It is named by the name (`aria-labelledby`) and described by the brand (`aria-describedby`); focus is `--sf-shadow-focus` around the image and titles. No control is nested in it: the chips and buttons sit in a sibling layer laid over the frame (same width, 4:5), which lets clicks through to the image |
| Image frame | 4:5 (`aspect-ratio`), sand while loading, radius sm, `object-fit: cover`. The `img` has alt = name, `width="1200" height="1500"`, `loading="lazy"`, `decoding="async"` and `onImageError` (the placeholder) |
| Keyline | a 1px inset line in `--sf-color-bg` over the image edge, always on. It cannot be seen on the page, but where a card sits on another tone (the home page's sand band) it keeps a sand photograph, or the sand placeholder, from dissolving into the background |
| Titles | 12px below the frame. Brand eyebrow: sans 11px, 500, 0.16em, uppercase, muted; one line with an ellipsis; omitted when empty. Name: Playfair 18px / 1.25, ink, `-webkit-line-clamp: 2` (only a name over 100 characters is also cut in the markup, with `truncateText`) |
| Rating row | only when `totalReviews > 0`: 12px stars in ink and "(12)" in muted 12px; one accessible image, "Rated 4.5 out of 5, 12 reviews" (the visible count is `aria-hidden`) |
| Price | `PriceBlock size="sm" showSavings={false}` (23.3) |
| Chips | stacked at the image's top-left: "Sold out" (`stock === 0`), "Sale" (a real compare-at price: `getProductMinPrice(product).discount > 0`), "New" (`hot`), in that priority, two at most. `.sf-badge` at 10px, brand paper on brand ink in both modes (16.25 : 1) |
| Wishlist | a 36px hairline disc at the top-right (a 44px target through `::after`): the page tone at 93% behind an ink outline heart, filled with the accent when saved; `aria-pressed`, "Save to wishlist" / "Remove from wishlist"; on hover the outline turns caramel |
| Quick add, touch (the base layout) | a persistent 44px "+" disc at the image's bottom-right (the heart's disc), `aria-label="Add <name> to cart"`; a check for 1.2s after a tap |
| Quick add, `(hover: hover)` | a 44px bar along the image's bottom edge: the page tone at 93%, "Add to cart" in ink (sans 14px, 500). It slides up (`--sf-duration`, `--sf-ease-out`) on card hover and on keyboard focus inside the card (`--qa`); focus left behind by a click does not keep it up once the pointer leaves (`:has(:focus-visible)`). Hover inverts it to `--sf-color-primary` with `--sf-color-primary-contrast` text; it reads "Added" for 1.2s after a click |
| Sold out | the image at 60%; the quick add disabled and labelled "Sold out" (bar text muted, the disc at 50%) |
| Hover, `(hover: hover)` | the image scales to 1.03 over `--sf-duration-slow` (`--sf-ease-out`); the second photograph (`images[1]`) fades in over it once loaded (mounted on the first mouse or pen hover, never on touch: lazy, `aria-hidden`, empty alt); the stone hairline appears around the image (opacity); the name's underline turns caramel while the link is hovered |
| Focus | link: `--sf-shadow-focus`. Discs: the caramel ring inside a 2px page-tone ring (`0 0 0 2px focus, 0 0 0 4px bg`), so one of the two stands out on any photograph. Bar: a 2px inset caramel outline (an inset box-shadow would sit under its fill) |
| Reduced motion | no scale and no slide; the bar appears by opacity; durations collapse to 0.01ms |
| Forced colours | the chips and the bar carry a transparent outline the system draws; stars use `CanvasText` / `GrayText` |
| Insets | 8px; 12px from 1024px |

A card costs three tab stops (link, heart, quick add). With its View all, previous and next, an eight-card rail now costs 27 stops (35 before).

**Over photography**, the controls use the page tone (`--sf-color-bg`, paper or navy-ink) at 93% opacity with text-tone glyphs. 93% is the least that keeps the caramel heart and the bar's focus ring at 3 : 1 on the fill over any photograph, from pure black to pure white, in both modes. The chips are a fixed ink-and-paper pairing, like any label on photography.

### 23.2 `ProductCardSkeleton`

`<ProductCardSkeleton className? />` is `aria-hidden`. It draws the 4:5 `.sf-skeleton--image` and three bars (brand, name, price) set in the line boxes of a card with a brand and a two-line name, so it is exactly that card's height at every width (measured equal at 360, 768, 1024 and 1440px). A card with a rating row is 20px taller; one without a brand is 20.5px shorter. Put `aria-busy` on the loading region. `ProductRail` renders it while loading (§21.6).

### 23.3 `PriceBlock`

| Prop | Default | Notes |
|---|---|---|
| `price` | 0 | current price |
| `comparePrice` | 0 | struck through only when higher than `price` (and `price` > 0) |
| `currency` | `"INR"` | via `formatCurrency` |
| `size` | `"lg"` | price / compare: sm 15 / 13px · md 18 / 15px · lg 24 / 16px |
| `showSavings` | `size === "lg"` | the saving, in accent-text: "Save 12%" at sm and md (nothing when it rounds to 0%), "Save ₹400.00" at lg |
| `taxNote` | — | a muted 12px line |

All sans: the current price in ink at 500, the compare-at price muted with a 1px strike and a visually hidden "Was" before it. Figures are tabular and never break inside; the row wraps between them. The old inline "12% off" is gone; the opt-in saving replaces it.

### 23.4 `StarRating`

The props are unchanged: `rating` (0–5, clamped), `size` (px, default 18), `label`. It draws five inline SVG stars, each 1em (the root's font-size is `size`), 0.08em apart. Empty stars use `--sf-color-border-strong`; filled stars use `--sf-color-star`, each filled by exactly its share of the rating (4.3 fills four stars and 30% of the fifth). It is one `role="img"` named "Rated 4.3 out of 5", or `label`. To recolour the stars, set `--sf-color-star` on a parent: the card and the home review slides use ink.

### 23.5 New contrast pairs

| Pairing | Light | Dark | Min |
|---|---|---|---|
| Card control text and glyphs on the page tone at 93% over a black photo | 13.91 ✓ | 16.13 ✓ | 4.5:1 |
| Card control text and glyphs on the page tone at 93% over a white photo | 16.32 ✓ | 13.40 ✓ | 4.5:1 |
| Card saved heart and bar focus ring (accent) on the 93% fill over a black photo | 3.06 ✓ | 9.49 ✓ | 3:1 |
| Card saved heart and bar focus ring (accent) on the 93% fill over a white photo | 3.59 ✓ | 7.89 ✓ | 3:1 |
| Card disc focus ring (accent) on a black photo | 5.51 ✓ | 10.70 ✓ | 3:1 |
| Card disc focus ring (accent) against its page-tone outer ring | 3.57 ✓ | 9.38 ✓ | 3:1 |
| Card disc focus ring (accent) on a white photo | 3.81 ✓ | n/a | 3:1 |
| Card disc focus ring's page-tone outer ring on a white photo | n/a | 18.41 ✓ | 3:1 |
| Card stars (ink) on sand (graphic) | 14.64 ✓ | 12.52 ✓ | 3:1 |
| Card empty star (border-strong) on page (graphic) | 3.54 ✓ | 3.45 ✓ | 3:1 |
| Card chip: brand paper on brand ink (both modes) | 16.25 ✓ | 16.25 ✓ | 4.5:1 |
| Card keyline (page tone) vs the sand band | 1.11 | 1.14 | info |
| Card saved heart (accent) on the page tone at 90% over a black photo (not used) | 2.85 | 9.54 | info |
| Card disabled bar text (muted) on the 93% fill over a black photo | 4.89 | 6.72 | info |

`scripts/check-contrast.js` gained two things for these rows: a `"--token@0.93"` layer (a token drawn at an opacity) and a `PAIRS_DARK_ONLY` list. Every other card pairing is already in §14: ink and muted text on page, surface and sand, the focus ring on the page, and primary-contrast on primary (the bar's hover).

---

## 24. Product listing and `Breadcrumb`

Written by Prompt 14. Files: `src/pages/Products/Products.js` + `.module.css` (the page), `src/pages/Products/ProductListRow.js` + `.module.css` (the list view's row), `src/components/Breadcrumb/Breadcrumb.js` + `.module.css` (the shared trail).

### 24.1 `Breadcrumb`

```jsx
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";

<Breadcrumb
  items={[
    { label: "Furniture", link: "/products" },
    { label: "Plastic Furniture", link: "/products?category=plastic-furniture" },
    { label: "Essentials" },
  ]}
/>
// → Home › Furniture › Plastic Furniture › Essentials
```

| Prop | Notes |
|---|---|
| `items` | `[{ label, link? }]`, the trail **after** Home (the component adds `{ label: "Home", link: "/" }` first). Empty labels and `null`s are skipped. |
| `className` | appended to the `nav`'s class (the listing gives the phone trail a two-line minimum through it) |

- **Markup:** `<nav aria-label="Breadcrumb"><ol>…</ol></nav>`. Items before the last are router `Link`s when they have a `link` (text otherwise). The last item is the current page: text with `aria-current="page"`, even when it has a `link`.
- **Separators:** a "›" drawn by CSS before every item after the first, with `content: "\203A" / ""`, so screen readers skip it.
- **Look:** sans 13px / `--sf-leading-normal`; links `--sf-color-text-muted`, ink with a 1px `--sf-color-accent` underline on hover; the current page ink at 500. It wraps on narrow screens (row gap 4px). Each link has a 44px-tall hit area (`::after`, inset −12px −4px) that does not move the row; focus is a 2px `--sf-color-focus` outline.
- **Adoption:** Prompt 16 (product page: the category's full trail, then the product; section 26.2) and Prompt 28 (content pages).

### 24.2 Page header

`padding-top: var(--sf-section-y)`, the breadcrumb, then the `h1` (`.sf-display-lg`, 16px below the trail on phones, 24px from 768px) and the introduction (sans `--sf-text-md` / `--sf-leading-body`, secondary, `max-width: 60ch`). The intro keeps room for three lines on phones and two from 768px (`min-height`), and on phones the trail keeps room for two lines: the catalogue's descriptions and leaf trails fit those, so the title sits at the same height on every listing.

| Selection | `h1` | Intro | Trail (after Home) |
|---|---|---|---|
| none | "All furniture" | `APP_DESCRIPTION` | All furniture (current) |
| one category | its name | its `description` | Furniture › each ancestor (linked) › the category |
| several | "Sofas and Beds", "Sofas, Beds and 2 more" (a repeated name once) | — | Furniture › the title |
| `search` set | "Results for “query”" | — | Furniture › [the category's trail, linked] › the title |

While a deep-linked category waits for the tree, the trail, the title and the intro are skeletons laid in the line boxes the text will take.

### 24.3 Layout

| Width | Layout |
|---|---|
| ≥ 1024px | `.sf-container--wide`, 12 columns (gap `clamp(24px, 2.5vw, 40px)`): the filter rail in 1–3, the results in 4–12. The rail is sticky at `top: calc(var(--sf-header-height) + 24px)`, `max-height: calc(100vh - var(--sf-header-height) - 48px)`, scrolls on its own (`overscroll-behavior: contain`), and keeps 8px of focus room inside its scroll box. The layout is at least `100vh - 48px` tall, so the rail (whose `max-height` grows as the header compacts) never sets the row's height and a short listing's footer stays put while the page scrolls. |
| < 1024px | One column. The rail is not shown; its filters open in `BottomDrawer` ("Filters" sheet, `maxHeight="85vh"`; footer: ghost "Clear all", primary "Show N results"). The sheet closes itself if the window grows to 1024px. |
| < 768px | The toolbar sticks under the header (`top: var(--sf-header-height)`, `--sf-z-sticky`), edge to edge on paper with a hairline below. |

Grid: three columns from 1024px, two below; column gap 24px from 768px and 16px below; row gap 40px / 32px (the cards carry text under the image). List view: one row per product between hairlines (24.6).

### 24.4 Filters (the rail and the sheet render the same groups)

- Each group is a `fieldset` with its `legend` as an `.sf-eyebrow` (floated, so it lays out as a block), hairlines between groups, 44px option rows (`.sf-check`, `.sf-radio`, `.sf-switch`, made full-width flex rows so counts align right).
- **Category:** an outline built from `orderCategoriesHierarchically`, as nested lists (each level 16px further in), so assistive technology hears the hierarchy (leaf names repeat across tiers). Departments have a 44px plus/minus disclosure (`aria-expanded`, `aria-controls`; the sidebar's glyph). Counts are muted, tabular, `aria-hidden`, with a visually hidden ", N products" in the name. **Open rule:** a selection that arrives from elsewhere (mega-menu, breadcrumb, link, back/forward) opens exactly the departments it lies in; a change made on the page (a box, a chip, "Clear all") only ever opens more, so nothing folds under the pointer. It is applied in a layout effect, so the loaded outline paints open.
- **Price:** "Min" / "Max" `.sf-field`s with `.sf-input` (`type="text" inputMode="numeric"`, digits and a point kept, a ₹ prefix drawn over the field), applied by "Apply price" or Enter; then the `PRICE_RANGES` as `.sf-chip`s with `aria-pressed` (pressing the one in force clears the price, as a second click on a rating does).
- **Customer rating / Discount:** `.sf-radio` rows; a second press clears. The rating rows show `StarRating` in ink ("4 stars & up").
- **Availability:** `.sf-switch` (`role="switch"`). **Brand:** `.sf-check` rows.
- Radio-group names and ids carry the instance (rail / sheet), since both copies can be in the document.

### 24.5 Toolbar and applied filters

- **Results line** (`aria-live="polite"`, `aria-atomic`): sans 14px muted, figures ink 500.
- **Sort:** a visible "Sort" label and an `.sf-select` (the `SORT_OPTIONS` labels). On phones it takes the row's remaining width with a tighter chevron and ends in an ellipsis if a label does not fit (only "Avg. Customer Rating", at 360px).
- **Grid / list:** two 44px icon buttons in a `role="group"` named "View", `aria-pressed`; pressed = ink with a 1px underline (a border, so forced colours keep it).
- **Filters** (below 1024px): a ghost button with the filters icon (hidden below 480px) and a `.sf-count` of the filters in force (the search is not counted), named "Filters, N applied"; `aria-haspopup="dialog"`, `aria-expanded`.
- **Applied filters:** removable `.sf-chip`s above the results (`ul` "Applied filters"), each named "Remove <label>": the search ("“query”"), each category, the price ("₹1,000 – ₹5,000", "Under ₹500", "Above ₹5,000"), the rating ("4 stars & up"), the discount ("10% off or more"), "In stock only", each brand. Below 1024px a "Clear all" link follows when there are two or more (the rail has its own from 1024px). Chips keep a 44px-tall hit area.

### 24.6 Results

- **Cards:** the storefront `ProductCard` (`onAddToCart={(item) => addToCart(item)}`, `onToggleWishlist={toggleWishlist}`, `isWishlisted`); the first six enter with `Reveal` (`staggerDelay`), the rest render at once.
- **Search** (`?search=`): `matchesSearch` from `SearchModal/searchData.js`, the search overlay's rule (the query in the name, tags, category name or slug, brand or short description), so the overlay's counts and the listing always agree (section 25.4). "Relevance" keeps catalogue order.
- **"Only N left":** under a card (and in a row) when `0 < stock <= (Number(lowStockThreshold) || 5)`, the product page's rule; 12px, 500, `--sf-color-warning`.
- **`ProductListRow`** (the list view; the card has no horizontal layout and stays Prompt 13's): a 4:5 thumbnail 160px wide (112px below 480px) with the card's keyline, chips ("Sold out", "Sale", "New", two at most) and placeholder fallback; the brand eyebrow and the serif name (20px) in one link (the thumbnail repeats it out of the tab order); the short description (15px, two lines); ink stars only with reviews; `PriceBlock size="md"` with its saving; the stock line; then a ghost "Add to cart" (`buildCartItem`; "Added" for 1.2s; "Sold out" and disabled at zero stock; named "Add to cart, <name>") and the 44px hairline wishlist disc (`aria-pressed`, the card's labels). Actions sit in a third column from 768px and under the text below it. `ProductListRowSkeleton` is its loading box.
- **Loading:** `ProductCardSkeleton` (or row skeletons) × per page in the same grid, `aria-hidden`, in an `aria-busy` region. The loading region and the results region are separate elements (keyed), and a deep-linked category's chip is held by a skeleton pill, so the results replace the skeletons without anything moving.
- **Error:** an `.sf-panel` with the serif title "We couldn't load the catalogue." (display-md), one line and a primary "Try again" (`fetchCatalog`).
- **Empty:** on the page, the serif title "Nothing here yet.", one line (quoting the query when `search` is set) and a ghost "Clear all filters" when anything constrains the results.

### 24.7 Pagination

`nav aria-label="Pagination"` under a hairline, 48px below the results: "Per page" label + `.sf-select` (12 / 24 / 48) · ghost Previous / Next (`aria-label` "Previous page" / "Next page", chevrons, disabled at the ends) around the numbers · "Page X of Y". Numbers: sans 14px muted in 44px buttons named "Page N", separated by 16px hairlines (none around the ellipsis); the current page ink, 500, underlined, `aria-current="page"`. Phones: the numbers on one line, Previous and Next under them; the per-page select and page line are not shown (as before). A page change scrolls the results' top to `--sf-header-height` + 16px (smooth, instant under reduced motion).

### 24.8 Landmarks and headings

One `h1`; the rail is a region named by its "Filters" `h2`; the results are a region named "Results" (the page sits inside the app's `main`, so neither is an `aside` or a second `main`); the breadcrumb and the pagination are `nav`s; error and empty titles are `h2`s.

No new colour pairs: the page uses ink, secondary and muted text on paper and sand, the warning text on paper, the accent and focus ring, the control boundary, the primary button and count disc, and the card's chips, all already in §14 and §23.5.

---

## 25. Search overlay

Written by Prompt 15. Files: `src/components/SearchModal/SearchModal.js` + `.module.css` (the overlay) and `src/components/SearchModal/searchData.js` (its data rules: the catalogue cache, recent searches, category chips, scoring, suggestions). Props `open`, `onClose`; mounted by `Header` and `BottomNav`, which share one catalogue read through the module cache.

### 25.1 Surface and stacking

- A fixed, full-viewport surface in `--sf-color-bg` (paper; the navy-ink base in dark mode). No backdrop, blur or veil. It fades in over `--sf-duration` (`--sf-ease-out`) and out over `--sf-duration` (`--sf-ease-in-out`); under reduced motion it appears and goes at once.
- **Two grid rows.** Row 1 is the top bar: `<BrandLogo height={28} />` (decorative here, `aria-hidden`) at the left of `.sf-container--wide`, 64px plus the top safe-area inset, a hairline below. The 44px "Close search" button sits over the bar's far end but comes last in the DOM, so Tab reaches it after the results. Row 2 scrolls (`overscroll-behavior: contain`; `scrollbar-gutter: stable` from 480px, so the column never shifts when results make it scroll).
- **Column:** centred, `max-width: calc(64rem + 2 × --sf-gutter)` (three cards about the listing's width); 24px above the field on phones, `clamp(48px, 8vh, 80px)` from 768px; 64px plus the bottom inset below.
- **z-index: `--sf-z-search` (1400).** Above the header (50), mega-menu (55), bottom nav (58), sticky bar (60), drawers and sheets (1000) and modals (1100), and above two legacy literals that were in the code: the cart drawer (1200/1300, until Prompt 18) and the product page's mobile `AddToCartBar` (1300; Prompt 16 moved it to `--sf-z-stickybar`, section 26.6). At `--sf-z-modal` the sticky bar's buttons showed on top of the overlay on phones. Below SweetAlert (2000).
- **Progress hairline:** a 2px `--sf-color-accent` line along the top edge while the catalogue loads or a search is pending: the loading screen's grow-and-retract (2.4s, `--sf-ease-in-out`), still and full width under reduced motion. Drawn as a border, so forced-colours themes keep it. Decorative (`aria-hidden`).

### 25.2 The field

| Part | Spec |
|---|---|
| Type | Playfair 400 at `--sf-text-display-md` (`--sf-text-display-sm` below 480px, where the placeholder needs 413px of a 328px field at 28px and fits at 22px), `--sf-leading-heading`, `--sf-tracking-display`; ink, a caramel caret |
| Placeholder | "Search furniture, rooms, brands…", `--sf-color-text-muted` |
| Boundary | no border; a 1px `--sf-color-border-strong` underline (the control boundary, 3.54 : 1, not the decorative stone) that turns `--sf-color-accent` and 2px thick (border + 1px shadow) while the field or its clear button has focus. A transparent outline keeps a ring in forced colours |
| Semantics | `form role="search"`; a visually hidden `<label htmlFor>` "Search products"; `type="search"` (the browser's own cancel button hidden), `autocomplete="off"`, `autocorrect="off"`, `spellcheck="false"`, `enterkeyhint="search"`; Enter goes to `/products?search=<term>` |
| Clear | a 44px `.sf-btn--icon` "Clear search" (sand on hover) while the field holds text; it empties the field and refocuses it |

### 25.3 States

| State | When | Content |
|---|---|---|
| Suggestions | the field is empty | two columns from 768px (stacked below): **Recent**, the `localStorage["recentSearches"]` terms, each a pill holding the term (runs it) and a 32px × (forgets it; 44px tall), with "Clear all" (`.sf-btn--link`, named "Clear all recent searches"); **Popular**, the rule in 25.4. Titles are `h2` eyebrows on a 32px head row, so both columns line up |
| Loading | the catalogue is not here yet, or a query's first search has not settled | six `ProductCardSkeleton`s in the grid, in an `aria-busy` region; the department row as sand pills until the categories arrive; the hairline |
| Results | matches | the count line, then up to `MAX_RESULTS` (12) storefront `ProductCard`s, and "View all N results" (`.sf-btn--ghost`, centred) when more match |
| Nothing matched | no match | the serif line (`.sf-display-sm`) "Nothing matched “q”." (with " in <Department>" when one is pressed), "Try a room, a material or a department." and the department links |
| Unavailable | the catalogue read failed | the serif line "Search is unavailable right now.", "Please check your connection and try again." and a primary "Try again", which reads the catalogue again (a failed read also retries on the next open) |

- While a new query waits for its 300ms debounce, the last results (or the last "nothing matched") stay under the hairline; skeletons only show when there is nothing settled to show, so the grid never flickers between keystrokes.
- The count line's height is held while loading, so the field, the department row, the count and the first card do not move when results replace the skeletons (measured equal in Chromium).

### 25.4 Data rules

- **Popular** (from data only): the names of the first six active products the admin flags `trending`, in catalogue order; a chip runs a search for its name. With none flagged, the departments stand in (`getMainMenuCategories`: the header's six, in menu order), titled **Departments**, each a link to `/products?category=<slug>`. Never a demo list, never counts.
- **Department chips** (`.sf-chip`, `aria-pressed`, one horizontally scrolling row with the column's gutter as edge room): "All" plus each active top-level category, built from the live tree; each matches the category's slug and its descendants', plus name/slug substrings and tags. They appear once there is a query, since they scope a search. A press re-runs the search at once; a second press on the department in force returns to "All".
- **Scoring, caching and recents** are the boilerplate's, moved unchanged into `searchData.js`: name exact 100 / starts-with 80 / word start 60 / contains 40; tags 30 / 20 / 10; category or brand 15; short description 5; trending +3 and hot +2 on a real match only; stable sort. One `products.getAll()` + `categories.getAll()` per session for both instances. Recent searches: newest first, at most 8, de-duplicated case-insensitively; a query is remembered when it is submitted, when "View all" is followed and when a result is followed.
- **Cards:** `ProductCard` without `onAddToCart` or `onToggleWishlist`: one tab stop each (the link), its own placeholder and star handling. A plain click navigates and closes the overlay; a modified click (new tab) leaves it open; both remember the query.
- **The listing agrees.** `/products?search=` filters with `matchesSearch` (any positive score under the same rule), so "View all N results" lands on N products (section 24.6).

### 25.5 Keyboard, focus and announcements

- `role="dialog"`, `aria-modal="true"`, `aria-label="Product search"`; `useFocusTrap` (section 19.1): focus starts in the field; Tab and Shift+Tab stay inside; Escape closes; focus returns to the control that opened the overlay. The bottom bar's Search button is still `inert` at that moment (the bar keys off the scroll lock), so there the bar's own restore (section 19.3) puts focus back once the lock is released. `useBodyScrollLock` locks the page.
- Tab order: field → clear → department chips → result cards → "View all" → close.
- ArrowDown in the field moves to the first result; ArrowUp on the first result returns to the field.
- The status line is `role="status"` + `aria-live="polite"` + `aria-atomic`, always in the DOM: "42 results for “chair”" (figures and the query in ink 500, the rest muted 14px; " in <Department>" when scoped), or the state's serif line as an `h2`. The results list is named by it.
- A route change underneath (back, forward) closes the overlay. A click on the paper never does: the surface has no "outside".

### 25.6 Motion

| What | Values | Reduced motion |
|---|---|---|
| Overlay | opacity 0 → 1, `--sf-duration`, `--sf-ease-out`; out the same with `--sf-ease-in-out` | none |
| Results | opacity 0 → 1 and an 8px rise, `--sf-duration`, `--sf-ease-out`, 40ms apart for the first eight; the rest arrive with the eighth | none |
| Hairline | 2.4s grow-and-retract while busy | still, full width |

### 25.7 Contrast

No new pairs. The overlay uses ink, secondary and muted text on the page, the control boundary (border-strong) and the accent (underline, caret, hairline) on the page, the focus ring, the primary and ghost buttons, the selected chip (primary-contrast on primary), and ink on sand and on primary-soft for the hover states, all already in section 14, and the card's own pairs (section 23.5).

---

## 26. Product page: the primary surface

Written by Prompt 16. Files: `src/pages/ProductDetails/ProductDetails.js` + `.module.css` (the first screen; what follows it is Prompt 17's, section 27), and in `src/components/storefront/`: `ProductGallery` (+ `ProductGallerySkeleton`), `VariantSelector`, `QuantityStepper`, `SocialProof`, `TrustBadges`, `DeliveryReturnsInfo` and `AddToCartBar`, each with its module and tests. `variantUtils.js` is unchanged.

### 26.1 Layout

| Width | Layout |
|---|---|
| < 980px | One column inside `.sf-container--wide`: the trail, the gallery (centred, its frame at most `max(280px, 75vh × 4/5)` wide, so a portrait tablet is not all photograph), then the buy box at full width |
| ≥ 980px | 12 columns, 24px gap: the gallery in columns 1–7, the buy box in 8–12 with 48px (`--sf-space-12`) of padding on its left. The gallery fills its seven columns (no height cap: capping the 4:5 frame to short laptop screens left a hole between it and the buy box) |
| ≥ 1024px | The gallery is sticky at `top: calc(var(--sf-header-height) + 24px)` |

Page padding: 24px above the trail on phones, 32px from 768px; the trail then 16 / 24px above the grid; 48px below the grid. The buy box is a container (`container: pdp-info / inline-size`), so its action row follows its own width (26.4).

### 26.2 Breadcrumb

The shared `Breadcrumb` (section 24.1) with the category's **full trail**, then the product: Home › Plastic Furniture › Essentials › Shoe Racks › Covered Plastic Shoe Rack (every category linked with its canonical `?category=<slug>`).

- **Data:** the page's existing `categories.getById(product.categoryId)`, then one `getById` per ancestor through `parentId` (at most six levels, cycle-safe). A failed or missing read leaves the leaf alone (or nothing, when the leaf read fails): Home › product. No new endpoint.
- **Stability:** the trail's box holds two lines of the 13px trail (plus its 4px row gap) below 768px and one line from 768px, with a skeleton line while the reads run. Below 768px the current-page crumb (the product, named again by the `h1` just below) is visually hidden but stays for assistive technology, so the deepest seeded trail keeps to two lines at 320px. Measured: all 84 products fit their box at 320, 360, 768 and 1024px.

### 26.3 Gallery (`ProductGallery`)

```jsx
import { ProductGallery, ProductGallerySkeleton } from "../../components/storefront";

<ProductGallery images={images} alt={product.name} discount={discount} />
// zoom (default STOREFRONT_CONFIG.gallery.zoom), fit="cover" | "contain", className
```

- **Frame:** 4:5 (`aspect-ratio`), sand, radius sm, a hairline drawn over the photograph's edge (`::after`). Every photograph is stacked in it; the active one is at full opacity and the change is a crossfade over `--sf-duration` (`--sf-ease-out`), instant under reduced motion. `object-fit: cover` by default; `fit="contain"` keeps whole photographs with sand around them, for real photography that needs it.
- **Images:** `width="1200" height="1500"`, `decoding="async"`; the first `loading="eager"` and `fetchpriority="high"` (the page's largest paint), the others lazy. Only the shown image is named ("Name, view 2"); the others have empty alt.
- **The one overlay:** "Sale" as `.sf-badge--paper` (brand ink on brand paper, 16.25 : 1 over any photograph) at the frame's top-left, when the caller's real `discount` is > 0. No percentage badge, no dots.
- **Strip:** 56px square hairline thumbnails (inactive at 60% opacity; the active one with an ink border), a vertical strip beside the frame from 769px (it takes no height of its own and scrolls beside the frame when long) and a horizontal row under it below that, each with 6px of focus room. Hidden when there is one image.
- **Keyboard:** the strip is a `tablist` with one tab stop (the selected thumbnail); the arrow keys (either axis), Home and End move it and the image follows. The frame is a focusable `group` ("Name, image 2 of 3") whose Left/Right arrows step through the images, wrapping (only when there is more than one image). Click and hover on a thumbnail still show its image.
- **Zoom:** scale 2 at the cursor, for a mouse only (`pointerType`), so a tap never leaves the image zoomed; `cursor: zoom-in` under `(hover: hover) and (pointer: fine)`.
- **Swipe:** on touch and pen, a horizontal swipe of 40px or more (and mostly horizontal) steps through the images; `touch-action: pan-y pinch-zoom` leaves vertical scrolling and pinch to the browser. The thumbnails stay the single-pointer alternative.
- **Sizing hook:** `--gallery-max-width` on an ancestor caps the frame; the root is that wide plus the strip beside it, so the page can align it.
- **Loading:** `ProductGallerySkeleton` draws the same frame and strip in sand; the page's skeleton puts it exactly where the loaded gallery lands (measured equal at 360 and 1440px).

### 26.4 The buy box

In order, with the gap above each:

| Part | Spec |
|---|---|
| Eyebrow | the brand, else the category's name (a skeleton while it loads; the line is always held, so the title never moves): 12px, 500, 0.16em, uppercase, muted |
| Title | `h1` `.sf-display-md` (28 → 36px, 1.1), ink; 12px |
| Ratings row | `SocialProof` (26.5); 16px |
| Price | `PriceBlock size="lg"` (section 23.3); the tax line waits for the settings (a no-break space holds its line), so no tax treatment is stated before the store's is known; 20px |
| Summary | `shortDescription`, sans 16px / 1.6, secondary, 52ch; 20px |
| Hairline | 24px above and below |
| Variants | `VariantSelector` (26.5) |
| Quantity and stock | `QuantityStepper` and the stock status, "In stock" (success), "Only N left" (warning) or "Out of stock" (error), sans 14px 500, from the page's derived values only; 24px after the variants |
| Actions | 20px; see below |
| SKU | "SKU: …" 12px muted (the chosen variant's); 12px |
| Hairline | 24px above and below |
| Promises | `TrustBadges variant="grid"` (26.5) |
| Delivery & returns | `DeliveryReturnsInfo` (26.5); 32px |

- **Actions:** `Add to cart` (`.sf-btn--primary --lg --block`; "Added" with a check that settles in over `--sf-duration` for 1.4s; "Out of stock" and disabled at zero stock), `Buy now` (`.sf-btn--ghost --lg`), and the wishlist heart (a 48px hairline circle, `aria-pressed`, "Save to wishlist" / "Remove from wishlist", filled caramel when saved). Below a 26rem (416px) buy box, Add to cart takes its own row and Buy now and the heart share the next; from 26rem (container query) the three share one row. 52px tall below 980px, 56px from 980px. No gradient, no lift: the ink primary turns navy on hover.
- **Announcement:** a visually hidden polite status region says what the shopper chose when they change the variant: "5 shelves, ₹3,449.00, Only 4 left". It stays empty on load.
- **Not touched:** the page's derived values (price, compare price, discount, SKU, stock, low-stock threshold, the quantity ceiling and its clamp, the reviews blend) and the cart wiring (the cart line, `addToCart(line, quantity, options)`, Buy now's `{ openDrawer: false }` and `/checkout`) are byte-identical to the code before this prompt.

### 26.5 Components

- **`VariantSelector`:** each attribute is an eyebrow with the chosen value beside it in ink, over 40px `.sf-chip` pills (ink fill when chosen, from the primitive's `[aria-checked="true"]`; a 44px hit area) or, for colour, shade and finish rows, 28px swatches (the data's `swatchHex`, a 1px `--sf-color-border-strong` boundary so a white swatch still shows on paper, a 2px ink ring 2px clear of the circle when chosen) in 44px targets. Sold out keeps its strike (a hairline across the chip; a paper line with control-tone edges across the swatch, so it reads on any colour) and is disabled; an option that only conflicts with another choice is dimmed and still snaps to a real variant. The chosen variant's note ("Only N left in this option" / "This option is out of stock") is kept. Keyboard: the ARIA radio-group pattern (one tab stop, the chosen option; the arrow keys, Home and End move the choice and skip sold-out options).
- **`QuantityStepper`:** a 44px hairline pill with two 44px round buttons (sand on hover; the focus ring is not clipped) around the figure (sans 16px 500, tabular, a polite live region). It is a `group` named by `label` (default "Quantity"). The 32px `size="sm"` is kept.
- **`SocialProof`:** one row: gold stars at 14px (12px at `sm`), then "4.6 · 12 reviews" in ink; with `onReviewsClick` it is a button styled as a link (a stone underline that turns caramel, a 2px focus outline, a 44px hit area) named "Rated 4.6 out of 5, 12 reviews". With no ratings it says "No reviews yet" in muted text, never "0.0".
- **`TrustBadges`:** no tinted chips and no boxes: a 20px outline icon in the accent beside an eyebrow label in ink (tracking 0.1em up to 480px) over a 13px muted detail; a 2 × 2 grid (`variant="grid"`). A dynamic badge shows only while the live data backs it (no COD while it is switched off, no free shipping without a threshold, no returns at 0 days), the rule the footer and the assurance strip already follow; while `loading` it is a skeleton, so nothing is claimed early. Every badge keeps two lines' room, so the grid does not change height.
- **`DeliveryReturnsInfo`:** a Playfair 20px `h2` ("Delivery & returns", `title` prop) over a list of facts between hairlines: each active method (name and window, "7–10 business days" with an en dash; cost and "Free above ₹X" on the right), then the COD line (with its cap), the returns line and the tax line, each only when the data has it; skeleton rows while `loading`; nothing when there is nothing to say.
- **`AddToCartBar`:** see 26.6. Props: `anchorRef`, `price`, `currency`, `image`, `name`, `detail` (the chosen variant), `disabled`, `ctaLabel` ("Add to cart"), `onAddToCart`. The old `comparePrice` and `onBuyNow` props are gone (the bar shows the price alone and offers only Add to cart).

### 26.6 The sticky bar

- **When:** up to 768px, whenever the buy box's actions are out of view (the unchanged `IntersectionObserver`, `rootMargin: "0px 0px -10% 0px"`): below the fold on load, and again once they have scrolled past. Hidden, it is `aria-hidden` and its button leaves the tab order.
- **Look:** paper (`--sf-color-bg`) with a top hairline, 64px plus the home-indicator inset, `--sf-gutter` sides: a 40px thumbnail (hairline edge), the name in Playfair 15px on one line, the price (sans 14px 500) with the chosen option after a dot (13px muted), and a compact 44px `.sf-btn--primary` (at least 7.75rem wide, so "Added" or "Out of stock" never moves the text). It slides up over `--sf-duration`. No shadow.
- **Stacking:** `--sf-z-stickybar` (60), replacing the old `z-index: 1300`: above the bottom nav (`--sf-z-bottomnav`, 58), which it covers while shown, and below every drawer, sheet and modal (≥ 1000) and the search overlay (1400). Verified with `elementFromPoint` at 360px: the bar over the nav; the opened cart drawer over the bar.
- **Keyboard:** while the bar is shown, `html` gets `scroll-padding-bottom: calc(64px + inset + 16px)` (an `html:has(.visible)` rule), so focused or scrolled-to content stops above the bar instead of under it. If keyboard focus (`:focus-visible`) lands on something the bar covers where it rests (the fixed bottom nav), the bar steps aside until focus moves on.

### 26.7 States

- **Loading:** the page's own layout in sand inside an `aria-busy` container: the trail line, the gallery skeleton, then the buy box's lines (eyebrow, two title lines, ratings, price and tax, two summary lines), the hairline, a chip row, the stepper and status, and the action buttons.
- **Not found:** an in-app state (no redirect): the "Not found" eyebrow, the `h1` "We couldn't find that piece." (`.sf-display-md`), one line, and a primary "Browse all furniture" link to `/products`.

### 26.8 Motion

The gallery's crossfade (`--sf-duration`), the zoom's scale (`--sf-duration-slow`), the "Added" check (opacity and scale 0.6 → 1 over `--sf-duration`) and the sticky bar's slide (`--sf-duration`); all collapse under reduced motion. No lifts: the old hover lifts on the buttons, chips, swatches and thumbnails are gone. The page keeps its fade from before this prompt (Prompt 30's).

### 26.9 Contrast

No new pairs: the surface uses ink, secondary and muted text on the page; the accent (icons, the saved heart) and the focus ring on the page; the control boundary (swatches); the primary and ghost buttons and the selected chip; the gold stars on the page; success, warning and error text on the page; and brand ink on brand paper (the Sale chip), all already in section 14. In forced-colours mode the swatches keep their colours with a `Highlight` ring when chosen, the active thumbnail gets a `Highlight` border, and the sold-out strikes are kept in `CanvasText`.

---

## 27. Product page: below the first screen

Written by Prompt 17. Files: `src/pages/ProductDetails/ProductDetails.js` + `.module.css` (the lower half), `src/pages/ProductDetails/productSpecs.js` (the table's rows), `parseSpecifications` in `src/utils/helpers.js`, and in `src/components/storefront/`: `ReviewsSection`, `FrequentlyBoughtTogether` and `RelatedProducts`, each with tests.

### 27.1 Structure and rhythm

Inside the page's `.sf-container--wide`, after the first screen:

1. The **in-page nav** (27.2), sticky while the next two blocks scroll past;
2. **Details**: the description and its specifications table (27.3);
3. **Reviews** (27.4);
4. **Complete the set**, the curated set on a sand panel (27.5), only when the product has curated companions;
5. **You may also like**, the related rail (27.6), only when there are related products.

- Sections are padded by `--sf-section-y`, with a full-width hairline between neighbours. The first section after the nav has half the top padding (the nav's strip already parts it from the first screen).
- The set has no padding of its own and no rules: the section before and the one after give it room, and its sand panel stands in for the rule on either side.
- The page's last block drops its bottom padding; the footer's gap is `.main-content`'s plus the container's 64px.
- Every section is an `h2` (the details' two are eyebrow-styled); review titles are `h3`. Order: `h1` → `h2` "Delivery & returns" → "About this piece" → "Specifications" → "What customers say." (→ `h3` titles) → "Complete the set." → "You may also like.".

### 27.2 The in-page nav (anchored sections, not tabs)

- `nav aria-label="On this page"`, a list of links: "Details", "Specifications", "Reviews (N)" (N = the ratings count, muted, only when > 0). A link whose section is absent is left out, and with fewer than two the nav is not drawn. The old Description / Reviews tabs (and `activeTab`) are gone: everything is on the page, nothing hides behind a control.
- **Sticky:** `top: var(--sf-header-height)`, `--sf-z-sticky`, on the page tone with an inset bottom hairline (the header closes with its own), spanning the container's gutters too. It belongs to a wrapper that ends after the reviews, so it leaves with them.
- **Links:** 48px tall (`--pdp-nav-height`), eyebrow type (12px, 500, `--sf-tracking-eyebrow`; 0.08em below 480px), secondary text; on hover ink with a 1px ink underline (an inset shadow); focus a 2px `--sf-color-focus` outline inset 2px. 16px apart below 480px, 24px to 767px, 40px from 768px; the three fit from 320px, and the row scrolls sideways if a long count ever needs it.
- **Jumps:** a plain click scrolls the section in (`scrollIntoView`, smooth; `"instant"` under reduced motion) and moves focus to it (`tabIndex={-1}`, no ring: it is not a control), so the next Tab continues from there. No history entry and no hash are added. A modified click (new tab or window) is left to the browser. The buy box's ratings row (`scrollToReviews`) makes the same jump to the reviews.
- **Offsets:** targets carry `scroll-margin-top: var(--pdp-anchor-offset)` = `--sf-header-height` + the nav's 48px + 16px, so their first line lands 16px under the nav; a padded section subtracts its own top padding. From the top of the page at 1024px and up, the header is still at rest when a jump starts and compacts on the way, so the target lands up to 56px lower (never under the nav); jumps made further down land exactly.

### 27.3 Details and the specifications table

- **Layout:** from 980px (the first screen's grid) 12 columns, 24px gap: the description in 1–5 and the table in 7–12 (the table alone takes 1–7); one column below, the description first.
- **About this piece:** an eyebrow `h2`, then the description's prose (`parseSpecifications(description).body`) split on blank lines into paragraphs: sans 16px / `--sf-leading-relaxed`, secondary, 60ch. No description, no section and no "Details" link (never a filler line).
- **Specifications:** an eyebrow `h2` naming a `<table>` (`aria-labelledby`), `table-layout: fixed`: `th scope="row"` at 40% (sans 14px, muted, 400) and the value (15px ink, tabular figures), 12px above and below, a hairline above every row and under the last. Tags are sand pills (12px muted, radius pill), not links.
- **Rows** (`buildSpecRows`): the parsed pairs in their order, then Brand (when set), SKU (the chosen variant's), Weight ("3.2 kg"), Dimensions ("57 × 54 × 80 cm", headed "Dimensions (L × W × H)"; a partial record reads "L 57 × H 80 cm"), Category (the leaf's name) and Tags (trimmed, each once). A field row is left out when it is empty (the admin saves a blank weight as 0) or when a parsed pair already has its name, compared without regard to case or spacing. Units follow the admin's fields (Weight (kg), Length/Width/Height (cm)).
- **`parseSpecifications(description)`** → `{ body, specs }`: only the last paragraph, and only when it starts with "Specifications:"; pairs split on "; " first, then each on its first ": " (a value may hold a colon); a fragment with no "Key: " continues the value before it; CRLF, stray semicolons and spacing are tolerated. Without the paragraph (or with no pair in it), the whole description is the body and `specs` is `[]`.

### 27.4 Reviews (`ReviewsSection`)

```jsx
<ReviewsSection
  ref={reviewsRef}            // the <section>, focusable (tabIndex -1)
  id="product-reviews"        // its heading is product-reviews-title
  reviews={reviews}           // approved reviews (products.getReviews)
  displayAvg={4.7}
  totalRatingsCount={3}
  loading={false}
  error={false}
  onRetry={fetchReviews}
  className={styles.section}  // the page's padding, rule and scroll margin
/>
// eyebrow ("Reviews") and title ("What customers *say*.") can be set
```

- **Layout:** from 980px the heading, summary and bars in columns 1–5 and the reviews in 7–12; one column below.
- **Summary:** the average to one place in Playfair at 48px (lining, tabular; "out of 5" visually hidden), the 18px gold stars (hidden from assistive technology: the figure says it), "Based on N rating(s)" in 14px muted. With no ratings the average is not shown at all: "No reviews yet" (the display-sm serif) and "Reviews come from verified orders and are published after moderation." (14px muted) take its place, once the read has settled.
- **Rating bars:** a list named "Ratings by star", five rows 5 → 1, each `role="img"` named "5 stars: 2 reviews" (singular forms where due): the digit and a 10px star glyph, a 6px sand track with an ink fill as wide as its share (`--share`), the count in muted. Never the star colour. Only once the reviews have loaded and there is at least one.
- **Reviews:** a list of hairline-separated `article`s, 32px either side of each rule: the name (15px, 500, ink; "Anonymous" when missing), "Verified purchase" (an eyebrow in `--sf-color-success` after a check mark, only when `isVerifiedPurchase === true`), the short date in a `<time>` (left out when it does not parse), 14px gold stars, the title as an `h3` (Playfair 18px, 500), the body (16px / 1.7, secondary, 60ch), customer photos (a list, 72px, lazy, "Customer upload 1 of 2"), and "N people found this helpful" (12px muted, only above 0).
- **States:** loading shows two skeleton reviews in an `aria-busy` column with a visually hidden "Loading reviews" (the summary keeps the store's figure meanwhile); a failed read says "Reviews could not be loaded just now." with a ghost "Try again", which reads again and moves focus to the section. No sort control and no form: reviews are written from Order History for delivered pieces and published after moderation.
- **The blend (the page):** the product's `rating` / `totalReviews` are worked out from its approved reviews, the very list `getReviews` returns. Once that list has loaded it is the count and the average; until then, or if the read fails, the aggregate stands in. (They used to be added together, which counted every review twice.) The reviews are kept per product, and a read that settles after the shopper has moved on is dropped.

### 27.5 Complete the set (`FrequentlyBoughtTogether`)

- **Data:** the merchant's `frequentlyBoughtTogetherIds` (`products.getFrequentlyBoughtTogether(product, maxBundle - 1)`, two at most today). A curation, so it is introduced as one ("Curated by us", "Complete the *set*."), never as "customers also bought". Nothing renders without companions.
- **Panel:** `.sf-panel` (sand, radius sm) padded `clamp(24px, 4vw, 48px)`; the eyebrow and a `.sf-display-md` heading, 32px above the pieces.
- **Pieces:** on phones, rows of a 72px thumbnail beside the text; from 600px a row of tiles (11rem, 12rem from 980px) with a "+" (Playfair 24px, muted) centred in the 40px gap. Thumbnails are 4:5 on sand with a hairline frame over the edge, so a sand photograph stays apart from the panel. The anchor's photograph is decoration (empty alt; it is this page); a companion's opens its page.
- **Choosing:** each piece has a `.sf-check` row with its name in Playfair 16px. The anchor's box is ticked and disabled (drawn at full strength: it is part of the set); companions are ticked until the shopper unticks them (an unset choice reads as ticked, so companions that arrive late start ticked). Under the name, described by `aria-describedby`: "This piece", "Sold out" or the option that would be added (`buildCartItem` takes a piece's cheapest option, so the set says which), then the price (15px).
- **Total and add:** "Total for N pieces" (14px secondary) and the sum of the chosen pieces' card prices (20px, tabular) in a polite, atomic live region; a primary "Add N to cart" (lg; full width on phones, beside the total at 600–979px, in columns 9–12 from 980px). It hands each chosen piece to `onAddToCart(buildCartItem(p))`, the page's `addToCart`. There is no bundle discount.
- **Sold out:** a piece whose `stock` is 0 cannot be chosen: its box is unticked and disabled, and it is left out of the total and of the add (the card's rule, as on the home page). With nothing left to add the button is disabled.

### 27.6 You may also like (`RelatedProducts`)

A thin wrapper around the site's one rail: `SectionHeading` (eyebrow "Related", title "You may also *like*.") over `ProductRail` (label "Related pieces", the page's card handlers). It renders nothing without related products; the page reads them with `products.getRelated(product, 10)` (curated, then the same category, then tags and brand). Snap scrolling, the hairline previous/next buttons and the progress line are the rail's (§21.6). Its old scroller and stylesheet are gone.

### 27.7 Motion

`Reveal` on each section: the description, the table (90ms after it), the reviews, the set's panel and the related rail. The nav links' colour and underline change over `--sf-duration`, and the jumps scroll smoothly (instantly under reduced motion). Nothing else moves.

### 27.8 New contrast pairs

| Pairing | Light | Dark | Min |
|---|---|---|---|
| Reviews: rating bar fill (ink) on its sand track (graphic) | 14.64 ✓ | 12.52 ✓ | 3:1 |
| Set: checkbox boundary (border-strong) on the sand panel | 3.19 ✓ | 3.27 ✓ | 3:1 |
| Reviews: empty rating-bar track (sand) vs page | 1.11 | 1.27 | info |
| Set: thumbnail hairline (stone) vs the sand panel | 1.29 | 1.50 | info |

Every other pairing here is already in §14: ink, secondary and muted text on the page and on sand (the tags, the set), the gold stars on the page, the success tone on the page (the verified mark), the accent and the check mark on it, the focus ring on the page and on sand, and the primary and ghost buttons.
