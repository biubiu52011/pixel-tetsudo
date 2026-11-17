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
  fs.readFileSync(path.join(root, 'js/common.js'), 'utf8'),
  { window }, { filename: 'common.js' }
);
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
  assert.ok(order.indexOf('SotetsuJRDirect') < order.indexOf('Kawagoe'),
    'generic JR group icon must precede missing-icon routes');
  assert.equal(lines.SotetsuJRDirect.presentation.code, '');
  assert.equal(lines.SotetsuJRDirect.code, 'JS', 'internal railway code must not change');
  assert.equal(lines.ShonanShinjuku.presentation.code, 'JS');
  assert.equal(lines.UenoTokyo.presentation.afterLineId, 'ShonanShinjuku',
    'UenoTokyo card is attached to JS/ShonanShinjuku, not Joban or Chuo');
  assert.equal(primaries.filter(([id, line]) => line.operator === 'JR-East' &&
    line.presentation.code === 'JS').length, 1);
});

test('aggregated display members have no separate rank; corridor insertion remains adjacent', () => {
  assert.equal(lines.SobuRapid.presentation.lineIds[0], 'Yokosuka');
  assert.equal(lines.SobuRapid.presentation.order, undefined);
  const order = ordered();
  immediatelyAfter(order, 'Yokosuka', 'SobuRapid');
  immediatelyAfter(order, 'ShonanShinjuku', 'UenoTokyo');
  assert.ok(order.indexOf('UenoTokyo') < order.indexOf('Yamanote'),
    'JS-bound UenoTokyo precedes JY/Yamanote');
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
  assert.equal(lines.KagoshimaMain.presentation.nameJa, '鹿児島本線');
  assert.equal(lines.KagoshimaMain.presentation.nameZh, '鹿儿岛本线');
  assert.equal(lines.KagoshimaMainJA.presentation.nameJa, '鹿児島本線');
  assert.equal(lines.KagoshimaMainJB.presentation.nameJa, '鹿児島本線');
  assert.equal(lines.KagoshimaMainJA.branchOf, 'KagoshimaMain');
  assert.equal(lines.KagoshimaMainJB.branchOf, 'KagoshimaMain');
  assert.equal(lines.KagoshimaMain.presentation.code, '');
});

