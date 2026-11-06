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

test('alert artwork is a generic pixel-cab pictogram and never a real vehicle PNG', () => {
  const win = loadCardRenderer();
  const delayed = win.DataState.statusPictogramHtml('delayed');
  const notice = win.DataState.statusPictogramHtml('notice');
  assert.match(delayed, /<svg class="pt-train-status-art"/);
  assert.match(delayed, /#ff9e32/);
  assert.match(notice, /#ffe14d/);
  assert.match(delayed, /shape-rendering="crispEdges"/);
  assert.notEqual(delayed, notice);
  assert.equal(win.DataState.statusPictogramHtml('normal'), '');
  assert.equal(win.DataState.statusPictogramHtml('no_data'), '');
  assert.doesNotMatch(delayed, /images\/列车|vehicleIconPath|<image/);
  const line = {operator:'JR-East',delayInfo:{status:'delayed'}};
  assert.match(win.LineCard.render(line, 'JobanRapid', {mode:'realtime'}), /pt-train-status-art/);
  line.delayInfo.status = 'notice';
  assert.match(win.LineCard.render(line, 'JobanRapid', {mode:'realtime'}), /pt-train-status-art/);
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
  assert.match(src, /container\.addEventListener\("keydown"/);
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
