'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const root={};const ctx=vm.createContext({window:root,Date,Set,console:{
 log(){},warn(){},error(){},debug(){}
}});
for(const path of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js',
  'data/timetables/jreast-yamagata-2611-number-index.js',
  'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const idx=root.JREastYamagataNumberIndex202611;
function p(n,opts={}){
 const date=opts.serviceDate||'2026-11-06';
 const cal=opts.serviceId||'odpt.Calendar:Weekday';
 const c=String(cal).split(':').pop();
 const r=idx.roster[c][n]||idx.roster.Weekday[n];
 assert.ok(r,'known regional number '+n);
 return {
  trainNumber:n,positionLineId:'Yamagata',displayLineId:'Yamagata',
  sourceRailway:'odpt.Railway:JR-East.Yamagata',
  trainOperator:'odpt.Operator:JR-East',
  serviceDate:date,serviceId:cal,railDirection:r[0],
  trainType:'odpt.TrainType:JR-East.Local',
  scheduledStopKeys:r[1].map(i=>'odpt.Station:JR-East.'+idx.stops[i]),
  stationIndex:r[1][0],segmentToIndex:r[1][0],
  positionSource:'supabase-train-run',estimated:true,
  vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true,
  vehicleResolution:{identityStatus:'EXACT',lineId:'Yamagata',
    name:'701系5500番台',sources:['sql-timetable-model']},
  vehicleType:'701系5500番台',
  vehicleIconPath:'',
  vehiclePlan:{status:'PLANNED_MODEL',lineId:'Yamagata',
    source:'sql-timetable-plan',confirmed:false,
    models:['701系5500番台']},
  vehicleFormationId:'',vehicleFormationCandidates:[],
  ...opts
 };
}
test('Yamagata 35 stations: only 91 weekday + 92 weekend regular local M sources',()=>{
 assert.equal(idx.stops.length,35);
 assert.equal(idx.stops[0],'Fukushima');
 assert.equal(idx.stops[34],'Shinjo');
 assert.equal(Object.keys(idx.roster.Weekday).length,91);
 assert.equal(Object.keys(idx.roster.SaturdayHoliday).length,92);
 for(const [calendar,map] of Object.entries(idx.roster)){
  const opts=calendar==='Weekday'?{}:{
    serviceDate:'2026-11-07',serviceId:'odpt.Calendar:SaturdayHoliday'};
  for(const n of Object.keys(map)){
   const x=p(n,opts),proof=idx.verify(x);
   assert.ok(proof,calendar+' '+n+' must have full valid SQL stop sequence');
   assert.equal(proof.actualVehicleConfirmed,false);
   assert.equal(proof.trainNumber,n);
   assert.equal(proof.origin,idx.stops[map[n][1][0]]);
   assert.equal(proof.terminus,idx.stops[map[n][1].at(-1)]);
  }
 }
 assert.ok(idx.verify(p('1422M')));
 assert.equal(idx.verify(p('1422M',{
  serviceDate:'2026-11-07',serviceId:'odpt.Calendar:SaturdayHoliday'})),null);
 assert.ok(idx.verify(p('1435M',{
  serviceDate:'2026-11-07',serviceId:'odpt.Calendar:SaturdayHoliday'})));
});
test('Shinkansen and wrongly labeled 1xxM SQL trains cannot become Yamagata local markers',()=>{
 const original=p('420M');
 for(const n of ['121M','123M','124M','128M','171M','6069M','8177M',
   '9088M','9090M','9091M','9087M','9455M','9459M','9463M','3001M']){
  assert.equal(idx.verify({...original,trainNumber:n}),null,n);
  assert.equal(idx.resolve({...original,trainNumber:n}),null,n);
 }
 assert.equal(idx.verify({...original,trainType:'odpt.TrainType:JR-East.Shinkansen'}),null);
 assert.equal(idx.verify({...original,positionLineId:'YamagataShinkansen'}),null);
 assert.equal(idx.verify({...original,sourceRailway:'odpt.Railway:JR-East.OuMain'}),null);
 assert.equal(idx.verify({...original,displayLineId:'OuMain'}),null);
 assert.equal(idx.verify({...original,scheduledStopKeys:original.scheduledStopKeys.slice(1)}),null);
 assert.equal(idx.verify({...original,scheduledStopKeys:original.scheduledStopKeys.slice().reverse()}),null);
 assert.equal(idx.verify({...original,scheduledStopKeys:original.scheduledStopKeys.map(
  (v,i)=>i===4?'odpt.Station:JR-East.Morioka':v)}),null);
 assert.equal(idx.verify({...original,positionSource:'realtime-api'}),null);
 assert.equal(idx.verify({...original,estimated:false}),null);
 assert.equal(idx.verify({...original,serviceDate:'2026-12-01'}),null);
 assert.equal(idx.verify({...original,serviceDate:'2026-11-23',
  serviceId:'odpt.Calendar:Weekday'}),null);
});
test('number-scoped E723 newly entered 2026 and 701 old regional references',()=>{
 const groups={
  'E723系5000番台':['420M','431M','436M','5425M','5426M','451M','455M'],
  '701系5500番台':['429M','422M','1425M','1437M','1443M','1445M',
   '1447M','1449M','1455M','1457M','1420M','1424M','1432M',
   '1444M','1446M','1448M','1450M','1454M']
 };
 for(const [model,numbers] of Object.entries(groups)){
  for(const n of numbers){
   const x=p(n),ref=idx.resolve(x);
   assert.ok(ref,n+' should have a sourced reference');
   assert.equal(ref.illustrationModel,model);
   assert.equal(ref.model,null);
   assert.equal(ref.formationId,null);
   assert.equal(ref.actualNovemberModelConfirmed,false);
   assert.equal(ref.actualVehicleConfirmed,false);
   assert.equal(ref.referenceOnly,true);
   assert.equal(ref.authorizesPNG,false);
   assert.ok(root.VehicleGaragePngMap.matchModelPath(model,
      ref.illustrationPng,'Yamagata'));
   assert.equal(root.VehicleGaragePngMap.matchModelPath(model,
      ref.illustrationPng,'YamagataShinkansen'),false);
   const art=root.TrainVehicle.selectMarkerArtwork(x,false);
   assert.equal(art.kind,'vehicle',n+' marker should have a vehicle image');
   assert.equal(art.iconSrc,ref.illustrationPng);
   assert.equal(art.planned,true);
   assert.equal(art.illustrative,true);
   assert.equal(art.representativeOnly,true);
   assert.equal(art.actualVehicleConfirmed,false);
   assert.equal(root.TrainVehicle.selectMarkerArtwork(x,true).kind,'unresolved',
    'PNG load error must not assign an unverified substitute');
  }
 }
});
test('source-verified 5430M reference survives absent or projection-specific geometry',()=>{
 for(const change of [
  {stationIndex:undefined,segmentToIndex:undefined},
  {stationIndex:null,segmentToIndex:null},
  {stationIndex:999,segmentToIndex:998},
  {stationIndex:'Niwasaka',segmentToIndex:'Fukushima'}
 ]){
  const x=p('5430M',change);
  assert.ok(idx.verify(x),'official number/stops/date still validate');
  const art=root.TrainVehicle.selectMarkerArtwork(x,false);
  assert.equal(art.kind,'vehicle');
  assert.equal(art.iconSrc,idx.image['E723系5000番台']);
  assert.equal(art.actualVehicleConfirmed,false);
 }
});
test('October observed 5429M to 5430M displays E723 artwork without claiming November consist',()=>{
 for(const n of ['5429M','5430M']){
  const x=p(n),ref=idx.resolve(x),art=root.TrainVehicle.selectMarkerArtwork(x,false);
  assert.equal(ref.illustrationModel,'E723系5000番台');
  assert.equal(ref.actualNovemberModelConfirmed,false);
  assert.equal(ref.formationId,null);
  assert.equal(art.kind,'vehicle');
  assert.equal(art.iconSrc,idx.image['E723系5000番台']);
  assert.equal(art.illustrative,true);
  assert.equal(art.actualVehicleConfirmed,false);
 }
});
test('mixed 719/701/E723 unverified train numbers remain honest candidate text, not 701 PNG',()=>{
 assert.deepEqual(Array.from(idx.candidates),['701系5500番台','719系5000番台','E723系5000番台']);
 for(const n of ['423M','425M','426M','433M','437M','447M','449M','453M',
   '461M','1426M','1427M','1431M','1433M']){
  const x=p(n),proof=idx.verify(x);
  assert.ok(proof);
  assert.equal(idx.resolve(x),null,n+' has no 2026 independent single-model evidence');
  const art=root.TrainVehicle.selectMarkerArtwork(x,false);
  assert.equal(art.kind,'candidate',n+' must retain a scoped mixed-fleet candidate');
  assert.equal(art.iconSrc,'',n+' must not inherit the obsolete all-701 SQL label');
  assert.equal(art.candidateAssets.length,idx.candidates.length);
 }
});
test('every 2611 Yamagata number has an evidence-scoped artwork or fleet candidate',()=>{
 for(const [calendar,roster] of Object.entries(idx.roster)){
  const opts=calendar==='Weekday'?{}:{
   serviceDate:'2026-11-07',serviceId:'odpt.Calendar:SaturdayHoliday'};
  for(const n of Object.keys(roster)){
   const x=p(n,opts),art=root.TrainVehicle.selectMarkerArtwork(x,false);
   assert.ok(['vehicle','candidate'].includes(art.kind),calendar+' '+n);
   if(art.kind==='candidate'){
    assert.equal(art.iconSrc,'');
    assert.equal(art.candidateAssets.length,idx.candidates.length);
    assert.equal(idx.resolve(x),null);
    assert.equal(idx.resolveCandidates({...x,displayLineId:'OuMain'}),null);
   }
  }
 }
 const x=p('5427M');
 assert.equal(root.TrainVehicle.selectMarkerArtwork(x,false).kind,'candidate');
 assert.equal(idx.resolveCandidates({...x,trainNumber:'9455M'}),null);
 assert.equal(idx.resolveCandidates({...x,estimated:false}),null);
 assert.equal(idx.resolveCandidates({...x,actualVehicleConfirmed:true}),null);
});
test('no false physical car from EXACT SQL or through-line fallback',()=>{
 let x=p('455M');
 assert.equal(idx.resolve(x).illustrationModel,'E723系5000番台');
 assert.equal(root.TrainVehicle.selectMarkerArtwork(x,false).iconSrc,idx.image['E723系5000番台']);
 for(const change of [
  {vehicleResolvedFromRealtime:true},
  {actualVehicleConfirmed:true},
  {vehicleFormationId:'B-1'},
  {vehicleFormationCandidates:['B-1']},
  {realtimeVehicleType:'E723系5000番台'},
  {vehiclePlan:{...x.vehiclePlan,
    source:'database-verified-published-plan',confirmed:true,models:['719系5000番台']}},
  {vehiclePlan:{...x.vehiclePlan,
    source:'database-verified-published-plan',confirmed:true,models:['701系5500番台']}},
  {displayLineId:'OuMain'},
  {sourceRailway:'odpt.Railway:JR-East.OuMain'},
  {estimated:false}
 ])assert.equal(idx.resolve({...x,...change}),null,JSON.stringify(change));
});
test('HTML, source-scoped lazy manifest, PNG versions and fold model label wired',()=>{
 const manifest=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
 const path='data/timetables/jreast-yamagata-2611-number-index.js';
 assert.deepEqual(manifest.lazyScopes.trains[path],['Yamagata']);
 assert.equal(manifest.lazy.trains.filter(x=>x===path).length,1);
 assert.equal(manifest.lazy.trains.indexOf(path),
   manifest.lazy.trains.indexOf('data/timetables/jreast-uetsu-2611-number-index.js')+1);
 const html=fs.readFileSync('pages/trains.html','utf8');
 assert.match(html,/jreast-yamagata-2611-number-index\.js\?v=[a-f0-9]{12}" data-line-scope="Yamagata"/);
 for(const file of [path,'data/timetables/vehicle-garage-png-map.js',
   'js/train-vehicle.js','js/train-position-estimator.js','js/trains-render.js']){
  const bytes=fs.readFileSync(file),hash=crypto.createHash('sha1')
   .update('blob '+bytes.length+'\0').update(bytes).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+file+'?v='+hash),file+' outdated cache fingerprint');
 }
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 assert.match(estimator,/lineId==="Yamagata"&&tt\._positionSource==="supabase-train-run"/);
 assert.match(estimator,/yamIndex\.verify\(/);
 const vehicle=fs.readFileSync('js/train-vehicle.js','utf8');
 assert.ok(vehicle.indexOf('contextLineId==="Yamagata"')<
   vehicle.indexOf('var numberPng = !identityConfirmed'),'Yamagata gate precedes old universal PNG fallback');
 const renderer=fs.readFileSync('js/trains-render.js','utf8');
 assert.match(renderer,/lineId==="Yamagata" && window\.JREastYamagataNumberIndex202611/);
 assert.match(renderer,/lineId === "ChuoMain" \|\| lineId === "Yamagata"/);
});
