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
  "A & S Urbanseat makes and selects furniture for the places people spend their days: homes, offices, cafés and outdoor spaces. Much of what we sell comes from our own workshop; the rest comes from makers we know well, such as Nilkamal, Carlton and Winsome. We put quality first, keep the customer at the centre and build trust one piece at a time.";

// Assurance items (strip, trust bar, cart). `detail` is a template: fill the
// `{tokens}` from live data, and hide the item when the value is unavailable.
//   {threshold}  lowest shipping_methods[].freeAbove, formatted with formatCurrency
//   {days}       STOREFRONT_CONFIG.returnsWindowDays (hide when 0)
// COD shows only when settings.payment.codEnabled is true.
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
  ASSURANCE_ITEMS,
};
export default brandContent;
