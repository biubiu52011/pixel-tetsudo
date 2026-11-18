'use strict';
// 2026-11 Saikyo/Kawagoe number -> approved PNG -> actual train-marker.
// No K/F/S tail or Osaki handover may stand in for a physical carset.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root={};
const context=vm.createContext({
 window:root,Date,console:{debug(){},warn(){},log(){},error(){}},
 _isTrainArtworkFailureActive(){return false}
});
for(const file of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start,'SVG marker selector must exist');
vm.runInContext(render.slice(start,end),context,{filename:'js/trains-render.js:marker'});

const e233='../images/列车/JR東日本/JR東日本_E233系_7000番台.png';
const s12000='../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png';
const twr70='../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png';
const twr71='../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_71-000形.png';
const model70='東京臨海高速鉄道70-000形';
const model71='東京臨海高速鉄道71-000形';
const saikyo=(no,fields={})=>({
 trainNumber:no,trainId:'odpt:train:'+no,
 positionLineId:'SaikyoKawagoe',displayLineId:'SaikyoKawagoe',
 sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
 trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local',
 railDirection:/[02468][KFS]$/.test(no)?'odpt.RailDirection:Inbound':
  'odpt.RailDirection:Outbound',
 serviceDate:'2026-11-18',calendarType:'weekday',
 positionSource:'realtime-api',estimated:false,
 vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
 ...fields
});
const rinkai=(no,fields={})=>({
 ...saikyo(no),positionLineId:'Rinkai',displayLineId:'Rinkai',
 sourceRailway:'odpt.Railway:TWR.Rinkai',trainOperator:'TWR',
 trainType:'odpt.TrainType:TWR.Local',...fields
});
const mark=(p,line)=>context._trainMarkerSpec(p,p.trainId,line);

test('native Saikyo train numbers 510S / 759K / 1974K draw the scoped planned PNG',()=>{
 for(const [p,png] of [
  [saikyo('510S',{trainType:'odpt.TrainType:JR-East.CommuterRapid'}),e233],
  [saikyo('759K'),e233],
  [saikyo('1974K'),s12000]
 ]){
  const m=mark(p,'SaikyoKawagoe');
  assert.equal(m.kind,'vehicle',p.trainNumber);
  assert.equal(m.iconSrc,png,p.trainNumber);
  assert.equal(m.planned,true);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN','do not claim actual carset');
 }
 const sql=saikyo('510S',{estimated:true,positionSource:'supabase-train-run'});
 assert.equal(mark(sql,'SaikyoKawagoe').iconSrc,e233);
});

test('actual JR-East ODPT Saikyo feed uses Northbound/Southbound, not Inbound/Outbound',()=>{
 // Real field shapes observed from JR-East odpt:Train on 2026-11-18:
 // 1263K/1233F head north; 1236K/1264F head south.
 // Only the Saikyo source direction vocabulary is adapted.
 for(const [number,direction,trainType] of [
  ['1263K','Northbound','Local'],
  ['1233F','Northbound','Rapid'],
  ['1236K','Southbound','Local'],
  ['1264F','Southbound','Rapid']
 ]){
  const p=saikyo(number,{
   railDirection:'odpt.RailDirection:'+direction,
   trainType:'odpt.TrainType:JR-East.'+trainType
  });
  const sourceMatch=root.TrainNumberPngRanges.match(number,'SaikyoKawagoe',p);
  assert.equal(sourceMatch?.pngPath,e233,number+' ODPT range');
  assert.equal(mark(p,'SaikyoKawagoe').iconSrc,e233,
   number+' must reach the production SVG selector');
  assert.equal(mark({...p,railDirection:direction},'SaikyoKawagoe').iconSrc,e233,
   'DataFusion removes the ODPT direction prefix');
  const opposite=direction==='Northbound'?'Southbound':'Northbound';
  assert.equal(mark({...p,railDirection:opposite},'SaikyoKawagoe').kind,
   'unresolved','reversed route direction must not pass');
  assert.equal(mark({...p,sourceRailway:'odpt.Railway:JR-East.JobanRapid'},
   'SaikyoKawagoe').kind,'unresolved',
   'source-provenance boundary stays enforced');
 }
 // Public operation number 87 by itself cannot identify 70-000 vs 71-000.
 const mixed=saikyo('1287K',{railDirection:'Northbound'});
 assert.equal(mark(mixed,'SaikyoKawagoe').kind,'unresolved',
  'mixed 80-91 family requires model evidence');
 // TWR's separate source direction convention is never silently rewritten.
 const twr=rinkai('1263K',{railDirection:'Northbound'});
 assert.equal(mark(twr,'Rinkai').kind,'unresolved');
});

