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
  {realtimeVehicleType:'東京臨海高速鉄道72-000形'}
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

test('short TWR 70-000/71-000 labels select correct PNG end-to-end',()=>{
  for(const [number,shortLabel,fullLabel,png] of [
    ['683S','70-000形',model70,twr70],
    ['1984K','71-000形',model71,twr71],
    ['584T','71-000形',model71,twr71],
    ['1088T','70-000形',model70,twr70]
  ]){
    const direction=/[02468][KFST]$/.test(number)?'Inbound':'Outbound';
    const base=rinkai(number,{
      realtimeVehicleType:shortLabel,
      railDirection:'odpt.RailDirection:'+direction
    });
    assert.equal(root.TrainNumberPngRanges.match(number,'Rinkai',base)?.model,
      fullLabel,'short model must resolve canonically: '+number);
    const spec=mark(base,'Rinkai');
    assert.equal(spec.kind,'vehicle',number);
    assert.equal(spec.iconSrc,png,number);
    assert.equal(spec.planned,true,number);
    const consistent=mark({...base,realtimeDerivedVehicleType:fullLabel},'Rinkai');
    assert.equal(consistent.iconSrc,png,'short/full names are same model');
    const conflicting=mark({...base,realtimeDerivedVehicleType:
      fullLabel===model70?model71:model70},'Rinkai');
    assert.equal(conflicting.kind,'unresolved',
      'different models must not select an arbitrary PNG');
    assert.equal(mark({...base,sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'},
      'Rinkai').kind,'unresolved','TWR source scope is mandatory');
  }
});

test('Rinkai T number display defaults preserve both existing illustrations',()=>{
  for(const [number,png,direction] of [
    ['584T',twr70,'Inbound'],['1088T',twr71,'Inbound'],
    ['583T',twr70,'Outbound'],['1689T',twr71,'Outbound']
  ]){
    const p=rinkai(number,{
      realtimeVehicleType:'',railDirection:'odpt.RailDirection:'+direction
    });
    const spec=mark(p,'Rinkai');
    assert.equal(spec.kind,'vehicle',number);
    assert.equal(spec.iconSrc,png,number);
    assert.equal(spec.planned,true,number);
    assert.equal(spec.illustrative,true,number);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN',number);
  }
  const missing=rinkai('1080T',{railDirection:'odpt.RailDirection:Inbound'});
  assert.equal(mark(missing,'Rinkai').kind,'unresolved');
  assert.equal(root.TrainVehicle.diagnoseSaikyoRinkaiArtwork(
    missing,'Rinkai'),'rinkai-t-number-calendar-type-or-model-unresolved');
  assert.equal(mark(rinkai('1088T',{
    railDirection:'odpt.RailDirection:Inbound',serviceDate:'2026-12-01'
  }),'Rinkai').kind,'unresolved','old edition must not leak forward');
});

test('dated TWR 70-000/71-000 observations accept full K/F/S/T numbers and both parity halves',()=>{
 const p=root.TRAIN_OPERATION_EVIDENCE_PROVIDERS.find(x=>
  x.id==='loo-ool-saikyo-dated-formations');
 assert.ok(p,'existing dated Saikyo/Rinkai roster provider');
 const expected=[
  ['580T','81','Z2',model70],['581T','81','Z2',model70],
  ['682S','83','Z7',model70],['683S','83','Z7',model70],
  ['1084F','85','Z12',model71],['1085F','85','Z12',model71],
  ['1984K','85','Z12',model71],['1985K','85','Z12',model71],
  ['1888T','89','Z11',model71],['1889T','89','Z11',model71],
  ['990T','91','Z3',model70],['991T','91','Z3',model70]
 ];
 for(const date of ['2026-04-03','2026-04-04']){
  const ctx={lineId:'Rinkai',operator:'TWR',
   railway:'odpt.Railway:TWR.Rinkai',serviceDate:date};
  for(const [number,operation,formation,model] of expected){
   const e=root.TrainOperationEvidence.resolveEvidence(number,ctx,'fallback');
   assert.ok(e,date+' '+number);
   assert.equal(e.vehicleType,model,date+' '+number);
   assert.equal(e.operationCode,operation,date+' '+number);
   assert.equal(e.formationId,formation,date+' '+number);
   assert.equal(e.observedDate,date);
   assert.equal(e.grade,'C','dated observation, not a permanent carset rule');
  }
 }
 for(const number of ['636T','1985M','1080T','1977M','1985X']){
  assert.equal(p.resolveEvidence(number,{
   lineId:'Rinkai',serviceDate:'2026-04-03'}),null,
   'no unrelated/unverified full train number: '+number);
 }
 for(const date of ['2026-04-02','2026-04-05','2026-11-18']){
  assert.equal(p.resolveEvidence('1985K',{
   lineId:'Rinkai',serviceDate:date}),null,
   'the April carset must not leak into another operating date');
 }
});

test('dated TWR number evidence reaches the canonical timetable vehicle PNG resolver',()=>{
 function resolved(number,date){
  const run={trainNumber:number,timetableIdentity:'test:'+number+':'+date,
   destinationStationUrn:'odpt.Station:TWR.Rinkai.Shin-Kiba',
   railDirection:'odpt.RailDirection:Inbound',
   trainType:'odpt.TrainType:TWR.Local',calendar:'odpt.Calendar:Weekday'};
  const tt={'odpt:operator':'odpt.Operator:TWR',
   'odpt:railway':'odpt.Railway:TWR.Rinkai',
   'odpt:trainType':'odpt.TrainType:TWR.Local',
   'odpt:calendar':'odpt.Calendar:Weekday',
   'odpt:trainTimetableObject':[],
   'odpt:originStation':['odpt.Station:TWR.Rinkai.Osaki'],
   'odpt:destinationStation':['odpt.Station:TWR.Rinkai.Shin-Kiba'],
   _positionSource:'train-timetable',_serviceDate:date};
  return root.TrainVehicle.resolveTimetableRun(run,tt,'Rinkai',
   {operator:'TWR'}).vehicleResult;
 }
 for(const date of ['2026-04-03','2026-04-04']){
  for(const [no,name,png] of [
   ['580T',model70,twr70],['1985K',model71,twr71],
   ['1984K',model71,twr71],['1889T',model71,twr71],
   ['991T',model70,twr70]
  ]){
   const r=resolved(no,date);
   assert.equal(r.identityStatus,'EXACT',date+' '+no);
   assert.equal(r.name,name,date+' '+no);
   assert.equal(r.iconPath,png,date+' '+no);
  }
 }
 const november=resolved('1985K','2026-11-18');
 assert.notEqual(november.iconPath,twr71,
  'April observation must not become an unverified November trainset');
});

test('explicit 70-000/71-000 KFS model maps across months, not daily Z formations',()=>{
 for(const date of [
  '2025-10-01','2026-04-03','2026-11-18','2026-12-01','2027-04-01'
 ]){
  for(const [model,png] of [[model70,twr70],[model71,twr71]]){
   for(const line of ['Rinkai','SaikyoKawagoe']){
    const pos=(line==='Rinkai'?rinkai:saikyo)('1984K',{
     serviceDate:date,realtimeVehicleType:model
    });
    assert.equal(root.TrainNumberPngRanges.match('1984K',line,pos)?.pngPath,
     png,'independent model identity: '+date+' '+line+' '+model);
    assert.equal(mark(pos,line).iconSrc,png,
     'render independent model: '+date+' '+line+' '+model);
   }
  }
  const noModel=rinkai('1984K',{serviceDate:date});
  assert.equal(mark(noModel,'Rinkai').kind,'unresolved',
   'a number alone does not reveal its actual model: '+date);
  assert.equal(root.TrainVehicle.diagnoseSaikyoRinkaiArtwork(
   noModel,'Rinkai'),'rinkai-70-000-71-000-model-unverified');
  const conflicting=rinkai('1984K',{serviceDate:date,
   realtimeVehicleType:model70,realtimeDerivedVehicleType:model71});
  assert.equal(mark(conflicting,'Rinkai').kind,'unresolved',
   'conflicting independent models must not pick a PNG: '+date);
 }
 const outside=rinkai('1088T',{
  railDirection:'odpt.RailDirection:Inbound',
  serviceDate:'2026-12-01'
 });
 assert.equal(mark(outside,'Rinkai').kind,'unresolved',
  'historical T-number fallback does not reuse the old 2611 timetable');
});

test('April Z7 operation is not reusable after fleet withdrawal in October-November',()=>{
 const provider=root.TRAIN_OPERATION_EVIDENCE_PROVIDERS.find(p=>
  p.id==='loo-ool-saikyo-dated-formations');
 assert.ok(provider);
 const april=provider.resolveEvidence('1983K',{
  lineId:'Rinkai',serviceDate:'2026-04-03'});
 assert.equal(april?.formationId,'Z7');
 assert.equal(april?.vehicleType,model70);
 for(const date of ['2026-09-29','2026-11-07','2026-11-19','2026-12-01']){
  const value=provider.resolveEvidence('1983K',{
   lineId:'Rinkai',serviceDate:date});
  assert.equal(value,null,'do not reuse April Z7 onto '+date);
 }
});
