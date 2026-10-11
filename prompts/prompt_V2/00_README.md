# Prompt V2 — Max-effort re-verification of Prompts 02–05

**Why this folder exists.** Prompts 02, 03, 04 and 05 of the original 34-prompt build ran at **medium** effort; every other prompt ran at **max**. These five V2 prompts bring the work of 02–05 up to the same max-effort standard **without re-running them**. Re-running the originals would regenerate the catalogue and supporting data and break the 29 prompts that were built on top of that data (ids, slugs, SKUs, orders, carts, wishlists, reviews, tests).

**What they do instead.** Each V2 prompt treats its original prompt as the specification, audits the current repository against every requirement in it, line by line, then repairs the real gaps in place. Ids, slugs, SKUs and later decisions stay as they are. When all five have run, nothing from 02–05 rests on medium-effort work alone. Every requirement has been checked, with evidence, at max effort, and the whole application has been regression-tested afterwards.

---

## Run order

| # | File | Re-verifies | Original commit | Depends on |
|---|---|---|---|---|
| V2-01 | `01_V2_brand-identity-wiring-audit.md` | Prompt 02 — Brand identity wiring | `a1318e6` | — |
| V2-02 | `02_V2_catalogue-client-ranges-audit.md` | Prompt 03 — Catalogue data I | `6616837` | V2-01 |
| V2-03 | `03_V2_catalogue-reference-ranges-audit.md` | Prompt 04 — Catalogue data II | `4dd5cf2` | V2-02 |
| V2-04 | `04_V2_supporting-data-integrity-audit.md` | Prompt 05 — Supporting data and integrity | `d807ce4` | V2-01, V2-02, V2-03 |
| V2-05 | `05_V2_full-regression-and-sign-off.md` | Everything V2-01…04 touched, across the whole app (Prompts 06–34 surfaces) | — | V2-01…04 |

Run them **in this order**, one per fresh session, each **at max effort** (set effort to `max` before you paste the prompt). Do not batch two into one session. Each one ends with a build-log entry and a report file that the next one reads.

## How to run a V2 prompt

1. Open a fresh session on the repository, set effort to **max**.
2. `npm ci` if `node_modules` is missing; start `npm run server` (JSON Server on :3001) and `npm start` (CRA on :3000, mock mode from `.env`).
3. Paste the full content of the V2 prompt file.
4. Let the session finish: audit report written, fixes committed, validator, tests and build green, build-log entry appended.

## Rules every V2 prompt follows (repeated inside each prompt, since each runs in a fresh session)

1. **Audit first, then repair.** No edits until the requirement matrix (every requirement from the original prompt → status → evidence) is written.
2. **The original prompt is the floor, the build log is the record of later decisions.** If the current state differs from the original spec, search `prompts/BUILD_LOG.md` (Prompts 06–34) and `prompts/DESIGN_SYSTEM.md` for a recorded decision that changed it on purpose. If one is recorded, the later decision wins. Keep it and cite it. If none is recorded, the difference is a gap. Fix it.
3. **Stability is non-negotiable.** Never renumber or rename existing ids, slugs or SKUs, never change a key set or key order, never add or remove a collection or field, never touch `src/services/api.js`, never touch the admin (`src/pages/Admin/*`, `src/components/AdminLayout/*`, `src/theme/adminTheme.js`).
4. **Fix the gap, not the neighbourhood.** Repairs stay inside the original prompt's scope; anything outside it goes to the report as a finding for V2-05 or as an open question.
5. **Green before done.** `node scripts/validate-db.js` (full mode), `CI=true npm test -- --passWithNoTests` and `npm run build` pass after every change; the validator may be **tightened** to cover a requirement it missed, never loosened.
6. **Evidence, not assertion.** Every "✅ Met" in the matrix cites a command output, a file and line, or a record id.

## Outputs

- `prompts/prompt_V2/reports/V2-0N_REPORT.md`: one per prompt, holding the requirement matrix, the gaps found, the fixes made and the evidence.
- `prompts/BUILD_LOG.md`: one entry per V2 prompt, headed `## Prompt V2-0N — …`.
- V2-05 updates `prompts/00_INDEX.md` (status line and the effort note), `prompts/QA_CHECKLIST.md` (the re-run) and writes `prompts/prompt_V2/reports/V2_SIGN_OFF.md`.
