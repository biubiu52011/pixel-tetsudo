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

function renderShop(spot, lang = 'ja') {
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
    'detail.visit_notes': '訪問メモ',
    'detail.official_source': '公式情報',
    'detail.unverified': '情報未確認',
    'detail.reported_closed': '閉店情報あり',
    'detail.closed_warning': '閉店情報あり。営業時間は要確認。',
    'detail.check_source': '閉店情報の出典',
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
    state: { lang },
    t(key) { return messages[key] || key; },
    escapeHtml(value) {
      return value == null ? '' : String(value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;');
    },
    buildContext(s) {
      return {
        spot: s, spotName: s.name, spotFee: '無料', spotHours: s.hours || '10:00',
        spotBestTime: '年中', spotAddress: '', desc: s.desc || 'About',
        tags: s.tags || [], tagsHtml: '', typeBadge: '', heroClass: '',
        mapLat: 35.6, mapLng: 139.6,
        dist: { distMain: '', distText: '', stationName: '' },
      };
    },
    galleryIndexForMenu(s, index) {
      return (s.image ? 1 : 0) + s.menu.slice(0, index).filter(item => item && item.img).length;
    },
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
  assert.equal(priceFields.length, 2, 'short menus render each price once without an unnecessary modal');
});

test('historical visit notes never masquerade as product recommendation cards', () => {
  const html = renderShop({
    name: 'Craft Store', tags: ['store'],
    menu: [
      { item: 'Handmade goods', kind: 'note', cover: '../images/観光地/test.jpg', coverRole: 'shop' },
      { item: 'Open early', kind: 'note' },
    ],
    menu_i18n: [{ ja: '手作り雑貨' }, { ja: '朝から営業' }],
  });
  assert.match(html, /訪問メモ/);
  assert.match(html, /手作り雑貨/);
  assert.match(html, /朝から営業/);
  assert.doesNotMatch(html, /dp-menu-carousel|dp-dish-thumb|dp-dish-img|すべて見る/);
});

