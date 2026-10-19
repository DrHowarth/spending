# ARCHITECTURE — Spending

## 1. Shape

One page (`index.html`) and no build step, served by GitHub Pages and installable as an app (manifest + `sw.js`).
**Code and data are separate.** The app re-reads Barry's data folder every time it opens; nothing he owns is ever fetched over the network.

```
data folder (Barry's, moves between devices by hand)
  *.pdf                 HSBC monthly statements (~16th → 15th)
  *.csv                 HSBC miData exports (latest weeks; masks payee names, see §4)
  spending-data.json    categories, rules, tags, prefs — written by the app (from the Categories phase)
  spending-tests.json   expected figures for run-tests.js (on the iMac sample folder only)
```

## 2. Layers

1. **Core** (`<script id="core">`): pure functions, no DOM, all money in integer pence.
   `pdfToPages` → `parseHsbcPdf` / `parseMidataCsv` → `merge`. Exported as `Core`, and also as `module.exports` for the tests.
2. **Storage**: two drivers with one shape (`restore / pick / list / blob / readData / writeData`).
   - `FolderDriver` (Chrome/Edge): File System Access. The directory handle is kept in IndexedDB; on launch it asks for permission and shows a Reconnect button if Chrome wants a click.
   - `CopyDriver` (Safari, iPad): a folder (or file, on iOS) picker imports the files into IndexedDB. Data-file edits are saved in the app and flagged with a dot; ⤓ downloads a fresh `spending-data.json` to put back in the folder. When a folder is re-chosen, the newer `savedAt` wins.
3. **State**: one `state` object (files, statements, CSVs, merged timeline, data, view). Tiles only read it.
4. **Tiles**: Balance timeline, the Transactions list (windowed, 40px rows) and the PDF panel. The System dialog shows the stamp, storage and every check.

The parse results are cached in IndexedDB, keyed by `name|size|lastModified|PARSER_VERSION`. **Bump `PARSER_VERSION` whenever the parser's output changes.**

## 3. HSBC statement parsing

What pdf.js gives, as seen on the rendered pages, and how each is handled:
- **Bold text arrives one letter per item** (headers, BALANCE BROUGHT/CARRIED FORWARD, the summary labels). `toLines` groups items by baseline (within 2pt), then joins runs: a gap under 6pt stays in the same cell, and a gap over 1.2pt inside a cell is a space. Matching uses squashed lower-case text (`sq`).
- **Columns come from each page's header line** (Date / Payment type and details / £ Paid out / £ Paid in / £ Balance). Money cells go to the header whose right edge is nearest; the type is the cell left of `details.x + 10`; the description is everything else that has a letter or digit in it.
- **The date is printed only on a day's first row**, so it carries forward. Descriptions run over 1–3 lines, and the amount sits on the last line. The balance is printed only at a day's end, and it is checked against the running total.
- The table region starts at BALANCE BROUGHT FORWARD, which also kills the invisible stray "A" on page 1, and ends at CARRIED FORWARD.
- **Overdrawn:** a `D`/`OD` cell after the balance makes it negative. *Not yet seen on a real statement — unverified.*
- **Row box:** `[left of Date, top, right of Balance, bottom]` in page units. The top is clamped to the bottom of the line above, because HSBC packs the first entry tight under BROUGHT FORWARD.
- **Checks per statement:** day balances, total paid in/out against the summary, opening and closing. `ok` is true only when all pass.

## 4. miData CSV

The CSV is newest first, with the balance after every row; reversed, it is chronological, and each balance equals the previous balance plus the amount.
Descriptions are **fixed-width 18-character blocks** (name, town). HSBC replaces the payee on CR/BP/SO/DR/TFR rows with asterisks, and blocks that are only asterisks are dropped. **So statement PDFs are the main source; the CSV is for the weeks since the last statement.**

## 5. Merge

- Statements are de-duplicated by period, and gaps between periods are reported (missing month, or opening ≠ previous closing).
- CSV rows are de-duplicated on date, amount, balance and text.
- A CSV row inside a statement period is matched to a statement row on (date, amount), as a multiset. Statement rows win, because they carry the PDF position.
- CSV rows outside every period are added. A CSV row inside a period with no match is added and flagged.
- `key = date|amount|n` is the stable identity used for tags. It doesn't change when a CSV row is later replaced by its statement row.

## 6. Timeline (the app's date range)

