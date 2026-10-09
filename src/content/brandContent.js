// Proposed brand copy, pending client approval. Replace values here, never
// inline copy in components.
//
// Grounded in how the business describes itself on its existing site (own
// manufacturing, "Quality First", "Customer Focused", "Trust & Reliability",
// brands carried: Nilkamal, Carlton, Winsome). No claim here states a number
// of years, a warranty or a customer count: those wait for client confirmation
// (see prompts/BUILD_LOG.md, Prompt 02).
//
// Accent words are marked `*word*`; the display primitives render them in the
// italic accent style. Templates use `{placeholder}` tokens that the consuming
// prompt fills from live `settings` / `shipping_methods` data; an item whose
// placeholder has no live value should be hidden, not shown with a guess.

// One sentence for the About page and the footer.
export const BRAND_PROMISE =
  "Furniture made to be lived with, from our own workshop and the makers we trust.";

// Hero headline candidates (Prompt 10 picks one; the client approves).
export const HERO_HEADLINES = [
  "Seating for the way you *live*.",
  "Comfort, *quietly* made.",
  "Rooms that feel *finished*.",
];

// Hero support-line candidates (each 14 words or fewer).
export const HERO_SUPPORT_LINES = [
  "Chairs, sofas and tables for homes, offices, cafés and the open air.",
  "Made in our own workshop, alongside brands we trust, and built for everyday use.",
  "Considered furniture for every room you live, work and gather in.",
];

// One line above the newsletter form.
export const NEWSLETTER_LINE =
  "New pieces, care notes and the occasional offer. A few letters a month, nothing more.";

// About page introduction (2–3 sentences).
export const ABOUT_INTRO =
  "A & S Urbanseat makes and selects furniture for the places people spend their days: homes, offices, cafés and outdoor spaces. Some of what we sell is made in our own workshop; the rest comes from makers we know well, such as Nilkamal, Carlton and Winsome. We put quality first, keep the customer at the centre and build trust one piece at a time.";

// About page (/about, "Our story"; Prompt 28). It states only what the
// client's existing site says: furniture for homes and offices, an own
// workshop for some wooden pieces, the brands carried, based in Assam. No
// years in business, customer counts or warranties until confirmed.
//
// The page's h1 (display-lg; one *accent* word).
export const ABOUT_HEADLINE = "Furniture made to be *lived* with.";

// Two image-and-text blocks, the second mirrored. Images are 1200 × 1500
// (4:5) placeholders in the placeholder tones; replace `src` and describe the
// real photograph in `alt`.
const aboutImage = (text) => `https://placehold.co/1200x1500/f1ebe1/686158?text=${text}`;

export const ABOUT_STORY = [
  {
    id: "workshop",
    eyebrow: "Our workshop",
    title: "Made in our *own* workshop.",
    body: [
      "Some of our wooden pieces, such as sofas and tables, are made in our own workshop. Making them ourselves means we know how each one is put together.",
    ],
    image: {
      src: aboutImage("Our+workshop"),
      alt: "Placeholder for a photograph of the workshop",
      width: 1200,
      height: 1500,
    },
  },
  {
    id: "makers",
    eyebrow: "The makers we carry",
    title: "Brands we *know* well.",
    body: [
      "Alongside our own pieces, we carry furniture from makers we know well: plastic chairs, tables and sofas from Nilkamal, mattresses from Carlton and Nilkamal, and office, computer and reading tables from Winsome.",
      "We are based in Assam, and we furnish homes, offices, cafés and outdoor spaces.",
    ],
    image: {
      src: aboutImage("Furnished+room"),
      alt: "Placeholder for a photograph of a furnished room",
      width: 1200,
      height: 1500,
    },
  },
];

// "What we care about": the existing site's three value statements (Quality
// First, Customer Focused, Trust & Reliability), in the brand voice.
export const ABOUT_VALUES = {
  eyebrow: "What we care about",
  title: "Three things we *hold* to.",
  items: [
    {
      id: "quality",
      title: "Quality first",
      body: "We choose materials, makers and finishes for how they hold up to everyday use, not only for how they look on the day they arrive.",
    },
    {
      id: "customer",
      title: "Customer focused",
      body: "We listen first. Tell us about the room you are furnishing, and we will help you find the pieces that suit it.",
    },
    {
      id: "trust",
      title: "Trust & reliability",
      body: "Clear prices, plain descriptions and policies you can read before you buy, so you always know what to expect.",
    },
  ],
};

// The closing line and its ghost button.
export const ABOUT_CLOSING = {
  line: "Chairs, sofas, beds and tables for every room, in one place.",
  cta: { label: "Browse the collection", to: "/products" },
};

// Assurance items (strip, trust bar, cart). `detail` is a template: fill the
// `{tokens}` from live data, and hide the item when the value is unavailable.
//   {threshold}  lowest shipping_methods[].freeAbove, formatted with formatCurrency
//   {days}       STOREFRONT_CONFIG.returnsWindowDays (hide when 0)
// COD shows only when settings.payment.codEnabled is true.
// The home page's AssuranceStrip prints `label` with the detail beneath it.
// For delivery it prints resolveTrustBadgeDetail("freeShipping") from
// src/theme/tokens.js ("Above ₹9,999") rather than the template, so the label
// is not repeated and the strip, footer and product page show one amount.
export const ASSURANCE_ITEMS = [
  {
    id: "delivery",
    label: "Free delivery",
    detail: "Free delivery above {threshold}",
  },
  {
    id: "returns",
    label: "Easy returns",
    detail: "{days}-day returns on eligible pieces",
  },
  {
    id: "securePayment",
    label: "Secure payment",
    detail: "Encrypted checkout for cards, UPI and net banking",
  },
  {
    id: "cod",
    label: "Cash on delivery",
    detail: "Pay when your furniture arrives",
  },
];

const brandContent = {
  BRAND_PROMISE,
  HERO_HEADLINES,
  HERO_SUPPORT_LINES,
  NEWSLETTER_LINE,
  ABOUT_INTRO,
  ABOUT_HEADLINE,
  ABOUT_STORY,
  ABOUT_VALUES,
  ABOUT_CLOSING,
  ASSURANCE_ITEMS,
};
export default brandContent;
