'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={},ctx=vm.createContext({window:root,Date,
  console:{log(){},warn(){},debug(){},error(){}},
  _isTrainArtworkFailureActive(){return false}});
for(const f of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js','data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const models=['E233系7000番台','相鉄12000系'],
  pngs=['../images/列车/JR東日本/JR東日本_E233系_7000番台.png',
    '../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png'],
  north=['HazawaYokohamaKokudai','MusashiKosugi','NishiOi','Osaki'];
const verify=root.TrainNumberPngRanges.verifySotetsuJRService;
function dayHoliday(date){
 const w=new Date(date+'T12:00:00Z').getUTCDay();
 return w===0||w===6||date==='2026-11-03'||date==='2026-11-23';
}
function position(num='120M',date='2026-11-06',extra={}){
 const inbound=Number(num.replace(/M$/,''))%2===0,
   direction=inbound?'Northbound':'Southbound',
   holiday=dayHoliday(date),
   cal=holiday?'SaturdayHoliday':'Weekday',
   stops=inbound?north.slice():north.slice().reverse();
 return {
  trainNumber:num,serviceDate:date,calendarType:holiday?'holiday':'weekday',
  positionLineId:'SotetsuJRDirect',displayLineId:'SotetsuJRDirect',
  sourceRailway:'odpt.Railway:JR-East.SotetsuDirect',
  trainOperator:'JR-East',railDirection:'odpt.RailDirection:'+direction,
  trainType:'odpt.TrainType:JR-East.Local',
  positionSource:'supabase-train-run',estimated:true,
  scheduledStopKeys:stops,
  vehicleIdentityStatus:'UNKNOWN',
  plannedVehicleCandidates:models.slice(),
  plannedVehicleCandidateStatus:'unresolved-mixed-fleet',
  vehiclePlan:{status:'UNCONFIRMED_FLEET',models:models.slice(),confirmed:false},
  sqlPublishedNumberFleetReference:{
   source:'sql-jreast-sotetsu-jr-2611-source-candidate',
   lineId:'SotetsuJRDirect',trainNumber:num,serviceDate:date,
   sourceTemplateId:73270,direction:'odpt.RailDirection:'+direction,
   calendar:'odpt.Calendar:'+cal,trainType:'odpt.TrainType:JR-East.Local',
   sourceStopKeys:stops.slice(),candidateModels:models.slice(),
   candidateAssets:pngs.slice(),
   fleetSourceUrl:'https://www.jreast.co.jp/press/2019/20190716.pdf',
   timetableIndexUrl:'https://timetables.jreast.co.jp/2611/timetable-v/628'+
      (inbound?'d':'u')+(holiday?'2':'1')+'p.html',
   stopClockStatus:'historical_not_2611_verified',
   referenceOnly:true,actualVehicleConfirmed:false,
   numberDateVerified:false,authorizesPNG:false
  },...extra
 };
}
test('120M/220M public train family is never proof of E233 carset',()=>{
 for(const line of ['SotetsuJRDirect','SaikyoKawagoe']){
  for(const num of ['120M','121M','220M','221M','285M']){
   const p=position(num);
   assert.equal(root.TrainNumberPngRanges.match({
     ...p,positionLineId:line,displayLineId:line
   }),null,line+'/'+num);
  }
 }
});
test('date-scoped source candidates always produce ONE neutral SVG marker',()=>{
 for(const date of ['2026-11-06','2026-11-07','2026-11-03','2026-11-23']){
  for(const num of ['120M','121M','220M','221M','278M','285M']){
   const p=position(num,date),proof=verify(p);
   assert.ok(proof,date+' '+num);
   assert.equal(proof.actualVehicleConfirmed,false);
   assert.equal(proof.authorizesPNG,false);
   assert.deepEqual(Array.from(proof.candidateModels),models);
   const marker=root.TrainVehicle.selectMarkerArtwork(p,false);
   assert.equal(marker.kind,'candidate',num+'/'+date);
   assert.equal(marker.iconSrc,'');
   assert.equal(marker.planned,false);
   assert.deepEqual(Array.from(marker.candidateAssets),pngs);
  }
 }
});
test('approved gallery paths are line and model scoped',()=>{
 for(let i=0;i<2;i++)
  assert.equal(root.VehicleGaragePngMap.matchModelPath(
    models[i],pngs[i],'SotetsuJRDirect'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath(
    models[0],pngs[1],'SotetsuJRDirect'),false);
});
test('bad calendar/line/route/carset/source do not inherit any PNG',()=>{
 const p=position();
 const invalid=[
  {trainNumber:'710K'},{trainNumber:'119M'},{trainNumber:'299M'},
  {serviceDate:'2026-12-07'},{calendarType:'holiday'},
  {positionLineId:'SaikyoKawagoe'},{displayLineId:'SotetsuMain'},
  {sourceRailway:'odpt.Railway:JR-East.Saikyo'},
  {trainOperator:'Sotetsu'},
  {railDirection:'odpt.RailDirection:Southbound'},
  {trainType:'odpt.TrainType:JR-East.Rapid'},
  {positionSource:'realtime-api'},
  {scheduledStopKeys:[]},{scheduledStopKeys:['Shinjuku',...north]},
  {scheduledStopKeys:north.slice().reverse()},
  {sqlPublishedNumberFleetReference:null},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,candidateModels:[models[0]]}},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,candidateAssets:[pngs[0]]}},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,numberDateVerified:true}},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,sourceTemplateId:0}},
 ];
 for(const diff of invalid){
  const x={...p,...diff};
  assert.equal(verify(x),null,JSON.stringify(diff));
  assert.equal(root.TrainVehicle.selectMarkerArtwork(x,false).iconSrc,'');
 }
 for(const diff of [
  {vehicleIdentityStatus:'EXACT'},{vehicleFormationId:'12101F'},
  {vehicleResolvedFromRealtime:true},{plannedVehicleCandidates:[models[0]]},
  {plannedVehicleCandidateStatus:'source_single_type_candidate'},
  {vehiclePlan:{models:[models[0]],confirmed:true}}
 ]){
  const marker=root.TrainVehicle.selectMarkerArtwork({...p,...diff},false);
  assert.notEqual(marker.kind,'candidate',JSON.stringify(diff));
  assert.equal(marker.iconSrc,'');
 }
});
test('source 184, 4-stop, two-model and server/estimator gates are explicit',()=>{
 const sql=fs.readFileSync(
  'supabase/migrations/20261107042000_sotetsu_jr_direct_2611_two_fleet_source_candidates.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const est=fs.readFileSync('js/train-position-estimator.js','utf8');
 for(const token of ['184','station_keys=CASE',
    'number_date_verified boolean NOT NULL DEFAULT false',
    'authorizes_png boolean NOT NULL DEFAULT false'])
  assert.ok(sql.includes(token),token);
 for(const token of ['published_sotetsu_jr_2611_fleet_roster',
    'SOTETSU_JR_2611_HISTORICAL_FLEET_ROSTER_UNAVAILABLE',
    'run.vehicle_type_candidates=pub.candidate_models.join(" / ")'])
  assert.ok(edge.includes(token),token);
 for(const token of ['officialSotetsuJRPlan',
    'verifySotetsuJRService','unresolved-mixed-fleet'])
  assert.ok(est.includes(token),token);
});