- `dailyBalances(tx, cover)`: one day-end balance per calendar day. A day that no statement or CSV covers (`merge().cover`) is `null`, so the step line breaks over a missing month instead of drawing a false flat stretch.
- Drawn as an ECharts `step: 'end'` line (a value holds until the next day's).
- Zooming (Barry's request: "left-click and hold while sweeping" selects the new window):
  - **Drag across the chart** (mouse, or one finger) draws an ECharts `brush` (lineX). `onBrushEnd` zooms to it and clears it. A sweep under a day counts as a click, which jumps the list.
  - So dragging does not pan. To pan: drag the window in the `slider` (the stock-chart navigator), swipe two fingers sideways on a trackpad (`onSwipe`, using wheel deltaX), or shift+wheel.
  - Pinch (trackpad ctrl+wheel, or touch) zooms. A plain up/down wheel is left to the page, so the page still scrolls.
  - `brush` needs `takeGlobalCursor` again after every `setOption(…, true)`; `buildTimeline` does it.
- **The zoomed window is the app's date range:** `readZoom` → `state.view.range` (`null` means everything). Every tile filters with `Core.inRange`, so later tiles must read it, not keep their own.
- **Presets** (`presetRange`): 1M/3M/6M/1Y end on the last day of data. A hand drag clears the preset. A rebuild keeps a dragged window. `applyPreset` cancels the chart's own echo of its action, or the echo would clear the preset.
- **Paydays** (`findPaydays`): the credit amount (within 5%) that recurs in the most different months, at most one per month, at least 3 months. It reads amounts, not names, because the CSV hides payers.
  - On the sample, the 12 dots sit on the 12 monthly salary jumps.
  - The switch is stored per device in localStorage.
- Clicking the chart jumps the Transactions list to that day.

## 7. Categories

- **Who decides, first match wins (`categoryOf`):**
  1. the transaction's own tag (`tags[txKey].cat`)
  2. Barry's payee rule (`rules[payeeKey]`)
  3. a built-in name guess (`NAME_GUESSES`, UK merchants)
  4. a type guess (DD → Bills, ATM → Cash, CR → Income, TFR/SO/BP → Transfers)
  5. none

  Guesses are drawn as faded dots and are never saved. Only Barry's choices go into `spending-data.json`.
- **`payeeKey`:** the first description line in capitals with only letters and `&` kept, so store numbers and punctuation go. `INT'L` card lines use line 2. A numbers-only line, such as a transfer's sort code and account, keeps its numbers, so two accounts stay separate.
  - HSBC cuts names to 18 characters in both the PDF and the CSV, so both sources give the same key.
  - The CSV masks payees on CR/BP/SO/DR/TFR rows. Those have no key, so they can only take a type guess or a per-row tag.
- **Refunds (`findRefunds`):** a credit pairs with the latest earlier payment to the same payee, for the same amount, within 90 days, at most once. Both rows are tinted lilac; the switch is per device.
- **"Sort payees"** lists payees in the timeline's range without a rule, biggest spend first. A payee's shown guess is the one most of its payments get, not the latest payment's (Barry's British Gas read "Income" because its latest row was a credit). ✓ or a change makes a rule, and the message offers Undo for 6 s. It is a tagging tool, and the hint line at the top says so.
- **On the sample:**
  - The guesses cover 996 of 1,451 rows (68.6%).
  - There is 1 refund pair (Apple, £20).
  - The top 50 of 218 card, direct debit and cash-machine payees cover 83% of those payments.
- **Category panel** (Barry's request): the Categories tab lists each category's count and money out (money in for income-only ones) in the range. Clicking one slides in `#catPanel`, which lists every payment newest first, grouped by month with subtotals. A statement row opens the PDF over it (z-index 9 over 8), and Escape closes the top panel first. The panel re-renders when the range or the categories change.
- **Saving:** every change is saved 400 ms later. The folder driver writes the file; the copy driver saves in IndexedDB and shows the orange dot.

## 8. Spending charts and custom categories

- **Spending** (`spendTotals`, `spendByMonth`) is money out, less credits that `findRefunds` paired as refunds. Pay and money back from savings are not spending.
- **The months on the bars run through** from the first month in range to the last, including empty ones, so the spacing is true.
- **Ring:** by category for the timeline's range, with the total of the visible categories in the middle. Clicking a slice opens the category panel.
- **Hiding a category:** clicking its name in the legend hides it from both charts (`state.chartHidden`, per device in localStorage).
- **Bars:** stacked by category. Clicking a segment opens the category panel for that month, clipped to the timeline's range (`openCatPanel(id, range)`).
- **Custom categories:**
  - "+ New" in the row picker creates a category and assigns it in one step (as a payee rule if "All from" is ticked).
  - "+ New category" sits in the Categories list.
  - The ✕ in Edit asks first, then removes the category's rules and tags, so those rows fall back to a guess or to uncategorised.
  - New categories take colours from `SPARE_COLOURS`, chosen to differ from the 16 starters.
- **On the sample (6M, 19 Mar – 18 Sep 26):**
  - The ring total is £29,031.96, against £29,051.96 of money out in the raw CSV. The £20.00 difference is the one Apple refund.
  - Transfers are £17,661.15, which is 61% of it.
  - Groceries for July is 10 payments, £480.14, in both the bar tooltip and the panel.

## 9. Testing with the real sample in the browser pane

**ECharts draws only while the browser pane is visible** (show the preview pane first). Start `spending` and `spending-samples`. Then, in the page: fetch the files from `http://localhost:8041/…`, and either `IDB.put('files', …)` plus a `kv/files` index (copy mode, `?store=copy`), or write them into `navigator.storage.getDirectory()` and set `FolderDriver.handle` (folder mode). Then call `loadAll()`.
**A hidden pane pauses drawing.** Run `drawPages` again once it is visible, and delete the OPFS folder and the `spending` IndexedDB afterwards.

## 10. Build plan

The plan approved on 19 Oct 2026, one phase per session:

1. Foundations
2. Timeline
3. Categories
4. Charts
5. Repeats and habits
6. Calculator
7. Tile polish

ECharts 5.5.1 is in `vendor/` (it reports zrender's own 5.6.0 too, which is expected). SortableJS 1.15.2 still has to be added the same way, for tile dragging.
