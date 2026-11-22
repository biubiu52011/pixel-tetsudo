'use strict';
// Runtime source, type and direction must be present before a tail-based
// Saikyo/Rinkai vehicle illustration is eligible. No actual carset inference.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root={},ctx=vm.createContext({
 window:root,Date,console:{debug(){},warn(){},log(){},error(){}}
});
for(const file of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/nambu-branch-official.js',
 'data/timetables/joban-e231-h-index.js',
 'data/timetables/jreast-keihin-number-index.js',
 'data/timetables/jreast-yokohama-number-index.js',
 'data/timetables/jreast-yamanote-number-index.js',
 'data/timetables/jreast-regional-number-index.js',
 'data/timetables/train-number-png-ranges.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const match=(n,p)=>root.TrainNumberPngRanges.match(n,'SaikyoKawagoe',p);
const position=(p={})=>({
 positionSource:'realtime-api',estimated:false,
 positionLineId:'SaikyoKawagoe',serviceDate:'2026-11-16',
 calendarType:'weekday',sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
 trainType:'odpt.TrainType:JR-East.Local',
 railDirection:'odpt.RailDirection:Inbound',trainOperator:'JR-East',
 vehicleIdentityStatus:'UNKNOWN',...p
});
test('complete number evidence retains reference-only status',()=>{
 const result=match('1940K',position());
 assert.equal(result?.model,'E233系7000番台');
 assert.equal(result?.planned,true);
 assert.equal(result?.representative,true);
 assert.equal(result?.formationId,undefined);
 assert.equal(match('1974K',position())?.model,'相鉄12000系');
 const pooled=match('1984K',position());
 assert.equal(pooled?.model,'東京臨海高速鉄道71-000形');
 assert.equal(pooled?.illustrative,true);
 assert.equal(pooled?.referenceOnly,true);
 assert.equal(pooled?.formationId,undefined);
 assert.equal(match('1984K',position({serviceDate:'2030-01-01'}))?.model,
  '東京臨海高速鉄道71-000形','composite number pool has no month limit');
});
test('live K/F/S tails fail closed when provenance is incomplete',()=>{
 for(const [label,change] of Object.entries({
  missingSource:{sourceRailway:''},
  foreignSource:{sourceRailway:'odpt.Railway:JR-East.JobanRapid'},
  missingType:{trainType:''},
  wrongType:{trainType:'odpt.TrainType:JR-East.LimitedExpress'},
  missingDirection:{railDirection:''},
  wrongDirection:{railDirection:'odpt.RailDirection:Outbound'},
  conflictingModel:{realtimeVehicleType:'E235系1000番台'}
 })){
  assert.equal(match('1940K',position(change)),null,label);
 }
});
test('SQL positions obey the same provenance guards',()=>{
 const original=position({positionSource:'supabase-train-run',estimated:true});
 assert.equal(match('1940K',original)?.model,'E233系7000番台');
 for(const change of [{sourceRailway:''},{trainType:''},{railDirection:''}]){
  assert.equal(match('1940K',{...original,...change}),null,
   JSON.stringify(change));
 }
});
