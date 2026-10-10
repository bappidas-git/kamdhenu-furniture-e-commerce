// Content and configuration for the home page's editorial slots. Replace
// values here, never inline copy or media in components. Prompt 10 added
// HERO; Prompt 11 the discovery sections (HOME_SECTIONS, SPACES, STORY,
// COMPLETE_THE_SPACE); Prompt 12 the closing half (the brands, reviews, press
// and promise headings in HOME_SECTIONS, PROMISE_STEPS, MARQUEE_PHRASES,
// CLOSING_CTA).
//
// Conventions (shared with brandContent.js):
// - One accent word per display headline is marked `*word*`; renderAccent()
//   (src/components/ui) sets it in the italic accent.
// - Links are router paths (`to`), never full URLs to this site.
// - Media is an object with explicit `width`/`height` (the intrinsic size of
//   the file) so its box is reserved before the file arrives. Until real
//   photography is supplied, images are placehold.co files in the placeholder
//   tones (prompts/DESIGN_SYSTEM.md, "Image placeholder tones").

import { HERO_HEADLINES, HERO_SUPPORT_LINES } from "./brandContent";

// The hero photograph: 2400 × 1350 (16:9). To use real photography, replace
// this URL (and the alt text below); nothing else changes. The same file is
// the video poster, so a film can be added later without a second image.
const HERO_IMAGE = "https://placehold.co/2400x1350/f1ebe1/686158?text=Hero+photograph";

export const HERO = {
  eyebrow: "A & S Urbanseat", // optional: omit or "" to hide
  headline: HERO_HEADLINES[0], // proposed copy, pending client approval
  support: HERO_SUPPORT_LINES[0], // 14 words or fewer
  primaryCta: { label: "Shop the collection", to: "/products" },
  secondaryCta: { label: "Our story", to: "/about" }, // optional: null to hide
  media: {
    image: {
      src: HERO_IMAGE,
      // Describe the photograph that replaces the placeholder.
      alt: "Placeholder for the hero photograph",
      width: 2400,
      height: 1350,
      // Optional responsive set for real photography, e.g.
      // srcSet: "hero-1200.jpg 1200w, hero-2400.jpg 2400w", sizes: "100vw"
    },
    // src: an MP4 (muted, looping, a few seconds) or null for the image only.
    // It plays only without the reduced-motion preference, and the image stays
    // underneath as its fallback.
    video: { src: null, poster: HERO_IMAGE },
    // CSS object-position: the point of the photograph that must stay in
    // frame as the hero crops it (wide desktops, tall phones).
    focalPoint: "50% 60%",
  },
};

// ── Discovery (Prompt 11) ─────────────────────────────────────────────────────

// Section headings for the discovery half of the page. `viewAll` is the
// heading's link (valid listing targets only: /products, ?sort=newest,
// ?sort=popular, ?sort=rating); `railLabel` names the carousel for screen
// readers.
export const HOME_SECTIONS = {
  spaces: { eyebrow: "Shop by space", title: "Furniture for every *room*." },
  featured: {
    eyebrow: "Featured",
    title: "Pieces we *recommend*.",
    viewAll: { label: "View all", to: "/products" },
    railLabel: "Featured pieces",
  },
  // Lists the products the admin flags as trending; the copy claims no
  // numbers (no views, no "N sold") and no customer behaviour the flag
  // cannot back.
  trending: {
    eyebrow: "Trending",
    title: "Pieces of the *moment*.",
    viewAll: { label: "View all", to: "/products?sort=popular" },
    railLabel: "Trending pieces",
  },
  recentlyViewed: { eyebrow: "Recently viewed", railLabel: "Recently viewed pieces" },
  // Prompt 12. The brands strip lists the catalogue's own `brand` values as
  // text (no logos, no "trusted by"); its eyebrow is the section's h2.
  brands: { eyebrow: "Brands we carry" },
  // Approved reviews of the featured pieces; the section is hidden when there
  // are none. `carouselLabel` names the carousel for screen readers.
  reviews: {
    eyebrow: "From our customers",
    title: "Comfort, *in their words*.",
    carouselLabel: "Customer reviews",
  },
  // Shown only once press or client logos have a data source (there is none
  // today: prompts/00_INDEX.md, "Open questions and deviations", item 7).
  press: { eyebrow: "As featured in" },
  promise: { eyebrow: "Our promise", title: "How it *works*." },
};

