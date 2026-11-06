'use strict';
// Kabe line 2611: quarantine old synthetic Yokokawa–Kabe clocks,
// never reuse Wakayama 227 PNG, preserve 227 Red Wing as fleet evidence.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const sql=fs.readFileSync(
 'supabase/migrations/20261107055500_jrwest_kabe_2611_source_quarantine.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
const fleet=fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8');
const ctx={window:{},Date,console:{warn(){},log(){},error(){},debug(){}}};
vm.createContext(ctx);
for(const path of ['data/timetables/vehicle-garage-png-map.js','js/train-vehicle.js'])
 vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const gallery=ctx.window.VehicleGaragePngMap;
const vehicle=ctx.window.TrainVehicle;
test('87 old Kabe clocks are a guarded archive, NOT real 2611 positions',()=>{
 for(const token of [
  'published_jrwest_kabe_2611_source_quarantine',
  "source_train_number ~ '^70[0-9]{2}MH?$'",
  "gaps[1:10]=ARRAY[4,4,4,4,4,4,4,4,4,4]",
  'gaps[11]=3',
  "WHERE line_key='Kabe'",
  "'data/timetables/Kabe-manual.js'",
  "cardinality(stops)=12",
  "CHECK(NOT authorizes_2611_position)",
  "CHECK(NOT authorizes_png)",
  "CHECK(NOT number_date_verified)",
  "CHECK(NOT actual_vehicle_confirmed)",
  "<>87","<>54","<>33"])
  assert.ok(sql.includes(token),token);
});
test('official 2611-number references are only 740M / 866M / 868M',()=>{
 for(const [number,source,calendar] of [
  ['740M','139551','saturday_holiday'],
  ['866M','140121','daily'],
  ['868M','140131','daily']]){
  assert.ok(sql.includes("('"+number+"','"+calendar+
    "','https://timetable.jr-odekake.net/train-timetable/"+source+
    "?date=20261031')"),number);
 }
 for(const tag of [
  "number_evidence='official_2026_11_issue_reference_only'",
  'official_timetable_issue',
  "origin_key text NOT NULL DEFAULT 'Aki-Kameyama'",
  "destination_key text NOT NULL DEFAULT 'Hiroshima'",
  'authorizes_2611_position boolean NOT NULL DEFAULT false',
  'stop_clocks_verified boolean NOT NULL DEFAULT false',
  "line_fleet text NOT NULL DEFAULT '227系0番台（Red Wing）'"])
  assert.ok(sql.includes(tag),tag);
 assert.ok(!sql.includes("('7001M','daily'"));
});
test('Kabe fleet is 227 Red Wing; Wakayama 227 WK gallery is NOT authorized',()=>{
 assert.ok(fleet.includes("lineIds:['Kure','Kabe']"));
 assert.ok(fleet.includes("models:['JR西日本227系0番台']"));
 assert.deepEqual(Array.from(gallery.lineModels('Kabe')),[]);
 const wakayama='../images/列车/JR西日本/JR西日本_227系_WK.png';
 assert.equal(gallery.matchModelPath('JR西日本227系（WK）',wakayama,'Kabe'),false);
 for(const n of ['7001M','7073MH','740M','866M','868M']){
  const pos={lineId:'Kabe',positionLineId:'Kabe',displayLineId:'Kabe',
    trainNumber:n,serviceDate:'2026-11-07',
    estimated:true,vehicleIdentityStatus:'UNKNOWN',
    vehicleType:'JR西日本227系（WK）',
    vehicleIconPath:wakayama,
    vehiclePlan:{models:['227系0番台（Red Wing）'],confirmed:false}};
  const selected=vehicle.selectMarkerArtwork(pos,false);
  assert.equal(selected.iconSrc,'',n);
  assert.notEqual(selected.kind,'exact',n);
 }
});
test('edge quarantines matching old 87 without denying line service or inventing clocks',()=>{
 const start=edge.indexOf('// Kabe / 可部線:');
 const end=edge.indexOf('// The existing manual timetable owner may certify',start);
 assert.ok(start>0&&end>start);
 const guard=edge.slice(start,end);
 for(const token of [
  'lineId==="Kabe"',
  'selectedCalendar==="odpt.Calendar:Weekday"?54',
  'selectedCalendar==="odpt.Calendar:SaturdayHoliday"?33',
  'published_jrwest_kabe_2611_source_quarantine',
  'published_jrwest_kabe_2611_number_reference',
  'KABE_2611_SYNTHETIC_SOURCE_COVERAGE_CHANGED',
  'KABE_2611_LEGACY_QUARANTINE_MISSING',
  'KABE_2611_SOURCE_PROOF_CONFLICT',
  'KABE_2611_OFFICIAL_NUMBER_REFERENCE_CONFLICT',
  'LEGACY_SYNTHETIC_CLOCKS_QUARANTINED',
  'quarantined_legacy_sources:expected',
  'official_number_fleet_references:currentRefs',
  'no_service_confirmed:false','complete:false','runs:[]'
 ])assert.ok(guard.includes(token),token);
 assert.ok(!guard.includes('number_date_verified:true'));
 assert.ok(!guard.includes('authorizes_png:true'));
});
test('stale client SQL cache cannot revive ghost 70xxM/MH trains',()=>{
 const anchor=estimator.indexOf('// Kabe SQL\'s 7001M–7087MH');
 const next=estimator.indexOf('// Yamagata local-only 2611:',anchor);
 assert.ok(anchor>0&&next>anchor);
 const guard=estimator.slice(anchor,next);
 assert.ok(guard.includes('lineId==="Kabe"'));
 assert.ok(guard.includes('tt._positionSource==="supabase-train-run"'));
 assert.ok(guard.includes('^2026-11-\\d{2}$'));
 assert.ok(guard.includes('^70[0-9]{2}MH?$'));
 assert.ok(guard.includes('continue;'));
 for(const n of ['7001M','7054M','7055MH','7087MH'])
  assert.match(n,/^70[0-9]{2}MH?$/);
 for(const n of ['740M','866M','868M','2760M','800M'])
  assert.doesNotMatch(n,/^70[0-9]{2}MH?$/);
});
