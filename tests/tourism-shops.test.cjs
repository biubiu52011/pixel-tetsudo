/* Run with: node --test tests/tourism-shops.test.cjs
 * Static site regression tests using only Node built-ins.
 * Shop means eating, drinking, shopping, entertainment and experiences.
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function source(file) {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
}
function execute(file, sandbox) {
  vm.runInNewContext(source(file), sandbox, { filename: file });
}

test('shop routing supports food, drink, retail and play (including explicit categories)', () => {
  const sandbox = { window: {} };
  execute('js/tourism-type.js', sandbox);
  const getType = sandbox.window.TourismType.getSpotType;
  for (const tags of [['food'], ['drink'], ['shopping'], ['play'], ['cafe'], ['bar'], ['shop']]) {
    assert.equal(getType({ tags }), 'shop', tags.join(','));
  }
  for (const category of ['restaurant', 'cafe', 'arcade', 'amusement', 'experience', 'entertainment', 'shopping']) {
    assert.equal(getType({ category }), 'shop', category);
  }
  assert.equal(getType({ tags: ['mall', 'food'] }), 'spot', 'mall remains a spot');
  assert.equal(getType({ tags: ['event', 'play'] }), 'event', 'event precedence remains');
});

function renderShop(spot) {
  const article = { innerHTML: '' };
  const document = {
    title: '',
    addEventListener() {},
    getElementById(id) { return id === 'articleContainer' ? article : null; },
    querySelectorAll() { return []; },
  };
  const messages = {
    'detail.menu': 'おすすめ',
    'detail.tips': '訪問Tips',
    'detail.info_fee': '費用',
    'detail.info_hours': '営業時間',
    'detail.best_time': 'ベストシーズン',
    'detail.distance': '距離',
    'detail.address': '住所',
    'detail.about': '紹介',
    'detail.location': '場所',
    'detail.view_all': 'すべて見る',
    'detail.close': '閉じる',
    'detail.ai_note': 'Note',
    'detail.i18n_missing': '内容なし',
  };
  const core = {
    state: { lang: 'ja' },
    t(key) { return messages[key] || key; },
    escapeHtml(value) {
      return value == null ? '' : String(value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;');
    },
    buildContext(s) {
      return {
        spot: s, spotName: s.name, spotFee: '無料', spotHours: '10:00',
        spotBestTime: '年中', spotAddress: '', desc: 'About',
        tagsHtml: '', typeBadge: '', heroClass: '',
        mapLat: 35.6, mapLng: 139.6,
        dist: { distMain: '', distText: '', stationName: '' },
      };
    },
    galleryIndexForMenu(s, index) { return index + 1; },
    distValueHtml() { return ''; },
    observeMap() {},
    bindGallery() {},
    start(render) { render(spot, 'Test'); },
  };
  execute('js/tourism-shop.js', { window: { TourismDetailCore: core }, document });
  return article.innerHTML;
}

test('play recommendations render with optional prices and without empty tips', () => {
  const html = renderShop({
    name: 'Arcade', tags: ['play'],
    menu: [
      { item: 'Tokens', price: '500円' },
      { item: 'Free Game' },
      { item: 'Zero-cost Pass', price: 0 },
    ],
    tips: [],
  });
  assert.match(html, /おすすめ/);
  assert.match(html, /Tokens/);
  assert.match(html, /500円/);
  assert.match(html, /Free Game/);
  assert.match(html, /Zero-cost Pass/);
  assert.match(html, />0<\/div>/);
  assert.match(html, /費用/);
  assert.doesNotMatch(html, /訪問Tips|内容なし/);
  const priceFields = html.match(/class="dp-dish-price"/g) || [];
  assert.equal(priceFields.length, 4, 'two priced items in preview and modal; unpriced item omitted');
});

test('tips-only shops use the same recommendations carousel without invented products or prices', () => {
  const tipsOnly = renderShop({
    name: 'Craft Store', tags: ['shopping'], menu: [],
    tips: ['Handmade goods', 'Daily selection on SNS', 'Open early'],
    tips_i18n: { ja: ['手作り雑貨', '新着商品はSNSで確認', '朝から営業'] },
  });
  assert.match(tipsOnly, /おすすめ/);
  assert.match(tipsOnly, /dp-menu-carousel dp-rec-text-carousel/);
  assert.match(tipsOnly, /dpRecommendTipsModal/);
  assert.match(tipsOnly, /すべて見る/);
  assert.match(tipsOnly, /手作り雑貨/);
  assert.match(tipsOnly, /新着商品はSNSで確認/);
  assert.match(tipsOnly, /朝から営業/);
  assert.doesNotMatch(tipsOnly, /dp-shop-picks|dp-pick-list|訪問Tips/);
  assert.doesNotMatch(tipsOnly, /dp-dish-price|dp-dish-img/);
  assert.doesNotMatch(tipsOnly, /Handmade goods/, 'translation should take precedence');
});

test('structured offers retain the image/price carousel and distinct visit tips; empty shops show neither', () => {
  const withMenu = renderShop({
    name: 'Cafe', tags: ['food'],
    menu: [{ item: 'Coffee', price: '500円' }],
    tips: ['Check opening hours'],
  });
  assert.match(withMenu, /dp-menu-carousel/);
  assert.match(withMenu, /Coffee/);
  assert.match(withMenu, /500円/);
  assert.match(withMenu, /訪問Tips/);
  assert.doesNotMatch(withMenu, /dp-rec-text-carousel/);
  const empty = renderShop({ name: 'Cafe', tags: ['food'], menu: [], tips: [] });
  assert.doesNotMatch(empty, /dp-shop-picks|dp-menu-head|dp-rec-text-carousel/);
});

test('all four languages use an industry-neutral recommendations title', () => {
  const labels = [...source('js/translations.js').matchAll(/"detail\.menu": "([^"]+)"/g)]
    .map(match => match[1].replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
  assert.deepEqual(labels, ['Recommendations', '推荐', 'おすすめ', '추천']);
});

test('experience filter does not lose play venues beyond the first 30 nearby records', () => {
  const spots = Array.from({ length: 42 }, (_, index) => ({
    name: index < 40 ? 'Food ' + index : 'Arcade ' + (index - 40),
    tags: index < 40 ? ['food'] : ['play', 'family'],
    coord: [35.6 + index * 0.00001, 139.6 + index * 0.00001],
    image: '', desc: '',
  }));
  const calls = [];
  const proximity = {
    getNearbySpotsByStation(stationId, options) {
      calls.push(options);
      return spots.slice(0, options.limit).map((spot, index) => ({
        spot, distance: 100 + index * 8, distanceText: '1 min',
        stationId, exitDirection: '',
      }));
    },
    formatWalkMinutes() { return '5 min'; },
  };
  const classList = () => ({ add() {}, remove() {} });
  const nodes = {
    smModule: {},
    smGrid: { innerHTML: '' },
    smTagFilters: {
      innerHTML: '', dataset: {},
      addEventListener(event, listener) { this.clickHandler = listener; },
    },
    smEmpty: { classList: classList() },
    smStationDisplay: { textContent: '', classList: classList() },
    smRelocateBtn: {
      classList: classList(), addEventListener() {}, setAttribute() {},
    },
  };
  const document = {
    readyState: 'loading',
    getElementById(id) { return nodes[id] || null; },
    querySelector(selector) { return selector === '.sm-header' ? { innerHTML: '' } : null; },
    addEventListener() {},
  };
  const listeners = {};
  const window = {
    STATION_COORDS: { Test: [35.6, 139.6] },
    TOURISM_SPOTS: spots, TourismProximity: proximity,
    DataLoader: { isLoaded() { return true; } },
    currentLang: 'ja', t(key) { return key; },
    onLanguageChange() {},
    addEventListener(event, callback) { listeners[event] = callback; },
  };
  execute('js/sightseeing.js', {
    window, document, TourismProximity: proximity,
    navigator: null, setTimeout() {},
  });
  window.SightseeingModule.init({ station: 'Test', lang: 'ja' });
  assert.ok(calls[0].limit >= spots.length, 'collect full nearby candidate pool');
  assert.match(nodes.smGrid.innerHTML, /Food 0/);
  function selectGroup(group) {
    nodes.smTagFilters.clickHandler({
      target: { closest() { return { getAttribute(attr) { return attr === 'data-filter' ? group : null; } }; } },
      preventDefault() {},
    });
  }
  selectGroup('experience');
  assert.match(nodes.smGrid.innerHTML, /Arcade 0/);
  assert.match(nodes.smGrid.innerHTML, /Arcade 1/);
  assert.doesNotMatch(nodes.smGrid.innerHTML, /Food 0/);
  spots.push({ name: 'Arcade New', tags: ['play'], coord: [35.6, 139.6], image: '' });
  listeners['pt:tourism-ready']();
  assert.match(nodes.smGrid.innerHTML, /Arcade New/, 'tourism-ready must invalidate stale candidate cache');
});