// "Shop by space": one tile per space, in this order. The tile shows the
// category's own admin-managed image and links to its listing
// (/products?category=<slug>); a space whose category is missing or inactive
// is skipped, never shown as a broken link. `line` must describe what the
// linked listing holds.
export const SPACES = [
  {
    key: "home",
    label: "Home",
    line: "Sofas, beds, dining and storage.",
    categorySlug: "home-furniture",
  },
  {
    key: "office",
    label: "Office",
    line: "Task, executive and waiting chairs.",
    categorySlug: "office-chairs",
  },
  {
    key: "cafe",
    label: "Café & Restaurant",
    line: "Hard-wearing chairs for busy service.",
    categorySlug: "cafe-restaurant-chairs",
  },
  {
    key: "outdoor",
    label: "Outdoor",
    line: "For verandas, lawns and terraces.",
    categorySlug: "outdoor-furniture",
  },
];

// Editorial story blocks, rendered image-and-text in alternation: STORY[0]
// after "Shop by space" (image left), STORY[1] after "Complete the space"
// (mirrored). Images are 1200 × 1500 (4:5); replace `src` and describe the
// real photograph in `alt`. Copy is proposed and pending client approval.
const storyImage = (text) => `https://placehold.co/1200x1500/f1ebe1/686158?text=${text}`;

export const STORY = [
  {
    eyebrow: "At home",
    title: "Built for the *everyday*.",
    body: "Sofas to sink into after work, beds for long nights and dining tables that seat the whole family. We choose each piece for the way it is used day to day, not only for how it looks on the day it arrives.",
    cta: { label: "Shop home furniture", to: "/products?category=home-furniture" },
    image: {
      src: storyImage("Living-room+photograph"),
      alt: "Placeholder for a living-room photograph",
      width: 1200,
      height: 1500,
    },
  },
  {
    eyebrow: "Our workshop",
    title: "Made by people we *know*.",
    body: "Some of our pieces are made in our own workshop; the rest come from makers we know well. Either way, we choose each one to hold up to everyday use.",
    cta: { label: "Read our story", to: "/about" },
    image: {
      src: storyImage("Workshop+photograph"),
      alt: "Placeholder for a photograph of our workshop",
      width: 1200,
      height: 1500,
    },
  },
];

// "Complete the space": one product shown large with the pieces that suit it.
// - anchorProductSlug: the anchor. If it cannot be loaded (renamed, inactive,
//   removed), the first featured product with frequentlyBoughtTogetherIds
//   anchors instead.
// - Companions are the anchor's admin-curated frequentlyBoughtTogetherIds;
//   when those give fewer than two, related products top them up (to four).
//   With no anchor, or fewer than two companions, the section is hidden.
// - "Add all to cart" adds each piece at the price its card shows (the
//   cheapest variant), so choose an anchor whose companions do not depend on
//   a size: the King Size Bed's mattress, for example, would be added in
//   Single size.
// - totalLabel: {count} and {total} are filled from the pieces being added.
export const COMPLETE_THE_SPACE = {
  anchorProductSlug: "ergonomic-high-back-chair-with-headrest",
  eyebrow: "Complete the space",
  title: "Pieces that belong *together*.",
  intro: "One piece we like, and the pieces we would set beside it.",
  companionsLabel: "Pairs well with",
  viewLabel: "View",
  addAllLabel: "Add all to cart",
  addAvailableLabel: "Add the available pieces",
  totalLabel: "{count} pieces, {total}",
};

