'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const p10=[
  '西武鉄道_7000系_サステナ車両.png',
  '西武鉄道_8500系_レオライナー.png',
  '西武鉄道_9000系.png',
  '西武鉄道_L00系_れおけい.png',
  '西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png'
].map(name=>'images/列车/西武鉄道/'+name).sort();

const index=JSON.parse(fs.readFileSync(
  'data/audits/png-to-train-number-index-2611.json','utf8'));
const rows=index.pngIndex.filter(x=>p10.includes(x.path));
const gallery=fs.readFileSync('js/train-vehicle.js','utf8');
const garageSource=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
const migration=fs.readFileSync(
  'supabase/migrations/20261121203000_p10_seibu_l00_formation_metadata.sql','utf8');

test('P-10 covers exactly the fixed five Seibu PNGs and invents no number mapping',()=>{
  assert.deepEqual(rows.map(x=>x.path).sort(),p10);
  for(const row of rows){
    assert.equal(row.status,'no_verified_number_mapping',row.path);
    assert.deepEqual(row.directNumberRules,[],row.path);
    assert.deepEqual(row.runtimeNumberRosters,[],row.path);
    assert.deepEqual(row.historicalNumberedSources,[],row.path);
  }
});

test('bare L00 model identity has no formation-specific default artwork',()=>{
  const entry=gallery.match(/"remaining-fleet-extra-6": \{[^\n]+/)[0];
  for(const expected of [
    '"displayName":"西武L00系"',
    '"asset":null',
    '"plannedAsset":null',
    '"lineIds":["SeibuYamaguchi"]',
    '"candidateOnly":true',
    '"promotePlannedAsset":false',
    '"artworkStatus":"generic-model-no-default-artwork"'
  ])assert.ok(entry.includes(expected),expected);
});

test('two L00 artworks remain distinct, review-only formation identities',()=>{
  const second=gallery.match(/\{ id: "seibu-l00-second-formation-review"[^\n]+/)[0];
  const first=gallery.match(/\{ id: "artwork-inventory-227"[^\n]+/)[0];
  for(const expected of [
    '第2編成・西武園ゆうえんちデザイン・2026年度導入予定',
    'asset: null',
    'lineIds: ["SeibuYamaguchi"]',
    'candidateOnly: true',
    'promotePlannedAsset: false',
    'artworkStatus: "future-formation-specific-review"',
    '20260305_LEOLINER'
  ])assert.ok(second.includes(expected),expected);
  for(const expected of [
    '第1編成・埼玉西武ライオンズ',
    'asset: null',
    'lineIds: ["SeibuYamaguchi"]',
    'candidateOnly: true',
    'promotePlannedAsset: false',
    'artworkStatus: "formation-specific-review"',
    '20260327_LEOLINER'
  ])assert.ok(first.includes(expected),expected);
});

test('garage map keeps both L00 liveries out of generic model matching',()=>{
  const window={};
  vm.runInNewContext(garageSource,{window,console});
  const garage=window.VehicleGaragePngMap;
  const blue='../images/列车/西武鉄道/西武鉄道_L00系_れおけい.png';
  const white='../images/列车/西武鉄道/西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png';
  assert.equal(garage.matchModelPath('西武L00系',blue,'SeibuYamaguchi'),false);
  assert.equal(garage.matchModelPath('西武L00系',white,'SeibuYamaguchi'),false);
  assert.match(garageSource,/"seibu-l00-second-formation-review":true/);
  assert.match(garageSource,/"artwork-inventory-227":true/);
});

test('metadata migration changes review identity only',()=>{
  assert.match(migration,/L00系（第2編成・西武園ゆうえんちデザイン）/);
  assert.match(migration,/L00系（第1編成・埼玉西武ライオンズ）/);
  assert.match(migration,/appearance_class='requires_review'/);
  assert.doesNotMatch(migration,/INSERT\s+INTO\s+public\.published_train_png_number_ranges/i);
  assert.doesNotMatch(migration,/DELETE\s+FROM\s+public\.published_train_png_number_ranges/i);
});
