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
