'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sql = fs.readFileSync('supabase/migrations/20261117120000_seed_private_gallery_missing_24_review_assets_2611.sql','utf8');
const csv = fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const expectedOperators = new Map([
  ['伊豆急行','Izukyu'],
  ['富士急行','FujisanrokuElectricRailway'],
  ['東急電鉄','Tokyu'],
  ['東武鉄道','Tobu'],
]);

test('24 private PNG gallery assets are registered only as review, without train-number authority', () => {
  // The same VALUES source occurs once for INSERT and once for verification.
  const match = [...sql.matchAll(/^\s*\('([^']+\.png)','([^']+)','([^']+)'\),?$/gm)];
  assert.equal(match.length, 48, 'must have 24 rows in each of two SQL VALUES lists');
  const unique = new Map();
  for (const [, png, vehicleType, operator] of match) {
    assert.match(png, /^images\/列车\/.+\.png$/);
    assert.ok(fs.existsSync(png), 'missing physical PNG: ' + png);
    const dir = png.split('/')[2];
    assert.equal(operator, expectedOperators.get(dir), 'operator mismatch: ' + png);
    assert.notEqual(vehicleType, '未判定');
    const previous = unique.get(png);
    if (previous) assert.deepEqual(previous, [vehicleType, operator]);
    else unique.set(png, [vehicleType, operator]);
  }
  assert.equal(unique.size, 24, 'review registry must cover exactly 24 unique PNGs');
  const byDirectory = {};
  for (const png of unique.keys()) {
    const dir = png.split('/')[2];
    byDirectory[dir] = (byDirectory[dir] || 0) + 1;
    assert.ok(csv.split('\n').some(line => line.startsWith('私铁,'+dir+','+png+',')),
      'not represented in the existing one-gallery audit CSV: '+png);
  }
  assert.deepEqual(byDirectory, {
    '伊豆急行': 2, '富士急行': 18, '東急電鉄': 3, '東武鉄道': 1,
  });
  assert.ok(sql.includes("'review','review','requires_review',NULL"));
  assert.ok(sql.includes('AND a.file_format_status IS NULL'));
  assert.ok(sql.includes('IF n<>24'));
  assert.doesNotMatch(sql, /UPDATE\s+public\.vehicle_image_assets/i);
  assert.doesNotMatch(sql, /INSERT\s+INTO\s+public\.published_train_png_number_ranges/i);
  assert.doesNotMatch(sql, /ON CONFLICT\s*\(image_path\)\s*DO UPDATE/i);
});

test('third-sector unresolved scope is still an audit gap, not invented PNG bands', () => {
  const index = JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json','utf8'));
  const byPng = new Map(index.pngIndex.map(x=>[x.path,x]));
  const rows = csv.trimEnd().split('\n').filter(line=>line.startsWith('第三部门铁道,'));
  const missing = [...new Set(rows.filter(line=>line.endsWith(',无号段')).map(line=>line.split(',')[2]))];
  assert.ok(missing.length>0);
  for (const png of missing) {
    assert.ok(fs.existsSync(png),'missing gallery art '+png);
    const evidence=byPng.get(png);
    assert.ok(evidence,'missing scope audit '+png);
    assert.equal((evidence.directNumberRules||[]).length,0,
      'recheck current rule metadata before copying an older audit: '+png);
  }
  const scoped=missing.filter(p=>byPng.get(p)?.lineScopes?.length).length;
  const unscoped=missing.length-scoped;
  assert.equal(scoped+unscoped,missing.length);
  const quarantined=missing.filter(p=>byPng.get(p)?.quarantined);
  for(const p of quarantined)assert.ok(missing.includes(p));
});
