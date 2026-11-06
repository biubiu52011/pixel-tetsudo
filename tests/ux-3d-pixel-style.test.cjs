'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const blobVersion = text => crypto.createHash('sha1')
  .update('blob ' + Buffer.byteLength(text) + '\0' + text).digest('hex').slice(0,12);

test('realtime status and modal blocks retain a raised 3D pixel structure', () => {
  const css = read('css/ux-refinements.css');
  assert.match(css, /\.rs-modal-content \{[\s\S]*?box-shadow: 8px 8px 0 #26262b/);
  assert.match(css, /\.rs-status-section,\s*body\[data-page="realtime"\] \.rs-interval-section,[\s\S]*?border-width: 3px;/);
  assert.match(css, /\.rs-updated-section \{[\s\S]*?border: 3px solid var\(--text\)/);
  assert.match(css, /\.rs-modal-close:active \{[\s\S]*?translate\(3px,3px\)/);
});

test('navigation, railway cards and history controls have stepped shadows', () => {
  const css = read('css/ux-refinements.css');
  assert.match(css, /\.rs-line-card \{[\s\S]*?box-shadow: 4px 4px 0/);
  assert.match(css, /\.rs-line-card:active \{[\s\S]*?translate\(3px,3px\)/);
  assert.match(css, /\.history-entry \{[\s\S]*?box-shadow: 4px 4px 0/);
  assert.match(css, /\.rs-filter-btn \{[\s\S]*?box-shadow: 3px 3px 0/);
  assert.match(css, /prefers-reduced-motion/);
});

test('language selector stays circular with a subtle shadow and accessible touch target', () => {
  const css = read('css/lang-bar.css');
  assert.match(css, /\.lang-toggle-btn \{[\s\S]*?border-radius: 50%/);
  assert.match(css, /\.lang-toggle-btn \{[\s\S]*?box-shadow: 0 2px 5px rgba\(24,36,48,\.20\)/);
  assert.match(css, /\.lang-toggle-btn:active \{[\s\S]*?translateY\(1px\)/);
  assert.match(css, /\.lang-toggle-btn::after \{[\s\S]*?width: 44px/);
  assert.doesNotMatch(css, /box-shadow: 4px 4px 0 var\(--lang-border\)/);
});

test('CSS links use the current Git blob versions and home avoids scoped refinements', () => {
  const uxVersion = blobVersion(read('css/ux-refinements.css'));
  const langVersion = blobVersion(read('css/lang-bar.css'));
  for (const page of ['realtime','trains','history']) {
    const html = read('pages/' + page + '.html');
    assert.ok(html.includes('ux-refinements.css?v=' + uxVersion), page + ' UX cache key');
  }
  for (const page of ['home','history','realtime','trains','tourism-spot','tourism-shop','tourism-event']) {
    const html = read('pages/' + page + '.html');
    assert.ok(html.includes('lang-bar.css?v=' + langVersion), page + ' language UI cache key');
  }
  assert.doesNotMatch(read('pages/home.html'), /ux-refinements\.css/);
});

test('bright warning and notice colors retain readable text without train-shaped glyphs', () => {
  const css = read('css/ux-refinements.css');
  const dataState = read('js/data-state.js');
  const realtime = read('js/realtime-view.js');
  assert.match(css, /--pt-alert-accent: #FFB45E/);
  assert.match(css, /--pt-alert-accent: #67CFFF/);
  assert.match(css, /background: #F2FBFF/);
  assert.match(css, /background: #FFF9F2/);
  assert.match(css, /color: #1F2A35/);
  assert.doesNotMatch(css, /#915300|#785900|\.pt-train-status-art/);
  assert.doesNotMatch(dataState, /statusPictogramHtml|pt-train-status-art/);
  assert.doesNotMatch(realtime, /statusPictogramHtml|rs-status-symbol-art/);
  assert.match(dataState, /oldStatus\.textContent=newStatus\.textContent/);
});
