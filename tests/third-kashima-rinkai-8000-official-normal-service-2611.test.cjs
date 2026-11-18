'use strict';
// Third05: 2026-07-21 official Kashima Rinkai Railway press notice
// says these full train numbers NORMALLY use 8000 stock; substitution with
// 6000 during 2026-08-03..09-20 was explicitly possible. Source-only, not
// a dated physical carset assignment or a new production railway renderer.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const migration='supabase/migrations/20261118122000_third05_oarai_kashima_8000_official_normal_service_refs.sql';
const sql=fs.readFileSync(migration,'utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const triage=fs.readFileSync('data/audits/png-unmapped-source-triage-20261118.csv','utf8');
const index=JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json','utf8'));
const png='images/列车/鹿島臨海鉄道/鹿島臨海鉄道_8000形.png';
const target='第三部门铁道,鹿島臨海鉄道,'+png+',';
const records=csv.trimEnd().split('\n').slice(1);
const rows=records.filter(x=>x.startsWith(target)).map(x=>x.split(','));
const numbers=[116,179,1131,1156,1157,1172,1173,1178,2117,2130];
const spans=[[116,116],[179,179],[1131,1131],[1156,1157],[1172,1173],[1178,1178],[2117,2117],[2130,2130]];

test('exact ten official full D train numbers compact into eight gap-free bands',()=>{
 assert.deepEqual(rows.map(x=>[+x[4],+x[5]]),spans);
 assert.equal(rows.length,8);
 for(const row of rows){
  assert.equal(row.length,9);
  assert.equal(row[3],'OaraiKashima');
  assert.equal(row[6],'D');
  assert.equal(row[7],'full');
  assert.match(row[8],/官网常用8000形/);
  assert.match(row[8],/可能临时改用6000形/);
 }
 const union=spans.flatMap(([a,b])=>Array.from({length:b-a+1},(_,i)=>a+i));
 assert.deepEqual(union,numbers);
 for(const [a,b] of spans){
  const label='png_band/OaraiKashima/'+String(a).padStart(4,'0')+'-'+String(b).padStart(4,'0')+'D';
  assert.ok(sql.includes(label),'expected official singleton/adjacent interval '+label);
 }
 assert.ok(!sql.includes('1131,1178'),'no broad heuristic number ranges');
 assert.ok(!sql.includes('116,2130'),'do not fill between non-consecutive numbers');
 assert.match(sql,/https:\/\/www\.rintetsu\.co\.jp\/14034\.html/);
 assert.match(sql,/2026-08-03 through/);
 assert.match(sql,/NOT establish stock on 2026-11-18/);
});

test('new data-only source key is not JR Kashima or runtime stock authorization',()=>{
 assert.match(sql,/line_key='OaraiKashima'/);
 assert.match(sql,/data-only railway reference key|DATA-ONLY railway reference key/);
 assert.match(sql,/JR-East's distinct line_key Kashima/);
 assert.ok(!sql.includes("'2611','Kashima','png_band/"));
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes('UPDATE public.vehicle_image_assets'));
 const inserts=[...sql.matchAll(/\('2611','OaraiKashima','png_band\/OaraiKashima\/[^']+',\d+,\d+,'D',NULL,'\.\.\/images\/列车\/鹿島臨海鉄道\/鹿島臨海鉄道_8000形\.png',NULL,FALSE,FALSE\)/g)];
 assert.equal(inserts.length,8);
 assert.match(sql,/asset_scope='generic'/);
 assert.match(sql,/source_url IS NULL/);
 assert.match(sql,/actual_vehicle_confirmed=FALSE/);
 assert.ok(!sql.includes("6000形_新塗装.png"));
 assert.ok(!sql.includes("6000形_標準色.png"));
 const asset=index.pngIndex.find(x=>x.path===png);
 assert.ok(asset);
 assert.equal(asset.quarantined,false);
 assert.equal(asset.directNumberRules.length,0,
  'historical source-only SQL does not silently grant runtime vehicle authority');
});

test('gallery and evidence triage contain 601 PNG with 474 remaining missing',()=>{
 assert.equal(records.length,5578);
 assert.equal(new Set(records.map(x=>x.split(',')[2])).size,601);
 assert.equal(records.filter(x=>x.endsWith(',无号段')).length,474);
 assert.equal(triage.trimEnd().split('\n').length-1,475);
 assert.ok(!triage.includes('"'+png+'"'));
 for(const color of ['鹿島臨海鉄道_6000形_新塗装.png','鹿島臨海鉄道_6000形_標準色.png']){
  assert.ok(triage.includes(color),'unproven livery stays unmapped');
 }
});
