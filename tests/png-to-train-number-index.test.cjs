'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {buildIndex}=require('../tools/build-png-to-train-number-index.cjs');

const read=p=>fs.readFileSync(p,'utf8');
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const rows=index.pngIndex;
const get=substr=>rows.find(x=>x.path.endsWith(substr));

test('PNG-first number index reproduces original sources, no new mapping authority',()=>{
 const actual=buildIndex({
   garageSource:read('data/timetables/vehicle-garage-png-map.js'),
   rangesSource:read('data/timetables/train-number-png-ranges.js'),
   catalog:JSON.parse(read('data/audits/train-number-png-catalog-2611.json')),
   datedSource:JSON.parse(read('data/audits/train-png-dated-source-links-2611.json'))
 });
 assert.equal(JSON.stringify(index),JSON.stringify(actual));
 assert.equal(index.summary.galleryPng,601);
 assert.equal(index.summary.catalogRules,421);
 assert.equal(rows.length,new Set(rows.map(x=>x.path)).size);
 assert.equal(index.summary.missingPhysicalPngReferences,0);
});
test('every indexed PNG is physical, quarantine remains blocked',()=>{
 for(const asset of rows){
   assert.match(asset.path,/^images\/列车\/.+\.png$/);
   assert.ok(fs.existsSync(asset.path),'missing physical PNG: '+asset.path);
   if(asset.quarantined)
     assert.equal(asset.status,'quarantined_visual_identity');
   assert.ok(asset.directNumberRules.every(r=>r.actualVehicleConfirmed===false));
   assert.ok(asset.runtimeNumberRosters.every(r=>
     r.referenceOnly===true && r.illustrative===true &&
     r.actualVehicleConfirmed===false));
   assert.ok(asset.historicalNumberedSources.every(r=>
     r.referenceOnly===true && r.actualVehicleConfirmed===false));
 }
 assert.equal(rows.filter(x=>x.quarantined).length,9);
});
test('catalog numeric bounds never claim every intervening service number',()=>{
 const catalog=JSON.parse(read('data/audits/train-number-png-catalog-2611.json'));
 const all=catalog.rules;
 for(const asset of rows)for(const r of asset.directNumberRules){
   const source=all.find(x=>x.id===r.ruleId);
   assert.ok(source,'missing original rule '+r.ruleId);
   assert.equal(source.png,asset.path);
   assert.equal(r.minNumber,source.min);
   assert.equal(r.maxNumber,source.max);
   assert.equal(r.requiresExactRoster,source.requires_exact_roster===true);
   assert.equal(r.grade==='guarded_number_bounds_only',
     !r.explicitDocumentedNumberCount&&r.minNumber!==r.maxNumber);
 }
});
test('Tobu Skytree SPACIA X and Nikko source-owned exact rosters are preserved',()=>{
 const x=get('東武鉄道_N100系_SPACIA_X.png');
 assert.ok(x);
 assert.ok(x.runtimeNumberRosters.length>=4);
 for(const g of x.runtimeNumberRosters){
   assert.equal(g.numberFamily,'spacia_x');
   assert.ok(['TobuSkytree','TobuNikko'].includes(g.lineId));
   assert.ok(['weekday','holiday'].includes(g.calendarType));
   assert.ok(g.exactContiguousBands.length>0);
   assert.equal(g.exactContiguousBands.reduce((sum,x)=>sum+x.count,0),
     g.explicitDocumentedNumberCount,
     'exhaustive exact islands; cannot synthesize holes');
 }
});
test('historical dated schedule sources are not turned into current-number bands',()=>{
 const metro=get('東京メトロ_16000系.png');
 const e233=get('JR東日本_E233系_2000番台.png');
 assert.ok(metro?.historicalNumberedSources.length);
 assert.ok(e233?.historicalNumberedSources.length);
 for(const a of [metro,e233]){
   for(const r of a.historicalNumberedSources){
     assert.equal(r.explicitServiceDateNumberCount,0);
     assert.equal(r.sourceRevisionDate,'2026-07-06');
   }
 }
 const saikyo=get('JR東日本_E233系_7000番台.png');
 assert.ok(saikyo.historicalNumberedSources.some(x=>
   x.explicitServiceDateNumberCount===2));
});
