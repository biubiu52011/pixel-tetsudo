'use strict';
// Third06: two source-only historical routes absent from the runnable rail map.
// No active 2026 timetable or stock inferencing; only original SQL/CSV.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const currentPendingPngCount=fs.readFileSync('data/audits/png-unmapped-source-triage-20261118.csv','utf8').trimEnd().split('\n').length-1;
const read=p=>fs.readFileSync(p,'utf8');
const isumi=read('supabase/migrations/20261118235000_third06_isumi350_20241004_5d_official_historical.sql');
const moka=read('supabase/migrations/20261118235100_third06_moka_c12_6001_6002_official_historical.sql');
const rows=read('data/audits/png-first-number-band-inventory-20261117.csv').trimEnd().split('\n').slice(1);
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const imgs=["images/列车/いすみ鉄道/いすみ鉄道_いすみ350型.png","images/列车/真岡鐵道/真岡鐵道_C12形_C1266_SLもおか.png"];
test('exact official 5D Isumi350 historical derailment number only, Isumi300 still unmapped',()=>{
 const records=rows.filter(x=>x.startsWith('第三部门铁道,いすみ鉄道,'+imgs[0]+','));
 assert.deepEqual(records,['第三部门铁道,いすみ鉄道,'+imgs[0]+',Isumi,0005,0005,D,full,纯号段（2024年10月4日官方事故公告确认いすみ350形351・352担当5D；线路已停运至今，仅历史参考）']);
 assert.match(isumi,/https:\/\/isumirail\.co\.jp\/blog\/archives\/9701/);
 assert.match(isumi,/2024-10-04/);
 assert.match(isumi,/2026-11 Isumi railway line is fully suspended/);
 assert.match(isumi,/asset_scope='generic'/);
 assert.ok(rows.includes('第三部门铁道,いすみ鉄道,images/列车/いすみ鉄道/いすみ鉄道_いすみ300型.png,,,,,,无号段'));
 assert.ok(!triage.includes('"'+imgs[0]+'"'));
});
test('two Moka 6001-6002 services use one precise band and C12 review-only PNG',()=>{
 const records=rows.filter(x=>x.startsWith('第三部门铁道,真岡鐵道,'+imgs[1]+','));
 assert.deepEqual(records,['第三部门铁道,真岡鐵道,'+imgs[1]+',Moka,6001,6002,,full,纯号段（真冈铁道官方SLもおか6001・6002列车及C12 66历史参考；2026年度全面停运、PNG仍review）']);
 assert.match(moka,/moka-railway\.co\.jp\/36255\//);
 assert.match(moka,/moka-railway\.co\.jp\/slmoka-intro\//);
 assert.match(moka,/moka-railway\.co\.jp\/suspension\//);
 assert.match(moka,/asset_scope='review'/);
 assert.match(moka,/2026 FULL SUSPENSION/);
 assert.ok(!triage.includes('"'+imgs[1]+'"'));
});
test('both references are source-only and must not create runtime or broad bands',()=>{
 for(const sql of [isumi,moka]){
  assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
  assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
  assert.match(sql,/Data-only/);
  assert.ok(!sql.includes('CREATE TABLE'));
  assert.equal([...sql.matchAll(/\('2611','(Isumi|Moka)','png_band\/[^']+'\s*,/g)].length,1);
 }
 const pngs=new Set(rows.map(x=>x.split(',')[2]));
 assert.equal(pngs.size,601);
 const missing=rows.filter(x=>x.endsWith('无号段'));
 assert.equal(missing.length,currentPendingPngCount);
});
