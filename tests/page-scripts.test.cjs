'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), spec = require('../scripts/page-scripts.json');
const expand = items => items.flatMap(x => x.startsWith('@') ? expand(spec.groups[x.slice(1)]) : [x]);
test('page manifest and HTML are synchronized', () => {
  execFileSync(process.execPath, ['scripts/sync-page-scripts.cjs', '--check'], { cwd: root });
});
test('all assets follow ordered, non-async script loading with shared cache keys', () => {
  const seen = new Map();
  for (const [page, entries] of Object.entries(spec.pages)) {
    const html = fs.readFileSync(path.join(root, 'pages', page + '.html'), 'utf8');
    const tags = [...html.matchAll(/<script\b([^>]*)><\/script>/g)];
    const expected = [...expand(spec.head), ...expand(entries)];
    assert.equal(tags.length, expected.length, page + ' count');
    const actual = tags.map((tag, i) => {
      const m = tag[1].match(/\bsrc="([^"]+)"/);
      assert.ok(m, page + ' src');
      assert.ok(!/\basync\b/.test(tag[1]), page + ' async breaks dependency order');
      assert.equal(/\bdefer\b/.test(tag[1]), i >= spec.head.length, page + ' defer');
      assert.match(m[1], /^\.\.\/(?:js|data)\/[^?]+\.js\?v=[0-9a-f]{12}$/);
      const key = m[1].split('?')[0];
      if (seen.has(key)) assert.equal(seen.get(key), m[1], key + ' inconsistent versions');
      seen.set(key, m[1]);
      return key.slice(3);
    });
    assert.deepEqual(actual, expected, page + ' order');
    assert.equal(new Set(actual).size, actual.length, page + ' duplicate');
  }
});

test('train detail assets are inert and preserve dependency order', () => {
  const html = fs.readFileSync(path.join(root, 'pages/trains.html'), 'utf8');
  const eager = expand(spec.pages.trains), lazy = expand(spec.lazy.trains);
  assert.ok(eager.includes('js/trains-detail-loader.js'));
  for (const asset of ['js/train-vehicle.js','js/trains-render.js',
    'js/train-position-estimator.js','data/timetables/train-number-png-ranges.js']) {
    assert.ok(!eager.includes(asset), 'heavy module is not eager: ' + asset);
    assert.ok(lazy.includes(asset), 'heavy module must remain available on detail: ' + asset);
  }
  assert.equal(new Set(lazy).size, lazy.length);
  assert.ok(lazy.every(x => !eager.includes(x)));
  const section = html.match(/<template id="pt-trains-detail-assets">([\s\S]*?)<\/template>/);
  assert.ok(section, 'inert detail script template');
  const sources = [...section[1].matchAll(/data-script-src="\.\.\/([^"?]+)\?v=([0-9a-f]{12})"/g)];
  assert.deepEqual(sources.map(x => x[1]), lazy, 'source order matches manifest');
  assert.ok(lazy.indexOf('data/timetables/train-number-png-ranges.js') < lazy.indexOf('js/train-vehicle.js'));
  assert.ok(lazy.indexOf('js/train-vehicle.js') < lazy.indexOf('js/trains-render.js'));
  const source = fs.readFileSync(path.join(root, 'js/trains-detail-loader.js'), 'utf8');
  assert.match(source, /script\.async = false/, 'dynamic classic scripts must remain ordered');
  assert.match(source, /Math\.min\(from \+ 4, urls\.length\)/, 'limit in-flight detail assets');
});