test('TWR 683S / 1984K chooses 70-000 or 71-000 only with an explicit source model',()=>{
 for(const [number,model,png] of [
  ['683S',model70,twr70],['1984K',model71,twr71]
 ]){
  const p=saikyo(number,{realtimeVehicleType:model});
  assert.equal(mark(p,'SaikyoKawagoe').iconSrc,png);
  assert.equal(mark(saikyo(number),'SaikyoKawagoe').kind,'unresolved',
   'number family alone is not a 70/71 formation');
  assert.equal(mark(saikyo(number,{realtimeVehicleType:model,
   realtimeDerivedVehicleType:model===model70?model71:model70}),
   'SaikyoKawagoe').kind,'unresolved','conflicting labels fail closed');
 }
});

test('Osaki sourced Rinkai -> Saikyo through-boundary may retain its OWN approved PNG',()=>{
 const own=rinkai('1984K',{realtimeVehicleType:model70});
 const atBoundary={...own,stationId:'Osaki',fusionLineId:'Rinkai',
  fusionRole:'through-boundary'};
 const match=root.TrainVehicle.lookupTrainNumberRangePng({...atBoundary,
  displayLineId:'SaikyoKawagoe'});
 assert.equal(match?.pngPath,twr70);
 const marker=mark(atBoundary,'SaikyoKawagoe');
 assert.equal(marker.kind,'vehicle');
 assert.equal(marker.iconSrc,twr70);
 assert.equal(marker.planned,true);
 assert.equal(marker.illustrative,false);
 assert.equal(own.vehicleIdentityStatus,'UNKNOWN');
});

test('reverse Osaki Saikyo -> Rinkai handover retains the original scoped JR asset',()=>{
 const atBoundary=saikyo('510S',{stationId:'Osaki',fusionLineId:'SaikyoKawagoe',
  fusionRole:'through-boundary',trainType:'odpt.TrainType:JR-East.CommuterRapid'});
 assert.equal(mark(atBoundary,'Rinkai').iconSrc,e233);
});

test('arbitrary cross-line reuse, absent type/direction and unsupported formations remain neutral',()=>{
 const valid=rinkai('1984K',{stationId:'Osaki',fusionLineId:'Rinkai',
  fusionRole:'through-boundary',realtimeVehicleType:model70});
 for(const change of [
  {fusionRole:'extension'},{fusionRole:'shared-track'},
  {fusionLineId:'SaikyoKawagoe'},{stationId:'Oimachi'},
  {sourceRailway:'odpt.Railway:JR-East.Joban'},
  {trainType:''},{railDirection:''},
  {realtimeVehicleType:'東京臨海高速鉄道72-000形'},
  {serviceDate:'2026-12-01'}
 ]){
  assert.equal(mark({...valid,...change},'SaikyoKawagoe').kind,'unresolved',
   JSON.stringify(change));
 }
 assert.equal(mark(saikyo('1984K'),'SaikyoKawagoe').kind,'unresolved');
 assert.equal(mark(saikyo('1940K',{trainType:''}),'SaikyoKawagoe')
  .unresolvedReason,'missing-published-train-type');
 assert.equal(mark(saikyo('1940K',{railDirection:''}),'SaikyoKawagoe')
  .unresolvedReason,'missing-source-rail-direction');
 assert.equal(mark(saikyo('1984K'),'SaikyoKawagoe').unresolvedReason,
  'rinkai-70-000-71-000-model-unverified');
});
