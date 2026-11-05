'use strict';
/* 2026-11 Chuo-Sobu yellow local / Tozai source separation.
 * The original 1179 SQL rows are historical source data, not a verified
 * 659 number/clock roster or a B/C->physical-formation assignment.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},ctx=vm.createContext({window:win,Date,console:{
 log(){},debug(){},warn(){},error(){}
},_isTrainArtworkFailureActive(){return false}});
for(const path of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const e235='../images/列车/JR東日本/JR東日本_E235系_0番台_B31編成_中央・総武線.png';
const e231='../images/列车/JR東日本/JR東日本_E231系_500番台_中央・総武線各駅停車.png';
const sql=fs.readFileSync('supabase/migrations/'+
 '20261106190000_chuo_sobu_local_2611_historical_1179_source_scope_and_m_exclusions.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const fleet=fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8');
test('E235 B31 artwork is approved as Chuo-Sobu catalogue reference only',()=>{
 const gallery=win.VehicleGaragePngMap;
 assert.equal(fs.existsSync('images/列车/JR東日本/JR東日本_E235系_0番台_B31編成_中央・総武線.png'),true);
 assert.equal(gallery.matchModelPath('E235系0番台（中央・総武線各駅停車）',e235,'ChuoSobuLocal'),true);
 assert.equal(gallery.matchModelPath('E235系0番台（中央・総武線各駅停車）',e235,'Yamanote'),false);
 assert.equal(gallery.matchModelPath('E231系500番台',e231,'ChuoSobuLocal'),true);
 assert.equal(gallery.findModel('E235系0番台（中央・総武線各駅停車）','ChuoSobuLocal').length,1);
 assert.equal(gallery.findModel('E235系0番台（中央・総武線各駅停車）','ChuoSobuLocal')[0].canonicalImage,false,
  'B31 image cannot certify a daily B/C trainset');
});
test('fleet candidates include three families, never infer a 2026 E235 B31 from B train number',()=>{
 const start=fleet.indexOf("id:'jr-chuo-sobu-local'");
 assert.ok(start>=0);
 const local=fleet.slice(start,start+400);
 for(const name of ['E231系500番台','E231系0番台（中央・総武線各駅停車）',
  'E235系0番台（中央・総武線各駅停車）'])
  assert.ok(local.includes(name),'missing candidate '+name);
 for(const n of ['437B','403C','1003C','2005B']){
  const p={sourceRailway:'odpt.Railway:JR-East.ChuoSobuLocal',
   railDirection:'odpt.RailDirection:Westbound',trainType:'odpt.TrainType:JR-East.Local',
   trainNumber:n,positionLineId:'ChuoSobuLocal',calendarType:'weekday',
   serviceDate:'2026-11-06',positionSource:'supabase-train-run',
   plannedVehicleCandidates:local.match(/E23[15][^']*/g)||[]};
  assert.equal(win.TrainNumberPngRanges.match(n,'ChuoSobuLocal',p),null);
  assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null,
   'B/C number is not a physical formation / model proof '+n);
 }
});
test('1179 historic sources classified, with E353 M entries quarantined not deleted',()=>{
 for(const s of ["published_chuo_sobu_2611_source_scope",
  "jr_ordinary_bc","tozai_through_ya","foreign_limited_express_m",
  "1179","912","263","<>4","5003M","5050M",
  "historical_not_2611_verified","historical_source_only",
  "png_reference text DEFAULT NULL CHECK(png_reference IS NULL)",
  "actual_vehicle_confirmed boolean NOT NULL DEFAULT false"])
  assert.ok(sql.includes(s),'missing SQL source audit '+s);
 for(const s of ["CHUO_SOBU_2611_SOURCE_SCOPE_UNAVAILABLE",
  'run.vehicle_type_candidates=',
  'run.vehicle_plan_confirmed=false',
  'run.published_number_fleet_reference={',
  'run.train_number_verification="historical-source-only-659-2611"',
  'if(p.segment_key==="foreign_limited_express_m")',
  'run.vehicle_artwork_path=null',
  'run.vehicle_type_label=null'])
  assert.ok(edge.includes(s),'missing backend source guard '+s);
});
test('existing JR 659 / Metro 671 Y/A crosswalk is not converted to B/C model mapping',()=>{
 const map=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
 assert.ok(map.includes('chuoSobuTozai2611'));
 assert.ok(map.includes('throughOwner:"S"'));
 assert.ok(map.includes('throughOwner:"K"'));
 assert.ok(map.includes('numberIndex:"chuo-sobu-tozai-2611"'));
 assert.ok(map.includes('E231系800番台（東西線直通）'));
 assert.ok(!map.includes('numberIndex:"chuo-sobu-2611-e235-bc"'));
});
