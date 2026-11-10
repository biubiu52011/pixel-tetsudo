'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function loadReferenceMatcher(){
  const window={};
  const context=vm.createContext({window,console});
  for(const path of [
    'data/timetables/vehicle-garage-png-map.js',
    'data/timetables/train-number-png-ranges.js'
  ]) vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
  return window;
}
// This is a synthetic test fixture, not a claim that 801M is published in 2611.
function plannedSqlRun(changes={}){
  return {
    trainNumber:'801M',positionLineId:'ChuoCentral',displayLineId:'ChuoCentral',
    serviceDate:'2026-11-11',calendarType:'weekday',
    positionSource:'supabase-train-run',estimated:true,
    officialNumberVerified:true,timetableDateVerified:true,
    timetableValidity:'date_verified',
    sourceRailway:'odpt.Railway:JR-Central.Chuo',trainOperator:'JR-Central',
    trainType:'odpt.TrainType:JR-Central.Local',
    railDirection:'odpt.RailDirection:Outbound',
    scheduledStopKeys:['Nagoya','JRC-TokaidoCentral-067',
      'JRC-ChuoCentral-003','JRC-ChuoCentral-020'],
    ...changes
  };
}
const png='../images/列车/JR東海/JR東海_315系.png';
test('ChuoCentral 315 PNG belongs to its own approved reference gallery',()=>{
  const w=loadReferenceMatcher();
  assert.equal(w.VehicleGaragePngMap.matchModelPath('315系',png,'ChuoCentral'),true);
  assert.equal(w.VehicleGaragePngMap.matchModelPath('315系',png,'ChuoRapid'),false);
});
test('dated, numbered Nagoya–Nakatsugawa SQL commuter train selects only a reference PNG',()=>{
  const w=loadReferenceMatcher(),p=plannedSqlRun();
  const result=w.TrainNumberPngRanges.match('801M','ChuoCentral',p);
  assert.ok(result);
  assert.equal(result.model,'315系');
  assert.equal(result.pngPath,png);
  assert.equal(result.illustrative,true);
  assert.equal(result.referenceOnly,true);
  assert.equal(result.actualVehicleConfirmed,false);
  assert.equal(w.TrainNumberPngRanges.match('801M','ChuoMain',p),null);
  const holiday=plannedSqlRun({serviceDate:'2026-11-03',calendarType:'holiday'});
  assert.ok(w.TrainNumberPngRanges.match('801M','ChuoCentral',holiday));
});
test('number-only, live, other operator, other month, limited express and unknown segments cannot pick 315',()=>{
  const w=loadReferenceMatcher(),p=plannedSqlRun();
  const rejected=[
    {},{officialNumberVerified:false},{timetableDateVerified:false},
    {timetableValidity:'unverified'},{estimated:false},
    {positionSource:'realtime-api'},
    {sourceRailway:'odpt.Railway:JR-East.Chuo'},
    {trainOperator:'JR-East'},{serviceDate:'2026-12-11'},
    {calendarType:'holiday'},
    {trainType:'odpt.TrainType:JR-Central.LimitedExpress'},
    {trainType:'odpt.TrainType:JR-Central.HomeLiner'},
    {scheduledStopKeys:[]},
    {scheduledStopKeys:['JRC-ChuoCentral-020','JRC-ChuoCentral-021']},
    {scheduledStopKeys:['Nagoya','JRC-ChuoCentral-003','JRC-ChuoCentral-003']},
    {scheduledStopKeys:['JRC-ChuoCentral-020','Nagoya']},
    {railDirection:'odpt.RailDirection:Inbound'},
    {vehicleIdentityStatus:'EXACT'},{vehiclePlan:{models:['383系']}},
    {plannedVehicleCandidates:['315系','383系']},
    {realtimeVehicleType:'313系'}
  ];
  for(const change of rejected)
    assert.equal(w.TrainNumberPngRanges.match('801M','ChuoCentral',
      plannedSqlRun(change)),null,JSON.stringify(change));
  assert.equal(w.TrainNumberPngRanges.match('1001M','ChuoCentral',
    plannedSqlRun()),null,'caller train number must equal SQL source');
});
test('missing timetable is announced from an audited SQL status, not inferred from zero positions',()=>{
  const render=fs.readFileSync('js/trains-render.js','utf8');
  const page=fs.readFileSync('js/trains-page.js','utf8');
  const t=fs.readFileSync('js/translations.js','utf8');
  assert.match(render,/runStatus\.auditCoverageStatus === "missing_all_plans"/);
  assert.match(render,/runStatus\.planAvailability === "unconfirmed"/);
  assert.match(render,/runStatus\.source !== "SOURCE_ERROR"/);
  assert.match(page,/auditedMissingPlan/);
  assert.equal(t.split('"trains.plan_not_imported_note"').length-1,4);
  // No train runs are invented by a gallery, status, or importer migration.
  const sql=fs.readFileSync('supabase/migrations/20261111100000_jr_central_shared_authorized_plan_import.sql','utf8');
  assert.match(sql,/No published 2026-11 trains are created by this schema migration/);
});
