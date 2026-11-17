'use strict';
// Other-railway PNG mapping baseline, 2026-11-17.
// Uses the existing single CSV and derived gallery index; creates no mapping
// authority and never turns a formation/car number into a train service number.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const csv = fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const index = JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json','utf8'));
const byPng = new Map(index.pngIndex.map(entry => [entry.path,entry]));
const items = csv.trimEnd().split('\n').slice(1)
  .filter(row => row.startsWith('其他铁路,')).map(row => row.split(','));

test('other railway category covers 41 distinct existing PNGs without assigning unsupported number bands',()=>{
  assert.equal(items.length,41,'review the source inventory when gallery size changes');
  assert.equal(new Set(items.map(row=>row[2])).size,41);
  const expected = {
    'ゆりかもめ':2,
    '函館市電':17,
    '千葉都市モノレール':2,
    '多摩都市モノレール':2,
    '宇都宮ライトレール':1,
    '山万':3,
    '東京モノレール':7,
    '湘南モノレール':7
  };
  const counts = {};
  for(const [category,operator,png,line,min,max,suffix,format,status] of items){
    assert.equal(category,'其他铁路');
    counts[operator] = (counts[operator]||0) + 1;
    assert.ok(fs.existsSync(png),'gallery image is missing: '+png);
    const entry=byPng.get(png);
    assert.ok(entry,'read-only PNG evidence index has no path: '+png);
    assert.equal(entry.operatorDirectory,operator);
    assert.equal((entry.directNumberRules||[]).length,0,
      'a new source must be reviewed before declaring an additional number band: '+png);
    assert.deepEqual([line,min,max,suffix,format,status],
      ['','','','','','无号段'],
      'do not silently promote a car number or unverified timetable into a PNG train-number band: '+png);
  }
  assert.deepEqual(counts,expected);
});

test('the current train-number audit does not confuse vehicle/formation numbers with service numbers',()=>{
  const reviewPngs=items.filter(row => /号車|編成|こあら[1-3]号/.test(row[2]));
  assert.ok(reviewPngs.length>0);
  for(const row of reviewPngs){
    const entry=byPng.get(row[2]);
    assert.equal((entry.directNumberRules||[]).length,0,
      'vehicle-number label is not proof of a train-number mapping: '+row[2]);
    assert.equal(row[8],'无号段');
  }
});