test('JR Central trunk lines lead the display; Hokkaido recurring symbols are adjacent', () => {
  const order = ordered();
  assert.deepEqual(order.filter(id => lines[id]?.operator === 'JR-Central').slice(0, 4),
    ['TokaidoCentral', 'Gotemba', 'Minobu', 'Iida']);
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

test('third-sector operators are grouped after metro and before private rail', () => {
  for (const op of ['ToyoRapid', 'SaitamaRapidRailway', 'HojoRailway',
                    'MinatoMirai', 'Rinkai', 'TsukubaExpress', 'TWR', 'MIR'])
    assert.equal(presentation.categoryOf(op), 'Other', op);
  for (const op of ['KobeDentetsu', 'ChichibuRailway'])
    assert.equal(presentation.categoryOf(op), 'Private', op);
  assert.equal(lines.Hakodate2.presentation.order, 1);
  assert.equal(lines.Hakodate5.presentation.order, 2);
});

test('official line icons are listed before generic operator logos or missing icons', () => {
  const groups = {};
  for (const [id, line] of primaries) (groups[line.operator] ||= []).push({id, line});
  for (const [op, entries] of Object.entries(groups)) {
    // Presentation order is the rendered order. Stale manual order fields can
    // place a former JF/JH/JI whole-line icon after a real fallback line.
    // Keep Shinkansen in its separate late tier within each JR operator.
    const ranks = new Map(presentation.getPresentationOrder(lines).map((entity, index) => [entity.id, index]));
    entries.sort((a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity));
    const seenFallback = { conventional: false, shinkansen: false };
    for (const {id, line} of entries) {
      const p = line.presentation || {};
      const icon = String(p.icon || line.image || '');
      const dedicated = !!icon && !/(グループ|ロゴ|マーク|アイコン|シンボル)/.test(icon);
      const isShinkansen = /Shinkansen|新幹線/i.test([
        line.nameJa, line.nameEn, line.nameZh, p.nameJa, p.nameEn, p.nameZh, id
      ].join(' '));
      const tier = isShinkansen ? 'shinkansen' : 'conventional';
      if (!dedicated) seenFallback[tier] = true;
      assert.ok(!dedicated || !seenFallback[tier], op + '/' + id +
        ' entered the official icon sequence after fallback in ' + tier);
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

test('operator categories are JR, metro, third-sector/other, then private', () => {
  const sample = {
    metro: {operator: 'TokyoMetro'},
    other: {operator: 'Yurikamome'},
    private: {operator: 'Keio'},
    jr: {operator: 'JR-East'}
  };
  assert.deepEqual(Array.from(presentation.getOperatorOrder(sample)),
    ['JR-East', 'TokyoMetro', 'Yurikamome', 'Keio']);
  assert.deepEqual(Array.from(presentation.orderOperators(
    ['TokyoMetro', 'NewThirdRailway', 'JR-East', 'Keio'])),
    ['JR-East', 'TokyoMetro', 'NewThirdRailway', 'Keio'],
    'previously unseen third-sector operators must be between Metro and Private');
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

test('JR dedicated public codes outrank manual positions while Tobu follows official symbol groups', () => {
  const order = ordered();
  const central = order.filter(id => lines[id]?.operator === 'JR-Central').slice(0, 9);
  assert.deepEqual(central,
    ['TokaidoCentral', 'Gotemba', 'Minobu', 'Iida', 'Taketoyo',
      'ChuoCentral', 'Takayama', 'Taita', 'KansaiCentral']);
  const tobuCards = order.filter(id => lines[id]?.operator === 'Tobu' &&
    presentation.isIndependentLine(id, lines));
  assert.deepEqual(tobuCards, [
    'TobuSkytree', 'Tobu_Kameido', 'Daishi_Tobu',
    'TobuIsesaki', 'Sano', 'Koizumi', 'Kiryu',
    'TobuNikko', 'TobuUtsunomiya', 'Nikkoku',
    'Noda', 'Tojo', 'Ogose'
  ]);
  assert.equal(lines.Daishi_Tobu.code, 'DTB', 'internal identity preserved');
  assert.equal(lines.Daishi_Tobu.presentation.code, 'TS');
  assert.equal(lines.TobuUtsunomiya.code, null, 'internal source code preserved');
  assert.equal(lines.TobuUtsunomiya.presentation.code, 'TN');
  assert.equal(lines.TobuUtsunomiya.presentation.icon, lines.TobuNikko.presentation.icon);
  assert.equal(presentation.getLineIconTier(lines.TokaidoCentral), 0);
  assert.equal(presentation.getLineIconTier(lines.SotetsuJRDirect), 1);
  assert.equal(presentation.getLineIconTier(lines.Kawagoe), 2);
  assert.ok(order.indexOf('SotetsuJRDirect') < order.indexOf('Kawagoe'));
  immediatelyAfter(order, 'ShonanShinjuku', 'UenoTokyo');
});

test('Tobu official symbol groups override shuffled manual ranks without changing another operator', () => {
  const icon = code => '../images/' + code + '.png';
  const line = (id, code, order, operator = 'Tobu') => ({
    operator, image: icon(code),
    presentation: { lineIds: [id], order, code, icon: icon(code) }
  });
  const demo = {
    Tojo: line('Tojo', 'TJ', 1),
    Nikko: line('Nikko', 'TN', 2),
    Noda: line('Noda', 'TD', 3),
    Skytree: line('Skytree', 'TS', 4),
    Isesaki: line('Isesaki', 'TI', 5),
    OtherA: line('OtherA', 'AB', 2, 'Keio'),
    OtherB: line('OtherB', 'AA', 1, 'Keio')
  };
  const cards = Array.from(presentation.getDisplayOrder(demo));
  assert.deepEqual(cards.filter(id => demo[id].operator === 'Tobu'),
    ['Skytree', 'Isesaki', 'Nikko', 'Noda', 'Tojo']);
  assert.deepEqual(cards.filter(id => demo[id].operator === 'Keio'),
    ['OtherB', 'OtherA'], 'other private railways retain their manual order');
});

test('public code overrides order only inside the same JR dedicated-icon tier', () => {
  const demo = {
    C: { operator: 'JR-Central', image: '../images/CC.png',
      presentation: {lineIds: ['C'], code: 'CC', order: 1}},
    A: { operator: 'JR-Central', image: '../images/CA.png',
      presentation: {lineIds: ['A'], code: 'CA', order: 3}},
    B: { operator: 'JR-Central', image: '../images/CB.png',
      presentation: {lineIds: ['B'], code: 'CB', order: 2}},
    NoIcon: { operator: 'JR-Central', code: 'JS', image: '',
      presentation: {lineIds: ['NoIcon'], code: '', order: 4}},
    GroupIcon: { operator: 'JR-Central', image: '../images/JRグループ.png',
      presentation: {lineIds: ['GroupIcon'], code: '', order: 5}}
  };
  assert.deepEqual(Array.from(presentation.getDisplayOrder(demo)),
    ['A', 'B', 'C', 'GroupIcon', 'NoIcon']);
  assert.equal(presentation.getLineIdentity('NoIcon', demo).displayCode, '');
});

test('the final card model consumes one canonical order without a second map sort', () => {
  const src = fs.readFileSync(path.join(root, 'js/data-state.js'), 'utf8');
  assert.doesNotMatch(src, /getDisplayOrderMap\(orderingLines\)/);
  assert.match(src, /sortIdx: insertMap\[lid\]/);
  assert.match(src, /return a\.sourceIdx - b\.sourceIdx/);
  const fusion = fs.readFileSync(path.join(root, 'js/data-fusion.js'), 'utf8');
  assert.match(fusion, /lineOrder: window\.LinePresentationService[\s\S]*?getDisplayOrder\(dlLines\)/);
});

test('canonical operator catalog agrees with visible cards and filter ranks', () => {
  const known = Array.from(window.TransitConstants.OP_ORDER);
  const actual = Array.from(new Set(Object.values(lines).map(line => line.operator).filter(Boolean)));
  assert.equal(new Set(known).size, known.length);
  for (const op of actual) assert.ok(known.includes(op), op + ' lacks explicit rank');
  const display = Array.from(presentation.getOperatorOrder(lines));
  assert.deepEqual(display, known.filter(op => actual.includes(op)));
  assert.deepEqual(Array.from(presentation.orderOperators(actual.slice().reverse())), display);
  assert.deepEqual(Array.from(new Set(presentation.getPresentationOrder(lines)
    .map(entity => entity.line.operator))), display);
  assert.deepEqual(known.slice(0,7), ['JR-East','JR-Central','JR-West',
    'JR-Hokkaido','JR-Shikoku','JR-Kyushu','JR-Freight']);
  const categories = ['JR','Metro','Other','Private'];
  const tiers = known.map(op => presentation.categoryOf(op));
  assert.ok(tiers.every((tier,i) => i===0 ||
    categories.indexOf(tier) >= categories.indexOf(tiers[i-1])));
});

test('operator aliases and regional railway categories retain canonical priority', () => {
  assert.equal(window.TransitConstants.normalizeOp('JR_WEST'), 'JR-West');
  assert.equal(window.TransitConstants.normalizeOp('JR West'), 'JR-West');
  assert.equal(window.TransitConstants.toLosKey('JR-West'), 'JR_WEST');
  for (const op of ['JR-West','JR_WEST'])
    assert.equal(presentation.categoryOf(op), 'JR');
  assert.equal(presentation.categoryOf('ChichibuRailway'), 'Private');
  for (const op of ['TWR','MIR']) assert.equal(presentation.categoryOf(op), 'Other');
  assert.equal(presentation.categoryOf('HakodateCity'), 'Other');
  assert.equal(presentation.categoryOf('TokyoMetro'), 'Metro');
  assert.deepEqual(Array.from(presentation.orderOperators(
    ['TokyoMetro','Yurikamome','ChichibuRailway','JR_WEST','JR-East'])),
    ['JR-East','JR_WEST','TokyoMetro','Yurikamome','ChichibuRailway']);
});

test('operator filter DOM and card groups have the same JR-Metro-Other-Private sequence', () => {
  const actual = Array.from(new Set(Object.values(lines).map(line => line.operator).filter(Boolean)));
  const expected = Array.from(presentation.orderOperators(actual));
  const categories = ['JR','Metro','Other','Private'];
  assert.deepEqual(Array.from(new Set(expected.map(op => presentation.categoryOf(op)))), categories);
  const byCategory = categories.map(category => expected.filter(op => presentation.categoryOf(op) === category));
  assert.deepEqual(byCategory.flat(), expected);
  const entities = presentation.getPresentationOrder(lines);
  assert.deepEqual(Array.from(new Set(entities.map(e => e.line.operator))), expected);
  assert.ok(expected.indexOf('TokyoMetro') < expected.indexOf('TsukubaExpress'));
  assert.ok(expected.indexOf('TsukubaExpress') < expected.indexOf('Keio'));
  const display = presentation.getDisplayOrder(lines, {includeServiceCorridors:true});
  assert.equal(display.indexOf('UenoTokyo'), display.indexOf('ShonanShinjuku') + 1);
});

test('JR Kyushu duplicate full-line cards are hidden without altering canonical or operational sections', () => {
  const match = runtimeSource.match(/var TRUNK_MAIN_LINE_IDS = (\[[^\]]+\]);/);
  assert.ok(match);
  const hidden = JSON.parse(match[1]);
  for (const id of ['KagoshimaMain', 'Chikuho']) {
    assert.ok(hidden.includes(id), id + ' is a physical full-route overview, not a separate operator card');
    assert.ok(lines[id].stations.length > 20, id + ' topology remains intact');
    assert.equal(lines[id].operator, 'JR-Kyushu');
  }
  for (const id of ['KagoshimaMainJA', 'KagoshimaMainJB', 'Wakamatsu', 'Haruda', 'Sasaguri',
                    'Nippo', 'NagasakiMain', 'Hitahikosan']) {
    assert.ok(!hidden.includes(id), id + ' remains selectable');
    assert.ok(lines[id] && lines[id].presentation, id + ' still exists');
  }
  const bundle = fs.readFileSync(path.join(root, 'data/core/data-config-bundle.js'),'utf8');
  const bundleMatch = bundle.match(/var TRUNK_MAIN_LINE_IDS = (\[[^\]]+\]);/);
  assert.ok(bundleMatch, 'bundled runtime hide-rule array missing');
  assert.deepEqual(JSON.parse(bundleMatch[1]), hidden,
    'bundled live configuration must match the source hide list');
  const list = fs.readFileSync(path.join(root, 'js/data-state.js'),'utf8');
  assert.match(list,/TRUNK_MAIN_LINE_IDS\.indexOf\(lid\) >= 0/,
    'existing shared list renderer must own the hiding rule');
});