// ── Social proof, explainer and closing CTA (Prompt 12) ───────────────────────

// "Our promise": three steps, in this order, each with a 4:5 image (1200 ×
// 1500; replace `src` and describe the real photograph in `alt`). The
// numerals (01, 02, 03) come from the order. `dataKey` names the live data
// the step's body may use:
//   payment   cod: true while settings.payment.codEnabled; it gates the
//             sentences marked `requires: "cod"` and is never printed
//   delivery  {days}: the active Standard method's estimatedDays ("7–10");
//             {threshold}: the lowest free-delivery threshold of the active
//             methods, as resolveTrustBadgeDetail("freeShipping") words it,
//             in sentence case ("above ₹9,999", the strip's and footer's
//             amount)
//   returns   {returns}: STOREFRONT_CONFIG.returnsWindowDays, only when > 0
// `body` is a list of sentences, shown in order. A sentence with
// {placeholders} appears only when every one of them has a live value, and
// `{ text, requires: "cod" }` only while that value is true; nothing is ever
// shown with a guessed number. `fallback` is used when no sentence survives.
// Copy is proposed and pending client approval.
const promiseImage = (text) => `https://placehold.co/1200x1500/f1ebe1/686158?text=${text}`;

export const PROMISE_STEPS = [
  {
    dataKey: "payment",
    eyebrow: "Order",
    title: "Pay the way that suits you",
    body: [
      "Check out securely online with cards, UPI or net banking.",
      {
        text: "Or choose Cash on Delivery and pay when your furniture arrives.",
        requires: "cod",
      },
    ],
    image: {
      src: promiseImage("Ordering+photograph"),
      alt: "Placeholder for a photograph of someone choosing a chair",
      width: 1200,
      height: 1500,
    },
  },
  {
    dataKey: "delivery",
    eyebrow: "Delivery",
    title: "Brought to your door",
    body: [
      "Standard delivery brings your order to your door in {days} business days.",
      "Orders {threshold} ship free.",
    ],
    fallback: "We bring your order to your door.",
    image: {
      src: promiseImage("Delivery+photograph"),
      alt: "Placeholder for a photograph of a sofa being delivered",
      width: 1200,
      height: 1500,
    },
  },
  {
    dataKey: "returns",
    eyebrow: "After delivery",
    title: "Time to settle in",
    body: [
      "Eligible pieces can be returned within {returns} days of delivery.",
      "If anything is not right, talk to us.",
    ],
    image: {
      src: promiseImage("At-home+photograph"),
      alt: "Placeholder for a photograph of a furnished living room",
      width: 1200,
      height: 1500,
    },
  },
];

// The slow ribbon of brand phrases above the closing CTA (decorative: screen
// readers get them once, as a plain list). Phrases only: no claims, numbers
// or offers. Four to six short lines read best; an empty list hides it.
export const MARQUEE_PHRASES = [
  "Made for living",
  "Chosen with care",
  "Comfort that lasts",
  "For every room",
  "At home, at work, outdoors",
];

// The page's closing statement, on navy, directly above the footer's
// newsletter band (so it carries no form of its own). `title` takes one
// `*accent*` word; `secondary: null` hides the second button.
export const CLOSING_CTA = {
  eyebrow: "When you’re ready",
  title: "Find the piece that *fits*.",
  line: "Browse the full collection, or talk to us about the space you are furnishing.",
  primary: { label: "Shop the collection", to: "/products" },
  secondary: { label: "Talk to us", to: "/support" },
};

const homeContent = {
  HERO,
  HOME_SECTIONS,
  SPACES,
  STORY,
  COMPLETE_THE_SPACE,
  PROMISE_STEPS,
  MARQUEE_PHRASES,
  CLOSING_CTA,
};
export default homeContent;
