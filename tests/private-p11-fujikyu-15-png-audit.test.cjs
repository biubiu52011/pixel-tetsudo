'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const p11=[
  '富士急行_1000系_旧塗装_水色.png',
  '富士急行_1000系_青色.png',
  '富士急行_1000系_赤白塗装.png',
  '富士急行_1000系_富士登山電車_別面.png',
  '富士急行_1000系_富士登山電車.png',
  '富士急行_2000系_フジサン特急_顔A_パノラマ車.png',
  '富士急行_2000系_フジサン特急_顔A_非パノラマ車.png',
  '富士急行_2000系_フジサン特急_顔B_パノラマ車.png',
  '富士急行_2000系_フジサン特急_顔B_非パノラマ車.png',
  '富士急行_5000形_トーマスランド号.png',
  '富士急行_5000形_標準色.png',
  '富士急行_6000系_マッターホルン号.png',
  '富士急行_6000系_リサとガスパールトレイン.png',
  '富士急行_6000系_紫色ラッピング.png',
  '富士急行_6000系_赤色塗装.png'
].map(name=>'images/列车/富士急行/'+name).sort();

const index=JSON.parse(fs.readFileSync(
  'data/audits/png-to-train-number-index-2611.json','utf8'));
const rows=index.pngIndex.filter(x=>p11.includes(x.path));
const assetSeed=fs.readFileSync(
  'supabase/migrations/20261117120000_seed_private_gallery_missing_24_review_assets_2611.sql',
  'utf8');
const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
const gallery=fs.readFileSync('js/train-vehicle.js','utf8');

test('P-11 covers exactly the fixed 15 Fujikyu PNGs and invents no number mapping',()=>{
  assert.deepEqual(rows.map(x=>x.path).sort(),p11);
  for(const row of rows){
    assert.equal(row.status,'no_verified_number_mapping',row.path);
    assert.deepEqual(row.directNumberRules,[],row.path);
    assert.deepEqual(row.runtimeNumberRosters,[],row.path);
    assert.deepEqual(row.historicalNumberedSources,[],row.path);
  }
});

test('all P-11 PNGs are already registered as review assets',()=>{
  for(const path of p11){
    assert.ok(assetSeed.includes("('"+path+"'"),path);
  }
  assert.match(assetSeed,/asset_status,\r?\n\s+asset_scope/);
  assert.match(assetSeed,/'review','review','requires_review'/);
});

test('existing Fujikyu number scopes remain on out-of-batch generic references',()=>{
  assert.match(ranges,/from:1,to:52[\s\S]*富士急行_6000系_標準色\.png/);
  assert.match(ranges,/from:701,to:794[\s\S]*富士急行_8000系_フジサン特急_顔A\.png/);
  for(const path of p11){
    const name=path.split('/').at(-1).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    assert.doesNotMatch(ranges,new RegExp(name),path);
  }
});

test('2000-series face labels remain artwork variants, not formation inference',()=>{
  assert.match(gallery,/顔A\/顔B[^\n]+画像差分[^\n]+2001F\/2002F/);
  assert.match(gallery,/への推定は行わない/);
});
