/* Run: node --test tests/railway-image-fallback.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/railway-image-fallback.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const fallback = sandbox.window.RailwayImageFallback;

test('missing railway-line PNGs become self-contained SVG badges', () => {
  const sourceLines = {
    JK: { image: '../images/鉄道/JR東日本/京浜東北線.png', code: 'JK', color: '#00b2e5' },
    train: { image: '../images/列车/JR東日本/JR東日本_E233系.png', code: 'E233' },
    plain: { name: 'plain' }
  };
  const lines = fallback.prepareLines(sourceLines);
  assert.match(lines.JK.image, /^data:image\/svg\+xml;charset=utf-8,/);
  assert.match(decodeURIComponent(lines.JK.image), /JK/);
  assert.match(decodeURIComponent(lines.JK.image), /#00b2e5/);
  assert.equal(lines.JK.imageOriginal, sourceLines.JK.image);
  assert.equal(lines.JK.imageIsFallback, true);
  assert.equal(sourceLines.JK.image, '../images/鉄道/JR東日本/京浜東北線.png');
  assert.equal(lines.train, sourceLines.train);
  assert.equal(lines.plain, sourceLines.plain);
});

test('SVG special characters are escaped and unsafe colors rejected', () => {
  const uri = fallback.badgeImage({ code: '<&"', color: 'red;url(bad)' }, 'x');
  const svg = decodeURIComponent(uri.split(',')[1]);
  assert.match(svg, /&lt;&amp;&quot;/);
  assert.match(svg, /#6b7280/);
  assert.doesNotMatch(svg, /red;url/);
});

test('source objects remain unchanged across reloads', () => {
  const line = { image: '../images/鉄道/東京メトロ/銀座線.png', code: 'G', color: '#ff9500' };
  const data = { Ginza: line };
  const first = fallback.prepareLines(data), second = fallback.prepareLines(data);
  assert.notEqual(first.Ginza, line);
  assert.equal(first.Ginza.image, second.Ginza.image);
  assert.equal(line.image, '../images/鉄道/東京メトロ/銀座線.png');
});
