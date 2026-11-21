'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const p12=[
  '富士急行_8000系_フジサン特急_顔B.png',
  '富士急行_8500系_富士山ビュー特急_赤色.png',
  '富士急行_8500系_富士山ビュー特急_茶色.png'
].map(name=>'images/列车/富士急行/'+name).sort();

const index=JSON.parse(fs.readFileSync(
  'data/audits/png-to-train-number-index-2611.json','utf8'));
const rows=index.pngIndex.filter(x=>p12.includes(x.path));
const assetSeed=fs.readFileSync(
  'supabase/migrations/20261117120000_seed_private_gallery_missing_24_review_assets_2611.sql',
  'utf8');
const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
const garage=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
const gallery=fs.readFileSync('js/train-vehicle.js','utf8');

test('P-12 covers exactly the fixed three Fujikyu PNGs and invents no number mapping',()=>{
  assert.deepEqual(rows.map(x=>x.path).sort(),p12);
  for(const row of rows){
    assert.equal(row.status,'no_verified_number_mapping',row.path);
    assert.deepEqual(row.directNumberRules,[],row.path);
    assert.deepEqual(row.runtimeNumberRosters,[],row.path);
    assert.deepEqual(row.historicalNumberedSources,[],row.path);
  }
});

test('all P-12 PNGs are registered as review assets and gallery identities',()=>{
  for(const path of p12){
    assert.ok(assetSeed.includes("('"+path+"'"),path);
    assert.ok(garage.includes(path.replace('images/列车/','')),path);
    assert.ok(gallery.includes('../'+path),path);
  }
  assert.match(assetSeed,/'review','review','requires_review'/);
});

test('existing Fujisan Express scope stays on face A as an illustrative reference',()=>{
  assert.match(ranges,/from:701,to:794[\s\S]*publishedNumbers:\["701","702","703","704","705","793","794"\]/);
  assert.match(ranges,/does not select face A\/B, a formation number, or today's actual car/);
  assert.match(ranges,/from:701,to:794[\s\S]*富士急行_8000系_フジサン特急_顔A\.png/);
});

test('none of the P-12 artwork variants is selectable by a number range',()=>{
  for(const path of p12){
    const name=path.split('/').at(-1).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    assert.doesNotMatch(ranges,new RegExp(name),path);
  }
});
