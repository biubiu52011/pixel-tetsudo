'use strict';
// Private18: summer-2026 historical Tobu Sky Tree Train reference,
// not a real-day vehicle-identity assertion or November rendering grant.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118131000_private18_tobu_634_skytree_5181_5182_historical_reference.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const png='images/列车/東武鉄道/東武鉄道_634型_スカイツリートレイン.png';
const refs=[
 ['TobuNikko',5181,5182],
 ['TobuSkytree',5182,5182],
];
test('official summer 634 train numbers are exact, safely scoped reference rows',()=>{
 assert.match(sql,/20260617101307S58bkJR6rTPBgknijenx1A\.pdf/);
 assert.match(sql,/July 18\/20, August 8\/11\/15, 2026/);
 const rows=[...sql.matchAll(/\('2611','(TobuNikko|TobuSkytree)','png_band\/[^']+',([0-9]+),([0-9]+),'',NULL,'\.\.\/images\/列车\/東武鉄道\/東武鉄道_634型_スカイツリートレイン\.png',NULL,FALSE,FALSE\)/g)];
 assert.equal(rows.length,3,'two Nikko singleton references, one Skytree');
 assert.deepEqual(rows.map(m=>[m[1],+m[2],+m[3]]),[
  ['TobuNikko',5181,5181],['TobuNikko',5182,5182],['TobuSkytree',5182,5182],
 ]);
 assert.ok(!rows.some(m=>[1262,1263].includes(+m[2])));
 assert.match(sql,/same train numbers are officially used for N100 SPACIA X/);
 assert.match(sql,/asset_scope='review'/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.ok(!sql.includes('CREATE TABLE'));
});
test('one gallery PNG appears as two losslessly compacted scoped inventory rows',()=>{
 const lines=csv.trimEnd().split('\n');
 const rows=lines.filter(s=>s.startsWith('私铁,東武鉄道,'+png+',')).map(s=>s.split(','));
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(r=>[r[3],+r[4],+r[5],r[6],r[7]]),
  refs.map(([line,start,end])=>[line,start,end,'','full']));
 assert.ok(rows.every(r=>r[8].includes('历史临时番号')));
 assert.equal(new Set(lines.slice(1).map(s=>s.split(',')[2])).size,601);
 const pendingGallery=new Set(lines.slice(1).filter(s=>s.endsWith(',无号段')).map(s=>s.split(',')[2]));
 const pendingTriage=new Set(triage.trimEnd().split('\n').slice(1).map(s=>s.split('","')[2]));
 assert.deepEqual([...pendingTriage].sort(),[...pendingGallery].sort());
 assert.ok(!triage.includes('"'+png+'"'));

});
test('gallery review image remains unverified for automatic train PNG rendering',()=>{
 const entry=index.pngIndex.find(x=>x.path===png);
 assert.ok(entry);
 assert.equal(entry.quarantined,false);
 assert.deepEqual(entry.lineScopes.sort(),['TobuNikko','TobuSkytree'].sort());
 assert.equal(entry.directNumberRules.length,0);
 assert.equal(entry.runtimeNumberRosters.length,0);
 assert.equal(entry.historicalNumberedSources.length,0);
 assert.match(sql,/no new auto-render authorization/);
 assert.match(sql,/Not Nov 2026 or a live consist/);
});
