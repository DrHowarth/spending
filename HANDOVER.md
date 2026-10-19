# HANDOVER — Spending

Cold-start guide. Read this first. Technical detail is in ARCHITECTURE.md; build history in CHANGELOG.md.

---

## 1. FILES

| File | Role |
|---|---|
| `index.html` | The whole app. `<script id="core">` = pure data layer (tested); `<script id="app">` = storage, state, tiles |
| `vendor/pdf.js`, `vendor/pdf.worker.js` | pdf.js 3.11.174 legacy build — used by the app AND by the tests |
| `vendor/echarts.min.js` | ECharts 5.5.1 — the balance timeline (later: pie and bar charts) |
| `sw.js`, `manifest.json`, `icon-*.png` | Installable app + offline cache |
| `run-tests.js` | Gate 1 (Node, no npm) |
| `.githooks/pre-commit` | Refuses PDFs, CSVs, the data file and sort-code/account-number patterns |

**This repo is PUBLIC.** It holds code only. Barry's statements, his data file and even the expected test
figures (`spending-tests.json`) live in his data folder (`~/Documents/Bank Things/` on the iMac), never here.

---

## 2. SETUP AND WORKFLOW

```
git config core.hooksPath .githooks     # once per clone — turns on the bank-data guard
node run-tests.js                       # baseline before touching anything
```

**Current baseline: 75 of 75 passed (100%)** — 25 need Barry's sample folder; without it they show SKIPPED (not green).
**Current build stamp: `spend-20261019-charts`** — the app updates itself to the newest stamp on opening (see CHANGELOG) (System panel, ⓘ top right)
**Live:** https://drhowarth.github.io/spending/

Browser preview (iMac): `preview_start spending` (port 8040). To test with the sample statement, `preview_start
spending-samples` (8041, bound to 127.0.0.1) and inject the files — see ARCHITECTURE §6. `?store=copy` forces
the Safari path in Chrome. Clear the pane's IndexedDB/OPFS afterwards: it held real bank data.

Session loop: read this → run tests → take the next queue item → small passes, tests after each →
record defects before fixing → CHANGELOG + stamp → update this queue → commit and push.

---

## 3. ACTIVE WORK QUEUE (one per session — plan in ARCHITECTURE §7)

1. ~~Foundations~~ — shipped `spend-20261019-foundations`.
2. ~~Timeline~~ — shipped `spend-20261019-timeline`, drag-to-select `spend-20261019-drag-select`. **Both awaiting Barry's Gate 2 in Chrome and Safari** (iPad pinch-zoom unchecked).
3. ~~Categories~~ — shipped `spend-20261019-categories`, category panel `spend-20261019-category-panel`. Awaiting Barry's Gate 2 (tag his top payees in Chrome and Safari).
4. ~~Charts~~ — shipped `spend-20261019-charts` (with custom categories). Awaiting Barry's Gate 2.
5. **Repeats and habits** (Opus) — regular payments, frequent habits (coffee), dots for price rises / new subscriptions.
6. **Calculator** (Opus) — category/payee/word, per day/week/month over a range, sparkline.
7. **Tile polish** (Sonnet) — drag to reorder, remembered layout, iPad touch check; budget hooks.

Open questions for Barry: none blocking. More statement PDFs (older ones, especially 2020) will test the parser on
layouts it has not seen — add them to the folder and check the System panel shows all 🟢.

---

## 4. RULES THAT MUST NOT BE BROKEN

1. **No bank data in the repo, ever** — not statements, not the data file, not figures in tests or docs. The repo is public.
2. **The core never touches the DOM.** Everything about money is in `<script id="core">`, in pence (integers), tested headlessly. Tiles only read `state`.
3. **No special cases in the parser.** Columns come from each page's header line; a new layout is fixed by making the general rule better.
4. **Render before you count.** Any parser change: run `node run-tests.js --dump`, draw `.render/boxes.json` over the pages, look, then believe the numbers.
5. **Never commit on a red baseline.**

---

## 5. VISUAL VERIFICATION

Gate 1 checks parsed values, balances and merge counts. It is blind to how anything looks.
Gate 2 is Barry: Chrome (installed app) and Safari on the Mac, after each session; check the stamp first.

---

## 6. WHERE THINGS GO

| Record… | In… |
|---|---|
| A diagnosed defect | `ERRORS.md` (create when the first one is open) |
| What shipped | `CHANGELOG.md`, newest first, with the stamp |
| How the app works / a design decision | `ARCHITECTURE.md` |
| A hard-won rule about how to work | `LESSONS.md` (create when earned) |
