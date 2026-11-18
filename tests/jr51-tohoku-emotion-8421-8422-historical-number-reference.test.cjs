'use strict';
// JR51: TOHOKU EMOTION, historical 2026 Hachinohe numbers only.
// Source: https://hop-step-back.hatenablog.com/entry/2026/09/25/000000
// Do NOT interpret this check as actual November 2026 trainset verification.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const sql=read('supabase/migrations/20261118164000_jr51_hachinohe_tohoku_emotion_8421_8422_historical_refs.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/JR東日本/JR東日本_キハ110系_TOHOKU_EMOTION.png';
test('verified consecutive historical numbers compress to one Hachinohe D-band',()=>{
 const rows=csv.trimEnd().split('\n').filter(line=>line.includes(png));
 assert.deepEqual(rows,[
  'JR,JR東日本,'+png+',Hachinohe,8421,8422,D,full,纯号段（2026年6月TOHOKU EMOTION 8421D/8422D历史参考；不是2026年11月当日车辆确认）'
 ]);
 assert.match(sql,/png_band\/Hachinohe\/8421-8422D/);
 assert.match(sql,/8421,8422,'D',NULL/);
 assert.ok(!sql.includes('8420-')&&!sql.includes('8423-'));
 assert.equal((sql.match(/\('2611','Hachinohe','png_band\/Hachinohe\/8421-8422D'/g)||[]).length,1);
});
test('JR51 must remain an illustration reference, never physical vehicle authority',()=>{
 assert.match(sql,/2026-11 train timetable evidence, NOT a live carset/);
 assert.match(sql,/asset_scope='review'/);
 assert.match(sql,/appearance_class='dedicated_vehicle_identity'/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!triage.includes('"'+png+'"'));
 assert.equal(new Set(csv.trimEnd().split('\n').slice(1).map(row=>{
  const match=row.match(/^([^,]+),([^,]+),(images\/列车\/[^,]+),/);
  return match?.[3] || '';
 })).size,601);
});
