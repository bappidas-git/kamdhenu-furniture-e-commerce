#!/usr/bin/env node
/* =============================================================================
 * WCAG contrast check for the storefront design tokens
 * =============================================================================
 *
 * Reads src/theme/storefront-tokens.css, resolves every --sf-* token for light
 * mode (:root) and dark mode (body.dark, inheriting :root), composites
 * translucent colours over the background they sit on, and checks each pairing
 * below against its WCAG 2.2 minimum (4.5:1 body text, 3:1 large display text
 * and non-text UI such as focus rings, control boundaries and rating stars).
 *
 * It also verifies that src/theme/colors.js (the MUI palette) and
 * src/theme/tokens.js (the JS mirror) still match the CSS values.
 *
 * Usage:
 *   node scripts/check-contrast.js              # table + sync check, exit 1 on failure
 *   node scripts/check-contrast.js --markdown   # same, as a Markdown table
 *
 * Later prompts: add the component-level pairs you introduce to PAIRS (or
 * PAIRS_DARK_ONLY / PAIRS_FIXED) and paste the --markdown output into
 * prompts/DESIGN_SYSTEM.md. No dependencies; plain Node.
 * ========================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CSS_FILE = path.join(ROOT, "src/theme/storefront-tokens.css");
const markdown = process.argv.includes("--markdown");

// ---------------------------------------------------------------------------
// 1. Parse the token file into { light, dark } maps of raw declarations
// ---------------------------------------------------------------------------
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseBlocks(css) {
  const blocks = [];
  let depth = 0;
  let selStart = 0;
  let bodyStart = -1;
  const stack = [];
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === "{") {
      const selector = css.slice(selStart, i).trim();
      stack.push(selector);
      depth += 1;
      bodyStart = i + 1;
      selStart = i + 1;
    } else if (ch === "}") {
      const selector = stack.pop();
      const body = css.slice(bodyStart, i);
      blocks.push({ selector, body, parents: [...stack] });
      depth -= 1;
      selStart = i + 1;
      bodyStart = i + 1;
    }
  }
  return blocks;
}

function declarations(body) {
  const out = {};
  body
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.startsWith("--"))
    .forEach((d) => {
      const idx = d.indexOf(":");
      out[d.slice(0, idx).trim()] = d.slice(idx + 1).trim().replace(/\s+/g, " ");
    });
  return out;
}

const css = stripComments(fs.readFileSync(CSS_FILE, "utf8"));
const blocks = parseBlocks(css).filter((b) => b.parents.length === 0);
const sel = (b) => b.selector.split(",").map((s) => s.trim());

const lightRaw = {};
const darkRaw = {};
blocks.forEach((b) => {
  const s = sel(b);
  const decl = declarations(b.body);
  if (s.includes(":root")) Object.assign(lightRaw, decl);
  if (s.includes("body.dark")) Object.assign(darkRaw, decl);
});

// A custom property inherits its *computed* value, so a token declared only on
// :root resolves its var() references against the light values even in dark
// mode. Model that faithfully: dark = :root values resolved in light, then the
// body.dark declarations resolved against the dark map.
function resolveAll(raw, base = {}) {
  const resolved = { ...base };
  const resolving = new Set();
  const get = (name) => {
    if (raw[name] === undefined) {
      if (resolved[name] !== undefined) return resolved[name];
      throw new Error(`Unknown token ${name}`);
    }
    if (resolving.has(name)) throw new Error(`Cycle at ${name}`);
    resolving.add(name);
    const value = raw[name].replace(/var\((--[a-z0-9-]+)(?:\s*,[^)]*)?\)/g, (_, ref) => get(ref));
    resolving.delete(name);
    return value;
  };
  Object.keys(raw).forEach((name) => {
    resolved[name] = get(name);
  });
  return resolved;
}

const light = resolveAll(lightRaw);
const dark = resolveAll(darkRaw, light);

// ---------------------------------------------------------------------------
// 2. Colour maths (WCAG 2.x relative luminance)
// ---------------------------------------------------------------------------
function parseColor(value) {
  const v = value.trim();
  let m = v.match(/^linear-gradient\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
  if (m && m[1] === m[2]) return parseColor(m[1]);
  m = v.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (m) {
    let a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (m[4] && m[4].endsWith("%")) a /= 100;
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  throw new Error(`Cannot parse colour "${value}"`);
}

const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
});

const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (c) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (c) =>
  "#" + [c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");

// A layer is a token name, a literal colour, or an array [top, ..., bottom]
// that is composited bottom-up (the bottom layer must be opaque).
function layer(spec, map) {
  const one = (s) => parseColor(s.startsWith("--") ? map[s] : s);
  if (!Array.isArray(spec)) return one(spec);
  const stack = spec.map(one);
  let acc = stack[stack.length - 1];
  for (let i = stack.length - 2; i >= 0; i -= 1) acc = over(stack[i], acc);
  return acc;
}

// ---------------------------------------------------------------------------
// 3. Pairings — [label, foreground, background, minimum]
//    Text on a translucent fill: background = [fill, base]. Translucent text:
//    foreground = [text, background...] (composited onto what it sits on).
// ---------------------------------------------------------------------------
const AA = 4.5;
const LARGE = 3; // display text >= 24px, and non-text UI (WCAG 1.4.11)

// Dark-mode sand/stone are translucent; check them over the lighter dark
// surface (the worse case for light text) — the same layer in light mode is
// opaque, so the base is irrelevant there.
const SAND = ["--sf-color-sand", "--sf-color-surface"];

const PAIRS = [
  // Text tones
  ["Text (ink) on page (paper) — brief: >= 12:1", "--sf-color-text", "--sf-color-bg", 12],
  ["Text on surface", "--sf-color-text", "--sf-color-surface", AA],
  ["Text on sand", "--sf-color-text", SAND, AA],
  ["Secondary text on page", "--sf-color-text-secondary", "--sf-color-bg", AA],
  ["Secondary text on surface", "--sf-color-text-secondary", "--sf-color-surface", AA],
  ["Secondary text on sand", "--sf-color-text-secondary", SAND, AA],
  ["Muted text on page", "--sf-color-text-muted", "--sf-color-bg", AA],
  ["Muted text on surface", "--sf-color-text-muted", "--sf-color-surface", AA],
  ["Muted text on sand", "--sf-color-text-muted", SAND, AA],
  // Accent family
  ["Accent-text (links, sale) on page", "--sf-color-accent-text", "--sf-color-bg", AA],
  ["Accent-text on surface", "--sf-color-accent-text", "--sf-color-surface", AA],
  ["Accent-text on sand", "--sf-color-accent-text", SAND, AA],
  ["Accent-text on accent-soft (selected)", "--sf-color-accent-text", ["--sf-color-accent-soft", "--sf-color-bg"], AA],
  ["Accent (display italic >= 24px, icons) on page", "--sf-color-accent", "--sf-color-bg", LARGE],
  ["Accent on surface", "--sf-color-accent", "--sf-color-surface", LARGE],
  ["Accent on sand", "--sf-color-accent", SAND, LARGE],
  ["Text on solid accent (accent-contrast)", "--sf-color-accent-contrast", "--sf-color-accent", AA],
  // Focus + control boundaries (non-text, 3:1)
  ["Focus ring on page", "--sf-color-focus", "--sf-color-bg", LARGE],
  ["Focus ring on surface", "--sf-color-focus", "--sf-color-surface", LARGE],
  ["Focus ring on sand", "--sf-color-focus", SAND, LARGE],
  ["Control border (border-strong) on page", "--sf-color-border-strong", "--sf-color-bg", LARGE],
  ["Control border on surface", "--sf-color-border-strong", "--sf-color-surface", LARGE],
  // Buttons
  ["Primary button text (primary-contrast on primary)", "--sf-color-primary-contrast", "--sf-color-primary", AA],
  ["Primary button hover (primary-contrast on primary-hover)", "--sf-color-primary-contrast", "--sf-color-primary-hover", AA],
  ["Ink on primary-soft (ghost hover)", "--sf-color-text", ["--sf-color-primary-soft", "--sf-color-bg"], AA],
  ["Secondary (navy) contrast text", "--sf-color-secondary-contrast", "--sf-color-secondary", AA],
  // Commerce
  ["Price on surface", "--sf-color-price", "--sf-color-surface", AA],
  ["Compare-at price on surface", "--sf-color-compare", "--sf-color-surface", AA],
  ["Sale / discount on surface", "--sf-color-sale", "--sf-color-surface", AA],
  ["Discount on discount-bg", "--sf-color-discount", ["--sf-color-discount-bg", "--sf-color-surface"], AA],
  ["Rating star on surface (graphic)", "--sf-color-star", "--sf-color-surface", LARGE],
  ["Rating star on page (graphic)", "--sf-color-star", "--sf-color-bg", LARGE],
  // Semantic
  ["Success text on page", "--sf-color-success", "--sf-color-bg", AA],
  ["Success on success-bg", "--sf-color-success", ["--sf-color-success-bg", "--sf-color-surface"], AA],
  ["Warning text on page", "--sf-color-warning", "--sf-color-bg", AA],
  ["Warning on warning-bg", "--sf-color-warning", ["--sf-color-warning-bg", "--sf-color-surface"], AA],
  ["Error text on page", "--sf-color-error", "--sf-color-bg", AA],
  ["Error on error-bg", "--sf-color-error", ["--sf-color-error-bg", "--sf-color-surface"], AA],
  ["Info text on page", "--sf-color-info", "--sf-color-bg", AA],
  ["Info on info-bg", "--sf-color-info", ["--sf-color-info-bg", "--sf-color-surface"], AA],
  ["Badge text on solid error fill (primary-contrast)", "--sf-color-primary-contrast", "--sf-color-error", AA],
  ["Badge text on solid success fill (primary-contrast)", "--sf-color-primary-contrast", "--sf-color-success", AA],
  // Primitives (Prompt 06: storefront-base.css, MUI overrides, SweetAlert)
  ["Field error text on surface (.sf-field__error in a card)", "--sf-color-error", "--sf-color-surface", AA],
  ["Invalid field border (error) on surface", "--sf-color-error", "--sf-color-surface", LARGE],
  ["Selected menu item: ink on accent-soft over surface", "--sf-color-text", ["--sf-color-accent-soft", "--sf-color-surface"], AA],
  ["Accent badge (.sf-badge--accent): discount on discount-bg over page", "--sf-color-discount", ["--sf-color-discount-bg", "--sf-color-bg"], AA],
];

// Always-dark surfaces (footer, hero, navy bands): identical in both modes.
const PAIRS_FIXED = [
  ["On-dark text on navy surface", "--sf-color-on-dark", "--sf-color-surface-dark", AA],
  ["On-dark muted (translucent) on navy", ["--sf-color-on-dark-muted", "--sf-color-surface-dark"], "--sf-color-surface-dark", AA],
  ["On-dark accent (caramel) on navy", "--sf-color-on-dark-accent", "--sf-color-surface-dark", AA],
  ["Focus ring (on-dark accent) on navy", "--sf-color-on-dark-accent", "--sf-color-surface-dark", LARGE],
  ["Paper button text (brand ink on brand paper)", "--sf-brand-ink", "--sf-brand-paper", AA],
  ["Paper button hover (brand ink on on-dark accent)", "--sf-brand-ink", "--sf-color-on-dark-accent", AA],
  ["Paper-ghost hover (on-dark on on-dark-border over navy)", "--sf-color-on-dark", ["--sf-color-on-dark-border", "--sf-color-surface-dark"], AA],
  // Footer newsletter field on navy (Prompt 08)
  ["Footer field text (on-dark on the paper-8% fill over navy)", "--sf-color-on-dark", ["--sf-color-on-dark-soft", "--sf-color-surface-dark"], AA],
  ["Footer field placeholder (on-dark muted on the fill)", ["--sf-color-on-dark-muted", "--sf-color-on-dark-soft", "--sf-color-surface-dark"], ["--sf-color-on-dark-soft", "--sf-color-surface-dark"], AA],
  ["Footer field boundary (on-dark-border-strong) on navy", ["--sf-color-on-dark-border-strong", "--sf-color-surface-dark"], "--sf-color-surface-dark", LARGE],
  ["Footer error text and invalid border (on-dark-error) on navy", "--sf-color-on-dark-error", "--sf-color-surface-dark", AA],
  // Hero: text sits where the scrim is >= --sf-color-scrim. Worst case is a
  // pure-white photograph under the scrim.
  ["Hero: on-dark text on scrim over white photo", "--sf-color-on-dark", ["--sf-color-scrim", "#ffffff"], AA],
  ["Hero: caramel accent (display) on scrim over white photo", "--sf-color-on-dark-accent", ["--sf-color-scrim", "#ffffff"], LARGE],
  ["Hero: focus ring on scrim over white photo", "--sf-color-on-dark-accent", ["--sf-color-scrim", "#ffffff"], LARGE],
  // Home hero (Prompt 10): the paper-ghost CTA's 1px border is its boundary.
  ["Hero: paper-ghost CTA border (on-dark) on scrim over white photo", "--sf-color-on-dark", ["--sf-color-scrim", "#ffffff"], LARGE],
];

// Light mode only: the inline PLACEHOLDER_IMG SVG cannot read CSS variables.
const PAIRS_LIGHT_ONLY = [
  ["Placeholder image text (muted on sand)", "--sf-color-text-muted", "--sf-color-sand", AA],
];

// Informational (no minimum): decorative hairlines.
const INFO = [
  ["Hairline (stone) vs page", "--sf-color-border", "--sf-color-bg"],
  ["Hairline vs surface", "--sf-color-border", "--sf-color-surface"],
  ["Sand panel vs page", SAND, "--sf-color-bg"],
  ["Brand caramel vs paper (decorative only, never text)", "--sf-brand-caramel", "--sf-brand-paper"],
  // Why small text on photography uses full --sf-color-on-dark, never the muted tone
  ["Hero: on-dark muted on scrim over white photo (not for text)", ["--sf-color-on-dark-muted", "--sf-color-scrim", "#ffffff"], ["--sf-color-scrim", "#ffffff"]],
  // Prompt 10: why the hero eyebrow is full on-dark rather than paper at 80%,
  // and why the hero scrim is --sf-color-scrim, not the backdrop token
  ["Hero: paper at 80% on scrim over white photo (not for text)", ["rgba(250, 247, 242, 0.8)", "--sf-color-scrim", "#ffffff"], ["--sf-color-scrim", "#ffffff"]],
  ["Hero: on-dark text with --sf-color-overlay as the scrim, white photo (not used)", "--sf-color-on-dark", ["--sf-color-overlay", "#ffffff"]],
];

// ---------------------------------------------------------------------------
// 4. Evaluate
// ---------------------------------------------------------------------------
const rows = [];
let failures = 0;
const evaluate = (fg, bg, map) => {
  const b = layer(bg, map);
  const f = Array.isArray(fg) ? layer(fg, map) : over(layer(fg, map), b);
  return ratio(f, b);
};
const cell = (r, min) => {
  if (r === null) return "—";
  const ok = min === null || r >= min;
  if (!ok) failures += 1;
  return `${r.toFixed(2)}${min === null ? "" : ok ? " ✓" : " ✗"}`;
};

PAIRS.forEach(([label, fg, bg, min]) => {
  rows.push([label, cell(evaluate(fg, bg, light), min), cell(evaluate(fg, bg, dark), min), min]);
});
PAIRS_FIXED.forEach(([label, fg, bg, min]) => {
  rows.push([label + " (both modes)", cell(evaluate(fg, bg, light), min), cell(evaluate(fg, bg, dark), min), min]);
});
PAIRS_LIGHT_ONLY.forEach(([label, fg, bg, min]) => {
  rows.push([label, cell(evaluate(fg, bg, light), min), "n/a", min]);
});
INFO.forEach(([label, fg, bg]) => {
  rows.push([label, cell(evaluate(fg, bg, light), null), cell(evaluate(fg, bg, dark), null), null]);
});

const minLabel = (m) => (m === null ? "info" : `${m}:1`);
if (markdown) {
  console.log("| Pairing | Light | Dark | Min |");
  console.log("|---|---|---|---|");
  rows.forEach(([l, a, b, m]) => console.log(`| ${l} | ${a} | ${b} | ${minLabel(m)} |`));
} else {
  const w = Math.max(...rows.map((r) => r[0].length));
  console.log(`${"Pairing".padEnd(w)}  ${"Light".padEnd(9)}  ${"Dark".padEnd(9)}  Min`);
  rows.forEach(([l, a, b, m]) => console.log(`${l.padEnd(w)}  ${a.padEnd(9)}  ${b.padEnd(9)}  ${minLabel(m)}`));
}

// ---------------------------------------------------------------------------
// 5. Mirror check: colors.js (MUI) and tokens.js (JS) must match the CSS
// ---------------------------------------------------------------------------
function loadModule(file, names) {
  const src = fs
    .readFileSync(path.join(ROOT, file), "utf8")
    .replace(/^import .*$/gm, "")
    .replace(/export default [\s\S]*?;\s*$/m, "")
    .replace(/export const /g, "const ");
  return vm.runInNewContext(`${src}\n;({ ${names.join(", ")} })`);
}

const norm = (v) => {
  try {
    return hex(parseColor(String(v))) + (parseColor(String(v)).a < 1 ? `@${parseColor(String(v)).a}` : "");
  } catch (_) {
    return String(v).replace(/\s+/g, "");
  }
};

const mismatches = [];
const expect = (where, actual, token, map, label) => {
  const want = map[token];
  if (norm(actual) !== norm(want)) mismatches.push(`${where}: ${label} = ${actual}, CSS ${token} (${map === light ? "light" : "dark"}) = ${want}`);
};

const { LIGHT, DARK } = loadModule("src/theme/colors.js", ["LIGHT", "DARK"]);
[[LIGHT, light, "LIGHT"], [DARK, dark, "DARK"]].forEach(([p, map, name]) => {
  const w = `colors.js ${name}`;
  expect(w, p.primary.main, "--sf-color-primary", map, "primary.main");
  expect(w, p.primary.dark, "--sf-color-primary-hover", map, "primary.dark");
  expect(w, p.primary.light, "--sf-color-primary-light", map, "primary.light");
  expect(w, p.primary.contrastText, "--sf-color-primary-contrast", map, "primary.contrastText");
  expect(w, p.secondary.main, "--sf-color-secondary", map, "secondary.main");
  expect(w, p.secondary.contrastText, "--sf-color-secondary-contrast", map, "secondary.contrastText");
  expect(w, p.accent.main, "--sf-color-accent", map, "accent.main");
  expect(w, p.accent.text, "--sf-color-accent-text", map, "accent.text");
  expect(w, p.background.default, "--sf-color-bg", map, "background.default");
  expect(w, p.background.paper, "--sf-color-surface", map, "background.paper");
  expect(w, p.text.primary, "--sf-color-text", map, "text.primary");
  expect(w, p.text.secondary, "--sf-color-text-secondary", map, "text.secondary");
  expect(w, p.divider, "--sf-color-border", map, "divider");
  expect(w, p.action.hover, "--sf-color-primary-soft", map, "action.hover");
  expect(w, p.action.selected, "--sf-color-accent-soft", map, "action.selected");
  expect(w, p.success.main, "--sf-color-success", map, "success.main");
  expect(w, p.warning.main, "--sf-color-warning", map, "warning.main");
  expect(w, p.error.main, "--sf-color-error", map, "error.main");
  expect(w, p.info.main, "--sf-color-info", map, "info.main");
  expect(w, p.gradient.primary, "--sf-color-primary", map, "gradient.primary (flat)");
  expect(w, p.bodyBackground, "--sf-color-bg", map, "bodyBackground (flat)");
});

const { TOKENS } = loadModule("src/theme/tokens.js", ["TOKENS"]);
const px = (n) => `${n}px`;
Object.entries(TOKENS.radius).forEach(([k, v]) => expect("tokens.js", px(v), `--sf-radius-${k}`, light, `radius.${k}`));
Object.entries(TOKENS.space).forEach(([k, v]) => expect("tokens.js", px(v), `--sf-space-${k}`, light, `space.${k}`));
expect("tokens.js", px(TOKENS.tapTarget), "--sf-tap-target", light, "tapTarget");
expect("tokens.js", px(TOKENS.containerMax), "--sf-container-max", light, "containerMax");
Object.entries(TOKENS.container).forEach(([k, v]) => expect("tokens.js", px(v), `--sf-container-${k}`, light, `container.${k}`));
expect("tokens.js", TOKENS.type.fontDisplay, "--sf-font-display", light, "type.fontDisplay");
expect("tokens.js", TOKENS.type.fontSans, "--sf-font-sans", light, "type.fontSans");
Object.entries(TOKENS.type.size).forEach(([k, v]) => expect("tokens.js", v, `--sf-text-${k}`, light, `type.size.${k}`));
Object.entries(TOKENS.type.weight).forEach(([k, v]) => expect("tokens.js", String(v), `--sf-font-${k}`, light, `type.weight.${k}`));
Object.entries(TOKENS.type.leading).forEach(([k, v]) => expect("tokens.js", String(v), `--sf-leading-${k}`, light, `type.leading.${k}`));
Object.entries(TOKENS.type.tracking).forEach(([k, v]) => expect("tokens.js", v, `--sf-tracking-${k}`, light, `type.tracking.${k}`));
expect("tokens.js", TOKENS.type.measure, "--sf-measure", light, "type.measure");
Object.entries(TOKENS.motion.durationMs).forEach(([k, v]) =>
  expect("tokens.js", `${v}ms`, k === "base" ? "--sf-duration" : `--sf-duration-${k}`, light, `motion.durationMs.${k}`)
);
expect("tokens.js", `cubic-bezier(${TOKENS.motion.easeOut.join(", ")})`, "--sf-ease-out", light, "motion.easeOut");
expect("tokens.js", `cubic-bezier(${TOKENS.motion.easeInOut.join(", ")})`, "--sf-ease-in-out", light, "motion.easeInOut");
expect("tokens.js", px(TOKENS.motion.revealDistance), "--sf-reveal-distance", light, "motion.revealDistance");
expect("tokens.js", `${TOKENS.motion.staggerMs}ms`, "--sf-stagger", light, "motion.staggerMs");
Object.entries(TOKENS.motion.duration).forEach(([k, v]) => {
  if (Math.round(v * 1000) !== TOKENS.motion.durationMs[k]) mismatches.push(`tokens.js: motion.duration.${k} (${v}s) != durationMs.${k}`);
});

console.log("");
if (mismatches.length) {
  console.log(`Mirror check: ${mismatches.length} mismatch(es)`);
  mismatches.forEach((m) => console.log(`  ✗ ${m}`));
} else {
  console.log("Mirror check: colors.js and tokens.js match storefront-tokens.css ✓");
}
console.log(failures ? `Contrast: ${failures} pairing(s) below minimum ✗` : "Contrast: every pairing meets its minimum ✓");
process.exit(failures || mismatches.length ? 1 : 0);
