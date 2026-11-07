'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function loadCardRenderer() {
  const win = {
    currentLang: 'ja',
    t: key => key,
    RailwayDB: {
      resolveLineName: () => '常磐線快速',
      resolveStationName: id => id,
      getLineStations: () => ['A', 'B']
    }
  };
  const doc = { readyState:'loading', addEventListener() {} };
  vm.runInNewContext(read('js/data-state.js'),
    { window:win, document:doc, navigator:{}, console }, {timeout:4000});
  return win;
}

test('railway status symbols do not imply that missing data is normal', () => {
  const win = loadCardRenderer();
  const meta = win.DataState.STATUS_META;
  assert.equal(meta.normal.icon, '○');
  assert.equal(meta.delayed.icon, '△');
  assert.equal(meta.suspended.icon, '×');
  assert.equal(meta.no_data.icon, '?');
  assert.equal(meta.no_odpt.icon, '—');
  assert.equal(meta.loading.icon, '…');
  const card = win.LineCard.render({operator:'JR-East', delayInfo:{status:'no_data'}},
    'JobanRapid', {mode:'realtime'});
  assert.match(card, /role="button" tabindex="0"/);
  assert.match(card, /rs-status-icon-no-data" aria-hidden="true">\?<\/span>/);
  assert.doesNotMatch(card, /aria-label="[^"]*detail\.open/);
});

test('realtime detail dialog is labelled and its close control follows the title', () => {
  const html = read('pages/realtime.html');
  const titlePos = html.indexOf('id="rsModalTitle"');
  const closePos = html.indexOf('class="rs-modal-close"');
  assert.ok(titlePos >= 0 && closePos > titlePos);
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="rsModalTitle"/);
  assert.match(html, /class="rs-close-glyph">×<\/span>/);
  const js = read('js/realtime-view.js');
  assert.match(js, /status === "normal" \? t\("status\.interval"\)/);
  assert.match(js, /区間情報なし/);
  assert.match(js, /status === "normal"\) \{/);
  assert.match(js, /_modalPreviousFocus/);
  assert.match(js, /container\.addEventListener\('keydown'/);
});

test('history actions are reversible and delete is distinct from close', () => {
  const src = read('js/history.js');
  assert.match(src, /showHistoryUndo\(previous, "cleared"\)/);
  assert.match(src, /showHistoryUndo\(history, "deleted"\)/);
  assert.match(src, /persistHistory\(snapshot\)/);
  assert.match(src, /historyUndoNotice/);
  assert.match(src, /M4 7h16M9 7V4h6v3/);
  assert.match(src, /history-delete-btn[^\n]+aria-label/);
  assert.match(src, /class="history-route" href="home\.html\?from=/);
  assert.doesNotMatch(src, /history-entry" role="link"/);
  assert.match(src, /if \(e\.target\.closest\("\.history-route"\)\) return/);
});

test('train fold uses text for unverified vehicle rather than a tiny dot', () => {
  const src = read('js/trains-render.js');
  const css = read('css/ux-refinements.css');
  assert.match(src, /function showUnknownVehicle\(\)/);
  assert.match(src, /train-fold-vehicle-placeholder/);
  assert.match(css, /train-fold-vehicle-icon\.unresolved::after\s*\{\s*content:none/);
  assert.match(css, /prefers-reduced-motion/);
});

test('scoped refinements are included on relevant pages, not home', () => {
  for (const page of ['realtime','trains','history'])
    assert.match(read('pages/' + page + '.html'), /ux-refinements\.css/);
  assert.doesNotMatch(read('pages/home.html'), /ux-refinements\.css/);
});

test('normal realtime reports retain both legacy detail sections', () => {
  const view = read('js/realtime-view.js');
  assert.match(view, /intervalSection\.classList\.toggle\("hidden", \["loading", "no_data", "no_odpt"\]/);
  assert.match(view, /causeSection\.classList\.toggle\("hidden", status !== "normal"/);
  assert.match(view, /status === "normal" \? "status.normal" : "status.none"/);
});
