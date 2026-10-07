// Home page editorial slots: copy, links and media for each section, in one
// place. Swap photography or copy here; the components read this module and
// never inline their own. Prompt 10 adds HERO; Prompts 11 and 12 add theirs.
//
// Copy comes from brandContent.js (the client-approved lines), never
// duplicated here. Headlines mark one accent word as `*word*` (renderAccent).

import { HERO_HEADLINES, HERO_SUPPORT_LINES } from "./brandContent";

// Placeholder media until the client's photography arrives, in the neutral
// placeholder tones (DESIGN_SYSTEM.md, section 11). Replacing the hero image
// is a one-line change to `media.image.src` (keep width/height in step with
// the real file); setting `media.video.src` switches the hero to a muted,
// looping video with `poster` as its first frame.
const HERO_PLACEHOLDER =
  "https://placehold.co/2400x1350/f1ebe1/686158?text=Hero+Photograph";

export const HERO = {
  eyebrow: "A & S Urbanseat",
  headline: HERO_HEADLINES[0],
  support: HERO_SUPPORT_LINES[0],
  primaryCta: { label: "Shop the collection", to: "/products" },
  secondaryCta: { label: "Our story", to: "/about" },
  media: {
    image: {
      src: HERO_PLACEHOLDER,
      alt: "Placeholder for the hero photograph",
      width: 2400,
      height: 1350,
    },
    video: { src: null, poster: HERO_PLACEHOLDER },
    // CSS object-position: keep the subject in frame as the hero crops
    // from landscape (desktop) to portrait (phones).
    focalPoint: "50% 60%",
  },
};

const homeContent = { HERO };
export default homeContent;
