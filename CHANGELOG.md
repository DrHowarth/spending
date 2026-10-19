# CHANGELOG — Spending

## 2026-10-19 — spend-20261019-payee-detail

- **Barry: is the total money out and in together? "70 ×" reads like 70 equal payments.**
  - Answer: it was money out only.
  - Each payee now reads "70 payments · £x out · £y in", with money in shown separately.
- **Click a payee in Sort payees to unfold every payment behind its total,** 30 at a time, newest first. A statement payment opens its PDF.
- Card rows no longer lead with the bank's masked `INT'L **********` reference; the merchant shows first in every list, the PDF header, the chart tooltip and the picker.
- **Checked on the sample:** Apple shows 44 payments · £379.62 out · £20.00 in, which equals the raw sums. The refund pair is lilac, and 12 Aug opened page 8, highlighted.

## 2026-10-19 — spend-20261019-sort-undo

- **Barry: "is this a tagging tool? I clicked the green tick and the category disappeared."**
  - The tab is renamed **Sort payees** and has a one-line hint saying what ✓ does.
  - Each choice shows "PAYEE → Category" with **Undo**.
- **Fixed:** the list took a payee's guess from its latest payment. On Barry's data, a British Gas credit made the payee read "Income". It now takes the guess most of the payee's payments get (new test).

## 2026-10-19 — spend-20261019-charts

Phase 4: charts, plus custom categories (Barry's request).
- **Spending tile** under Balance:
  - A ring by category, with the total spent in the middle.
  - Monthly bars stacked by category, both for the timeline's range.
  - Spending is money out less refunds; pay and transfers in are not counted.
- **Clicking:** a slice opens the category's panel; a bar segment opens it for that month. Clicking a name under the ring hides the category from both charts, remembered per device; for example Transfers, which is 61% of the sample's money out.
- **Custom categories:** "+ New" in each row's picker (creates and assigns in one step), "+ New category" in the Categories list, and ✕ to delete in Edit (it asks first and says how many payees and choices it affects).
- **Checked on the sample:**
  - The ring total equals the raw CSV's money out, less the one £20 refund.
  - The July Groceries bar and the panel agree (10 payments, £480.14).
  - A new category from the picker moved all 7 rows of that payee and appeared in the ring; deleting it returned them.
- **Tests:** 75 of 75 (100%), 4 of them new.

Fixed during the build (found in the renders):
- A bar tooltip stayed floating over the panel.
- The first automatic colour for a new category was too close to Eating out's orange.

## 2026-10-19 — spend-20261019-category-panel

- **Click a category to see its payments** (Barry's request).
  - The Categories tab now lists every category with its count and total for the timeline's range, plus "Uncategorised". Renaming and recolouring moved behind "Edit categories".
  - The slide-in panel lists the payments newest first, by month with subtotals. A statement payment opens its PDF on top.
- **Checked on the sample (3M):**
  - The category counts add up to the 438 transactions in range.
  - Coffee shows 50 payments; its monthly subtotals sum to the header total.
  - 13 Aug Costa Coffee opened on page 8, highlighted.
- Income-only categories show money in (+£) rather than £0.00 out.

## 2026-10-19 — spend-20261019-categories

Phase 3: categories.
- **A category dot on every row.** Click it for the picker: 16 starter categories, "All from <payee>" (on by default, makes a rule), and free labels (shown as #label).
- **Categories tile:**
  - "To sort": payees by spend in the current range, each with its guess, a dropdown and a ✓ to keep it.
  - "Categories": rename, recolour, add.
- **First guesses:** UK merchant names plus payment types. They cover 996 of 1,451 rows (68.6%) of the sample, checked by reading the top 45 payees' guesses.
- **Refunds and their payments tinted lilac,** with a switch.
- **Search** also finds category names and labels.
- **`spending-data.json` is now really written:** straight to the folder in Chrome; in the app with the orange dot in Safari.
- **Tests:** 71 of 71 (100%). The 17 new ones cover payee keys, rule order, refunds and payee totals.

Fixed during the build (found by reading the guesses before counting them):
- SAINSBURYS and MARKS&SPENCER were missed.
- Fish bar, pizza and "… HEAD" pubs had no rule.

## 2026-10-19 — spend-20261019-self-update

- **Stale-build guard.** Barry's Safari still showed `spend-20261019-timeline` after ⌥⌘R.
  - Cause: the old service worker was still answering. A worker fix only takes effect on the load after the one that installs it.
  - Fix: on every opening, the app reads the server copy's stamp with `cache: 'no-store'`. If it is newer, the app clears the offline cache, updates the worker and loads the new build once, at a `?v=<stamp>` URL no cache has seen. The worker is also registered with `updateViaCache: 'none'`.

## 2026-10-19 — spend-20261019-fresh-load

- **Fixed a stale build on reopening.** Barry reopened the app in Safari and got `spend-20261019-timeline` after `drag-select` was live, so drag-to-select seemed broken.
  - Cause: GitHub Pages sends `max-age=600`, and `sw.js` fetched with the default cache mode, so a reopen within 10 minutes of a push got the old page.
  - Fix: `sw.js` now fetches with `cache: 'no-cache'`, so every opening re-checks with GitHub.

## 2026-10-19 — spend-20261019-drag-select

- **Drag across the balance chart to select a new window**, which the chart then zooms to (Barry's request).
- Dragging no longer pans. To pan: drag the slider window, or swipe two fingers sideways on a trackpad (new). Pinch still zooms, and a plain click still jumps the list to that day.
- **Checked on the sample:**
  - A sweep chose 15 Feb – 9 Aug 26, within a day of the dates predicted from the pointer positions, and the list showed only those 661 entries.
  - A swipe moved the window 44 days with its 175-day width kept, and a vertical scroll still scrolls the page.

## 2026-10-19 — spend-20261019-timeline

Phase 2: the balance timeline.
- **Balance tile:** day-end balance as a step line; it breaks over days no statement or CSV covers.
- **Zoom and pan:** drag, trackpad pinch, and a navigator slider. Preset buttons 1M / 3M / 6M / 1Y / All are remembered per device.
- **The zoomed window is the app's date range.** The Transactions list now shows only that window, and later tiles will too.
- **Tooltip:** weekday, date, day-end balance and the day's entries.
- **Clicking the chart** jumps the list to that day.
- **Payday dots,** on by default with a switch. Pay is found by a recurring amount, not a name.
- The top bar no longer repeats the date range. The narrow-screen date column is wider.
- **Tests:** 54 of 54 (100%). The 13 new ones cover daily balances, gaps, ranges, month-end arithmetic and paydays.

Fixed during the build (found by rendering):
- The slider hid the month labels.
- The chart's echo of a preset button press cleared the highlight.
- On a phone, the date ran into the shop name.

## 2026-10-19 — spend-20261019-foundations

First build: the foundations phase.
- **Reads HSBC statement PDFs:** position-based, with columns taken from each page's header. Every entry gets its page and row box. Each statement self-checks against HSBC's own printed day balances and summary totals.
- **Reads the miData CSV** in 18-character blocks, dropping masked payees.
- **Merges** statements and CSVs into one timeline with no duplicates. Statement rows win, and keys stay stable for tagging later.
- **Storage drivers:** a folder in Chrome (read and write) and a saved copy in Safari, with a save dot and a download of the data file.
- **Transactions tile:** windowed list, search, date order toggle, collapsible.
- **PDF panel:** click a row to open its statement at the right page with the line highlighted. Pages are laid out first and drawn afterwards; a lost draw is retried when the app is visible.
- **System panel:** stamp, storage, per-statement checks with gems, merge counts.
- **Repo safety:** `.gitignore` plus a pre-commit hook; the expected test figures are kept outside the repo.
- **Installable:** manifest, icon, and a network-first offline cache.
- **Tests:** 41 of 41 (100%).

Fixed during the build (found by rendering, before release):
- The first row box on a page reached into the BROUGHT FORWARD line. The box top is now clamped to the line above.
- The PDF panel froze half-drawn if the app was hidden mid-draw, because pdf.js's draw never settled. Layout and highlight no longer wait on drawing.
- CSV descriptions ran name and town together. They are now read as fixed 18-character blocks.
