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


test('ODPT live 662B keeps realtime location and gets ONE explicitly illustrative yellow PNG',()=>{
 const base={
  trainNumber:'662B',trainId:'odpt.Train:JR-East.ChuoSobuLocal.662B',
  positionSource:'realtime-api',realtimePositionRecordPresent:true,
  estimated:false,trainOperator:'JR-East',
  sourceRailway:'odpt.Railway:JR-East.ChuoSobuLocal',
  positionLineId:'ChuoSobuLocal',railDirection:'odpt.RailDirection:Eastbound',
  trainType:'odpt.TrainType:JR-East.Local',serviceDate:'2026-11-06',
  calendarType:'weekday',vehicleIdentityStatus:'UNKNOWN',
  vehicleResolvedUpstream:false,
  plannedVehicleCandidates:['E231系500番台','E231系0番台','E235系0番台']
 };
 // The numbered model mapping STILL fails closed. Representative artwork
 // must not change the actual vehicle identity, number or realtime status.
 assert.equal(win.TrainNumberPngRanges.match('662B','ChuoSobuLocal',base),null);
 assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(base),null);
 const image=win.TrainVehicle.selectMarkerArtwork({...base,displayLineId:'ChuoSobuLocal'},false);
 assert.equal(image.kind,'vehicle');
 assert.equal(image.iconSrc,e231);
 assert.equal(image.planned,true);
 assert.equal(image.illustrative,true);
 assert.equal(image.representativeOnly,true);
 assert.equal(image.actualVehicleConfirmed,false);
 assert.equal(base.vehicleIdentityStatus,'UNKNOWN');
 assert.equal(base.trainId,'odpt.Train:JR-East.ChuoSobuLocal.662B');
 assert.equal(win.TrainVehicle.selectMarkerArtwork(base,true).kind,'unresolved');
 // B and C are public train-number suffixes, not a B31 carset mapping.
 for(const [number,direction] of [['663B','Westbound'],['662C','Eastbound'],['663C','Westbound']]){
  const p={...base,trainNumber:number,
    trainId:'odpt.Train:JR-East.ChuoSobuLocal.'+number,
    railDirection:'odpt.RailDirection:'+direction};
  assert.equal(win.TrainVehicle.selectMarkerArtwork(p,false).iconSrc,e231);
 }
});
test('unverified ODPT B/C fleet illustration cannot escape JR local source or become a carset',()=>{
 const base={
  trainNumber:'662B',trainId:'odpt.Train:JR-East.ChuoSobuLocal.662B',
  positionSource:'realtime-api',realtimePositionRecordPresent:true,
  estimated:false,trainOperator:'JR-East',
  sourceRailway:'odpt.Railway:JR-East.ChuoSobuLocal',
  positionLineId:'ChuoSobuLocal',displayLineId:'ChuoSobuLocal',
  railDirection:'odpt.RailDirection:Eastbound',
  trainType:'odpt.TrainType:JR-East.Local',
  serviceDate:'2026-11-06',vehicleIdentityStatus:'UNKNOWN'
 };
 const invalid=[
  {trainNumber:'662Y'},{trainNumber:'662A'},{trainNumber:'662F'},
  {trainNumber:'662T'},{trainNumber:'5003M'},
  {trainId:'odpt.Train:JR-East.ChuoRapid.662B'},
  {trainId:'odpt.Train:TokyoMetro.Tozai.662B'},
  {trainId:''},{railDirection:'odpt.RailDirection:Westbound'},
  {sourceRailway:'odpt.Railway:JR-East.SobuRapid'},
  {positionLineId:'SobuRapid'},
  {displayLineId:'ChuoRapid'},
  {trainOperator:'TokyoMetro'},
  {trainType:'odpt.TrainType:JR-East.Rapid'},
  {positionSource:'supabase-train-run'},
  {realtimePositionRecordPresent:false},
  {estimated:true},{serviceDate:'2026-12-01'},
  {serviceDate:'2026-10-31'},
  {vehicleIdentityStatus:'EXACT'},{vehicleResolvedFromRealtime:true},
  {vehicleFormationId:'B31'},
  {realtimeVehicleType:'E235系0番台'},
  {vehicleType:'E231系0番台'},
  {vehicleResolutionLineId:'SobuRapid'},
  {vehicleResolution:{identityStatus:'EXACT'}}
 ];
 for(const bad of invalid){
  const p={...base,...bad};
  const m=win.TrainVehicle.selectMarkerArtwork(p,false);
  assert.notEqual(m.iconSrc,e231,
   'wrong 662B illustration for '+JSON.stringify(bad));
 }
});
test('SVG image is a marked reference while the ODPT position and formation remain unresolved',()=>{
 const render=fs.readFileSync('js/trains-render.js','utf8');
 const start=render.indexOf('  function _trainMarkerDomKind(');
 const end=render.indexOf('  // Public identification boundary:',start);
 assert.ok(start>=0&&end>start);
 vm.runInContext(render.slice(start,end),ctx,{filename:'js/trains-render.js:marker'});
 const p={
  trainNumber:'662B',trainId:'odpt.Train:JR-East.ChuoSobuLocal.662B',
  positionSource:'realtime-api',estimated:false,
  sourceRailway:'odpt.Railway:JR-East.ChuoSobuLocal',
  positionLineId:'ChuoSobuLocal',trainOperator:'JR-East',
  railDirection:'odpt.RailDirection:Eastbound',
  trainType:'odpt.TrainType:JR-East.Local',
  serviceDate:'2026-11-06',vehicleIdentityStatus:'UNKNOWN'
 };
 const marker=ctx._trainMarkerSpec(p,p.trainId,'ChuoSobuLocal');
 assert.equal(marker.kind,'vehicle');
 assert.equal(marker.iconSrc,e231);
 assert.equal(marker.planned,true);
 assert.equal(marker.illustrative,true);
 assert.equal(marker.compact,false);
 assert.equal(ctx._trainMarkerDomKind(marker),'planned');
 ctx._trainMarkerTitle=()=> '列車番号 662B | 普通 | 西船橋 | ODPT リアルタイム';
 const label=ctx._trainMarkerAccessibleDescription(p,'ChuoSobuLocal',marker);
 assert.match(label,/662B/);
 assert.match(label,/路線の代表図/);
 assert.match(label,/編成は未確認/);
 assert.ok(render.includes('data-marker-illustrative'));
 assert.ok(render.includes('data-vehicle-unresolved'));
 assert.ok(render.includes('_syncTrainMarkerIllustrationStatus(existingIcon, markerSpec)'));
 assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
});


test('trains page points to the current PNG selector, renderer and fleet scripts',()=>{
 const crypto=require('node:crypto');
 const html=fs.readFileSync('pages/trains.html','utf8');
 for(const asset of [
  'js/train-vehicle.js','js/trains-render.js',
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js',
  'data/core/major-vehicle-fleet-presets.js'
 ]){
  const buf=fs.readFileSync(asset);
  const sha=crypto.createHash('sha1').update('blob '+buf.length)
    .update(Buffer.from([0])).update(buf).digest('hex').slice(0,12);
  // Git's blob SHA uniquely fingerprints the browser-loaded asset.
  assert.ok(html.includes('../'+asset+'?v='+sha),
    'stale script URL in trains page: '+asset+' expected '+sha);
 }
});
