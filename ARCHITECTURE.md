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
4. **Tiles**: the Transactions list (windowed, 40px rows) and the PDF panel. The System dialog shows the stamp, storage and every check.

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

## 6. Testing with the real sample in the browser pane

Start `spending` and `spending-samples`. Then, in the page: fetch the files from `http://localhost:8041/…`, and either `IDB.put('files', …)` plus a `kv/files` index (copy mode, `?store=copy`), or write them into `navigator.storage.getDirectory()` and set `FolderDriver.handle` (folder mode). Then call `loadAll()`.
**A hidden pane pauses drawing.** Run `drawPages` again once it is visible, and delete the OPFS folder and the `spending` IndexedDB afterwards.

## 7. Build plan

The plan approved on 19 Oct 2026, one phase per session:

1. Foundations
2. Timeline
3. Categories
4. Charts
5. Repeats and habits
6. Calculator
7. Tile polish

Libraries still to come: ECharts 5.5.1 (timeline with stock-style zoom, pie, bar) and SortableJS 1.15.2, both from cdnjs or jsdelivr at exact versions. Download them into `vendor/` the way pdf.js is, so they work offline.
