'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const window={},ctx=vm.createContext({window,Date,
  console:{log(){},warn(){},debug(){},error(){}},
  _isTrainArtworkFailureActive(){return false}});
for(const path of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const models=['207系','321系','223系6000番台','225系6000番台'];
const stops=['Amagasaki','Tsukaguchi','Ina-Tera','Itami','Kita-Itami',
 'Kawanishi-Ikeda','Nakayama-Tera','Takarazuka','Namase',
 'Nishinomiya-Najio','Takedao','Doujou','Sanda-Hyogo','Shinmita'];
const proof={
 source:'sql-jrwest-fukuchiyama-2611-historical-fleet-reference',
 lineId:'Fukuchiyama',sourceTemplateId:68122,sourceTrainId:'1199CH',
 serviceDate:'2026-11-08',calendar:'odpt.Calendar:SaturdayHoliday',
 direction:'odpt.RailDirection:Outbound',
 trainType:'odpt.TrainType:JR-West.Local',sourceStopKeys:stops.slice(),
 candidateModels:models.slice(),candidateAssets:[],
 fleetSourceUrl:'https://www.westjr.co.jp/fan/paper/local/',
 timetableSourcePath:'data/timetables/Fukuchiyama-manual.js',
 timetableValidity:'undated_not_current_verified',
 numberDateVerified:false,referenceOnly:true,
 actualVehicleConfirmed:false,authorizesPNG:false
};
const position={
 trainNumber:'1199CH',serviceDate:'2026-11-08',
 positionLineId:'Fukuchiyama',displayLineId:'Fukuchiyama',
 sourceRailway:'odpt.Railway:JR-West.Fukuchiyama',
 trainOperator:'JR-West',positionSource:'supabase-train-run',
 trainType:'odpt.TrainType:JR-West.Local',
 railDirection:'odpt.RailDirection:Outbound',
 serviceId:'odpt.Calendar:SaturdayHoliday',calendarType:'holiday',
 scheduledStopKeys:stops.slice(),estimated:true,
 timetableDateVerified:false,vehicleIdentityStatus:'UNKNOWN',
 vehicleResolvedUpstream:false,vehicleResolvedFromRealtime:false,
 vehicleFormationId:'',vehicleFormationCandidates:[],
 plannedVehicleCandidates:models.slice(),plannedVehicleCandidateStatus:'unresolved',
 vehiclePlan:null,sqlPublishedNumberFleetReference:proof
};
const verify=window.TrainNumberPngRanges.verifyFukuchiyamaSourceFleet;
const marker=p=>window.TrainVehicle.selectMarkerArtwork(p,false);
test('1199CH 2026-11-08 remains four fleet candidates, not missing map or guessed PNG',()=>{
 const f=verify(position);
 assert.ok(f);
 assert.equal(f.authorizesPNG,false);
 assert.equal(f.numberDateVerified,false);
 assert.deepEqual(Array.from(f.candidateModels),models);
 const art=marker(position);
 assert.equal(art.kind,'candidate');
 assert.equal(art.iconSrc,'');
 assert.equal(art.planned,false);
 assert.equal(art.actualVehicleConfirmed,false);
 assert.deepEqual(Array.from(art.candidateModels),models);
 assert.deepEqual(Array.from(art.candidateAssets),[]);
 const r=fs.readFileSync('js/trains-render.js','utf8');
 const a=r.indexOf('  function _trainMarkerDomKind(');
 const b=r.indexOf('  // ODPT location evidence must never',a);
 assert.ok(a>=0&&b>a);
 vm.runInContext(r.slice(a,b),ctx);
 const render=ctx._trainMarkerSpec(position,'planned-trip:1199CH','Fukuchiyama');
 assert.equal(render.kind,'candidate');
 assert.equal(render.compact,true);
 assert.equal(render.iconSrc,'');
 assert.equal(ctx._trainMarkerDomKind(render),'candidate');
 assert.match(r,/candidateVehicle\s*\?\s*\(color\s*\|\|/);
});
test('unknown source, line/date/calendar/train/stop mismatches remain unresolved',()=>{
 for(const change of [
  {sqlPublishedNumberFleetReference:null},
  {displayLineId:'SaninMain'},{positionLineId:'TokaidoKansai'},
  {sourceRailway:'odpt.Railway:JR-East.Fukuchiyama'},
  {trainOperator:'JR-East'},{positionSource:'realtime-api'},
  {serviceDate:'2026-11-09'},{serviceId:'odpt.Calendar:Weekday',calendarType:'weekday'},
  {serviceDate:'2026-12-08'},{trainNumber:'1198CH'},
  {trainType:'odpt.TrainType:JR-West.LimitedExpress'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {scheduledStopKeys:stops.slice().reverse()},
  {plannedVehicleCandidates:['207系']},
  {plannedVehicleCandidateStatus:'dated_schedule_rule'},
  {vehicleIdentityStatus:'NARROWED'},
  {vehicleResolvedFromRealtime:true},{actualVehicleConfirmed:true},
  {vehicleFormationId:'T1'},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['207系'],confirmed:true}},
  {sqlPublishedNumberFleetReference:{...proof,authorizesPNG:true}},
  {sqlPublishedNumberFleetReference:{...proof,numberDateVerified:true}},
  {sqlPublishedNumberFleetReference:{...proof,candidateAssets:[
     '../images/列车/JR西日本/JR西日本_207系_NK.png']}},
  {sqlPublishedNumberFleetReference:{...proof,sourceTemplateId:0}},
  {sqlPublishedNumberFleetReference:{...proof,sourceStopKeys:stops.slice(1)}}
 ]) {
  const p={...position,...change};
  assert.notEqual(marker(p).kind,'candidate',JSON.stringify(change));
  assert.equal(marker(p).iconSrc,'',JSON.stringify(change));
 }
});
test('front-end source adapter forwards the original guarded proof, not a new carset',()=>{
 const adapter=fs.readFileSync('data/api/odpt-unified.js','utf8');
 const est=fs.readFileSync('js/train-position-estimator.js','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 assert.match(adapter,/_sqlPublishedNumberFleetReference":run\.published_number_fleet_reference\|\|null/);
 assert.match(est,/lineId==="Fukuchiyama"&&tt\._positionSource==="supabase-train-run"/);
 assert.match(est,/sqlPublishedNumberFleetReference:\(osakaMahorobaScoped/);
 assert.match(edge,/sql-jrwest-fukuchiyama-2611-historical-fleet-reference/);
 assert.match(edge,/run\.vehicle_artwork_path=null/);
});
