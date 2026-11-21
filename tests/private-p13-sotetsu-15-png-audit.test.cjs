'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');

const names=[
  '相模鉄道_10000系_YOKOHAMA_NAVYBLUE.png',
  '相模鉄道_10000系_旧塗装.png',
  '相模鉄道_10000系_相鉄グループカラー_別表示.png',
  '相模鉄道_10000系_相鉄グループカラー.png',
  '相模鉄道_11000系_11003編成_ほほえみ号.png',
  '相模鉄道_11000系_相鉄グループカラー_別表示.png',
  '相模鉄道_11000系_相鉄グループカラー.png',
  '相模鉄道_13000系_YOKOHAMA_NAVYBLUE.png',
  '相模鉄道_20000系_YOKOHAMA_NAVYBLUE.png',
  '相模鉄道_21000系.png',
  '相模鉄道_8000系_YOKOHAMA_NAVYBLUE.png',
  '相模鉄道_8000系_旧塗装.png',
  '相模鉄道_8000系_新塗装_赤帯.png',
  '相模鉄道_8000系_新塗装_緑帯.png',
  '相模鉄道_8000系_赤帯塗装.png'
];
const p13=names.map(name=>'images/列车/相模鉄道/'+name).sort();
const quarantined=new Set([
  'images/列车/相模鉄道/相模鉄道_20000系_YOKOHAMA_NAVYBLUE.png',
  'images/列车/相模鉄道/相模鉄道_21000系.png'
]);

const index=JSON.parse(fs.readFileSync(
  'data/audits/png-to-train-number-index-2611.json','utf8'));
const rows=index.pngIndex.filter(x=>p13.includes(x.path));
const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
const garage=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
const gallery=fs.readFileSync('js/train-vehicle.js','utf8');
const quarantineMigration=fs.readFileSync(
  'supabase/migrations/20261116042000_reconcile_marunouchi_branch_and_quarantine_png.sql','utf8');

test('P-13 covers exactly the fixed 15 Sotetsu PNGs without inventing mappings',()=>{
  assert.deepEqual(rows.map(x=>x.path).sort(),p13);
  for(const row of rows){
    assert.equal(row.status,quarantined.has(row.path)
      ? 'quarantined_visual_identity'
      : 'no_verified_number_mapping',row.path);
    assert.deepEqual(row.directNumberRules,[],row.path);
    assert.deepEqual(row.runtimeNumberRosters,[],row.path);
    assert.deepEqual(row.historicalNumberedSources,[],row.path);
  }
  assert.equal(rows.filter(x=>x.status==='no_verified_number_mapping').length,13);
  assert.equal(rows.filter(x=>x.status==='quarantined_visual_identity').length,2);
});

test('all P-13 files exist and remain registered gallery identities',()=>{
  for(const path of p13){
    assert.ok(fs.existsSync(path),path);
    assert.ok(garage.includes(path.replace('images/列车/','')),path);
    assert.ok(gallery.includes('../'+path),path);
    assert.ok(rows.find(x=>x.path===path).galleryIds.length>0,path);
  }
});

test('none of the P-13 artwork variants is selectable by a number range',()=>{
  for(const path of p13){
    const name=path.split('/').at(-1).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    assert.doesNotMatch(ranges,new RegExp(name),path);
  }
});

test('conflicting 20000 and 21000 labels stay byte-identical and quarantined',()=>{
  const paths=[...quarantined];
  const hashes=paths.map(path=>crypto.createHash('sha256')
    .update(fs.readFileSync(path)).digest('hex'));
  assert.equal(hashes[0],hashes[1]);
  for(const path of paths){
    assert.ok(quarantineMigration.includes("'"+path+"'"),path);
    assert.match(garage,new RegExp(path.split('/').at(-1)
      .replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[^\\n]*identical bytes: Sotetsu'));
  }
});