test('source-backed products and experiences show a checkable original link', () => {
  const html = renderShop({
    name: 'ギャラクシティ', tags: ['play'],
    menu: [
      { item: '歩いて3分', kind: 'note' },
      { item: 'まるちたいけんドーム', kind: 'experience', price: '500円',
        sourceUrl: 'https://www.galaxcity.jp/about/', sourceType: 'official' },
    ],
    menu_i18n: [{ ja: '徒歩3分' }, { ja: 'まるちたいけんドーム' }],
  });
  assert.match(html, /おすすめ/);
  assert.match(html, /500円/);
  assert.match(html, /公式情報/);
  assert.match(html, /https:\/\/www.galaxcity.jp\/about\//);
  assert.match(html, /訪問メモ/);
  assert.doesNotMatch(html, /class="dp-dish-name">徒歩3分/);
});

test('old entries have a clear unverified label instead of implied official sourcing', () => {
  const html = renderShop({
    name: 'Cafe', tags: ['food'],
    menu: [{ item: 'Coffee', price: '500円' }],
  });
  assert.match(html, /情報未確認/);
  assert.doesNotMatch(html, /公式情報/);
});

test('reported-closed venue has a warning and is not shown as an active menu', () => {
  const html = renderShop({
    name: 'Sabö Asaichi', tags: ['food'],
    businessStatus: 'reported_closed',
    businessStatusSource: 'https://tabelog.com/tokyo/A1311/A131101/13201512/',
    menu: [{ item: 'Historical breakfast', price: '500円' }, { item: 'Open early', kind: 'note' }],
  });
  assert.match(html, /閉店情報あり/);
  assert.match(html, /閉店情報の出典/);
  assert.doesNotMatch(html, /dp-menu-carousel|Historical breakfast|Open early/);
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
  let productPhotoCount = 0;
  let shopPhotoProductCount = 0;
  let illustratedProductCount = 0;
  let sourceBackedCount = 0;
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
      } else {
        assert.ok(item.img || item.cover, spot.name + ' product or experience is missing an image');
        const mediaPath = item.img || item.cover;
        assert.ok(mediaPath.startsWith('../images/'), spot.name + ' media must be local');
        assert.ok(fs.existsSync(path.resolve(__dirname, '..', mediaPath.replace(/^\.\.\//, ''))),
          spot.name + ' has a broken product/experience image path: ' + mediaPath);
        if (item.img) {
          productPhotoCount++;
          assert.ok(!item.cover, 'real product photography must remain preferred');
        } else {
          if (item.coverRole === 'shop') shopPhotoProductCount++;
          else if (item.coverRole === 'illustration') illustratedProductCount++;
          else assert.fail('unclear media source on ' + spot.name);
          assert.ok(!Object.prototype.hasOwnProperty.call(item, 'img'), 'do not invent a product photo');
        }
        if (item.sourceUrl) {
          sourceBackedCount++;
          assert.ok(item.sourceUrl.startsWith('https://'), 'source URLs must use HTTPS');
          assert.equal(item.sourceType, 'official', 'manually reviewed items need official provenance');
          assert.match(item.verifiedAt || '', /^20\d\d-\d\d-\d\d$/);
        }
      }
    }
  }
  assert.equal(productPhotoCount + shopPhotoProductCount + illustratedProductCount, 397,
    'all active source-backed and historical product records have image references');
  assert.equal(sourceBackedCount, 20, 'first seven reviewed shops supply 20 official-source entries');
  assert.equal(productPhotoCount, 75, 'all valid product-specific photos are preserved');
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

test('official-source audit matches the complete business catalog', () => {
  const data = JSON.parse(source('data/core/tourism_data.json'));
  const audit = JSON.parse(source('data/core/tourism_recommendation_audit.json'));
  const sandbox = { window: {} };
  execute('js/tourism-type.js', sandbox);
  const shops = data.spots.filter(spot => sandbox.window.TourismType.getSpotType(spot) === 'shop');
  assert.equal(audit.totals.shops, shops.length);
  const indexed = new Map(audit.shops.map(item => [item.name, item]));
  assert.equal(indexed.size, shops.length);
  let reviewed = 0, unsupported = 0, notes = 0, closed = 0, verifiedShops = 0, noteOnly = 0;
  for (const spot of shops) {
    const entry = indexed.get(spot.name);
    assert.ok(entry, 'missing merchant review record: ' + spot.name);
    const offers = (spot.menu || []).filter(item => item.kind !== 'note');
    const sourced = offers.filter(item => item.sourceType === 'official' && item.sourceUrl);
    const noteCount = (spot.menu || []).length - offers.length;
    assert.equal(entry.officialItems, sourced.length, spot.name);
    assert.equal(entry.legacyItems, offers.length - sourced.length, spot.name);
    assert.equal(entry.visitorNotes, noteCount, spot.name);
    reviewed += sourced.length;
    unsupported += offers.length - sourced.length;
    notes += noteCount;
    if (sourced.length) verifiedShops++;
    if (offers.length === 0) noteOnly++;
    if (spot.businessStatus === 'reported_closed') {
      closed++;
      assert.equal(entry.status, 'reported_closed');
      assert.ok(spot.businessStatusSource.startsWith('https://'));
    }
  }
  assert.equal(audit.totals.verified, reviewed);
  assert.equal(audit.totals.unverified, unsupported);
  assert.equal(audit.totals.notes, notes);
  assert.equal(audit.totals.reportedClosed, closed);
  assert.equal(audit.totals.reviewedShops, verifiedShops);
  assert.equal(audit.totals.noteOnly, noteOnly);
  const yoshiya = shops.find(item => item.name === '木挽町よしや');
  assert.ok(yoshiya.menu.some(item => item.item.includes('5個入') && item.price.includes('850円')));
  assert.ok(!yoshiya.menu.some(item => item.item.includes('2個入') && item.kind !== 'note'));
  const galaxcity = shops.find(item => item.name === 'ギャラクシティ');
  assert.ok(galaxcity.menu.some(item => item.item.includes('がんばるウォール') && item.sourceUrl));
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

test('shop images cannot impersonate item photography and provenance is explicit', () => {
  const html = renderShop({
    name: 'Photo Audit', tags: ['food'],
    menu: [
      { item: 'Storefront fallback', cover: '../images/観光地/shop.jpg', coverRole: 'shop' },
      { item: 'Original drawing', cover: '../images/illustration.svg', coverRole: 'illustration' },
      { item: 'Unreviewed source', sourceUrl: 'https://example.com/menu' },
      { item: 'Reviewed menu', sourceUrl: 'https://example.com/verified', sourceType: 'official' },
    ],
  });
  assert.doesNotMatch(html, /dp-dish-badge/, 'never invent product imagery');
  assert.equal(html.includes('src="../images/観光地/shop.jpg"'), false);
  assert.equal(html.includes('src="../images/illustration.svg"'), true);
  assert.match(html, /https:\/\/example\.com\/verified/);
  assert.doesNotMatch(html, /href="https:\/\/example\.com\/menu"/);
  assert.match(html, /<article class="article-content article-content--shop">/);
  assert.match(html, /<section class="dp-card dp-menu"/);
});

test('Nagami dishes never present hand-drawn illustrations as actual restaurant photography', () => {
  const spot = JSON.parse(source('data/core/tourism_data.json')).spots.find(s => s.name === '千住の永見');
  assert.ok(spot);
  assert.ok(spot.menu.slice(0, 6).every(item => item.coverRole === 'shop'));
  const html = renderShop(spot);
  assert.doesNotMatch(html, /千住の永見_\\d+_.*?\\.svg/);
  assert.match(html, /https:\\/\\/san-tatsu\\.jp\\/articles\\/18793\\//);
  assert.match(html, /https:\\/\\/tabelog\\.com\\/tokyo\\/A1324/);
  assert.doesNotMatch(html, /class="dp-dish-img"/);
});

test('missing coordinates do not place a venue at an invented map location', () => {
  const sandbox = { window: { currentLang:'ja', t:key=>key }, document:{}, console };
  execute('js/tourism-core.js', sandbox);
  const core = sandbox.window.TourismDetailCore;
  const absent = core.buildContext({ name:'Missing', coord:null, tags:['food'] }, null);
  assert.equal(absent.mapLat, null);
  assert.equal(absent.mapLng, null);
  assert.equal(absent.mapSection, '');
  const zero = core.buildContext({ name:'Zero', coord:[0,0] }, null);
  assert.equal(zero.mapSection, '');
  const valid = core.buildContext({ name:'Valid', coord:[35.7,139.8] }, null);
  assert.match(valid.mapSection, /id="tourismMap"/);
  assert.equal(core.escapeHtml('A"&<\'B'), 'A&quot;&amp;&lt;&#39;B');
  assert.equal(core.escapeHtml(0), '0');
});

test('short menus use compact text rows and remove a redundant all-items dialog', () => {
  const html = renderShop({
    name:'びあマ北千住', tags:['food','drink','shop'],
    hours:'月曜～土曜・祝前日14:00〜23:00（LO22:00）、日曜・祝日13:00〜22:00（LO21:00）※テイクアウトは閉店まで可',
    desc:'長い紹介。'.repeat(75),
    menu:[
      {item:'クラフトビール',price:'300円〜',cover:'../images/観光地/shop.jpg',coverRole:'shop'},
      {item:'飲み比べセット',price:'1,500円',cover:'../images/観光地/shop.jpg',coverRole:'shop'},
      {item:'自家製ピクルス',price:'400円',cover:'../images/観光地/shop.jpg',coverRole:'shop'}
    ]
  });
  assert.match(html, /dp-menu-list/);
  assert.match(html, /dp-menu-row/);
  assert.doesNotMatch(html, /dp-menu-carousel|dp-dish-thumb|dp-menu-modal|dp-menu-viewall/);
  assert.match(html, /dp-about--collapsible/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /営業時間/);
  assert.match(html, /日曜・祝日/);
  assert.doesNotMatch(html, /ベストシーズン|營業時間|閉する/);
  assert.equal((html.match(/class="dp-dish-price"/g) || []).length, 3);
});


test('7–12 recommendations expand inline without a duplicated modal', () => {
  const menu = Array.from({length:8},(_,i)=>({item:'商品'+i,price:(100+i)+'円'}));
  const html = renderShop({name:'Medium shop',tags:['store'],menu});
  assert.match(html, /class="dp-menu-inline-toggle"/);
  assert.match(html, /aria-expanded="false" aria-controls="dp-menu-more"/);
  assert.match(html, /class="dp-menu-more" id="dp-menu-more" hidden/);
  assert.doesNotMatch(html, /role="dialog"|dp-menu-modal|dp-dish-badge/);
  assert.equal((html.match(/class="dp-dish-price"/g) || []).length, 8);
});

test('13+ recommendations retain an accessible dialog and focus controls', () => {
  const menu = Array.from({length:15},(_,i)=>({item:'商品'+i,price:(100+i)+'円'}));
  const html = renderShop({name:'Large shop',tags:['store'],menu});
  assert.match(html, /class="dp-menu-viewall"/);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /aria-label="閉じる"/);
  assert.match(html, /dp-menu-list/);
  assert.doesNotMatch(html, /dp-dish-badge|dp-dish-thumb/);
  assert.equal((html.match(/class="dp-dish-price"/g) || []).length, 21);
});

test('mixed menus keep real item photography separate from no-photo text entries', () => {
  const html = renderShop({name:'Hybrid shop',tags:['drink'],menu:[
    {item:'Real picture',img:'../images/items/real.jpg',sourceUrl:'https://example.com/real',sourceType:'official'},
    {item:'Text only',cover:'../images/観光地/shop.jpg',coverRole:'shop'}
  ]});
  assert.match(html, /class="dp-menu-mixed"/);
  assert.doesNotMatch(html, /class="dp-menu-carousel"|class="dp-menu-list"/);
  assert.ok(html.includes('src="../images/items/real.jpg"'));
  assert.equal(html.includes('src="../images/観光地/shop.jpg"'),false);
  assert.match(html, /公式情報/);
});

test('interleaved nine-item recommendations preserve order and gallery mapping across expansion', () => {
  const menu = [
    ...Array.from({length:5}, (_,i) => ({item:'Photo '+i,img:'../images/p'+i+'.jpg',price:(100+i)+'円'})),
    {item:'Text A',price:'600円'}, {item:'Text B',price:'700円'},
    {item:'Photo 7',img:'../images/p7.jpg',price:'800円'},
    {item:'Text C',price:'900円'}
  ];
  const html = renderShop({name:'Mixed nine',image:'../images/store.jpg',tags:['food'],menu});
  const start = html.indexOf('<section class="dp-card dp-menu"');
  assert.ok(start >= 0);
  const section = html.slice(start,html.indexOf('</section>',start));
  assert.equal((section.match(/class="dp-menu-mixed"/g)||[]).length,2);
  assert.doesNotMatch(section,/dp-menu-carousel|class="dp-menu-list"|dp-menu-modal/);
  assert.equal((section.match(/class="dp-dish-img"/g)||[]).length,6);
  assert.equal((section.match(/class="dp-dish-price"/g)||[]).length,9);
  assert.deepEqual([...section.matchAll(/class="dp-dish-name">([^<]+)/g)].map(m=>m[1]),
    menu.map(item=>item.item));
  assert.deepEqual([...section.matchAll(/data-gallery-idx="([0-9]+)"/g)].map(m=>Number(m[1])),
    [1,2,3,4,5,6], 'gallery index follows actual photos, not item positions');
  assert.match(section,/class="dp-menu-more" id="dp-menu-more" hidden/);
  assert.match(section,/data-hidden-count="3"/);
});

test('overview elevates hours and price, keeps transit update hooks, and avoids duplicate shop labels', () => {
  const html = renderShop({
    name:'千住の永見', image:'../images/観光地/千住の永見.jpg',
    tags:['food','restaurant','local_specialty','shop','drink'],
    hours:'15:00〜22:00', fee:'一品470円〜',
    menu:[{item:'千住あげ',price:'470円',img:'../images/foods/age.jpg'}]
  });
  assert.match(html, /class="dp-facts/);
  assert.match(html, /class="dp-fact dp-fact--hours/);
  assert.match(html, /class="dp-fact dp-fact--fee/);
  assert.match(html, /data-tourism-distance-row/);
  assert.match(html, /data-tourism-distance/);
  assert.match(html, /<img class="dp-hero-img" src="..\/images\/観光地\/千住の永見\.jpg"/);
  assert.doesNotMatch(html, /dp-photo-tag|dp-hero-shade|dp-photo-count|data-gallery-idx="0"/);
  assert.match(html, /class="dp-tags-toggle" aria-expanded="false"/);
  assert.match(html, /dp-tag-extra/);
  assert.equal((html.match(/class="dp-fact-label"/g) || []).length, 2);
});

test('long mixed hours stay in one responsive fact rather than an unbroken details line', () => {
  const html = renderShop({name:'びあマ北千住',tags:['food','drink'],hours:
    '月曜～土曜・祝前日14:00〜23:00（LO22:00）、日曜・祝日13:00〜22:00（LO21:00）※テイクアウトは閉店まで可'
  });
  assert.match(html, /dp-facts--long-hours/);
  assert.match(html, /月曜～土曜・祝前日/);
  assert.match(html, /日曜・祝日/);
  assert.match(html, /テイクアウト/);
});

test('visitor notes are grouped with the overview rather than standalone repeated cards', () => {
  const html = renderShop({
    name:'Shop with note',tags:['food'],desc:'Original description',
    menu:[{item:'Only a reminder',kind:'note'}],
    menu_i18n:[{ja:'冬期限定の料理'}]
  });
  assert.match(html, /class="dp-visit-notes"/);
  assert.match(html, /dp-visit-notes-list/);
  assert.match(html, /冬期限定の料理/);
  assert.doesNotMatch(html, /class="dp-card dp-visitor-notes"/);
  assert.equal((html.match(/class="dp-card dp-about/g) || []).length, 1);
});

test('shop-only UI labels support Japanese, Chinese, English and Korean without changing global translations', () => {
  const fixture = {name:'Test',tags:['drink'],hours:'10:00〜20:00',
    menu:Array.from({length:8},(_,i)=>({item:'Item'+i}))};
  for (const [lang,label,more] of [
    ['ja','営業時間','もっと見る'],['zh','营业时间','查看更多'],
    ['en','Opening hours','Show more'],['ko','영업시간','더 보기']
  ]) {
    const html = renderShop(fixture,lang);
    assert.ok(html.includes(label),lang+' hours label');
    assert.ok(html.includes(more),lang+' menu expansion');
  }
});

test('shop CSS has one pixel-style fact hierarchy, responsive rules and no fake item placeholder', () => {
  const css = source('css/tourism-shop.css');
  assert.match(css,/\.dp-facts \{/);
  assert.match(css,/\.dp-hero-img \{/);
  assert.doesNotMatch(css,/\.dp-photo-tag \{|\.dp-hero-shade \{/);
  assert.match(css,/\.dp-visit-notes \{/);
  assert.match(css,/\.dp-menu-inline-toggle/);
  assert.match(css,/@media \(max-width: 640px\)/);
  assert.doesNotMatch(css,/\.dp-dish-badge \{/);
});

test('merchant hero is only the native image, without a clickable gallery or overlay', () => {
  const photo = renderShop({name:'千住の永見',image:'../images/観光地/千住の永見.jpg',menu:[]});
  assert.match(photo, /<article class="article-content article-content--shop"><img class="dp-hero-img"[^>]*><header class="dp-head">/);
  assert.equal((photo.match(/class="dp-hero-img"/g) || []).length, 1);
  assert.doesNotMatch(photo, /dp-photo-tag|dp-hero-shade|dp-photo-count|class="dp-hero /);
  const missing = renderShop({name:'No photo',menu:[]});
  assert.doesNotMatch(missing, /dp-hero-img|dp-hero-shade|dp-photo-tag/);
});
