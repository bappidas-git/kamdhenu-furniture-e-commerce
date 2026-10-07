// Content and configuration for the home page's editorial slots. Replace
// values here, never inline copy or media in components. Prompt 10 adds HERO;
// Prompts 11 and 12 add their sections below it.
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

const homeContent = { HERO };
export default homeContent;
