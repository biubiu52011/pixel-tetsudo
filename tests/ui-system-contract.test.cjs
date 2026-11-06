'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const blobVersion = text => crypto.createHash('sha1')
  .update('blob ' + Buffer.byteLength(text) + '\0' + text)
  .digest('hex').slice(0, 12);
const pages = ['home','realtime','trains','history','tourism-spot','tourism-shop','tourism-event'];

test('every page uses the same versioned shared UI contract', () => {
  const hash = blobVersion(read('css/ui-system.css'));
  for (const page of pages) {
    const html = read('pages/' + page + '.html');
    assert.ok(html.includes('../css/ui-system.css?v=' + hash), page + ' shared UI stylesheet');
    assert.ok(html.indexOf('css/ui-system.css') > html.indexOf('css/style.css'), page + ' base loaded first');
    assert.ok(html.indexOf('css/ui-system.css') > html.indexOf('css/lang-bar.css'), page + ' language control independent');
  }
});

test('navigation and cards have one central raised-pixel geometry', () => {
  const ui = read('css/ui-system.css');
  const ux = read('css/ux-refinements.css');
  assert.match(ui, /body \.pixel-tabs \{[\s\S]*?border: 2px solid var\(--pt-ui-ink\)/);
  assert.match(ui, /body \.pixel-card \{[\s\S]*?box-shadow: var\(--pt-ui-shadow-card\)/);
  assert.match(ui, /body \.pixel-tabs \.tab-btn.active \{[\s\S]*?border-color: var\(--pt-ui-focus\)/);
  assert.match(ui, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(ux, /body\[data-page="(?:realtime|trains|history)"\] \.pixel-(?:tabs|card)/);
  assert.doesNotMatch(ux, /body\[data-page="(?:realtime|trains|history)"\] \.tab-btn/);
});

test('shared detail back buttons are consistent without duplicated tourism owners', () => {
  const ui = read('css/ui-system.css');
  const tourism = read('css/tourism-styles.css');
  assert.match(ui, /body \.back-btn,\s*body \.detail-back-btn \{/);
  assert.match(ui, /min-height: var\(--pt-ui-touch\)/);
  assert.match(ui, /body \.back-btn:focus-visible,\s*body \.detail-back-btn:focus-visible/);
  assert.doesNotMatch(tourism, /\.detail-back-btn\s*\{/);
  assert.doesNotMatch(tourism, /\.back-btn\s*\{/);
});

test('tourism shop and event keep their identity but meet common card/touch rules', () => {
  const shop = read('css/tourism-shop.css');
  const event = read('css/tourism-event.css');
  assert.match(shop, /\.dp-head \{[\s\S]*?border: 2px solid var\(--pt-ui-edge/);
  assert.match(shop, /\.dp-card \{[\s\S]*?box-shadow: var\(--pt-ui-shadow-card/);
  assert.match(shop, /\.dp-menu-modal-close \{[\s\S]*?min-height: 44px/);
  assert.match(shop, /\.dp-photo-tag \{[\s\S]*?min-height: var\(--pt-ui-touch, 44px\)/);
  assert.match(event, /\.btn-add-calendar \{[\s\S]*?min-height: var\(--pt-ui-touch, 44px\)/);
});

test('specialized railway symbols and circular language button stay untouched', () => {
  const ui = read('css/ui-system.css');
  const lang = read('css/lang-bar.css');
  const runCss = read('css/ux-refinements.css');
  const data = read('js/data-state.js');
  assert.match(lang, /\.lang-toggle-btn \{[\s\S]*?border-radius: 50%/);
  assert.doesNotMatch(ui, /\.lang-toggle-btn|\.rs-status-icon|train-vehicle/);
  assert.match(runCss, /#67CFFF/);
  assert.match(runCss, /#FFB45E/);
  assert.doesNotMatch(data, /statusPictogramHtml/);
});

test('shared CSS versions are correct and no old special styles are cached', () => {
  for (const [page, asset] of [
    ['home','tourism-styles.css'],
    ['history','tourism-styles.css'],
    ['tourism-spot','tourism-styles.css'],
    ['tourism-shop','tourism-shop.css'],
    ['tourism-event','tourism-event.css'],
    ['realtime','ux-refinements.css'],
    ['trains','ux-refinements.css']
  ]) {
    const html = read('pages/' + page + '.html');
    const hash = blobVersion(read('css/' + asset));
    assert.ok(html.includes(asset + '?v=' + hash), page + '/' + asset);
  }
});
