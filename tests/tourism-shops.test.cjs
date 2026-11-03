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
  for (const tags of [['food'], ['drink'], ['shopping'], ['play'], ['cafe'], ['bar'], ['shop'], ['store']]) {
    assert.equal(getType({ tags }), 'shop', tags.join(','));
  }
  for (const category of ['restaurant', 'cafe', 'arcade', 'amusement', 'experience', 'entertainment', 'shopping', 'store']) {
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
    'detail.shop_photo': '店舗写真',
    'detail.illustration': 'イメージ画像',
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

test('migrated tips use the identical square image-card layout without invented images or prices', () => {
  const notesOnly = renderShop({
    name: 'Craft Store', tags: ['store'],
    menu: [
      { item: 'Handmade goods', kind: 'note' },
      { item: 'Daily selection on SNS', kind: 'note' },
      { item: 'Open early', kind: 'note' },
    ],
    menu_i18n: [
      { ja: '手作り雑貨', en: 'Handmade goods' },
      { ja: '新着商品はSNSで確認', en: 'Daily selection on SNS' },
      { ja: '朝から営業', en: 'Open early' },
    ],
  });
  assert.match(notesOnly, /おすすめ/);
  assert.match(notesOnly, /dp-menu-carousel/);
  assert.match(notesOnly, /dp-dish-thumb/);
  assert.match(notesOnly, /dp-dish-badge/);
  assert.match(notesOnly, /dp-dish-name/);
  assert.match(notesOnly, /すべて見る/);
  assert.match(notesOnly, /手作り雑貨/);
  assert.match(notesOnly, /新着商品はSNSで確認/);
  assert.match(notesOnly, /朝から営業/);
  assert.doesNotMatch(notesOnly, /dp-shop-picks|dp-pick-list|訪問Tips/);
  assert.doesNotMatch(notesOnly, /dp-dish-price|dp-dish-img|dp-rec-text-item/);
  assert.equal((notesOnly.match(/class="dp-dish-badge"/g) || []).length, 6, 'each note has a preview and modal placeholder');
  assert.match(notesOnly, /class="dp-dish-badge">C<\/span>/, 'placeholder uses store name initial');
  assert.doesNotMatch(notesOnly, /Handmade goods/, 'menu translations take priority');
});

test('verified shop photos replace note placeholders without pretending to be item photos', () => {
  const cover = '../images/観光地/木挽町よしや.jpg';
  const html = renderShop({
    name: '木挽町よしや', tags: ['food'],
    menu: [
      { item: '1日1300個売れる名物どら焼き。', kind: 'note', cover, coverRole: 'shop' },
      { item: '一枚皮で餡を挟む珍しい製法。', kind: 'note' },
    ],
  });
  assert.equal((html.match(/class="dp-dish-photo-source"/g) || []).length, 2,
    'the store-photo source appears in preview and modal');
  assert.equal((html.match(/alt="木挽町よしや - 店舗写真"/g) || []).length, 2);
  assert.ok(html.includes(cover), 'source photo path is retained');
  assert.equal((html.match(/class="dp-dish-badge"/g) || []).length, 2,
    'unphotographed notes still get the same-size placeholder');
  assert.doesNotMatch(html, /data-gallery-idx="/,
    'a representative store photo must not be mislabelled or duplicated as product gallery media');
  assert.doesNotMatch(html, /dp-dish-price/, 'text notes do not invent prices');
});

test('illustrations have the same card layout and are not misrepresented as shop photos', () => {
  const cover = '../images/観光地/recommend-illustrations/readin-writing-workshop.svg';
  const html = renderShop({
    name: 'Readin’ Writin’', tags: ['shopping'],
    menu: [{ item: '子どもから高齢者まで参加可', kind: 'note', cover, coverRole: 'illustration' }],
  });
  assert.match(html, /イメージ画像/);
  assert.match(html, /alt="Readin’ Writin’ - イメージ画像"/);
  assert.match(html, /dp-dish-img/);
  assert.doesNotMatch(html, /店舗写真|data-gallery-idx=|dp-dish-price/);
});

test('products and notes share one spot.menu recommendation carousel', () => {
  const mixed = renderShop({
    name: 'Cafe', tags: ['food'],
    menu: [
      { item: 'Coffee', price: '500円' },
      { item: 'Check opening hours', kind: 'note' },
    ],
    menu_i18n: [
      { ja: 'コーヒー' },
      { ja: '営業時間を確認' },
    ],
    // Deprecated field must not create a second recommendation section.
    tips: ['Old visit tip'],
  });
  assert.match(mixed, /dp-menu-carousel/);
  assert.match(mixed, /コーヒー/);
  assert.match(mixed, /500円/);
  assert.match(mixed, /営業時間を確認/);
  assert.match(mixed, /dp-dish-badge/);
  assert.match(mixed, /dp-dish-thumb/);
  assert.match(mixed, /dp-dish-name/);
  assert.doesNotMatch(mixed, /訪問Tips|Old visit tip|dp-shop-picks|dp-rec-text-carousel|dp-rec-text-item/);
  const empty = renderShop({ name: 'Cafe', tags: ['food'], menu: [], tips: [] });
  assert.doesNotMatch(empty, /dp-shop-picks|dp-menu-head|dp-rec-text-item|dp-dish-thumb/);
});

test('active transit routes do not appear as standalone sightseeing spots', () => {
  const { spots } = JSON.parse(source('data/core/tourism_data.json'));
  assert.ok(!spots.some(spot => spot.name === '都電荒川線（三ノ輪橋）'),
    'operating Toden Arakawa tram line belongs to railway information, not a sightseeing destination');
  assert.ok(spots.some(spot => spot.name === '東京駅丸の内駅舎'),
    'independently visitable historic station architecture remains a sightseeing spot');
});

test('all merchant data is normalized to spot.menu and generated snapshots remain in sync', () => {
  const data = JSON.parse(source('data/core/tourism_data.json'));
  const sandbox = { window: {} };
  execute('js/tourism-type.js', sandbox);
  const isShop = sandbox.window.TourismType.getSpotType;
  const merchants = data.spots.filter(spot => isShop(spot) === 'shop');
  assert.ok(merchants.length >= 200, 'the complete catalog was checked');
  let noteCount = 0;
  let verifiedCovers = 0;
  let illustratedCovers = 0;
  for (const spot of merchants) {
    assert.ok(Array.isArray(spot.menu) && spot.menu.length > 0, spot.name + ' lacks menu');
    assert.ok(!Object.prototype.hasOwnProperty.call(spot, 'tips'), spot.name + ' keeps legacy tips');
    assert.ok(!Object.prototype.hasOwnProperty.call(spot, 'tips_i18n'), spot.name + ' keeps legacy translations');
    assert.ok(Array.isArray(spot.menu_i18n), spot.name + ' lacks menu translations');
    assert.equal(spot.menu.length, spot.menu_i18n.length, spot.name + ' translation length mismatch');
    for (let i = 0; i < spot.menu.length; i++) {
      const item = spot.menu[i];
      assert.equal(typeof item.item, 'string', spot.name + ' item name missing');
      if (item.kind === 'note') {
        noteCount++;
        assert.ok(!Object.prototype.hasOwnProperty.call(item, 'img'), 'note should not invent image');
        assert.ok(!Object.prototype.hasOwnProperty.call(item, 'price'), 'note should not invent price');
        if (item.cover) {
          assert.ok(['shop', 'illustration'].includes(item.coverRole), 'covers must disclose photo vs illustration');
          assert.ok(item.cover.startsWith('../images/'), 'covers should use repository assets');
          if (item.coverRole === 'illustration') {
            illustratedCovers++;
            assert.match(item.cover, /\.svg$/, 'original illustrations should be SVG');
          }
          const relative = item.cover.replace(/^\.\.\//, '');
          assert.ok(fs.existsSync(path.resolve(__dirname, '..', relative)), item.cover + ' is missing');
          verifiedCovers++;
        }
        for (const lang of ['ja', 'zh', 'en', 'ko']) {
          assert.equal(typeof spot.menu_i18n[i][lang], 'string', spot.name + ' note missing ' + lang);
        }
      }
    }
  }
  assert.ok(noteCount > 500, 'tips were migrated as text-only menu entries');
  assert.equal(verifiedCovers, noteCount, 'every migrated shop note has an available cover');
  assert.equal(illustratedCovers, 9, 'only the nine newly illustrated notes are marked as illustrations');
  const compact = JSON.stringify(data);
  assert.equal(source('data/core/tourism_data.compact.json'), compact + '\n');
  assert.equal(
    source('data/core/tourism-data.file.js'),
    'window.RAILWAY_TOURISM = ' + compact.replace(/<\/script/gi, '<\\/script') + ';\n',
  );
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
