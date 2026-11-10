'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
test('Kawagoe west 186 six-stop ODPT sources are 2611-edition scoped and source protected',()=>{
 const ingestion=read('supabase/migrations/20261110180000_enable_kawagoe_complete_odpt_train_schedule_after_sample_reconciliation.sql');
 const roster=read('supabase/migrations/20261110183000_kawagoe_2611_six_stop_odpt_source_roster_and_shared_fleet.sql');
 const edge=read('supabase/functions/train-runs/index.ts');
 assert.match(ingestion,/odpt-api:v1:Kawagoe/);
 assert.match(ingestion,/KAWAGOE_SAMPLE_HAS_CANONICAL_CONTINUATION/);
 assert.match(roster,/KAWAGOE_2611_ODPT_ROSTER_CHANGED/);
 assert.match(roster,/public.published_kawagoe_2611_source_roster/);
 assert.match(roster,/ENABLE ROW LEVEL SECURITY/);
 assert.match(roster,/source_stop_signature/);
 assert.match(roster,/E231系3000番台.*209系3500番台/);
 assert.match(edge,/KAWAGOE_2611_SIX_STOP_EVIDENCE_DRIFT/);
 assert.match(edge,/result.length!==93/);
 assert.match(edge,/source_stop_signature!==signature/);
 assert.match(edge,/run.timetable_date_verified=true/);
 assert.match(edge,/kawagoeNovemberComplete/);
 assert.match(edge,/verified_2611_kawagoe_six_stop/);
 const mapping=read('supabase/migrations/20261110060453_kawagoe_shared_working_number_and_dated_carsets_2611.sql');
 assert.match(mapping,/INSERT INTO train_timetable_operation_evidence/);
 assert.match(mapping,/INSERT INTO operation_vehicle_observations/);
 assert.match(mapping,/KAWAGOE_WORKING_POSTCHECK/);
 assert.match(edge,/reportedMappingLevel:reportedModel\?"dated_volunteer_observed_model":null/);
});
test('Kawagoe SQL positions require dated verification in every month',()=>{
 const host={};
 vm.runInNewContext(read('data/core/runtime-config.js'),{window:host,console,Date,Object});
 assert.deepEqual(Array.from(host.RuntimeConfig.SQL_POSITION_VERIFICATION_MONTHS.Kawagoe),['*']);
 assert.equal(read('data/core/data-config-bundle.js'),require('../data/core/gen-config-bundle.js').buildBundle());
 const est=read('js/train-position-estimator.js');
 assert.match(est,/requireSqlDateProof && tt\._timetableDateVerified!==true\) continue/);
 assert.match(est,/officialKawagoePlan/);
 assert.match(est,/kw\.singleModelUnresolved===true/);
 assert.match(est,/kw\.candidateModels\.join/);
});
test('shared working cannot become a single E231 or 209 physical PNG',()=>{
 const root={},ctx=vm.createContext({window:root,Date,
  console:{log(){},warn(){},debug(){},error(){}},
  _isTrainArtworkFailureActive(){return false}});
 for(const path of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-sotetsu-jr-direct-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js','data/timetables/vehicle-operation-evidence-data.js'
 ])vm.runInContext(read(path),ctx,{filename:path});
 const models=['E231系3000番台','209系3500番台'];
 const arts=['../images/列车/JR東日本/JR東日本_E231系_3000番台.png',
             '../images/列车/JR東日本/JR東日本_209系_3500番台.png'];
 for(let i=0;i<2;i++) assert.equal(root.VehicleGaragePngMap.matchModelPath(models[i],arts[i],'Kawagoe'),true);
 function position(date='2026-11-10'){
   return {trainNumber:'1060H',serviceDate:date,positionLineId:'Kawagoe',
    displayLineId:'Kawagoe',positionSource:'supabase-train-run',estimated:true,
    timetableDateVerified:true,vehicleIdentityStatus:'UNKNOWN',
    plannedVehicleCandidateStatus:'unresolved-mixed-fleet',
    plannedVehicleCandidates:models.slice(),
    sqlPublishedNumberFleetReference:{
     source:'sql-jreast-kawagoe-2611-shared-fleet',lineId:'Kawagoe',
     trainNumber:'1060H',serviceDate:date,
     referenceOnly:true,actualVehicleConfirmed:false,authorizesPNG:false,
     singleModelUnresolved:true,departure2611Verified:true,
     fleetEvidenceGrade:'C',candidateModels:models.slice(),candidateAssets:arts.slice()}
   };
 }
 const p=position(),art=root.TrainVehicle.selectMarkerArtwork(p,false);
 assert.equal(art.kind,'candidate');
 assert.equal(art.iconSrc,'');
 assert.equal(art.actualVehicleConfirmed,false);
 assert.deepEqual(Array.from(art.candidateModels),models);
 assert.deepEqual(Array.from(art.candidateAssets),arts);
 for(const bad of [
  {timetableDateVerified:false},
  {serviceDate:'2026-12-10'},
  {sqlPublishedNumberFleetReference:{...p.sqlPublishedNumberFleetReference,
   singleModelUnresolved:false}},
  {sqlPublishedNumberFleetReference:{...p.sqlPublishedNumberFleetReference,
   candidateModels:[models[0]]}},
  {sqlPublishedNumberFleetReference:{...p.sqlPublishedNumberFleetReference,
   authorizesPNG:true}}
 ]) assert.equal(root.TrainVehicle.selectMarkerArtwork({...p,...bad},false).iconSrc,'');
  // The 2026-11-10 61 duty was independently reported as 209-3500/HAE51.
  // It can display a dated, representative PNG, never an actual-carset claim.
  const reportedBase={...p,
    plannedVehicleCandidateStatus:'dated-reported-single-model',
    plannedVehicleCandidates:[models[1]],
    sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,
      workingOperationCode:'61',
      reportedModel:models[1],
      reportedFormation:'ハエ51',
      reportedModelArtworkPath:arts[1],
      reportedOperationCode:'61',
      reportedEvidenceUrl:'https://loo-ool.com/rail/W/00/20261110/',
      reportedEvidenceGrade:'C',
      reportedIsActual:false,
      reportedMappingLevel:'dated_volunteer_observed_model'
    }
  };
  const reported=root.TrainVehicle.selectMarkerArtwork(reportedBase,false);
  assert.equal(reported.kind,'vehicle');
  assert.match(reported.iconSrc,/209系_3500番台\.png$/);
  assert.equal(reported.illustrative,true);
  assert.equal(reported.actualVehicleConfirmed,false);
  assert.equal(reported.reportedFormation,'ハエ51');
  // The previous day used a different carset and model in the SAME duty.
  const nov9={...reportedBase,serviceDate:'2026-11-09',
    plannedVehicleCandidates:[models[0]],
    sqlPublishedNumberFleetReference:{
      ...reportedBase.sqlPublishedNumberFleetReference,
      serviceDate:'2026-11-09',reportedModel:models[0],
      reportedFormation:'ハエ45',reportedModelArtworkPath:arts[0],
      reportedEvidenceUrl:'https://loo-ool.com/rail/W/00/20261109/'
    }
  };
  const prev=root.TrainVehicle.selectMarkerArtwork(nov9,false);
  assert.equal(prev.kind,'vehicle');
  assert.match(prev.iconSrc,/E231系_3000番台\.png$/);
  assert.equal(prev.actualVehicleConfirmed,false);
  for(const wrong of [
    {serviceDate:'2026-11-11'},
    {sqlPublishedNumberFleetReference:{
      ...reportedBase.sqlPublishedNumberFleetReference,reportedEvidenceGrade:'D'}},
    {sqlPublishedNumberFleetReference:{
      ...reportedBase.sqlPublishedNumberFleetReference,reportedFormation:'ハエ45'}},
    {sqlPublishedNumberFleetReference:{
      ...reportedBase.sqlPublishedNumberFleetReference,reportedEvidenceUrl:'https://loo-ool.com/rail/W/00/20261109/'}},
    {sqlPublishedNumberFleetReference:{
      ...reportedBase.sqlPublishedNumberFleetReference,reportedOperationCode:'75'}},
    {plannedVehicleCandidateStatus:'unresolved-mixed-fleet'},
    {vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:false}
  ]) {
    const art=root.TrainVehicle.selectMarkerArtwork({...reportedBase,...wrong},false);
    assert.equal(art.iconSrc,'');
  }
});
test('no new Kawagoe prose panel: candidate label is train-local',()=>{
 const render=read('js/trains-render.js');
 const page=read('js/trains-page.js');
 assert.match(render,/if \(lineId === "Kawagoe" && p\.timetableDateVerified === true\)/);
 assert.match(render,/共通運用・実車未確認/);
 assert.doesNotMatch(page,/if \(lineId === "Kawagoe"\) \{/);
});
