'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const p09=[
  '西武鉄道_10000系_レッドアロークラシック.png',
  '西武鉄道_101系.png',
  '西武鉄道_20000系_標準塗装.png',
  '西武鉄道_2000系_ツートンカラー.png',
  '西武鉄道_2000系_黄色塗装.png',
  '西武鉄道_2000系_西武鉄道創立110周年記念トレイン.png',
  '西武鉄道_30000系_スマイルトレイン.png',
  '西武鉄道_40000系_トキイロ.png',
  '西武鉄道_40000系_青帯.png',
  '西武鉄道_40000系_赤帯.png',
  '西武鉄道_4000系_赤白塗装.png',
  '西武鉄道_4000系_白塗装.png',
  '西武鉄道_40050系_緑帯.png',
  '西武鉄道_6000系_標準塗装.png',
  '西武鉄道_6000系_副都心線対応車.png'
].map(name=>'images/列车/西武鉄道/'+name).sort();

const index=JSON.parse(fs.readFileSync(
  'data/audits/png-to-train-number-index-2611.json','utf8'));
const rows=index.pngIndex.filter(x=>p09.includes(x.path));
const gallery=fs.readFileSync('js/train-vehicle.js','utf8');
const garage=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
const migration=fs.readFileSync(
  'supabase/migrations/20261121124500_p09_seibu_review_asset_metadata.sql','utf8');

test('P-09 covers exactly the fixed 15 Seibu PNGs and invents no number mapping',()=>{
  assert.deepEqual(rows.map(x=>x.path).sort(),p09);
  for(const row of rows){
    assert.equal(row.status,'no_verified_number_mapping',row.path);
    assert.deepEqual(row.directNumberRules,[],row.path);
    assert.deepEqual(row.runtimeNumberRosters,[],row.path);
    assert.deepEqual(row.historicalNumberedSources,[],row.path);
  }
});

test('Tokiiro is not mislabeled or selectable as Seibu 40000 series',()=>{
  const entry=gallery.match(/\{ id: "artwork-inventory-222"[^\n]+/)[0];
  for(const expected of [
    '西武トキイロ（形式未公表・2027年春予定）',
    'asset: null',
    'lineIds: ["SeibuShinjuku"]',
    'candidateOnly: true',
    'promotePlannedAsset: false',
    'artworkStatus: "future-model-unverified"',
    'plannedOnly: true',
    '20260219_TOKIIRO'
  ])assert.ok(entry.includes(expected),expected);
  assert.doesNotMatch(entry,/displayName: "[^\n"]*40000系/);
  assert.match(garage,/row\[1\]="西武トキイロ（形式未公表・2027年春予定）"/);
  assert.match(garage,/"artwork-inventory-222":true/);
});

test('legacy 2000 two-tone filename remains quarantined from model promotion',()=>{
  const entry=gallery.match(/\{ id: "artwork-inventory-220"[^\n]+/)[0];
  for(const expected of [
    'asset: null',
    'candidateOnly: true',
    'promotePlannedAsset: false',
    'artworkStatus: "model-label-conflict"',
    'plannedOnly: true',
    'encyclopedia/designtrain'
  ])assert.ok(entry.includes(expected),expected);
  assert.match(garage,/"artwork-inventory-220":true/);
});

test('metadata migration only quarantines the two conflicting assets',()=>{
  assert.match(migration,/vehicle_type='トキイロ（形式未公表）'/);
  assert.match(migration,/appearance_class='requires_review'/);
  assert.match(migration,/asset_status='review'/);
  assert.doesNotMatch(migration,/INSERT\s+INTO\s+public\.published_train_png_number_ranges/i);
  assert.doesNotMatch(migration,/DELETE\s+FROM\s+public\.published_train_png_number_ranges/i);
});
