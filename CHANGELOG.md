# CHANGELOG — Spending

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
