# CHANGELOG — Spending

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
