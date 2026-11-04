'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function makeView() {
  const win = {
    currentLang: 'ja',
    t: key => key,
    tOp: operator => operator,
    RailwayDB: { resolveStationName: id => id, getLineStations: () => ['a', 'b'] },
    LinePresentationService: {
      getDisplayOrder: () => ['One', 'Two'],
      getDisplayOrderMap: () => ({ One: 0, Two: 1 }),
      orderOperators: ops => ops,
      isIndependentLine: () => true,
      getPrimaryPresentation: id => ({ nameJa: id, code: id, color: '#123456' }),
      getPresentationMembers: id => [id],
      getStatusMembers: members => members
    }
  };
  const doc = { readyState: 'loading', addEventListener() {} };
  vm.runInNewContext(fs.readFileSync('js/data-state.js', 'utf8'),
    { window: win, document: doc, navigator: {}, console }, { timeout: 4000 });
  return win;
}

test('train overview uses flat operator groups and removes stale loading state', () => {
  const win = makeView();
  const attrs = { 'data-page-state': 'loading', 'data-page-state-key': 'status.loading' };
  const container = {
    innerHTML: '',
    removeAttribute(key) { delete attrs[key]; },
    querySelectorAll() { return []; }
  };
  const lines = {
    One: { operator: 'JR-East', stations: ['a', 'b'] },
    Two: { operator: 'TokyoMetro', stations: ['c', 'd'] }
  };
  win.DataState.renderList(container, lines,
    { mode: 'trains', flatGroups: true, lineOrder: ['One', 'Two'] });
  assert.equal(attrs['data-page-state'], undefined);
  assert.equal(attrs['data-page-state-key'], undefined);
  assert.equal((container.innerHTML.match(/rs-operator-group/g) || []).length, 2);
  assert.equal((container.innerHTML.match(/rs-line-card rs-system-card/g) || []).length, 2);
  assert.ok(!container.innerHTML.includes('rs-cards-container'),
    'Train page must not add a redundant container per operator');
  assert.ok(container.innerHTML.includes('class="rs-system-lines rs-sys-chip"'),
    'A single segment does not need both a wrapper and a span');

  win.DataState.renderList(container, lines,
    { mode: 'realtime', lineOrder: ['One', 'Two'] });
  assert.equal((container.innerHTML.match(/class="rs-cards-container"/g) || []).length, 2,
    'Shared realtime layout must retain its own card containers');
});

test('multi-interval train systems keep the required wrapping layout', () => {
  const win = makeView();
  const lines = {
    One: { operator: 'JR-East', stations: ['a', 'b'] },
    Two: { operator: 'JR-East', stations: ['c', 'd'] }
  };
  const html = win.LineCard.renderSystem(
    { nameJa: 'Sample', code: 'X', color: '#123456' },
    ['One', 'Two'], lines, { mode: 'trains' });
  assert.ok(html.includes('<div class="rs-system-lines">'));
  assert.equal((html.match(/class="rs-sys-chip"/g) || []).length, 2);
});

test('train detail drops the invisible overview and rebuilds on return', () => {
  const html = fs.readFileSync('pages/trains.html', 'utf8');
  const controller = fs.readFileSync('js/trains-page.js', 'utf8');
  assert.match(html, /id="trainsLineListContent"\s+class="pixel-card rs-line-list-shell rs-line-list-content"/);
  assert.ok(!html.includes('<div class="pixel-card rs-line-list-shell">'),
    'The static overview uses one element instead of a nested shell');
  assert.match(controller, /function releaseOverviewDom\(\)/);
  assert.match(controller, /listEl\.replaceChildren\(\)/);
  assert.equal((controller.match(/^\s+releaseOverviewDom\(\);$/gm) || []).length, 2,
    'Both cold detail opening and subsequent line navigation release the overview');
  assert.match(controller, /if \(listEl && !listEl\.querySelector\("\.rs-line-card"\)\) \{\s*renderList\(listEl\)/);
  assert.match(controller, /if \(!hasLineCards && \(!detailEl \|\| detailEl\.classList\.contains\("hidden"\)\)\)/);
});
