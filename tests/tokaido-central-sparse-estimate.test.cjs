'use strict';
// TEST-ONLY timetable anchors; they are deliberately fabricated fixture times.
// Never load this file as a timetable or copy it into production Supabase.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const railway=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');

function makeContext(iso){
 class Clock extends Date{
  constructor(...args){super(...(args.length?args:[iso]));}
  static now(){return Date.parse(iso);}
 }
 const window={ODPTClient:{
  LINE_RAILWAY_CODE:{TokaidoCentral:'Tokaido'},
  LINE_TO_OPERATOR:{TokaidoCentral:'JR-Central'}
 },RuntimeConfig:{}};
 vm.runInNewContext(estimator,{window,Date:Clock,
  console:{debug(){},warn(){},log(){},error(){}}});
 return window;
}
const urn=station=>'odpt.Station:JR-Central.Tokaido.'+station;
function fixture(number,date,depart,arrive,overrides={}){
 return {
  '@id':'test-only-TokaidoCentral-'+date+'-'+number,
  'odpt:trainNumber':number,
  'odpt:railway':'odpt.Railway:JR-Central.Tokaido',
  'odpt:operator':'odpt.Operator:JR-Central',
  'odpt:calendar':'odpt.Calendar:Weekday',
  'odpt:railDirection':'odpt.RailDirection:Outbound',
  'odpt:trainType':'odpt.TrainType:JR-Central.Local',
  'odpt:destinationStation':[urn('Toyohashi')],
  'odpt:trainTimetableObject':[
   {'odpt:departureStation':urn('Hamamatsu'),'odpt:departureTime':depart},
   {'odpt:arrivalStation':urn('Toyohashi'),'odpt:arrivalTime':arrive}
  ],
  _positionSource:'supabase-train-run',
  _sqlLineId:'TokaidoCentral',
  _serviceDate:date,
  _timetableDateVerified:true,
  _timetableValidity:'date_verified',
  _canonicalGroupEvidence:'source_only',
  ...overrides
 };
}
function run(iso,rows){
 const w=makeContext(iso);
 w.TrainPositionEstimator.registerManualTimetable('TokaidoCentral',rows);
 const estimated=w.TrainPositionEstimator.estimateAllPositions(
  {TokaidoCentral:railway.lines.TokaidoCentral},{},{},null,
  {lineIds:['TokaidoCentral']});
 return estimated.TokaidoCentral||[];
}
test('a date-verified sparse two-stop SQL trip creates an estimated position',()=>{
 // 2026-11-11 06:39 JST, mid-way between fictitious 06:22 and 06:56 anchors.
 const positions=run('2026-11-10T21:39:00Z',[
  fixture('921M','2026-11-11','06:22','06:56')
 ]);
 assert.equal(positions.length,1);
 const p=positions[0];
 assert.equal(p.trainNumber,'921M');
 assert.equal(p.positionSource,'supabase-train-run');
 assert.equal(p.estimated,true);
 assert.equal(p.timetableDateVerified,true);
 assert.equal(p.serviceDate,'2026-11-11');
 const stations=railway.lines.TokaidoCentral.stations;
 assert.equal(stations[p.stationIndex],'Hamamatsu');
 assert.equal(stations[p.segmentToIndex],'Toyohashi');
 assert.ok(p.segmentProgress>0.35&&p.segmentProgress<0.65,
  'position should interpolate between two factual anchors once imported');
 assert.notEqual(p.vehicleIdentityStatus,'EXACT');
});
test('out-of-date, out-of-window and absent timetable cannot create trains',()=>{
 const a=fixture('921M','2026-11-11','06:22','06:56');
 assert.equal(run('2026-11-10T21:39:00Z',[]).length,0);
 assert.equal(run('2026-11-10T21:39:00Z',[{...a,_serviceDate:'2026-11-12'}]).length,0);
 assert.equal(run('2026-11-10T20:00:00Z',[a]).length,0);
 assert.equal(run('2026-11-10T22:15:00Z',[a]).length,0);
});
test('the test-only schedule is not a deployed timetable or parallel simulator',()=>{
 const code=fs.readFileSync('js/data-fusion.js','utf8');
 assert.match(code,/registerManualTimetable\(lineId, rows\)/);
 assert.match(code,/getCachedTrainRuns\(lineId\)/);
 const sql=fs.readFileSync('supabase/migrations/20261111100000_jr_central_shared_authorized_plan_import.sql','utf8');
 assert.match(sql,/JRC_PLAN_SOURCE_RIGHTS_UNVERIFIED/);
 assert.match(sql,/public\.manual_timetable_templates/);
 assert.doesNotMatch(sql,/INSERT INTO public\.train_runs\b/i);
});
