'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const css = read('css/home-mobile.css');

test('home has one scoped mobile stylesheet loaded after the baseline styles', () => {
  const html = read('pages/home.html');
  const hash = crypto.createHash('sha1')
    .update('blob ' + Buffer.byteLength(css) + '\0' + css)
    .digest('hex').slice(0, 12);
  assert.ok(html.includes('../css/home-mobile.css?v=' + hash));
  assert.ok(html.indexOf('css/home-mobile.css') > html.indexOf('css/tourism-styles.css'));
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /body\[data-page="home"\] #searchContainer/);
  assert.doesNotMatch(css, /(^|\})\s*\.pixel-card\s*\{/m);
});

test('search form has consistent readable touch sizes and bounded inputs', () => {
  assert.match(css, /#searchContainer \.search-input \{[\s\S]*?min-height: 48px/);
  assert.match(css, /#searchContainer \.search-input \{[\s\S]*?font-size: 16px/);
  assert.match(css, /#searchContainer \.swap-btn \{[\s\S]*?min-height: 44px/);
  assert.match(css, /#searchContainer \.search-btn \{[\s\S]*?min-height: 48px/);
  assert.match(css, /#searchContainer \.search-input \{[\s\S]*?max-width: 100%/);
  assert.match(css, /overflow: visible; \/\* keep station autocomplete popovers visible \*\//);
});

test('time controls never rely on unbounded mobile intrinsic columns', () => {
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /input\[type="time"\] \{[\s\S]*?min-width: 0/);
  assert.match(css, /::-webkit-date-and-time-value/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
});

test('top spacing makes room for circular language switcher; tourism aligns to search', () => {
  assert.match(css, /#tab-search \{[\s\S]*?padding-top: 0;/);
  assert.match(css, /#searchContainer \{[\s\S]*?margin-top: 0;/);
  assert.match(css, /#searchContainer,\s*body\[data-page="home"\] #smModule \{[\s\S]*?margin-right: 0;[\s\S]*?margin-left: 0/);
  const lang = read('css/lang-bar.css');
  assert.match(lang, /\.lang-toggle-btn \{[\s\S]*?border-radius: 50%/);
});

test('empty search results do not make a blank card footer', () => {
  assert.match(css, /#searchContainer > \.search-results:empty \{[\s\S]*?padding: 0;[\s\S]*?margin: 0;/);
  assert.match(css, /#searchContainer > \.search-results:not\(:empty\) \{[\s\S]*?padding: 0 16px 16px;/);
});

test('search and tourism module titles share a mobile grid and typography', () => {
  assert.match(css, /#searchContainer > \.module-title,\s*body\[data-page="home"\] #smModule > \.module-title \{/);
  assert.match(css, /#searchContainer > \.module-title h2,\s*body\[data-page="home"\] #smModule > \.module-title h2 \{/);
  assert.match(css, /#smModule > \.sm-location-bar \{[\s\S]*?padding: 12px 16px;/);
});

test('forced all-page UI layer is absent and page components retain their owners', () => {
  for (const page of ['home','history','realtime','trains','tourism-spot','tourism-shop','tourism-event']) {
    const html = read('pages/' + page + '.html');
    assert.doesNotMatch(html, /ui-system\.css/, page + ' should not load failed global CSS');
  }
  assert.doesNotMatch(css, /padding-top: 36px/);
  assert.match(css, /@media \(max-width: 480px\)/);
});

test('home station pair and optional dated timetable controls stay scoped', () => {
  const html = read('pages/home.html');
  assert.match(html, /class="station-pair"/);
  assert.match(html, /id="searchDate"[^>]*type="date"/);
  assert.match(html, /id="searchTimeDetails"[^>]*hidden/);
  assert.match(css, /#searchContainer \.station-pair \{/);
  assert.match(css, /#searchContainer \.station-pair \.swap-btn \{/);
  const pair = css.match(/#searchContainer \.station-pair \{([^}]+)\}/);
  const swap = css.match(/#searchContainer \.station-pair \.swap-btn \{([^}]+)\}/);
  assert.ok(pair);
  assert.ok(swap);
  assert.match(pair[1], /display: flex/);
  assert.match(pair[1], /flex-direction: column/);
  assert.doesNotMatch(pair[1], /linear-gradient|box-shadow|border-radius|border:/);
  assert.doesNotMatch(swap[1], /position: absolute|box-shadow|linear-gradient/);
  assert.doesNotMatch(css, /#b5c9d7|#eef7fc|#109b53/);

  assert.match(css, /#searchContainer \.station-clear-btn\[hidden\]/);
  assert.match(css, /#searchContainer \.search-time-details\[hidden\]/);
  assert.match(css, /@media \(max-width: 480px\)/);
});
