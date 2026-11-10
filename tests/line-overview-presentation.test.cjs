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
  immediatelyAfter(order, 'SaikyoKawagoe', 'ChuoSobuLocal');
  assert.ok(order.indexOf('Kawagoe') > order.indexOf('Yamanote'),
    'JRグループ/无图标线路不能穿插在官方线路图标序列里');
  immediatelyAfter(order, 'Kawagoe', 'SotetsuJRDirect');
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
  immediatelyAfter(order, 'JobanMain', 'UenoTokyo');
  assert.ok(order.indexOf('UenoTokyo') > order.indexOf('Yamanote'));
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
  assert.ok(order.indexOf('KagoshimaMain') < order.indexOf('NishiKyushuShinkansen'),
    'JR九州在来线全线概览虽无专属图标，仍须排在新干线之前');
  assert.match(lines.KagoshimaMain.presentation.nameJa, /全線案内/);
  assert.match(lines.KagoshimaMain.presentation.nameZh, /全线总览/);
  assert.equal(lines.KagoshimaMain.presentation.code, '');
});

test('JR Central trunk lines lead the display; Hokkaido recurring symbols are adjacent', () => {
  const order = ordered();
  assert.deepEqual(order.filter(id => lines[id]?.operator === 'JR-Central').slice(0, 4),
    ['TokaidoCentral', 'ChuoCentral', 'KansaiCentral', 'Takayama']);
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

test('official line icons are listed before generic operator logos or missing icons', () => {
  const groups = {};
  for (const [id, line] of primaries) (groups[line.operator] ||= []).push({id, line});
  for (const [op, entries] of Object.entries(groups)) {
    entries.sort((a, b) => a.line.presentation.order - b.line.presentation.order);
    let seenFallback = false;
    for (const {id, line} of entries) {
      const icon = String(line.presentation.icon || line.image || '');
      const dedicated = !!icon && !/(グループ|ロゴ|マーク|アイコン|シンボル)/.test(icon);
      if (!dedicated) seenFallback = true;
      assert.ok(!dedicated || !seenFallback, op + '/' + id + ' entered the official icon sequence after fallback');
    }
  }
  const order = ordered();
  assert.ok(order.indexOf('JobanMain') > order.indexOf('Yamanote'));
  assert.ok(order.indexOf('Kawagoe') > order.indexOf('Yamanote'));
  assert.ok(order.indexOf('SotetsuJRDirect') > order.indexOf('Yamanote'));
});



test('JR grouping places all conventional lines before shinkansen and prefers dedicated icons within each tier', () => {
  const rank = Array.from(presentation.getPresentationOrder(lines));
  const isShinkansen = line => {
    const p = line.presentation || {};
    return [line.id, line.name, line.nameJa, line.nameEn, line.nameZh, p.nameJa, p.nameEn, p.nameZh]
      .some(value => /Shinkansen|新幹線/i.test(String(value || '')));
  };
  const dedicated = line => {
    const p = line.presentation || {};
    const icon = String(p.icon || line.image || '');
    return !!icon && !/(グループ|ロゴ|マーク|アイコン|シンボル)/.test(icon);
  };
  for (const operator of ['JR-East', 'JR-Central', 'JR-West', 'JR-Hokkaido', 'JR-Shikoku', 'JR-Kyushu']) {
    const entries = rank.filter(entry => entry.line.operator === operator);
    let seenShinkansen = false;
    const seenGeneric = { conventional: false, shinkansen: false };
    for (const entry of entries) {
      const shinkansen = isShinkansen(entry.line);
      const tier = shinkansen ? 'shinkansen' : 'conventional';
      if (shinkansen) seenShinkansen = true;
      assert.ok(shinkansen || !seenShinkansen, operator + '/' + entry.id + ' conventional line after shinkansen');
      if (!dedicated(entry.line)) seenGeneric[tier] = true;
      else assert.ok(!seenGeneric[tier], operator + '/' + entry.id + ' dedicated icon after generic in ' + tier);
    }
  }
});

test('JR sort tiers include presentation-only shinkansen names and inserted generic corridors', () => {
  const badge = '../images/鉄道/JR東日本/JRグループ.PNG';
  const demo = {
    ShinGeneric: {operator: 'JR-East', image: badge, presentation: {
      lineIds: ['ShinGeneric'], order: 1, icon: badge, nameEn: 'Sample Shinkansen'}},
    ShinOfficial: {operator: 'JR-East', image: '../images/Shinkansen.png', presentation: {
      lineIds: ['ShinOfficial'], order: 2, icon: '../images/Shinkansen.png', nameJa: '架空新幹線'}},
    LocalMissing: {operator: 'JR-East', image: '', presentation: {
      lineIds: ['LocalMissing'], order: 3, icon: ''}},
    LocalGeneric: {operator: 'JR-East', image: badge, presentation: {
      lineIds: ['LocalGeneric'], order: 4, icon: badge}},
    LocalOfficial: {operator: 'JR-East', image: '../images/JA.png', presentation: {
      lineIds: ['LocalOfficial'], order: 5, icon: '../images/JA.png', code: 'JA'}},
    LocalRaw: {operator: 'JR-East', image: '../images/JC.png', code: 'JC'},
    UenoTokyo: {operator: 'JR-East', image: badge, presentation: {
      order: 4, icon: badge, afterLineId: 'LocalGeneric'}}
  };
  const sorted = Array.from(presentation.getDisplayOrder(demo, { includeServiceCorridors: true }));
  for (const conventional of ['LocalOfficial', 'LocalRaw', 'LocalGeneric', 'LocalMissing', 'UenoTokyo']) {
    for (const shinkansen of ['ShinOfficial', 'ShinGeneric']) {
      assert.ok(sorted.indexOf(conventional) < sorted.indexOf(shinkansen),
        conventional + ' must be before ' + shinkansen);
    }
  }
  assert.ok(sorted.indexOf('LocalOfficial') < sorted.indexOf('LocalGeneric'));
  assert.ok(sorted.indexOf('LocalRaw') < sorted.indexOf('LocalMissing'));
  assert.ok(sorted.indexOf('ShinOfficial') < sorted.indexOf('ShinGeneric'));
});

test('operator categories are JR, private/third-sector railways, then subways', () => {
  const sample = {
    metro: {operator: 'TokyoMetro'},
    other: {operator: 'Yurikamome'},
    private: {operator: 'Keio'},
    jr: {operator: 'JR-East'}
  };
  assert.deepEqual(Array.from(presentation.getOperatorOrder(sample)),
    ['JR-East', 'Keio', 'Yurikamome', 'TokyoMetro']);
  assert.deepEqual(Array.from(presentation.orderOperators(
    ['TokyoMetro', 'NewThirdRailway', 'JR-East', 'Keio'])),
    ['JR-East', 'Keio', 'NewThirdRailway', 'TokyoMetro'],
    'previously unseen third-sector operators cannot be appended behind Metro');
  assert.equal(presentation.categoryOf('HiroshimaElectric'), 'Private',
    'tram operators must not be classified as subway');
});

test('a generic JR badge or missing icon cannot overtake an official icon, including inserted corridors', () => {
  const jrBadge = '../images/鉄道/JR東日本/JRグループ.png';
  const example = {
    Generic: {operator: 'JR-East', image: jrBadge,
      presentation: {lineIds: ['Generic'], order: 1, icon: jrBadge}},
    Missing: {operator: 'JR-East', image: '',
      presentation: {lineIds: ['Missing'], order: 2, icon: ''}},
    Official: {operator: 'JR-East', image: '../images/JA.png',
      presentation: {lineIds: ['Official'], order: 3, icon: '../images/JA.png', code: 'JA'}},
    OfficialRaw: {operator: 'JR-East', image: '../images/JC.png', code: 'JC'},
    UenoTokyo: {operator: 'JR-East', image: jrBadge,
      presentation: {order: 1, icon: jrBadge, afterLineId: 'Official'}}
  };
  const order = Array.from(presentation.getDisplayOrder(example, {includeServiceCorridors: true}));
  for (const withIcon of ['Official', 'OfficialRaw']) {
    for (const withoutOfficialIcon of ['Generic', 'Missing', 'UenoTokyo']) {
      assert.ok(order.indexOf(withIcon) < order.indexOf(withoutOfficialIcon),
        withIcon + ' must precede ' + withoutOfficialIcon);
    }
  }
  assert.equal(order.filter(id => id === 'UenoTokyo').length, 1);
});
