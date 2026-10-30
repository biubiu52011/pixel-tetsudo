'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const sql=fs.readFileSync(
 'supabase/migrations/20261030125204_scoped_conventional_local_fleet_and_corridor_evidence_20261030.sql',
 'utf8');
for(const expected of [
 'PLAN:OFFICIAL-OSAKALOOP-LOCAL-323-REFERENCE',
 'PLAN:OFFICIAL-KANSAI-RAPID-223-225-REFERENCE',
 'CORRIDOR:OFFICIAL-KAGOSHIMA-813-817-MOJIKO-ARAO',
 'CORRIDOR:OFFICIAL-NIPPO-813-817-KOKURA-USA',
 'CORRIDOR:OFFICIAL-CHIKUHI-303-305-MEINOHAMA-NISHIKARATSU',
 'CORRIDOR:OFFICIAL-CHIKUHI-103-CHIKUZENMAEBARU-KARATSU',
 'JR西日本323系','JR西日本223系','JR西日本225系',
 'JR九州103系','JR九州303系','JR九州305系','JR九州813系','JR九州817系',
 'PARTIAL_FLEET_REFERENCE_UNDATED',
 'CORRIDOR:OFFICIAL-%',
 'needsSegmentVerification',
 'segment_inventory_not_timetable_plan',
 'fleetCompleteness'
]){
 assert.ok(sql.includes(expected),'missing evidence contract: '+expected);
}
assert.match(sql,/official_conventional_corridor_fleet_inventory/);
assert.match(sql,/CREATE OR REPLACE VIEW rail_audit\.official_conventional_timetable_plans/);
assert.match(sql,/false AS actual_vehicle_confirmed/);
assert.match(sql,/false AS dispatch_confirmed/);
assert.match(sql,/NULL::text AS exact_png_path/);
assert.match(sql,/REVOKE ALL ON rail_audit\.official_conventional_corridor_fleet_inventory/);
assert.match(sql,/REVOKE ALL ON rail_audit\.official_conventional_timetable_plans/);
assert.doesNotMatch(sql,/\bUPDATE\s+public\.train_runs\b/i);
assert.doesNotMatch(sql,/\bINSERT\s+INTO\s+public\.train_timetable_vehicle_mappings\b/i);
const js=fs.readFileSync('js/train-vehicle.js','utf8');
const injected=js.replace(
 'window.TrainVehicle = {',
 'window.__testPlanResolution = resolveTimetableVehiclePlan;\nwindow.TrainVehicle = {'
);
assert.notEqual(injected,js);
const w={};vm.runInNewContext(injected,{window:w,console:{debug(){},warn(){},error(){}}},
 {filename:'js/train-vehicle.js',timeout:15000});
const c=w.TrainVehicle.resolveCanonicalVehicle('JR西日本323系');
assert.ok(c && c.candidateOnly===true && !c.asset && !c.plannedAsset,
 'no generic 323 PNG: do not reuse particular livery variants');
const local=w.__testPlanResolution('JR西日本323系',
 {operator:'JR-West',lineId:'OsakaLoop'});
assert.equal(local.status,'PLANNED_MODEL');
assert.equal(local.iconPath,'');
const rapid=w.__testPlanResolution('JR西日本223系 / JR西日本225系',
 {operator:'JR-West',lineId:'TokaidoKansai'});
assert.equal(rapid.status,'PLANNED_CANDIDATES');
assert.equal(rapid.iconPath,'','223/225 mixed fleet cannot project single PNG');
const wrongLine=w.__testPlanResolution('JR西日本323系',
 {operator:'JR-West',lineId:'Nippo'});
assert.equal(wrongLine.iconPath,'');
console.log('JR West local rapid and JR Kyushu scoped corridor source contract: PASS');
