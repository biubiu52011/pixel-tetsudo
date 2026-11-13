'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const w={};
const sandbox=vm.createContext({window:w});
for(const source of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(source,'utf8'),sandbox,{filename:source,timeout:9000});
const gallery60000='../images/列车/東武鉄道/東武鉄道_60000系.png';
const gallery80000='../images/列车/東武鉄道/東武鉄道_80000系.png';
function pos(overrides={}){
 return {
  positionLineId:'Noda',displayLineId:'Noda',
  sourceRailway:'odpt.Railway:Tobu.TobuUrbanPark',
  trainOperator:'Tobu',trainNumber:'419A',
  trainType:'odpt.TrainType:Tobu.Local',
  positionSource:'realtime-api',serviceDate:'2026-11-13',
  vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
  vehicleResolvedFromRealtime:false,actualVehicleConfirmed:false,
  ...overrides
 };
}
test('Noda realtime trains display a clearly illustrative approved 60000 PNG',()=>{
 const result=w.TrainVehicle.selectMarkerArtwork(pos(),false);
 assert.equal(result.kind,'vehicle');
 assert.equal(result.iconSrc,gallery60000);
 assert.equal(result.planned,true);
 assert.equal(result.illustrative,true);
 assert.equal(result.representativeOnly,true);
 assert.equal(result.actualVehicleConfirmed,false);
 assert.match(result.illustrationRole,/not-actual-model/);
 assert.equal(w.VehicleGaragePngMap.matchModelPath('東武60000系',gallery60000,'Noda'),true);
});
test('Noda generic reference supports dated estimated services without inventing numbers',()=>{
 for(const src of ['supabase-train-run','train-timetable']){
  const art=w.TrainVehicle.selectMarkerArtwork(pos({
   trainNumber:'',positionSource:src,estimated:true
  }),false);
  assert.equal(art.kind,'vehicle',src);
  assert.equal(art.iconSrc,gallery60000);
  assert.equal(art.actualVehicleConfirmed,false);
 }
});
test('dated independent single-model plan takes precedence over generic reference',()=>{
 const art=w.TrainVehicle.selectMarkerArtwork(pos({
  positionSource:'supabase-train-run',estimated:true,
  serviceDate:'2026-11-04',
  officialNumberVerified:true,timetableDateVerified:true,
  timetableValidity:'date_verified',calendarType:'weekday',
  railDirection:'odpt.RailDirection:Outbound',
  vehiclePlan:{confirmed:true,models:['東武80000系']}
 }),false);
 assert.equal(art.kind,'vehicle');
 assert.equal(art.iconSrc,gallery80000);
 assert.equal(art.planned,true);
});
test('wrong source, line, restricted service and confirmed identity never get mixed-fleet image',()=>{
 for(const override of [
  {positionLineId:'Tojo',displayLineId:'Tojo'},
  {displayLineId:'Tojo'},
  {sourceRailway:'odpt.Railway:Tobu.Tojo'},
  {sourceRailway:'',trainOperator:''},
  {trainOperator:'JR-East'},
  {trainType:'odpt.TrainType:Tobu.LimitedExpress'},
  {trainNumber:'999B'},
  {vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true},
  {vehicleResolvedFromRealtime:true},
  {actualVehicleConfirmed:true},
  {vehicleFormationId:'61101F'},
  {vehicleFormationCandidates:['61101F','81601F']}
 ]){
  const art=w.TrainVehicle.selectMarkerArtwork(pos(override),false);
  assert.notEqual(art.iconSrc,gallery60000,JSON.stringify(override));
 }
});
test('failed artwork returns a neutral icon rather than retrying the broken PNG',()=>{
 const art=w.TrainVehicle.selectMarkerArtwork(pos(),true);
 assert.notEqual(art.iconSrc,gallery60000);
 assert.ok(art.kind==='unresolved'||art.kind==='candidate');
});
