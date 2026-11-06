'use strict';
/* Shinonoi 2611 historical source-number fleet references.
 * Distinguish 383 Shinano official plan and unconfirmed 211/E127 local fleet.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const w={},ctx=vm.createContext({window:w,Date,console:{
 log(){},warn(){},debug(){},error(){}
},_isTrainArtworkFailureActive(){return false}});
for(const path of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'data/timetables/jreast-senzan-2611-number-index.js',
 'data/timetables/jreast-shinonoi-2611-number-index.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const n211='../images/列车/JR東日本/JR東日本_211系_長野色.png';
const e127='../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png';
const shinano='../images/列车/JR東海/JR東海_383系.png';
function p(number,dir='Outbound',type='Local',calendar='weekday'){
 return {trainNumber:number,calendarType:calendar,
  serviceDate:'2026-11-06',railDirection:'odpt.RailDirection:'+dir,
  trainType:'odpt.TrainType:JR-East.'+type,
  positionLineId:'Shinonoi',displayLineId:'Shinonoi',
  sourceRailway:'odpt.Railway:JR-East.Shinonoi',
  positionSource:'supabase-train-run',estimated:true,
  vehicleIdentityStatus:'UNKNOWN'};
}
const resolve=p=>w.JREastShinonoiNumberIndex202611.resolve(p);
const marker=p=>w.TrainVehicle.selectMarkerArtwork(p,false);
test('144 distinct source numbers per calendar, including 26 official 383 Shinano plans',()=>{
 for(const cal of ['weekday','holiday']){
  const counts={Local:0,Rapid:0,LimitedExpress:0};
  for(const dir of ['Inbound','Outbound']){
   for(const type of Object.keys(counts))
    for(let n=100;n<=9999;n++){
     if(resolve(p(n+'M',dir,type,cal)))counts[type]++;
    }
  }
  assert.deepEqual(counts,{Local:114,Rapid:4,LimitedExpress:26});
 }
});
test('Shinano 1001-1026 uses approved 383 reference, never E353',()=>{
 for(const [number,dir] of [['1001M','Outbound'],['1002M','Inbound'],
  ['1025M','Outbound'],['1026M','Inbound']]){
  const x=p(number,dir,'LimitedExpress'),ref=resolve(x),chosen=marker(x);
  assert.equal(ref.illustrationModel,'383系');
  assert.equal(ref.scope,'official-shinano-383-plan');
  assert.equal(ref.actualVehicleConfirmed,false);
  assert.equal(ref.authorizesPNG,false);
  assert.equal(chosen.iconSrc,shinano);
  assert.equal(chosen.illustrative,true);
  assert.equal(chosen.actualVehicleConfirmed,false);
  assert.equal(x.vehicleIdentityStatus,'UNKNOWN');
 }
});
test('local mixed fleet uses 211 line illustration; E127 when independently planned',()=>{
 const x=p('421M');
 const ref=resolve(x),image=marker(x);
 assert.equal(ref.plannedCandidates.join('|'),'211系（長野地区）|E127系100番台');
 assert.equal(ref.scope,'historical-number-fleet-reference');
 assert.equal(image.iconSrc,n211);
 assert.equal(image.illustrative,true);
 const knownE127={...x,vehiclePlan:{status:'PLANNED_MODEL',models:['E127系100番台']}};
 assert.equal(marker(knownE127).iconSrc,e127);
 assert.equal(marker(p('2530M','Inbound','Rapid')).iconSrc,n211);
 assert.equal(resolve({...x,vehiclePlan:{status:'PLANNED_MODEL',
  models:['E131系200番台']}}),null,
  'unverified E131 2611 public-number assignment cannot be guessed');
});
test('reject cross-line, wrong number/type/date/calendar and exact formation',()=>{
 const base=p('1001M','Outbound','LimitedExpress');
 for(const change of [
  {sourceRailway:'odpt.Railway:JR-East.Chuo'},
  {positionLineId:'ChuoMain'},{displayLineId:'ChuoMain'},
  {trainType:'odpt.TrainType:JR-East.Local'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {calendarType:'unknown'},{serviceDate:'2026-12-01'},
  {vehicleIdentityStatus:'EXACT'}, {vehicleFormationId:'C101'},
  {vehicleResolvedFromRealtime:true},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['E353系']}},
  {trainOperator:'JR-West'}
 ])assert.equal(resolve({...base,...change}),null,JSON.stringify(change));
 assert.equal(resolve({...p('8032M','Outbound','LimitedExpress')}),null);
 assert.equal(w.TrainVehicle.selectMarkerArtwork(base,true).kind,'unresolved');
});
test('image authority has Shinonoi scope, and other line adapter survives',()=>{
 const g=w.VehicleGaragePngMap;
 assert.equal(g.matchModelPath('383系',shinano,'Shinonoi'),true);
 assert.equal(g.matchModelPath('383系',shinano,'ChuoMain'),false);
 assert.equal(g.matchModelPath('211系（長野地区）',n211,'Shinonoi'),true);
 assert.equal(g.matchModelPath('E127系100番台',e127,'Shinonoi'),true);
 const senzan=w.TrainNumberPngRanges.match('1829M','Senzan',{
  trainNumber:'1829M',positionLineId:'Senzan',displayLineId:'Senzan',
  sourceRailway:'odpt.Railway:JR-East.Senzan',
  calendarType:'weekday',serviceDate:'2026-11-06',
  railDirection:'odpt.RailDirection:Outbound',
  trainType:'odpt.TrainType:JR-East.Local',
  positionSource:'supabase-train-run',estimated:true});
 assert.equal(senzan.model,'E721系');
});
test('manifest, gallery and index SHA-12 references stay synchronized',()=>{
 const conf=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
 const index='data/timetables/jreast-shinonoi-2611-number-index.js';
 assert.equal(conf.lazy.trains.filter(x=>x===index).length,1);
 assert.equal(conf.lazyScopes.trains[index][0],'Shinonoi');
 assert.equal(conf.lazy.trains.indexOf(index),
   conf.lazy.trains.indexOf('data/timetables/jreast-senzan-2611-number-index.js')+1);
 const html=fs.readFileSync('pages/trains.html','utf8');
 for(const path of [index,'data/timetables/vehicle-garage-png-map.js','js/train-vehicle.js']){
  const b=fs.readFileSync(path),sha=crypto.createHash('sha1')
   .update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+path+'?v='+sha),'stale '+path);
 }
});
test('SQL mapping keeps 52 pre-existing 383 plans and historical stop clocks',()=>{
 const migration=fs.readFileSync('supabase/migrations/20261106220000_shinonoi_2611_historical_roster_fleet_reference.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 for(const term of ['published_shinonoi_2611_fleet_scope','228','52','288',
  'existing_official_service_vehicle_plan','actual_vehicle_confirmed'])
  assert.ok(migration.includes(term),term);
 for(const term of ['SHINONOI_2611_SOURCE_FLEET_SCOPE_UNAVAILABLE',
  'run.timetable_date_verified=false',
  'run.vehicle_plan_confirmed=shinano'])
  assert.ok(edge.includes(term),term);
});
