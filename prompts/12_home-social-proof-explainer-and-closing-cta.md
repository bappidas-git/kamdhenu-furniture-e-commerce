# Home social proof, explainer and closing CTA

**Prompt 12 of 34**

## Depends on

Prompts 01–08, 10, 11 (home structure, `homeContent.js`, `SectionHeading`, `Reveal`, footer newsletter band).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The admin panel must not change.

## Objective

Finish the home page with honest social proof (a "Brands we carry" strip from catalogue data, a customer-review carousel from approved reviews, and an "As featured in" slot that stays hidden because the data has no source for it), a three-step "Our promise" explainer with imagery, an optional restrained marquee of brand phrases, and a large closing brand CTA that sits above the footer's newsletter band.

## Scope — files and areas to touch

- `src/pages/Home/Home.js` + `Home.module.css`: the sections after Prompt 11's "Recently viewed" rail up to the footer.
- `src/components/CTASection/CTASection.js` + `.module.css`: orphan today (gradient banner with "Discover Amazing Deals"); revive as the closing brand CTA (props `eyebrow`, `title` with `*accent*`, `line`, `primary: { label, to }`, `secondary`, `tone="paper"|"sand"|"navy"`).
- `src/components/storefront/SocialProof.js`: read-only (Prompt 17 owns it on the product page); the home carousel is a new component.
- New: `src/components/storefront/ReviewCarousel.js` + module (props `reviews`, `loading`, `error`; each slide: serif quote ≤ 240 chars, star rating via `StarRating`, reviewer name as stored (`userName`), "Verified purchase" only when `isVerifiedPurchase`, product name link; honest empty state), `src/components/storefront/BrandStrip.js` (props `brands` string[]; text wordmarks in the eyebrow style separated by dot dividers; renders nothing when empty), `src/components/ui/Marquee.js` (optional; props `items`, `speed`; pauses on hover/focus, static list under reduced motion, `aria-hidden` duplicate track).
- `src/content/homeContent.js`: add `PROMISE_STEPS` (3 × `{ eyebrow, title, body, image: { src, alt }, dataKey }` where `dataKey` ∈ `"delivery" | "payment" | "returns"` lets the body template pull live numbers), `MARQUEE_PHRASES` (4–6 short brand phrases, optional), `CLOSING_CTA` (eyebrow, title with accent, line, CTAs).
- `src/utils/constants.js`: `WHY_CHOOSE_US` becomes unused after this prompt; delete it only if a grep proves no other consumer (`AboutUs.js` uses it until Prompt 28; if so leave it and note it).

Do not touch: Prompt 10/11 sections, `Footer`, `Newsletter`, `ProductCard`, `api.js`, `db.json`, admin.

## Data rules (the whole point of this prompt)

- **Brands we carry**: distinct non-empty `product.brand` values from `apiService.products.getAll()` (one call, cached in state; the home page already loads featured/trending, so add this call with `.catch(() => [])`), sorted alphabetically, rendered as text; the catalogue currently yields `A & S Urbanseat`, `Carlton`, `Nilkamal`, `Winsome`. If the storefront's own brand appears, show it last and styled the same. Section heading eyebrow "Brands we carry"; no logos (none are licensed or available), no "trusted by" phrasing.
- **As featured in / press / client logos**: there is no collection or settings field for press or clients in `db.json`, and the schema must not be extended. Implement the slot as a component that renders nothing (`return null`) unless it is handed a non-empty `items` array, wire it with an empty array, and leave a comment pointing to `00_INDEX.md` "Open questions" (press logos need a data source before they can appear). Do not hardcode names.
- **Customer reviews**: approved reviews only. The storefront API exposes reviews per product (`apiService.products.getReviews(productId)` → approved only), so fetch reviews for the featured products already loaded (max 8 calls, `Promise.all`, `.catch(() => [])`), flatten, sort by `createdAt` desc, keep up to 10 with a `body` of at least 40 characters, and attach each product's name/slug for the link. No fallback copy, no invented quotes: with zero reviews the section shows the honest empty state ("No customer reviews yet.") in the muted eyebrow style, or hides entirely (choose hide, since an empty review block adds no value; document it).
- **Our promise steps**: three steps whose numbers come from live data via `dataKey`: delivery → the Standard method's `estimatedDays` and min `freeAbove` from `apiService.shipping.getMethods()` (reuse `resolveTrustBadgeDetail`), payment → `settings.payment.codEnabled` (mention COD only when true) and "secure online payment", returns → `STOREFRONT_CONFIG.returnsWindowDays` (hide the number when 0). Bodies are templates in `homeContent.js` with `{threshold}`, `{days}`, `{returns}` placeholders filled at render; a step whose data is missing renders without the number, never with a guess.
- **Marquee**: brand phrases only (no claims, no numbers), e.g. "Made for living · Chosen with care · Comfort that lasts"; include only if it suits the page rhythm; it is decorative (`aria-hidden`) with a visually-hidden plain list for screen readers.

