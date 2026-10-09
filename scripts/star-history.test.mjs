import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyPoints, render } from './star-history.mjs';
const week = 1791072000;
test('sorts API weeks and accumulates daily counts', () => {
  const p = historyPoints([{week: week + 604800, days:[2,0,0,0,0,0,0]}, {week, days:[0,0,0,0,0,8,0]}]);
  assert.equal(p.at(-1).count, 10);
  assert.equal(p[5].count, 8);
});
test('renders zero and single-day series without invalid coordinates', () => {
  for (const count of [0, 8]) {
    const svg = render('test/repo', [{week, days:[count,0,0,0,0,0,0]}], count, false, week * 1000);
    assert.doesNotMatch(svg, /NaN|Infinity/);
    assert.match(svg, /<circle/);
  }
});
test('rejects missing history and invalid counts instead of publishing an empty chart', () => {
  assert.throws(() => render('test/repo', [], 8));
  assert.throws(() => render('test/repo', [], -1));
  assert.throws(() => historyPoints([{week, days:[-1,0,0,0,0,0,0]}]));
});
