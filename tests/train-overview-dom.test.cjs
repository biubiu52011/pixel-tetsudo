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

function makeContainer() {
  return {
    innerHTML: '',
    removeAttribute() {},
    querySelectorAll() { return []; }
  };
}

function cardCount(container) {
  return (container.innerHTML.match(/rs-line-card rs-system-card/g) || []).length;
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

test('overview structure signature follows rendered cards, not position churn', () => {
  const win = makeView();
  const cached = {
    One: { operator: 'JR-East', nameJa: 'One', stations: ['a', 'b'] },
    Two: { operator: 'TokyoMetro', nameJa: 'Two', stations: ['c', 'd'] }
  };
  const options = { mode: 'trains', flatGroups: true,
    includeServiceCorridors: true, lineOrder: ['One', 'Two', 'Three'] };
  const cachedSignature = win.DataState.lineListStructureSignature(cached, options);
  const sameStructure = {
    One: { ...cached.One, status: 'delayed', cachedPositions: [{ trainId: '1' }] },
    Two: { ...cached.Two, realtimePositions: [{ trainId: '2' }] }
  };
  assert.equal(win.DataState.lineListStructureSignature(sameStructure, options),
    cachedSignature, 'position/status refreshes do not invalidate overview structure');

  const added = { ...sameStructure,
    Three: { operator: 'JR-East', nameJa: 'Three', stations: ['e', 'f'] } };
  const addedSignature = win.DataState.lineListStructureSignature(added, options);
  assert.notEqual(addedSignature, cachedSignature, 'new canonical line changes the card model');
  const host = makeContainer();
  win.DataState.renderList(host, cached, options);
  assert.equal(cardCount(host), 2, 'old cache renders two visible systems');
  win.DataState.renderList(host, added, options);
  assert.equal(cardCount(host), 3, 'revalidated snapshot adds the new visible system');

  const removed = { One: added.One };
  assert.notEqual(win.DataState.lineListStructureSignature(removed, options),
    addedSignature, 'canonical deletion changes the card model');
  win.DataState.renderList(host, removed, options);
  assert.equal(cardCount(host), 1, 'revalidated snapshot removes obsolete cards');
});

test('cold/offline fallback and operator filtering use the same structure model', () => {
  const win = makeView();
  const options = { mode: 'trains', flatGroups: true,
    includeServiceCorridors: true, lineOrder: ['One', 'Two', 'Three'] };
  const emptyHost = makeContainer();
  assert.equal(win.DataState.lineListStructureSignature({}, options), 'empty');
  win.DataState.renderList(emptyHost, {}, options);
  assert.match(emptyHost.innerHTML, /rs-empty/, 'cold load has an explicit empty model');

  const fallback = {
    One: { operator: 'JR-East', nameJa: 'One', stations: ['a', 'b'] },
    Two: { operator: 'TokyoMetro', nameJa: 'Two', stations: ['c', 'd'] }
  };
  const jrOnly = win.DataState.filterLinesByOperator(fallback, 'JR-East');
  const jrSignature = win.DataState.lineListStructureSignature(jrOnly,
    { ...options, allLines: fallback });
  const metroOnlyChange = { ...fallback,
    Two: { ...fallback.Two, nameJa: 'Two refreshed' } };
  const jrAfterMetroChange = win.DataState.filterLinesByOperator(metroOnlyChange, 'JR-East');
  assert.equal(win.DataState.lineListStructureSignature(jrAfterMetroChange,
    { ...options, allLines: metroOnlyChange }), jrSignature,
  'selected operator is not rebuilt for an invisible operator-only change');

  const host = makeContainer();
  win.DataState.renderList(host, jrOnly, { ...options, allLines: fallback });
  assert.equal(cardCount(host), 1, 'offline fallback respects the selected operator');
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
  assert.match(controller, /if \(!hasLineCards && overviewVisible\)/);
  assert.match(controller, /if \(hasLineCards && overviewVisible && !positionSnapshot\)/,
    'position-only refreshes must skip overview structure work');
  assert.match(controller, /else if \(overviewStructureChanged\)/,
    'canonical structure changes refresh the visible overview');
  assert.match(controller, /var overviewScrollY = window\.scrollY \|\| window\.pageYOffset \|\| 0/,
    'structure refresh preserves overview scroll position');
  assert.match(controller, /window\.DataState\.renderList\(el, allLines, options\)/,
    'all operator groups stay mounted for later filter changes');
  assert.match(controller, /captureOverviewSignatures\(allLines\)/,
    'each rendered snapshot records per-filter card structures');
  assert.match(controller, /nextSignature !== renderedSignature/,
    'switching to a filter whose hidden cards became stale forces one refresh');
});

test('JU icon maps to the canonical JR Utsunomiya line across data and cards', () => {
  const asset = '../images/鉄道/JR東日本/宇都宮線.png';
  const sources = [
    JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8')),
    JSON.parse(fs.readFileSync('data/core/railway_data.compact.json', 'utf8')),
    JSON.parse(fs.readFileSync('data/core/railway-data.file.js', 'utf8')
      .replace(/^window\.RAILWAY_DATA\s*=\s*/, '').replace(/;\s*$/, ''))
  ];

  for (const data of sources) {
    const lines = data.lines;
    const line = lines.UtsunomiyaJR;
    assert.ok(line, 'canonical UtsunomiyaJR must exist');
    assert.equal(line.operator, 'JR-East');
    assert.equal(line.code, 'JU');
    assert.equal(line.image, asset, 'line image maps to the replaced JU artwork');
    assert.equal(line.presentation.icon, asset, 'overview uses the same JU artwork');
    assert.deepEqual(line.presentation.lineIds, ['UtsunomiyaJR']);

    assert.notEqual(lines.Takasaki.image, asset,
      'Takasaki shares JU line code but not Utsunomiya artwork');
    assert.notEqual(lines.TobuUtsunomiya.image, asset,
      'Tobu Utsunomiya must retain its own operator image');
    assert.notEqual(lines.UtsunomiyaLRT.image, asset,
      'Utsunomiya LRT must retain its own line image');
  }

  const png = fs.readFileSync('images/鉄道/JR東日本/宇都宮線.png');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 236);
  assert.equal(png.readUInt32BE(20), 236);

  // A valid signature and IHDR are insufficient: an invalid PLTE/IDAT
  // previously passed this test while Safari displayed a broken image.
  const zlib = require('node:zlib');
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let crc = n;
    for (let i = 0; i < 8; i++)
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    return crc >>> 0;
  });
  const chunkCrc = bytes => {
    let crc = 0xffffffff;
    for (const byte of bytes)
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const dataParts = [];
  let offset = 8;
  let ended = false;
  while (offset < png.length) {
    assert.ok(offset + 12 <= png.length, 'PNG chunk header is complete');
    const len = png.readUInt32BE(offset);
    assert.ok(offset + len + 12 <= png.length, 'PNG chunk fits within file');
    const type = png.toString('ascii', offset + 4, offset + 8);
    assert.equal(chunkCrc(png.subarray(offset + 4, offset + 8 + len)),
      png.readUInt32BE(offset + 8 + len), type + ' CRC matches');
    if (type === 'IDAT') dataParts.push(png.subarray(offset + 8, offset + 8 + len));
    offset += len + 12;
    if (type === 'IEND') { ended = true; break; }
  }
  assert.ok(ended, 'PNG has an IEND chunk');
  assert.equal(offset, png.length, 'PNG has no truncated or trailing chunks');
  assert.ok(dataParts.length, 'PNG has image data');
  const channels = { 2: 3, 3: 1, 6: 4 }[png[25]];
  const bitDepth = png[24];
  assert.ok(channels, 'PNG has a supported color format');
  // Palette-indexed PNGs are legitimately packed at 1/2/4/8 bits per pixel.
  // Count packed scanline bytes, not one byte per indexed pixel.
  if (png[25] === 3) assert.ok([1, 2, 4, 8].includes(bitDepth),
    'Indexed PNG uses a supported palette bit depth');
  else assert.equal(bitDepth, 8, 'Truecolor/alpha PNG uses 8-bit samples');
  const scanlineBytes = Math.ceil(236 * channels * bitDepth / 8);
  assert.equal(zlib.inflateSync(Buffer.concat(dataParts)).length,
    236 * (1 + scanlineBytes), 'PNG scanlines inflate to full image');

  const win = makeView();
  const line = sources[0].lines.UtsunomiyaJR;
  const card = win.LineCard.renderSystem(
    line.presentation, ['UtsunomiyaJR'], { UtsunomiyaJR: line }, { mode: 'trains' });
  assert.ok(card.includes('src="' + asset + '"'), 'train overview renders the mapped PNG');

  const search = fs.readFileSync('js/search-ui.js', 'utf8');
  assert.match(search, /var _canonicalImg = line && line\.image/);
  assert.match(search, /var img = _canonicalImg \|\|/);
});