## Brand and design requirements

1. **Brands we carry**: a single hairline-bounded row, eyebrow label left, wordmarks right (sans 13px uppercase tracked, muted), wrapping on mobile.
2. **Customer reviews carousel**: sand background section; `SectionHeading` (eyebrow "From our customers", title "Comfort, *in their words*."); one slide visible on mobile, two on tablet, three on desktop; snap scrolling with hairline prev/next buttons and dot indicators (`aria-label="Review N of M"`); slide = serif quote (22px), stars, name + verified mark, product link; no avatars (no photo data), no invented locations or dates beyond `createdAt` (short date).
3. **Our promise explainer**: `SectionHeading` (eyebrow "Our promise", title "How it *works*."); three columns (stacked on mobile), each with a 4:5 image placeholder (reserved ratio, lazy), a small serif numeral "01/02/03", title (serif 24px), body (sans 15px). Hover/focus on a step gently lifts its image (translateY −4px) on pointer devices only; `Reveal` stagger 90ms.
4. **Marquee** (optional): hairline top/bottom, 48px tall, eyebrow type, 60s linear loop.
5. **Closing CTA**: navy tone (`CTASection tone="navy"`, white logo mark optional but not required), display-xl title from `CLOSING_CTA` with the italic accent, one line, primary `.sf-btn--paper` "Shop the collection" → `/products` and ghost "Talk to us" → `/support`; min-height 420px desktop; this block ends the page content, directly above the footer's newsletter band (Prompt 08), so no newsletter form here.
6. Remove the "Why Choose {APP_NAME}" grid from Home (replaced by the explainer).

## Functional guardrails

1. **Preserve functionality and the data/API contract**: only existing `apiService` functions (`products.getAll`, `products.getReviews`, `shipping.getMethods`, `settings.get`); no new endpoints or fields; no schema extension for press logos.
2. **Tokens only**: zero colour literals in all touched modules.
3. **Admin untouched.**
4. **Brand consistency**: serif quotes, hairlines, sand/navy surfaces, no gradients, no star-rating inflation.
5. **Responsive and accessible**: carousel semantics (`aria-roledescription="carousel"`, slides `role="group" aria-label`), buttons labelled, marquee hidden from AT with a text alternative, heading order maintained, 44px controls.
6. **No fabricated trust signals**: reviews only from approved data; brands only from data; press slot empty; promise numbers only from settings/shipping/config.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–11), `prompts/DESIGN_SYSTEM.md`; then `Home.js`, `CTASection.js`, `StarRating.js`, `ReviewsSection.js` (review field names: `userName`, `rating`, `title`, `body`, `isVerifiedPurchase`, `createdAt`, `photos`), `src/theme/tokens.js`, `src/content/brandContent.js`.
2. Keep review fetching lazy: start it only when the carousel section scrolls near (IntersectionObserver via `Reveal`'s `onInView` callback or a small hook), so the home page's initial network stays light.
3. For the closing CTA on dark mode, the navy tone stays navy; verify the paper button contrast.

## Acceptance criteria

- [ ] Brands strip from data; review carousel from approved reviews of featured products with a correct empty behaviour; press slot renders nothing; promise steps show live numbers; closing CTA above the footer band; `WHY_CHOOSE_US` grid removed from Home.
- [ ] All copy in `homeContent.js`/`brandContent.js`, none inline.
- [ ] Zero colour literals; both modes verified; carousel accessible.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: `/` bottom half; approve/reject a review in Admin → Reviews and confirm the carousel follows after reload (restore the data); set `codEnabled: false` temporarily to see the payment step adapt (restore).
2. Widths 360, 768, 1024, 1440.
3. Keyboard and screen reader on the carousel and the marquee alternative; reduced motion stops the marquee.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance.
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 12 — Home social proof, explainer and closing CTA`: what changed, the review-sourcing rule, the hidden press slot, marquee decision, `WHY_CHOOSE_US` status, deviations, client confirmations (promise copy, closing CTA copy, whether press/client logos exist).
