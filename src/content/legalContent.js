// =============================================================================
// Legal content: the four policy pages (Prompt 28)
// =============================================================================
// DRAFTS FOR LEGAL REVIEW. None of this text has been approved by A & S
// Urbanseat or its legal adviser. It is written for a furniture business in
// India and describes what this storefront actually does today (what it
// stores, how orders, cancellations and refunds work), so the client can
// review one file.
//
// - Each document has `draft: true`, which shows "Draft for legal review" on
//   its page. Set it to false once that document is approved.
// - Lines marked "CONFIRM:" need a decision from the client. Every one is
//   listed in prompts/BUILD_LOG.md (Prompt 28, "Needs client confirmation").
// - `{ placeholder }` segments are facts nobody has supplied yet. They render
//   as a visible, muted blank ("to be confirmed"), never as a guess.
// - The returns window comes from STOREFRONT_CONFIG.returnsWindowDays, the
//   number the trust badges, the cart and Order History also use.
//
// Shape
//   { id, crumb, eyebrow, title, intro, draft, sections }
//   sections: [{ id, heading, blocks }]   (id becomes the heading's anchor)
//   blocks:
//     { type: "p", text }
//     { type: "list", items: [text] }       an unordered list
//     { type: "steps", items: [text] }      an ordered list
//     { type: "table", caption, columns: [string], rows: [[text]] }
//                                           the first cell of a row is its header
//   text (and every list item and table cell) is rich text: a string, or an
//   array of strings and segments:
//     { label, to }       a router link inside the site ("/support")
//     { label, href }     mailto: and tel: links
//     { placeholder }     a visible blank, e.g. "to be confirmed"
//
// Rendered by src/components/ContentPage/PolicyPage.js.
// =============================================================================

