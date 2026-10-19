#!/usr/bin/env node
/* run-tests.js — Gate 1 for the data layer.
 *
 *   node run-tests.js                 (sample folder: ~/Documents/Bank Things)
 *   SPENDING_SAMPLES=/path node run-tests.js
 *
 * Runs the <script id="core"> block of index.html in Node, with the same pdf.js
 * build the app uses (vendor/). Part 1 is synthetic and needs no bank data.
 * Part 2 reads Barry's real sample statement AND its expected figures
 * (spending-tests.json) from OUTSIDE the repo — the repo is public and never holds
 * his statements or his numbers. If they are missing, Part 2 is SKIPPED, which is
 * not a green baseline.
 *
 * --dump writes the parser's row boxes to .render/boxes.json for the overlay render.
 * Tests are blind to how anything looks; Gate 2 (Barry's eye) is still required.
 */
const fs = require('fs'), path = require('path'), os = require('os');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const core = /<script id="core">([\s\S]*?)<\/script>/.exec(html);
if (!core) { console.error('No <script id="core"> block in index.html'); process.exit(2); }
const m = { exports: {} };
new Function('module', core[1])(m);
const Core = m.exports;

let pass = 0, fail = 0, skipped = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`  FAIL ${name}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`);
};

(async () => {
  // ---------- Part 1: synthetic ----------
  eq('pence £1,234.56', Core.pence('£1,234.56'), 123456);
  eq('pence -£2.25', Core.pence('-£2.25'), -225);
  eq('pence +£216.20', Core.pence('+£216.20'), 21620);
  eq('pence split "£453.1 7"', Core.pence('£453.1 7'), 45317);
  eq('pence junk', Core.pence('abc'), null);
  eq('rowDate', Core.rowDate('16 Jul 26'), '2026-07-16');
  eq('rowDate rejects', Core.rowDate('A'), null);
  eq('addDays over month', Core.addDays('2026-01-31', 1), '2026-02-01');
  eq('fmt', Core.fmt(-123456, true), '−1,234.56');
  eq('csv quotes', Core.csvRows('a,"b,c",d\n1,"x""y",2'), [['a', 'b,c', 'd'], ['1', 'x"y', '2']]);

  // letter-per-item bold text joins into words; a 1.9pt gap is a space; a 20pt gap is a new cell
  const letters = (s, x, y) => [...s].map((ch, i) => ({ s: ch, x: x + i * 5, y, w: 4.8, h: 8 }));
  const L = Core.toLines([...letters('BALANCE', 140, 100), ...letters('BROUGHT', 177, 100), { s: '338.31', x: 528, y: 100.3, w: 22, h: 8 }]);
  eq('toLines letters', L[0].cells.map(c => c.s), ['BALANCE BROUGHT', '338.31']);

  const csv = '﻿Date,Type,Merchant/Description,Debit/Credit,Balance\n'
    + '2026-01-03,))),SHOP B            TOWN,-£1.00,+£8.00\n2026-01-02,CR,******************,+£5.00,+£9.00\n2026-01-01,DD,BILL,-£1.00,+£4.00\n\nArranged overdraft limit,2026-01-04,+£100.00';
  const C = Core.parseMidataCsv(csv);
  eq('csv rows chronological', C.tx.map(t => t.date), ['2026-01-01', '2026-01-02', '2026-01-03']);
  eq('csv padded description split', C.tx[2].d, ['SHOP B', 'TOWN']);
  eq('csv masked description dropped', C.tx[1].d, []);
  eq('csv chain', C.checks.chain, { ok: 2, total: 2 });
  eq('csv ok', C.ok, true);

  // merge: statement covers 1-2 Jan; CSV covers 1-3 Jan; duplicate CSV must not double up
  const S = { period: { from: '2026-01-01', to: '2026-01-02' }, opening: 500, closing: 900, file: 's.pdf', tx: [
    { date: '2026-01-01', type: 'DD', d: ['BILL'], amount: -100, bal: 400, page: 1, box: [0, 0, 1, 1] },
    { date: '2026-01-02', type: 'CR', d: ['PAY'], amount: 500, bal: 900, page: 1, box: [0, 0, 1, 1] }] };
  const M = Core.merge([S, S], [{ ...C, file: 'a.csv' }, { ...C, file: 'b.csv' }]);
  eq('merge count', M.tx.length, 3);
  eq('merge sources', M.tx.map(t => t.src), ['pdf', 'pdf', 'csv']);
  eq('merge stats', [M.stats.matched, M.stats.csvOnly, M.stats.pdfUnmatched, M.stats.breaks], [2, 0, 0, 0]);
  eq('merge keys', M.tx.map(t => t.key), ['2026-01-01|-100|0', '2026-01-02|500|0', '2026-01-03|-100|0']);
  const M2 = Core.merge([S, { ...S, period: { from: '2026-01-05', to: '2026-01-06' }, opening: 1, tx: [{ ...S.tx[0], date: '2026-01-05' }] }], []);
  eq('merge gap found', M2.gaps.map(g => g.kind + ' ' + g.from + '..' + g.to), ['missing 2026-01-03..2026-01-04']);

  // timeline: day-end balances, uncovered days break the line, ranges, paydays
  const T = [
    { date: '2026-01-01', amount: -100, bal: 900 }, { date: '2026-01-01', amount: -50, bal: 850 },
    { date: '2026-01-03', amount: 300000, bal: 300850 }, { date: '2026-01-06', amount: -1, bal: 300849 }];
  const D = Core.dailyBalances(T, [['2026-01-01', '2026-01-03'], ['2026-01-05', '2026-01-06']]);
  eq('daily: one point per day, day-end balance', D.map(d => d.bal), [850, 850, 300850, null, 300850, 300849]);
  eq('daily: dates run through', [D[0].date, D[3].date, D[5].date], ['2026-01-01', '2026-01-04', '2026-01-06']);
  const D2 = Core.dailyBalances(T, [['2025-12-30', '2026-01-06']]);
  eq('daily: days before the first entry hold the opening balance', D2.slice(0, 3).map(d => d.bal), [1000, 1000, 850]);
  eq('addMonths clamps to month end', [Core.addMonths('2026-03-31', -1), Core.addMonths('2026-01-31', 1), Core.addMonths('2026-01-15', -12)], ['2026-02-28', '2026-02-28', '2025-01-15']);
  eq('preset 1M', Core.presetRange('2026-09-18', '1M'), { from: '2026-08-19', to: '2026-09-18' });
  eq('preset 1Y', Core.presetRange('2026-09-18', '1Y'), { from: '2025-09-19', to: '2026-09-18' });
  eq('preset All', Core.presetRange('2026-09-18', 'All'), null);
  eq('inRange', Core.inRange(T, { from: '2026-01-02', to: '2026-01-05' }).length, 1);
  const pay = [];
  for (let m = 1; m <= 6; m++) {
    const mm = String(m).padStart(2, '0');
    pay.push({ date: `2026-${mm}-24`, amount: 380000 + m, key: 'p' + m });            // salary, wobbling by pennies
    pay.push({ date: `2026-${mm}-02`, amount: 2000, key: 's' + m });                   // small credits ignored
  }
  pay.push({ date: '2026-03-10', amount: 100000, key: 'big1' }, { date: '2026-05-10', amount: 100000, key: 'big2' });   // one-off transfers
  pay.push({ date: '2026-04-25', amount: 375000, key: 'p4b' });                      // a second near-salary credit in April
  eq('paydays: recurring amount, one per month', Core.findPaydays(pay).map(t => t.key), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  eq('paydays: under 3 months is not pay', Core.findPaydays(pay.filter(t => t.date < '2026-03')).length, 0);

  // categories: payee identity, who decides, refunds, payee totals
  const k = d => Core.payeeKey({ d });
  eq('payeeKey store number', k(['TESCO-STORES 6059', 'BARNET']), 'TESCO STORES');
  eq('payeeKey INT\'L uses line 2', k(["INT'L 0079832565", 'APPLE.COM/BILL', '08001076285']), 'APPLE COM BILL');
  eq('payeeKey PDF and CSV agree', [k(['Just Eat.Co.UK Ltd', 'London']), k(['JUST EAT.CO.UK LTD', 'LONDON'])], ['JUST EAT CO UK LTD', 'JUST EAT CO UK LTD']);
  eq('payeeKey asterisks', k(['PAYPAL_*LATYMER UP']), 'PAYPAL LATYMER UP');
  eq('payeeKey numbers-only line keeps numbers', k(['123456 7654321', 'INTERNET TRANSFER']), '123456 7654321');
  eq('payeeKey masked', k([]), '');
  const tx1 = { key: 'a', d: ['COSTA', 'London'], type: ')))', amount: -450 };
  eq('category: name guess', Core.categoryOf(tx1, {}), { cat: 'coffee', src: 'guess' });
  eq('category: rule beats guess', Core.categoryOf(tx1, { rules: { COSTA: 'eating' } }), { cat: 'eating', src: 'rule' });
  eq('category: own tag beats rule', Core.categoryOf(tx1, { rules: { COSTA: 'eating' }, tags: { a: { cat: 'gifts' } } }), { cat: 'gifts', src: 'tag' });
  eq('category: labels-only tag falls through', Core.categoryOf(tx1, { tags: { a: { labels: ['x'] } } }), { cat: 'coffee', src: 'guess' });
  eq('category: masked transfer by type', Core.categoryOf({ key: 'b', d: [], type: 'TFR', amount: -100 }, {}), { cat: 'transfers', src: 'guess' });
  eq('category: unknown', Core.categoryOf({ key: 'c', d: ['YE OLDE MITRE'], type: ')))', amount: -554 }, {}), { cat: null, src: 'none' });
  eq('category: fish bar is takeaway, not pubs', Core.categoryOf({ key: 'd', d: ['SEVENTEEN FISH BAR'], type: ')))', amount: -1 }, {}).cat, 'takeaway');
  const R = Core.findRefunds([
    { key: 'p1', date: '2026-01-01', d: ['SHOP'], amount: -2000 }, { key: 'p2', date: '2026-01-05', d: ['SHOP'], amount: -2000 },
    { key: 'r1', date: '2026-01-10', d: ['SHOP'], amount: 2000 },                 // refunds the LATEST matching payment
    { key: 'r2', date: '2026-06-01', d: ['SHOP'], amount: 2000 },                 // p1 is over 90 days old: no pair
    { key: 'p3', date: '2026-02-01', d: ['OTHER'], amount: -2000 }, { key: 'r3', date: '2026-02-02', d: ['ELSE'], amount: 2000 }]);
  eq('refunds: latest match, both ways, 90-day limit, same payee', [R.get('r1'), R.get('p2'), R.has('r2'), R.has('r3')], ['p2', 'r1', false, false]);
  const PS = Core.payeeSummary([
    { key: 1, d: ['COSTA'], type: ')))', amount: -450 }, { key: 2, d: ['COSTA'], type: ')))', amount: -300 },
    { key: 3, d: ['WAITROSE'], type: ')))', amount: -5000 }, { key: 4, d: [], type: 'TFR', amount: -9 }], { rules: { WAITROSE: 'other' } });
  const PS2 = Core.payeeSummary([
    { key: 1, date: '2026-01-01', d: ['BRITISH GAS'], type: 'DD', amount: -9000 }, { key: 2, date: '2026-02-01', d: ['BRITISH GAS'], type: 'DD', amount: -9000 },
    { key: 3, date: '2026-03-01', d: ['BRITISH GAS'], type: 'CR', amount: 4000 }], {});
  eq('payeeSummary: a refund credit last does not make a bill payee income', [PS2[0].cat, PS2[0].src], ['bills', 'guess']);
  eq('payeeSummary: money out and money in kept apart', [PS2[0].n, PS2[0].out, PS2[0].inn], [3, 18000, 4000]);
  eq('payeeSummary', PS.map(p => [p.key, p.n, p.out, p.cat, p.src]), [['WAITROSE', 1, 5000, 'other', 'rule'], ['COSTA', 2, 750, 'coffee', 'guess']]);

  // spending charts: money out less refunds; pay and transfers in are not spending; months run through
  const ST = [
    { key: 'a', date: '2026-01-05', amount: -1000, c: 'food' }, { key: 'b', date: '2026-01-20', amount: -500, c: 'food' },
    { key: 'r', date: '2026-01-21', amount: 500, c: 'food' },                                   // refund of b
    { key: 'p', date: '2026-01-25', amount: 300000, c: 'income' },                              // pay: not spending
    { key: 'x', date: '2026-03-02', amount: -2000, c: null }];                                   // uncategorised; Feb empty
  const cf = t => t.c, rf = t => t.key === 'r';
  eq('spendTotals', [...Core.spendTotals(ST, cf, rf)], [['food', 1000], ['', 2000]]);
  const SM = Core.spendByMonth(ST, cf, rf);
  eq('spendByMonth months run through', SM.months, ['2026-01', '2026-02', '2026-03']);
  eq('spendByMonth per category', [SM.byCat.get('food'), SM.byCat.get(''), SM.byCat.has('income')], [[1000, 0, 0], [0, 0, 2000], false]);
  eq('spendByMonth empty', Core.spendByMonth([], cf, rf).months, []);

  // ---------- Part 2: Barry's real sample (outside the repo) ----------
  // The expected figures are his own money, so they live beside the samples, never here.
  const dir = process.env.SPENDING_SAMPLES || path.join(os.homedir(), 'Documents', 'Bank Things');
  const expPath = path.join(dir, 'spending-tests.json');
  if (!fs.existsSync(expPath)) {
    skipped++;
    console.log(`  SKIPPED sample tests — no spending-tests.json in ${dir}`);
  } else {
    const X = JSON.parse(fs.readFileSync(expPath, 'utf8'));
    const warn = console.warn; console.warn = () => {};      // pdf.js complains about missing canvas in Node; text needs none
    const pdfjs = require('./vendor/pdf.js');
    console.warn = warn;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(dir, X.pdf))), verbosity: 0 }).promise;
    const P = Core.parseHsbcPdf(await Core.pdfToPages(doc));
    P.file = X.pdf;
    eq('sample period', P.period, X.period);
    eq('sample transactions', P.tx.length, X.tx);
    eq('sample issues', P.issues, []);
    eq('sample day balances', P.checks.dayBalances, X.dayBalances);
    eq('sample paid in', [P.checks.totalIn.parsed, P.checks.totalIn.printed], [X.paidIn, X.paidIn]);
    eq('sample paid out', [P.checks.totalOut.parsed, P.checks.totalOut.printed], [X.paidOut, X.paidOut]);
    eq('sample opening/closing', [P.opening, P.closing, P.summary.closing], [X.opening, X.closing, X.closing]);
    eq('sample ok', P.ok, true);
    const t0 = P.tx[0], tN = P.tx[P.tx.length - 1];
    eq('sample first entry', [t0.date, t0.type, t0.d, t0.amount, t0.page], X.first);
    eq('sample last entry', [tN.date, tN.type, tN.d, tN.amount, tN.bal, tN.page], X.last);
    eq('sample every entry dated', P.tx.every(t => /^\d{4}-\d\d-\d\d$/.test(t.date)), true);
    eq('sample every box on its page', P.tx.every(t => t.box[0] > 0 && t.box[2] < 596 && t.box[1] < t.box[3] && t.box[3] < 842), true);

    const C2 = Core.parseMidataCsv(fs.readFileSync(path.join(dir, X.csv), 'utf8'));
    C2.file = X.csv;
    eq('sample csv rows', C2.tx.length, X.csvRows);
    eq('sample csv chain', C2.checks.chain, { ok: X.csvRows - 1, total: X.csvRows - 1 });
    eq('sample csv range', [C2.from, C2.to], X.csvRange);

    const M3 = Core.merge([P], [C2]);
    eq('sample merge matched', M3.stats.matched, X.tx);
    eq('sample merge csv-only / pdf-only', [M3.stats.csvOnly, M3.stats.pdfUnmatched], [0, 0]);
    eq('sample merge total', M3.tx.length, X.csvRows);
    eq('sample merge breaks', M3.stats.breaks, 0);
    eq('sample merge keys unique', new Set(M3.tx.map(t => t.key)).size, X.csvRows);
    const days = Core.dailyBalances(M3.tx, M3.cover);
    eq('sample daily points', [days.length, days.filter(d => d.bal == null).length], [X.days, 0]);
    eq('sample daily ends on closing balance', days[days.length - 1].bal, M3.tx[M3.tx.length - 1].bal);
    const bySrc = { tag: 0, rule: 0, guess: 0, none: 0 };
    for (const t of M3.tx) bySrc[Core.categoryOf(t, {}).src]++;
    eq('sample first guesses', bySrc.guess, X.guessed);
    eq('sample refund pairs', Core.findRefunds(M3.tx).size / 2, X.refundPairs);
    const P2 = Core.findPaydays(M3.tx);
    eq('sample paydays', [P2.length, P2.every(t => t.amount === P2[0].amount || Math.abs(t.amount - P2[0].amount) <= P2[0].amount * 0.05)], [X.paydays, true]);

    if (process.argv.includes('--dump')) {
      fs.mkdirSync(path.join(__dirname, '.render'), { recursive: true });
      fs.writeFileSync(path.join(__dirname, '.render', 'boxes.json'), JSON.stringify(P.tx.map(t => ({ page: t.page, box: t.box, date: t.date, amount: t.amount, type: t.type }))));
    }
  }

  const total = pass + fail;
  console.log(`\n${fail ? '🔴' : skipped ? '🟡' : '🟢'} ${pass} of ${total} passed (${total ? Math.round(pass / total * 1000) / 10 : 0}%)${skipped ? ' — sample tests SKIPPED' : ''}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
