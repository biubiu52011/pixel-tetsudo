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
const marker=(p,artworkFailed=false)=>window.TrainVehicle.selectMarkerArtwork(p,artworkFailed);
test('1199CH maps the 1100-1299 C band to an illustrative 321 image, not an assigned carset',()=>{
 const f=verify(position),png='../images/列车/JR西日本/JR西日本_321系.png';
 assert.ok(f);
 assert.equal(f.numberBand,'local-1100-1299-C');
 assert.equal(f.numberDateVerified,false);
 assert.equal(f.authorizesPNG,false);
 assert.equal(f.actualVehicleConfirmed,false);
 assert.equal(f.authorizesIllustration,true);
 assert.deepEqual(Array.from(f.sourceFleetCandidates),models);
 assert.deepEqual(Array.from(f.candidateModels),['207系','321系']);
 assert.equal(f.illustrationPng,png);
 assert.equal(window.VehicleGaragePngMap.matchModelPath('JR西日本321系',png,'Fukuchiyama'),true);
 assert.equal(window.VehicleGaragePngMap.matchModelPath('JR西日本225系',
   '../images/列车/JR西日本/JR西日本_225系.png','Fukuchiyama'),false);
 const art=marker(position);
 assert.equal(art.kind,'vehicle');
 assert.equal(art.iconSrc,png);
 assert.equal(art.planned,true);
 assert.equal(art.illustrative,true);
 assert.equal(art.actualVehicleConfirmed,false);
 const r=fs.readFileSync('js/trains-render.js','utf8');
 const a=r.indexOf('  function _trainMarkerDomKind(');
 const b=r.indexOf('  // ODPT location evidence must never',a);
 assert.ok(a>=0&&b>a);
 vm.runInContext(r.slice(a,b),ctx);
 const svg=ctx._trainMarkerSpec(position,'planned-trip:1199CH','Fukuchiyama');
 assert.equal(svg.kind,'vehicle');
 assert.equal(svg.iconSrc,png);
 assert.equal(svg.compact,false);
 assert.equal(svg.illustrative,true);
 assert.equal(ctx._trainMarkerDomKind(svg),'planned');
 assert.equal(marker(position,true).kind,'candidate');
 const l=r.indexOf('function _trainFleetPlanLabel(');
 vm.runInContext(r.slice(l,r.indexOf('\n  function ',l)),ctx);
 const caption=ctx._trainFleetPlanLabel(position,'Fukuchiyama','zh');
 assert.match(caption,/207系 \/ 321系/);
 assert.doesNotMatch(caption,/223系/);
});
test('historical M/MO number bands remain candidates without reusing Hanwa 223/225 PNG',()=>{
 for(const [no,type] of [['2728MH','Rapid'],['2521MH','Local'],
  ['5424MH','Rapid'],['2759MOH','Local']]){
  const p={...position,trainNumber:no,
    trainType:'odpt.TrainType:JR-West.'+type,
    sqlPublishedNumberFleetReference:{...proof,sourceTrainId:no,
      trainType:'odpt.TrainType:JR-West.'+type}};
  const f=verify(p);
  assert.ok(f,no);
  assert.equal(f.authorizesIllustration,false);
  assert.equal(f.illustrationPng,'');
  assert.deepEqual(Array.from(f.candidateModels),models);
  assert.equal(marker(p).kind,'candidate',no);
  assert.equal(marker(p).iconSrc,'');
 }
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
  {trainNumber:'1301CH',sqlPublishedNumberFleetReference:{...proof,sourceTrainId:'1301CH'}},
  {trainNumber:'1199MH',sqlPublishedNumberFleetReference:{...proof,sourceTrainId:'1199MH'}},
  {trainNumber:'1198CH',sqlPublishedNumberFleetReference:{...proof,sourceTrainId:'1198CH'}},
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


test('2774MH 2026-11-08 holiday rapid maps 2025 common-duty candidates, 321 PNG example only',()=>{
 const keys=['Shinoyamaguchi','Minami-Yashiro','Furuichi','Kusano-Hyogo',
   'Ranpon','Sou-No','Hirono-Hyogo','Shinmita','Sanda-Hyogo',
   'Nishinomiya-Najio','Takarazuka','Nakayama-Tera',
   'Kawanishi-Ikeda','Itami','Amagasaki','Osaka'];
 const holidayProof={...proof,sourceTemplateId:68302,sourceTrainId:'2774MH',
  direction:'odpt.RailDirection:Inbound',trainType:'odpt.TrainType:JR-West.Rapid',
  sourceStopKeys:keys.slice()};
 const p={...position,trainNumber:'2774MH',
  railDirection:'odpt.RailDirection:Inbound',trainType:'odpt.TrainType:JR-West.Rapid',
  scheduledStopKeys:keys.slice(),sqlPublishedNumberFleetReference:holidayProof};
 const f=verify(p),png='../images/列车/JR西日本/JR西日本_321系.png';
 assert.equal(f.publicTrainNumber,'2774M');
 assert.equal(f.numberBand,'holiday-2774M-2025-207-321-working');
 assert.equal(f.authorizesIllustration,true);
 assert.equal(f.authorizesPNG,false);
 assert.equal(f.numberDateVerified,false);
 assert.equal(f.actualVehicleConfirmed,false);
 assert.deepEqual(Array.from(f.candidateModels),['207系','321系']);
 assert.equal(marker(p).kind,'vehicle');
 assert.equal(marker(p).iconSrc,png);
 assert.equal(marker(p).illustrative,true);
 assert.equal(marker(p).actualVehicleConfirmed,false);
 assert.equal(marker(p).illustrationRole,
  'fukuchiyama-2774M-2025-historical-207-321-example-only');
 const r=fs.readFileSync('js/trains-render.js','utf8');
 const a=r.indexOf('  function _trainMarkerDomKind(');
 const b=r.indexOf('  // ODPT location evidence must never',a);
 vm.runInContext(r.slice(a,b),ctx);
 const spec=ctx._trainMarkerSpec(p,'planned-trip:2774MH','Fukuchiyama');
 assert.equal(spec.kind,'vehicle');
 assert.equal(spec.iconSrc,png);
 assert.equal(spec.illustrative,true);
 assert.equal(ctx._trainMarkerDomKind(spec),'planned');
 const l=r.indexOf('function _trainFleetPlanLabel(');
 vm.runInContext(r.slice(l,r.indexOf('\n  function ',l)),ctx);
 const label=ctx._trainFleetPlanLabel(p,'Fukuchiyama','zh');
 assert.match(label,/2025年/);
 assert.match(label,/207系 \/ 321系/);
 assert.equal(marker(p,true).kind,'candidate');
 for(const change of [
  {serviceDate:'2026-11-15'},
  {trainNumber:'2772MH',sqlPublishedNumberFleetReference:{...holidayProof,sourceTrainId:'2772MH'}},
  {trainType:'odpt.TrainType:JR-West.Local'},
  {railDirection:'odpt.RailDirection:Outbound'},
  {scheduledStopKeys:keys.slice(1)},
  {sqlPublishedNumberFleetReference:{...holidayProof,sourceTemplateId:68301}},
  {sqlPublishedNumberFleetReference:{...holidayProof,sourceStopKeys:keys.slice(1)}},
  {positionSource:'realtime-api'},
  {vehicleIdentityStatus:'EXACT'}
 ]){
  assert.notEqual(marker({...p,...change}).kind,'vehicle',JSON.stringify(change));
 }
});