import { APP_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from "../utils/constants";
import { STOREFRONT_CONFIG } from "../theme/tokens";

// --- Shared pieces -----------------------------------------------------------

const RETURN_DAYS = Number(STOREFRONT_CONFIG.returnsWindowDays) || 0;
// "7 days"; null when the store accepts no change-of-mind returns.
const RETURN_WINDOW = RETURN_DAYS > 0 ? `${RETURN_DAYS} day${RETURN_DAYS === 1 ? "" : "s"}` : null;

const EMAIL = { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` };
const PHONE = { label: SUPPORT_PHONE, href: `tel:${SUPPORT_PHONE.replace(/[^\d+]/g, "")}` };
const SUPPORT_FORM = { label: "support form", to: "/support" };
const RETURNS_FORM = { label: "support form", to: "/support?category=returns" };
const MY_ORDERS = { label: "My orders", to: "/orders" };
const TO_CONFIRM = { placeholder: "to be confirmed" }; // inside a sentence
const TBC = { placeholder: "To be confirmed" }; // on its own (a table cell)

// --- Privacy policy ----------------------------------------------------------

export const PRIVACY_POLICY = {
  id: "privacy",
  crumb: "Privacy policy",
  eyebrow: "Policies",
  title: "Privacy policy",
  intro: `How ${APP_NAME} collects, uses and looks after your personal information when you browse, order or get in touch.`,
  draft: true,
  sections: [
    {
      id: "who-we-are",
      heading: "Who we are",
      blocks: [
        {
          // CONFIRM: "based in Assam, India" (the store's only known address).
          type: "p",
          text: `This website is run by ${APP_NAME}, a furniture business based in Assam, India. In this policy, “we” and “us” mean ${APP_NAME}.`,
        },
        // CONFIRM: the registered business name and full postal address.
        { type: "p", text: ["Our registered business name and address are ", TO_CONFIRM, "."] },
      ],
    },
    {
      id: "what-we-collect",
      heading: "What we collect",
      blocks: [
        { type: "p", text: "We collect only what we need to sell and deliver furniture to you:" },
        {
          type: "list",
          items: [
            "Account details: your name, email address and mobile number, and your password, when you create an account.",
            "The delivery and billing addresses you save or enter at checkout.",
            "Order details: the pieces you order, the delivery and payment methods you choose, the amounts paid, and any coupon or store credit used.",
            // CONFIRM: the payment partner (Razorpay and Stripe are both switched off in the store settings today).
            "Payment records: the payment method, amount and status. Online payments are handled by our payment partner; we do not keep your full card or bank account details.",
            "Messages you send through our support form, with the name, email address, phone number and order number you give us.",
            "Your email address, if you sign up for our newsletter.",
            "Reviews you write, and the name we show with them.",
            [
              "Information kept in your browser, such as your cart and your theme choice. Our ",
              { label: "Cookie policy", to: "/cookies" },
              " explains it.",
            ],
          ],
        },
      ],
    },
    {
      id: "how-we-use-it",
      heading: "How we use it",
      blocks: [
        {
          type: "list",
          items: [
            "To take, deliver and keep track of your orders, and to handle cancellations, returns, refunds and store credit.",
            "To run your account, your saved addresses and your wishlist.",
            "To reply when you contact us.",
            // CONFIRM: which order emails the store sends (the order confirmation page promises tracking details by email).
            "To tell you about your orders, for example when an order ships.",
            "To send our newsletter, only if you have signed up for it.",
            "To moderate and publish reviews.",
            "To keep the website secure and working, and to meet our legal, tax and accounting obligations.",
          ],
        },
      ],
    },
    {
      id: "sharing",
      heading: "Who we share it with",
      blocks: [
        { type: "p", text: "We share personal information only when it is needed to serve you:" },
        {
          type: "list",
          items: [
            "Delivery partners, such as courier companies, receive your name, delivery address and phone number so they can deliver your order.",
            "Payment partners process online payments.",
            "Service providers that host our website, store our data or deliver our images do so on our instructions.",
            "Government authorities, courts and regulators, when the law requires it.",
          ],
        },
        { type: "p", text: "We do not sell your personal information." },
      ],
    },
    {
      id: "security",
      heading: "How we protect it",
      blocks: [
        {
          type: "p",
          text: "We use reasonable security measures, such as encrypted connections and restricted access, to protect your information. No website or database is completely secure, so we cannot promise that information will never be lost or misused.",
        },
      ],
    },
    {
      id: "retention",
      heading: "How long we keep it",
      blocks: [
        {
          // CONFIRM: the retention periods.
          type: "p",
          text: "We keep your account details while your account is open. We keep order and payment records for as long as tax and accounting law requires, even after an account is closed. We keep support messages while we need them to help you, and your newsletter sign-up until you ask us to stop.",
        },
      ],
    },
    {
      id: "your-rights",
      heading: "Your choices and rights",
      blocks: [
        {
          type: "p",
          text: [
            "You can update your name, mobile number and saved addresses at any time in ",
            { label: "My account", to: "/profile" },
            ". You can also ask us to:",
          ],
        },
        {
          type: "list",
          items: [
            "give you a copy of the personal information we hold about you;",
            "correct information that is wrong or out of date;",
            "delete your information, unless the law requires us to keep it (order records, for example);",
            "stop sending you our newsletter.",
          ],
        },
        {
          type: "p",
          text: "To make a request, contact us using the details below. We may ask you to confirm your identity first.",
        },
      ],
    },
    {
      id: "children",
      heading: "Children",
      blocks: [
        {
          // CONFIRM: the minimum age for accounts and orders (the old terms said 18).
          type: "p",
          text: "Accounts and orders are for people aged 18 or over. We do not knowingly collect personal information from children.",
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: [
        {
          type: "p",
          text: "We may update this policy from time to time. The date at the top of this page shows when it was last reviewed. If a change affects how we use your information, we will tell you on this page or by email.",
        },
      ],
    },
    {
      id: "contact",
      heading: "Contact us",
      blocks: [
        {
          type: "p",
          text: [
            "For questions or requests about your personal information, email ",
            EMAIL,
            " or use our ",
            SUPPORT_FORM,
            ".",
          ],
        },
        // CONFIRM: the grievance officer's name and contact details.
        { type: "p", text: ["Grievance officer: ", TO_CONFIRM, "."] },
      ],
    },
  ],
};

// --- Terms of service --------------------------------------------------------

export const TERMS_OF_SERVICE = {
  id: "terms",
  crumb: "Terms of service",
  eyebrow: "Policies",
  title: "Terms of service",
  intro: `The terms that apply when you use this website and order from ${APP_NAME}. Please read them before you place an order.`,
  draft: true,
  sections: [
    {
      id: "about-these-terms",
      heading: "About these terms",
      blocks: [
        {
          type: "p",
          text: `These terms apply to your use of this website and to every order you place with ${APP_NAME}, a furniture business based in Assam, India. By using the website or placing an order, you agree to them. If you do not agree, please do not use the website.`,
        },
      ],
    },
    {
      id: "your-account",
      heading: "Your account",
      blocks: [
        {
          // CONFIRM: the minimum age (the old terms said 18).
          type: "p",
          text: "You need an account to place an order. You must be 18 or older, give accurate details and keep your password private. You are responsible for orders placed from your account, so please tell us straight away if you think someone else has used it.",
        },
      ],
    },
    {
      id: "products",
      heading: "Our pieces and their descriptions",
      blocks: [
        {
          type: "p",
          text: "We describe and photograph our pieces as accurately as we can. Measurements are approximate. Natural materials such as wood vary in grain and colour, and fabrics and finishes can look different on your screen, so no two pieces are exactly alike.",
        },
      ],
    },
    {
      id: "prices",
      heading: "Prices and tax",
      blocks: [
        {
          type: "p",
          text: "Prices are in Indian rupees (INR). Product prices do not include GST: the tax for your order is added at checkout and shown, with any delivery charge, before you pay.",
        },
        {
          type: "p",
          text: "If we find an obvious error in a price, we will contact you before your order goes any further, and you can cancel it for a full refund.",
        },
      ],
    },
    {
      id: "orders",
      heading: "Orders and cancellations",
      blocks: [
        {
          type: "p",
          text: "When you place an order, you will see a confirmation with your order number. We may decline or cancel an order, for example if a piece is no longer available or its price was wrong. If we do, we refund anything you have paid.",
        },
        {
          type: "p",
          text: [
            "You can cancel an order yourself from ",
            MY_ORDERS,
            " until it ships. After that, you can return it under our ",
            { label: "Returns & refunds policy", to: "/refund" },
            ".",
          ],
        },
      ],
    },
    {
      id: "payment",
      heading: "Payment",
      blocks: [
        {
          // CONFIRM: the payment methods the store will take, and the gateway.
          type: "p",
          text: "We accept the payment methods offered at checkout. These currently include credit and debit cards, UPI, net banking, wallets and Cash on Delivery. Cash on Delivery is available for orders up to the limit shown at checkout. You can also apply store credit to any order.",
        },
      ],
    },
    {
      id: "delivery",
      heading: "Delivery",
      blocks: [
        {
          // CONFIRM: the delivery area (checkout only takes addresses in India today).
          type: "p",
          text: "We deliver within India. Delivery charges and estimated delivery times depend on the delivery method you choose, and are shown at checkout. Delivery times are estimates, not guarantees.",
        },
        {
          type: "p",
          text: "Please make sure someone can receive your order, and that large pieces can be carried in through the doors, stairs and lifts on the way. If a delivery cannot be completed, we will contact you to arrange another.",
        },
        // CONFIRM: whether pieces are assembled on delivery, and at what cost.
        { type: "p", text: ["Assembly on delivery: ", TO_CONFIRM, "."] },
      ],
    },
    {
      id: "returns",
      heading: "Returns and refunds",
      blocks: [
        {
          type: "p",
          text: [
            "Returns, exchanges and refunds follow our ",
            { label: "Returns & refunds policy", to: "/refund" },
            ", which forms part of these terms. Nothing in these terms affects your rights under consumer protection law.",
          ],
        },
      ],
    },
    {
      id: "intellectual-property",
      heading: "Intellectual property",
      blocks: [
        {
          type: "p",
          text: `The content of this website, including its text, photographs, logo and design, belongs to ${APP_NAME} or is used with permission. You may not copy or reuse it for commercial purposes without our written permission. Brand names such as Nilkamal, Carlton and Winsome belong to their owners.`,
        },
      ],
    },
    {
      id: "liability",
      heading: "Our liability",
      blocks: [
        {
          type: "p",
          text: "To the extent the law allows, our total liability for an order is limited to the amount you paid for it, and we are not liable for indirect or unforeseeable losses. Nothing in these terms limits any liability that cannot be limited under Indian law, including the Consumer Protection Act, 2019.",
        },
      ],
    },
    {
      id: "governing-law",
      heading: "Governing law and disputes",
      blocks: [
        {
          // CONFIRM: the governing law and the courts (Assam is proposed; the old terms named Mumbai, Maharashtra).
          type: "p",
          text: "These terms are governed by the laws of India, and the courts of Assam, India have jurisdiction over any dispute. If something goes wrong, please contact us first: most problems can be put right quickly.",
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      blocks: [
        {
          type: "p",
          text: "We may update these terms from time to time. The terms on this page when you place an order apply to that order.",
        },
      ],
    },
    {
      id: "contact",
      heading: "Contact us",
      blocks: [
        {
          type: "p",
          text: ["Email ", EMAIL, ", call ", PHONE, ", or use our ", SUPPORT_FORM, "."],
        },
      ],
    },
  ],
};

// --- Cookie policy -----------------------------------------------------------

export const COOKIE_POLICY = {
  id: "cookies",
  crumb: "Cookie policy",
  eyebrow: "Policies",
  title: "Cookie policy",
  intro: "How this website uses cookies and similar storage in your browser, and how you can control them.",
  draft: true,
  sections: [
    {
      id: "what-cookies-are",
      heading: "What cookies are",
      blocks: [
        {
          type: "p",
          text: "Cookies are small text files a website stores in your browser. Websites can also keep small pieces of information in your browser’s local storage and session storage. In this policy, “cookies” means all three.",
        },
      ],
    },
    {
      id: "how-we-use-them",
      heading: "How we use them",
      blocks: [
        {
          type: "p",
          text: "We use cookies only to make the website work and to remember your choices. Your browser keeps:",
        },
        {
          type: "list",
          items: [
            "your cart and your wishlist;",
            "your sign-in, for as long as the tab is open, or longer if you choose “Remember me”;",
            "your choice of light or dark mode;",
            "the pieces you have looked at recently, and your recent searches.",
          ],
        },
        // CONFIRM: that no analytics or advertising tools will be added before launch.
        { type: "p", text: "We do not use analytics or advertising cookies at present." },
      ],
    },
    {
      id: "types",
      heading: "Types of cookies",
      blocks: [
        {
          type: "table",
          caption: "Types of cookies, and whether this website uses them",
          columns: ["Type", "What it does", "Used here"],
          rows: [
            ["Essential", "Keeps the website working: your cart and your sign-in.", "Yes"],
            [
              "Functional",
              "Remembers your choices: your wishlist, light or dark mode, the pieces you viewed and your recent searches.",
              "Yes",
            ],
            ["Analytics", "Counts visits and shows how the website is used, so it can be improved.", "Not at present"],
            ["Marketing", "Shows advertising based on your browsing, here and on other websites.", "Not at present"],
          ],
        },
      ],
    },
    {
      id: "other-services",
      heading: "Other services",
      blocks: [
        {
          type: "p",
          text: "Some content on our pages, such as fonts and images, comes from other providers (our fonts from Google Fonts, for example). Your browser’s request to them includes your IP address. If you pay online, our payment partner may use its own cookies, under its own policy.",
        },
      ],
    },
    {
      id: "managing-cookies",
      heading: "Managing cookies",
      blocks: [
        {
          type: "p",
          text: "You can block or delete cookies and stored website data in your browser’s settings. If you clear them, you will be signed out, and your theme, recently viewed pieces and recent searches on this device will be reset. Your cart and wishlist are kept on your account while you are signed in, but a guest’s cart and wishlist are cleared.",
        },
        {
          type: "p",
          text: "Blocking essential cookies may stop the cart, sign-in and checkout from working.",
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: [
        {
          type: "p",
          text: "If we start using analytics or advertising cookies, we will update this policy first, and ask for your consent where the law requires it.",
        },
      ],
    },
  ],
};

// --- Returns & refunds -------------------------------------------------------

export const REFUND_POLICY = {
  id: "refund",
  crumb: "Returns & refunds",
  eyebrow: "Policies",
  title: "Returns & refunds",
  intro: "How to return a piece, what can be returned, and how refunds are paid.",
  draft: true,
  sections: [
    {
      id: "returns-window",
      heading: "Our returns window",
      blocks: RETURN_WINDOW
        ? [
            {
              // CONFIRM: the window (STOREFRONT_CONFIG.returnsWindowDays, a placeholder).
              type: "p",
              text: `You can ask to return an eligible piece within ${RETURN_WINDOW} of delivery. If a piece arrives damaged, faulty or different from what you ordered, please tell us as soon as you can, within the same ${RETURN_WINDOW}.`,
            },
          ]
        : [
            {
              type: "p",
              text: "We accept returns only for pieces that arrive damaged, faulty or different from what you ordered. Please tell us as soon as you can after delivery.",
            },
          ],
    },
    {
      id: "how-to-return",
      heading: "How to start a return",
      blocks: [
        {
          type: "steps",
          items: [
            [
              "Open ",
              MY_ORDERS,
              " and choose Return or exchange on your order. This opens our support form with your order number and the Returns & refunds topic filled in. You can also use the ",
              RETURNS_FORM,
              " directly: enter your order number and choose Returns & refunds.",
            ],
            "Tell us which pieces you would like to return or exchange, and why. If anything is damaged, photos help us sort it out quickly.",
            "We reply during working hours with the next steps, including how the piece will come back to us.",
            "Once we have received and checked the piece, we issue your refund, or send your exchange.",
          ],
        },
        // CONFIRM: collection or drop-off, and any charge for it.
        { type: "p", text: ["How returned pieces are collected, and whether there is a charge: ", TO_CONFIRM, "."] },
        {
          // CONFIRM: that exchanges are handled this way.
          type: "p",
          text: "To exchange a piece, tell us which piece you would like instead. We will confirm that it is available, and any difference in price.",
        },
      ],
    },
    {
      id: "what-can-be-returned",
      heading: "What can be returned",
      blocks: [
        {
          // CONFIRM: the eligibility rules.
          type: "list",
          items: [
            "Pieces that are unused and in the condition you received them.",
            "In their original packaging where possible, with all parts, fittings and accessories.",
            RETURN_WINDOW
              ? `Requested within ${RETURN_WINDOW} of delivery.`
              : "Reported as damaged, faulty or wrong soon after delivery.",
          ],
        },
      ],
    },
    {
      id: "what-cannot-be-returned",
      heading: "What cannot be returned",
      blocks: [
        {
          // CONFIRM: each exclusion.
          type: "list",
          items: [
            "Pieces that have been assembled or installed, unless they are faulty.",
            "Custom-made or made-to-order pieces, unless they are faulty.",
            "Mattresses whose protective wrapping has been removed, unless they are faulty.",
            "Pieces damaged after delivery by misuse or accident.",
          ],
        },
        {
          type: "p",
          text: "None of this affects your rights when a piece is faulty or not as described.",
        },
      ],
    },
    {
      id: "damaged-or-wrong",
      heading: "Damaged, faulty or wrong pieces",
      blocks: [
        {
          // CONFIRM: the remedies offered.
          type: "p",
          text: [
            "If a piece arrives damaged, develops a fault, or is not what you ordered, contact us through the ",
            RETURNS_FORM,
            " with your order number and photos. We will arrange a repair, a replacement or a refund.",
          ],
        },
      ],
    },
    {
      id: "cancelling",
      heading: "Cancelling an order",
      blocks: [
        {
          type: "p",
          text: [
            "You can cancel an order yourself from ",
            MY_ORDERS,
            " until it ships. Once it has shipped, you can return it as described above.",
          ],
        },
        {
          type: "p",
          text: "When you cancel, what you paid online is refunded to your original payment method, and any store credit you used goes back to your account. An order you were going to pay for by Cash on Delivery has nothing to refund.",
        },
      ],
    },
    {
      id: "refunds",
      heading: "How refunds are paid",
      blocks: [
        {
          // CONFIRM: what a refund covers (the store's refund records include the pieces and their tax, not delivery).
          type: "p",
          text: "Your refund covers the price of the returned pieces and the tax paid on them. Delivery charges are not included.",
        },
        {
          // CONFIRM: the refund timings for each method.
          type: "table",
          caption: "How refunds are paid",
          columns: ["You paid by", "Refunded to", "Time to arrive"],
          rows: [
            ["Card, UPI, net banking or wallet", "The same card or account", [TBC]],
            ["Cash on Delivery", "Your bank account or UPI", [TBC]],
            ["Store credit", "Your store credit", "As soon as the refund is issued"],
          ],
        },
        {
          type: "p",
          text: "Banks and payment providers can take a few more days to show a refund on your statement.",
        },
      ],
    },
  ],
};

// The four documents, keyed by their route.
export const LEGAL_DOCUMENTS = {
  "/privacy": PRIVACY_POLICY,
  "/terms": TERMS_OF_SERVICE,
  "/cookies": COOKIE_POLICY,
  "/refund": REFUND_POLICY,
};

const legalContent = {
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  COOKIE_POLICY,
  REFUND_POLICY,
  LEGAL_DOCUMENTS,
};
export default legalContent;
