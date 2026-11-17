'use strict';
// Private-railway PNG mapping baseline, 2026-11-17 (after ninth number batch).
// Uses the existing single CSV and derived gallery index; creates no mapping
// authority and never turns a carset, livery, or formation number into a train
// service number.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const csv = fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const index = JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json','utf8'));
const byPng = new Map(index.pngIndex.map(entry => [entry.path, entry]));
const rows = csv.trimEnd().split('\n').slice(1)
  .filter(row => row.startsWith('私铁,')).map(row => row.split(','));
const rowsByPng = new Map();
for (const row of rows) {
  const group = rowsByPng.get(row[2]) || [];
  group.push(row);
  rowsByPng.set(row[2], group);
}

const expectedOperators = {
  '上信電鉄': 24,
  '京成電鉄': 11,
  '京浜急行電鉄': 7,
  '京王電鉄': 6,
  '伊豆急行': 3,
  '伊豆箱根鉄道': 4,
  '千葉ニュータウン鉄道': 3,
  '富士急行': 20,
  '小田急箱根': 3,
  '小田急電鉄': 11,
  '東急電鉄': 31,
  '東武鉄道': 37,
  '江ノ島電鉄': 7,
  '流鉄株式会社': 4,
  '相模鉄道': 19,
  '秩父鉄道': 23,
  '西武鉄道': 22,
  '銚子電鉄': 11,
};

const expectedReferencedPngs = [
  'images/列车/富士急行/富士急行_6000系_標準色.png',
  'images/列车/富士急行/富士急行_8000系_フジサン特急_顔A.png',
  'images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png',
  'images/列车/小田急電鉄/小田急電鉄_4000形_標準色.png',
  'images/列车/東急電鉄/東急電鉄_2020系.png',
  'images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png',
  'images/列车/東武鉄道/東武鉄道_10030型_未更新車.png',
  'images/列车/東武鉄道/東武鉄道_100系_原色.png',
  'images/列车/東武鉄道/東武鉄道_500系_リバティ.png',
  'images/列车/東武鉄道/東武鉄道_200型_りょうもう_赤.png',
  'images/列车/東武鉄道/東武鉄道_20400型.png',
  'images/列车/東武鉄道/東武鉄道_N100系_SPACIA_X.png',
  'images/列车/東武鉄道/東武鉄道_50050型.png',
  'images/列车/東武鉄道/東武鉄道_70090型.png',
  'images/列车/東武鉄道/東武鉄道_70000系.png',
  'images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png',
].sort();

test('private railway category fixes the 246-PNG inventory and 230 unresolved gaps', () => {
  assert.equal(rows.length, 580, 'review duplicate range rows when the inventory changes');
  assert.equal(rowsByPng.size, 246);
  const counts = {};
  const missing = [];
  const referenced = [];
  for (const [png, pngRows] of rowsByPng) {
    const operator = pngRows[0][1];
    counts[operator] = (counts[operator] || 0) + 1;
    assert.ok(pngRows.every(row => row[0] === '私铁' && row[1] === operator));
    assert.ok(fs.existsSync(png), 'gallery image is missing: ' + png);
    const entry = byPng.get(png);
    assert.ok(entry, 'read-only PNG evidence index has no path: ' + png);
    assert.equal(entry.operatorDirectory, operator);
    if (pngRows.every(row => row[8] === '无号段')) {
      missing.push(png);
      assert.equal((entry.directNumberRules || []).length, 0,
        'review a new source before declaring a private-railway number band: ' + png);
      assert.ok(pngRows.every(row =>
        row.slice(3, 8).every(value => value === '')),
        'unresolved PNG must not carry a partial invented range: ' + png);
    } else {
      referenced.push(png);
      assert.ok(pngRows.some(row => row[8] !== '无号段'));
    }
  }
  assert.deepEqual(counts, expectedOperators);
  assert.equal(missing.length, 230);
  assert.deepEqual(referenced.sort(), expectedReferencedPngs);
});

test('private gaps stay separated into scoped and unscoped evidence without priority guessing', () => {
  const missing = [...rowsByPng]
    .filter(([, pngRows]) => pngRows.every(row => row[8] === '无号段'))
    .map(([png]) => png);
  const scoped = missing.filter(png => (byPng.get(png).lineScopes || []).length);
  const unscoped = missing.filter(png => !(byPng.get(png).lineScopes || []).length);
  const quarantined = missing.filter(png => byPng.get(png).quarantined);
  assert.equal(scoped.length, 108);
  assert.equal(unscoped.length, 122);
  assert.equal(quarantined.length, 2);
  assert.equal(scoped.length + unscoped.length, missing.length);
  const carOrFormationLabels = missing.filter(png =>
    /(?:クハ|クモハ|デキ|_[0-9]+F(?:_|\.)|編成|号車)/.test(png));
  assert.ok(carOrFormationLabels.length > 0);
  for (const png of carOrFormationLabels) {
    assert.equal((byPng.get(png).directNumberRules || []).length, 0,
      'vehicle or formation label is not a train service number: ' + png);
  }
});
