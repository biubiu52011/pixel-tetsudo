'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261108225500_fukuchiyama_correct_evening_rapid_and_kounotori.sql');
const edge=read('supabase/functions/train-runs/index.ts');
const index=read('data/timetables/train-number-png-ranges.js');
const context={window:{},Date,console:{log(){},warn(){},error(){},debug(){}}};
vm.createContext(context);
for(const path of ['data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
  vm.runInContext(read(path),context,{filename:path});
const verify=context.window.TrainNumberPngRanges.verifyFukuchiyamaSourceFleet;
const marker=context.window.TrainVehicle.selectMarkerArtwork;
const officialModels=['287系','289系'];
const oldModels=['207系','321系','223系6000番台','225系6000番台'];
function sample({id,no,stops,dir,day='2026-11-08',type='LimitedExpress'}){
 const holiday=day==='2026-11-08';
 const proof={
  source:'sql-jrwest-fukuchiyama-2611-historical-fleet-reference',
  lineId:'Fukuchiyama',sourceTemplateId:id,sourceTrainId:no,
  serviceDate:day,calendar:holiday?'odpt.Calendar:SaturdayHoliday':'odpt.Calendar:Weekday',
  direction:'odpt.RailDirection:'+dir,trainType:'odpt.TrainType:JR-West.'+type,
  sourceStopKeys:stops.slice(),candidateModels:officialModels.slice(),
  candidateAssets:[],timetableSourcePath:'data/timetables/Fukuchiyama-manual.js',
  timetableValidity:'undated_not_current_verified',
  numberDateVerified:false,referenceOnly:true,
  actualVehicleConfirmed:false,authorizesPNG:false
 };
 return {
  trainNumber:no,serviceDate:day,positionLineId:'Fukuchiyama',
  displayLineId:'Fukuchiyama',
  sourceRailway:'odpt.Railway:JR-West.Fukuchiyama',
  trainOperator:'JR-West',positionSource:'supabase-train-run',
  trainType:'odpt.TrainType:JR-West.'+type,
  railDirection:'odpt.RailDirection:'+dir,serviceId:proof.calendar,
  calendarType:holiday?'holiday':'weekday',
  scheduledStopKeys:stops.slice(),estimated:true,
  timetableDateVerified:true,vehicleIdentityStatus:'UNKNOWN',
  vehicleResolvedUpstream:false,vehicleResolvedFromRealtime:false,
  vehicleFormationId:'',vehicleFormationCandidates:[],
  plannedVehicleCandidates:officialModels.slice(),
  plannedVehicleCandidateStatus:'unresolved',
  vehiclePlan:null,sqlPublishedNumberFleetReference:proof
 };
}

test('corrects seven source-only rapid categories and three specific LimitedExpress sources',()=>{
 assert.match(sql,/68158,68159,68164,68170,68172,68312,68313/);
 assert.match(sql,/68314,68315,68168/);
 assert.match(sql,/candidate_models=ARRAY\['287系','289系'\]::text\[\]/);
 assert.match(sql,/source_template_id NOT IN\(68244,68245,68251,68252,68314,68315,68168\)/);
 assert.match(sql,/cardinality\(operating_dates\)/);
 assert.match(sql,/2026-11-29/);
 assert.match(sql,/source_stop_count/);
 assert.match(sql,/authorizes_png OR number_date_verified/);
 assert.doesNotMatch(sql,/\bUPDATE public\.train_timetable_stops\b/);
 assert.doesNotMatch(sql,/\bINSERT INTO public\.train_timetables\b/);
});
test('SQL keeps 3028/7025 original southern stop clocks and appends official north stops',()=>{
 assert.match(sql,/stop_sequence=stop_sequence\+10 WHERE template_id IN\(68314,68315\)/);
 assert.match(sql,/stop_sequence=stop_sequence\+20 WHERE template_id=68168/);
 for(const needle of ['3028M','Fukuchiyama','20:02','Kaibara-Hyogo','20:21',
  'Shinoyamaguchi','20:42','7025MH','Osaka','21:10','Tanigawa',
  '22:29','Kuroi-Tamba','22:47','23:03'])assert.ok(sql.includes(needle),needle);
 assert.match(sql,/source_template_id IN\(68314,68315\)\)<>14/);
 assert.match(sql,/source_template_id=68168\)<>11/);
});
test('dated 3028MH and 7025MH have vehicle-family references but no PNG',()=>{
 for(const [id,no,stops,dir] of [
  [68315,'3028MH',['Fukuchiyama','Kaibara-Hyogo','Shinoyamaguchi',
    'Sanda-Hyogo','Takarazuka','Amagasaki','Osaka'],'Inbound'],
  [68168,'7025MH',['Osaka','Amagasaki','Takarazuka','Sanda-Hyogo',
    'Shinmita','Sou-No','Shinoyamaguchi','Tanigawa','Kaibara-Hyogo',
    'Kuroi-Tamba','Fukuchiyama'],'Outbound']
 ]){
  const p=sample({id,no,stops,dir});
  const proof=verify(p);
  assert.ok(proof,no);
  assert.deepEqual(Array.from(proof.candidateModels),officialModels,no);
  assert.equal(proof.authorizesPNG,false);
  assert.equal(proof.authorizesIllustration,false);
  assert.equal(proof.illustrationPng,'');
  const art=marker(p);
  assert.equal(art.kind,'candidate',no);
  assert.equal(art.iconSrc,'',no);
  assert.equal(art.actualVehicleConfirmed,false);
  assert.equal(verify({...p,serviceDate:'2026-12-01'}),null);
  assert.equal(verify({...p,trainType:'odpt.TrainType:JR-West.Local'}),null);
  assert.equal(verify({...p,scheduledStopKeys:stops.slice(1)}),null);
  assert.equal(verify({...p,sqlPublishedNumberFleetReference:{...p.sqlPublishedNumberFleetReference,
    sourceTemplateId:71234}}),null);
 }
});
test('existing 3008/3010 date-verified LimitedExpress family now remains visible as candidates',()=>{
 const p=sample({id:68245,no:'3008MH',
  stops:['Fukuchiyama','Kuroi-Tamba','Kaibara-Hyogo','Tanigawa',
    'Shinoyamaguchi','Sanda-Hyogo','Takarazuka','Amagasaki','Osaka'],
  dir:'Inbound'});
 assert.deepEqual(Array.from(verify(p).candidateModels),officialModels);
 assert.equal(marker(p).kind,'candidate');
 assert.match(index,/expressPublicBySource/);
 assert.match(edge,/const expressSourceIds=\[68244,68245,68251,68252,68314,68315,68168\]/);
 assert.match(edge,/vehicle_plan_confirmed=false/);
 assert.match(edge,/vehicle_artwork_path=null/);
});
