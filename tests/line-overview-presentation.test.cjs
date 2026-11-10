'use strict';
// Full-list display contracts. Source data is canonical; this test must not
// rewrite line identities, station topology, or train-number mappings.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/core/railway_data.json'), 'utf8'));
const lines = data.lines;
const runtimeSource = fs.readFileSync(path.join(root, 'data/core/runtime-config.js'), 'utf8');
const runtimeConfig = { SERVICE_CORRIDOR_LINES: { UenoTokyo: true } };
const window = { UNIFIED_LINES: lines, RuntimeConfig: runtimeConfig };
vm.runInNewContext(
  fs.readFileSync(path.join(root, 'js/line-presentation-service.js'), 'utf8'),
  { window }, { filename: 'line-presentation-service.js' }
);
const presentation = window.LinePresentationService;
const primaries = Object.entries(lines).filter(([id, line]) =>
  line.presentation && Array.isArray(line.presentation.lineIds) &&
  line.presentation.lineIds[0] === id);
const ordered = () => Array.from(presentation.getDisplayOrder(lines, { includeServiceCorridors: true }));
const immediatelyAfter = (ids, first, second) =>
  assert.equal(ids.indexOf(second), ids.indexOf(first) + 1, first + ' -> ' + second);

test('all primary display ranks are positive, unique, contiguous integers per operator', () => {
  const groups = {};
  for (const [id, line] of Object.entries(lines)) {
    const rank = line.presentation && line.presentation.order;
    assert.ok(rank == null || Number.isInteger(rank), id + ' has a fractional rank');
  }
  for (const [id, line] of primaries) {
    const rank = line.presentation.order;
    assert.ok(Number.isInteger(rank) && rank > 0, id + ' missing positive integer rank');
    (groups[line.operator] ||= []).push(rank);
  }
  for (const [operator, values] of Object.entries(groups)) {
    values.sort((a, b) => a - b);
    assert.deepEqual(values, values.map((_, i) => i + 1), operator + ' has a rank gap/duplicate');
  }
});

test('JA cards stay together, JR-Sotetsu service does not claim JS', () => {
  const order = ordered();
  immediatelyAfter(order, 'SaikyoKawagoe', 'Kawagoe');
  immediatelyAfter(order, 'Kawagoe', 'SotetsuJRDirect');
  immediatelyAfter(order, 'SotetsuJRDirect', 'ChuoSobuLocal');
  assert.equal(lines.SotetsuJRDirect.presentation.code, '');
  assert.equal(lines.SotetsuJRDirect.code, 'JS', 'internal railway code must not change');
  assert.equal(lines.ShonanShinjuku.presentation.code, 'JS');
  assert.equal(primaries.filter(([id, line]) => line.operator === 'JR-East' &&
    line.presentation.code === 'JS').length, 1);
});

test('aggregated display members have no separate rank; corridor insertion remains adjacent', () => {
  assert.equal(lines.SobuRapid.presentation.lineIds[0], 'Yokosuka');
  assert.equal(lines.SobuRapid.presentation.order, undefined);
  const order = ordered();
  immediatelyAfter(order, 'Yokosuka', 'SobuRapid');
  immediatelyAfter(order, 'ShonanShinjuku', 'UenoTokyo');
});

test('display prefixes use published station numbering, not internal route IDs', () => {
  for (const id of ['Keikyu', 'KeikyuAirport', 'KeikyuKurihama', 'KeikyuZushi', 'Daishi_Keikyu'])
    assert.equal(lines[id].presentation.code, 'KK', id);
  for (const id of ['Keisei', 'KeiseiOshiage', 'KeiseiKanamachi', 'KeiseiChiba', 'KeiseiChihara'])
    assert.equal(lines[id].presentation.code, 'KS', id);
  assert.equal(lines.NaritaSkyAccess.presentation.code, '', 'KS/HS mixed corridor');
  for (const id of ['SotetsuMain', 'SotetsuIzumino', 'SotetsuShin-Yokohama'])
    assert.equal(lines[id].presentation.code, 'SO', id);
  assert.equal(lines.KeikyuAirport.code, 'KAP', 'internal route key must stay stable');
});

test('Kagoshima route overview is distinguished from JA and JB section cards', () => {
  const order = ordered();
  immediatelyAfter(order, 'KagoshimaMainJA', 'KagoshimaMainJB');
  immediatelyAfter(order, 'KagoshimaMainJB', 'KagoshimaMain');
  assert.match(lines.KagoshimaMain.presentation.nameJa, /全線案内/);
  assert.match(lines.KagoshimaMain.presentation.nameZh, /全线总览/);
  assert.equal(lines.KagoshimaMain.presentation.code, '');
});

test('JR Central trunk lines lead the display; Hokkaido recurring symbols are adjacent', () => {
  const order = ordered();
  assert.deepEqual(order.filter(id => lines[id]?.operator === 'JR-Central').slice(0, 4),
    ['TokaidoCentral', 'MinoAkasaka', 'ChuoCentral', 'KansaiCentral']);
  immediatelyAfter(order, 'HakodateMain', 'Chitose');
  immediatelyAfter(order, 'NemuroMain', 'Sekisho');
});

test('special-line hide rules reference valid canonical IDs and are used by the list renderer', () => {
  const match = runtimeSource.match(/var TRUNK_MAIN_LINE_IDS = (\[[^\]]+\]);/);
  assert.ok(match, 'canonical hide-rule array missing');
  const hidden = JSON.parse(match[1]);
  assert.ok(hidden.includes('TohokuMain') && !hidden.includes('Tohoku'));
  for (const id of hidden) assert.ok(lines[id], id + ' is not a canonical railway');
  const dataState = fs.readFileSync(path.join(root, 'js/data-state.js'), 'utf8');
  assert.match(dataState, /TRUNK_MAIN_LINE_IDS\.indexOf\(lid\) >= 0/);
});

test('operator categories and Hakodate service ranks are stable', () => {
  for (const op of ['ToyoRapid', 'SaitamaRapidRailway', 'KobeDentetsu',
                    'HojoRailway', 'MinatoMirai', 'Rinkai', 'TsukubaExpress'])
    assert.equal(presentation.categoryOf(op), 'Private', op);
  assert.equal(lines.Hakodate2.presentation.order, 1);
  assert.equal(lines.Hakodate5.presentation.order, 2);
});