test('ChuoMain uses the JR Group fallback, not Chuo Rapid artwork, across all data sources', () => {
  const fallback = '../images/鉄道/JR東日本/JRグループ.png';
  const rapidIcon = '../images/鉄道/JR東日本/中央快速線.png';
  const sources = [
    JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8')),
    JSON.parse(fs.readFileSync('data/core/railway_data.compact.json', 'utf8')),
    JSON.parse(fs.readFileSync('data/core/railway-data.file.js', 'utf8')
      .replace(/^window\.RAILWAY_DATA\s*=\s*/, '').replace(/;\s*$/, ''))
  ];
  for (const source of sources) {
    const main = source.lines.ChuoMain;
    const rapid = source.lines.ChuoRapid;
    assert.equal(main.image, fallback);
    assert.equal(main.presentation.icon, fallback);
    assert.equal(main.presentation.code, 'CO');
    assert.deepEqual(main.presentation.lineIds, ['ChuoMain']);
    assert.equal(rapid.image, rapidIcon);
    assert.equal(rapid.presentation.icon, rapidIcon);
  }
  const win = makeView();
  const main = sources[0].lines.ChuoMain;
  const card = win.LineCard.renderSystem(main.presentation, ['ChuoMain'],
    {ChuoMain: main}, {mode: 'trains'});
  assert.ok(card.includes('rs-line-icon-fallback'), 'list should use JR Group badge wrapper');
  assert.ok(card.includes('JRグループ.png'), 'list should render fallback icon');
  assert.ok(!card.includes('中央快速線.png'), 'list must not reuse the rapid icon');
});
