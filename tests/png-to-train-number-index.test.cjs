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
 assert.equal(index.summary.catalogRules,423);
 assert.equal(index.summary.imagesInRuntimeRosters,14);
 assert.equal(index.summary.imagesInTobuRuntimeRosters,11);
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
 assert.equal(rows.filter(x=>x.quarantined).length,11);
});
test('catalog numeric bounds never claim every intervening service number',()=>{
 const catalog=JSON.parse(read('data/audits/train-number-png-catalog-2611.json'));
 const all=catalog.rules;
 for(const asset of rows)for(const r of asset.directNumberRules){
   const source=all.find(x=>x.id===r.ruleId);
   assert.ok(source,'missing original rule '+r.ruleId);
   const approvedPaths=[source.png,...Object.values(
     source.runtime_guards?.exactModelArtworkMap||{}).map(p=>
       String(p).replace(/^(?:\.\.\/|\.\/|\/)+/,''))];
   assert.ok(approvedPaths.includes(asset.path),
     'index path is not part of the source rule model artwork map: '+asset.path);
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
test('JR Central Kansai 315 uses only the 251 transcribed exact roster occurrences',()=>{
 const jrc=get('JR東海_315系.png');
 const groups=jrc.runtimeNumberRosters.filter(x=>
   x.lineId==='KansaiCentral'&&x.numberFamily==='ordinary-315');
 assert.equal(groups.length,4);
 assert.equal(groups.reduce((sum,x)=>sum+x.explicitDocumentedNumberCount,0),251);
 assert.deepEqual(groups.map(x=>x.explicitDocumentedNumberCount),[65,62,64,60]);
 assert.equal(index.summary.jrCentralKansai315ExactRosterOccurrences,251);
 for(const group of groups){
   assert.equal(group.authority,'private_unofficial_exact_roster');
   assert.equal(group.actualVehicleConfirmed,false);
   assert.equal(group.exactContiguousBands.reduce((sum,x)=>sum+x.count,0),
     group.explicitDocumentedNumberCount);
 }
});
test('JR Central Chuo uses only the 540 ordinary and 4 Home Liner roster occurrences',()=>{
 const jrc315=get('JR東海_315系.png');
 const ordinary=jrc315.runtimeNumberRosters.filter(x=>
   x.lineId==='ChuoCentral'&&x.numberFamily==='ordinary-315');
 assert.equal(ordinary.length,4);
 assert.deepEqual(ordinary.map(x=>x.explicitDocumentedNumberCount),
   [136,139,132,133]);
 assert.equal(ordinary.reduce((sum,x)=>
   sum+x.explicitDocumentedNumberCount,0),540);
 const jrc383=get('JR東海_383系.png');
 const liners=jrc383.runtimeNumberRosters.filter(x=>
   x.lineId==='ChuoCentral'&&x.numberFamily==='home-liner-383');
 assert.equal(liners.length,2);
 assert.deepEqual(liners.map(x=>x.explicitDocumentedNumberCount),[2,2]);
 assert.equal(index.summary.jrCentralChuo315ExactRosterOccurrences,540);
 assert.equal(index.summary.jrCentralChuo383HomeLinerExactRosterOccurrences,4);
 for(const group of [...ordinary,...liners]){
   assert.equal(group.authority,'private_unofficial_exact_roster');
   assert.equal(group.actualVehicleConfirmed,false);
   assert.equal(group.exactContiguousBands.reduce((sum,x)=>sum+x.count,0),
     group.explicitDocumentedNumberCount);
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
test('Toei 8500 alternative and 8501 Yamabuki share no numbered artwork authorization',()=>{
 for(const name of [
   '都営地下鉄_8500形（別）.png',
   '都営地下鉄_8500形_8501号車_山吹色.png'
 ]){
   const a=get(name);
   assert.ok(a?.quarantined,'duplicate Toei image must be quarantined');
   assert.equal(a.status,'quarantined_visual_identity');
   assert.equal(a.directNumberRules.length,0);
   assert.equal(a.runtimeNumberRosters.length,0);
 }
});
