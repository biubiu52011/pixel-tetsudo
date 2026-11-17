'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sql = fs.readFileSync('supabase/migrations/20261117172000_seed_other_hakodate_tram_17_review_assets_2611.sql', 'utf8');
const csv = fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv', 'utf8');
const index = JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json', 'utf8'));

test('all 17 Hakodate tram gallery PNGs are registered review-only, without number/render authority', () => {
  const registered = [...sql.matchAll(/^\s*\('([^']+\.png)','([^']+)','函館市電'\),?$/gm)];
  assert.equal(registered.length, 17);
  const paths = registered.map(x => x[1]);
  assert.equal(new Set(paths).size, 17);
  const expected = csv.trimEnd().split('\n').filter(line => line.startsWith('其他铁路,函館市電,'));
  assert.equal(expected.length, 17);
  const indexed = new Map(index.pngIndex.map(x => [x.path, x]));
  for (const [_, path, vehicle] of registered) {
    assert.match(path, /^images\/列车\/函館市電\/.+\.png$/);
    assert.ok(fs.existsSync(path), 'missing gallery image: ' + path);
    assert.ok(expected.some(line => line.startsWith('其他铁路,函館市電,' + path + ',')));
    const entry = indexed.get(path);
    assert.ok(entry, 'missing original gallery index: ' + path);
    assert.equal((entry.directNumberRules || []).length, 0);
    assert.ok(vehicle && vehicle.length > 0);
  }
  assert.equal(registered.filter(x => x[1].endsWith('/toq9002or.png') && x[2] === '未判定').length, 1);
  assert.match(sql, /'review','review','requires_review',NULL/);
  assert.match(sql, /IF n<>17/);
  assert.match(sql, /ON CONFLICT \(image_path\) DO NOTHING/);
  assert.doesNotMatch(sql, /INSERT\s+INTO\s+public\.published_train_png_number_ranges/i);
  assert.doesNotMatch(sql, /ON CONFLICT\s*\(image_path\)\s*DO UPDATE/i);
  assert.doesNotMatch(sql, /UPDATE\s+public\.vehicle_image_assets/i);
});
