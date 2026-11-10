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
 assert.match(edge,/reportedMappingLevel:reportedModel\?"dated_train_number_observation":null/);
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
  // Direct train-number 1060H is reported 209-3500/HAE51 on 2026-11-10.
  // Source C permits dated illustration but not a certified actual carset.
  const reportedBase={...p,
    plannedVehicleCandidateStatus:'dated-reported-single-model',
    plannedVehicleCandidates:[models[1]],
    sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,
      reportedModel:models[1],
      reportedFormation:'ハエ51',
      reportedModelArtworkPath:arts[1],
      reportedTrainNumber:'1060H',
      reportedEvidenceUrl:'https://loo-ool.com/rail/W/00/20261110/',
      reportedEvidenceGrade:'C',
      reportedIsActual:false,
      reportedMappingLevel:'dated_train_number_observation'
    }
  };
  const reported=root.TrainVehicle.selectMarkerArtwork(reportedBase,false);
  assert.equal(reported.kind,'vehicle');
  assert.match(reported.iconSrc,/209系_3500番台\.png$/);
  assert.equal(reported.illustrative,true);
  assert.equal(reported.actualVehicleConfirmed,false);
  assert.equal(reported.reportedFormation,'ハエ51');
  // The same published train can own a *live position* and retain
  // its independently dated C-grade PNG as a non-physical illustration.
  const live={trainNumber:'1060H',serviceDate:'2026-11-10',
    positionLineId:'Kawagoe',displayLineId:'Kawagoe',
    sourceRailway:'odpt.Railway:JR-East.Kawagoe',
    railDirection:'Inbound',positionSource:'realtime-api',
    estimated:false,vehicleIdentityStatus:'UNKNOWN',
    datedVehicleDisplayReference:{...reportedBase,
      sourceRailway:'odpt.Railway:JR-East.Kawagoe',
      railDirection:'Inbound'}};
  const bridged=root.TrainVehicle.selectMarkerArtwork(live,false);
  assert.equal(bridged.kind,'vehicle');
  assert.match(bridged.iconSrc,/209系_3500番台\.png$/);
  assert.equal(bridged.actualVehicleConfirmed,false);
  assert.equal(bridged.illustrative,true);
  for(const bad of [
    {trainNumber:'1062H'},{serviceDate:'2026-11-09'},
    {positionLineId:'Hachiko',displayLineId:'Hachiko'},
    {vehicleIdentityStatus:'EXACT'},{vehicleResolvedFromRealtime:true},
    {vehicleFormationId:'ハエ51'}, {datedVehicleDisplayReference:null}
  ]) assert.equal(root.TrainVehicle.selectMarkerArtwork({...live,...bad},false).iconSrc,'');
  const fusion=read('js/data-fusion.js');
  assert.match(fusion,/attachKawagoeDatedArtworkToLive/);
  assert.match(fusion,/matches\.length!==1\|\|liveCount\[k\]!==1/);
  assert.match(fusion,/sourceFromStation/);

  // The SAME train number used a different reported model the previous day.
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
      ...reportedBase.sqlPublishedNumberFleetReference,reportedTrainNumber:'999H'}},
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

test('direct date+train-number SQL evidence is the only runtime vehicle selector',()=>{
 const migration=read('supabase/migrations/20261110195000_kawagoe_2611_dated_train_number_direct_vehicle_observations.sql');
 const edge=read('supabase/functions/train-runs/index.ts');
 const est=read('js/train-position-estimator.js');
 const vehicle=read('js/train-vehicle.js');
 const renderer=read('js/trains-render.js');
 assert.ok(migration.includes('INSERT INTO public.train_vehicle_observations'));
 assert.ok(migration.includes('FROM _kw_direct)<>164'));
 assert.ok(migration.includes("WHERE t.line_key='Kawagoe'"));
 assert.ok(migration.includes("source_key='kw-reported-'"));
 assert.ok(edge.includes('.from("train_vehicle_observations")'));
 assert.ok(edge.includes('observationByNumber.get(String(run.train_number'));
 assert.ok(edge.includes('reportedTrainNumber:reportedModel?run.train_number:null'));
 assert.ok(edge.includes('reportedMappingLevel:reportedModel?"dated_train_number_observation":null'));
 assert.ok(est.includes('officialKawagoePlan.reportedTrainNumber===run.trainNumber'));
 assert.ok(vehicle.includes('kw.reportedTrainNumber===p.trainNumber'));
 assert.ok(renderer.includes('kawagoeRef.reportedTrainNumber===kwNo'));
 const start=edge.indexOf('  // Kawagoe WEST (Kawagoe');
 const end=edge.indexOf('  // Sotetsu-JR 2611:',start);
 assert.ok(start>=0&&end>start);
 const scoped=edge.slice(start,end);
 assert.ok(!scoped.includes('.from("operation_vehicle_observations")'));
});
