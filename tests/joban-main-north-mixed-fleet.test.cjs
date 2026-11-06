'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root={},ctx=vm.createContext({window:root,Date,
  console:{debug(){},warn(){},log(){},error(){}},
  _isTrainArtworkFailureActive(){return false}});
for(const f of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/nambu-branch-official-202611.js',
 'data/timetables/joban-e231-h-202611-index.js',
 'data/timetables/jreast-keihin-2611-number-index.js',
 'data/timetables/jreast-yokohama-2611-number-index.js',
 'data/timetables/jreast-yamanote-2611-number-index.js',
 'data/timetables/jreast-regional-2611-number-index.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js',
 'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const N=root.TrainVehicle.lookupJobanMainNorthMixedCandidates;
const up=['Sakamoto','Shinchi','Komagamine','Soma','Nittaki','Kashima','Haranomachi'];
function row(extra={}){
 return {
  estimated:true,positionSource:'supabase-train-run',
  positionLineId:'JobanMain',displayLineId:'JobanMain',
  sourceRailway:'odpt.Railway:JR-East.Joban',trainOperator:'JR-East',
  canonicalGroupEvidence:'source_only',canonicalLineIds:[],
  timetableValidity:'undated_not_current_verified',timetableDateVerified:false,
  vehicleIdentityStatus:'UNKNOWN',canonicalTimetableId:49700,
  runningChainId:'canonical-sql-trip:2026-11-05:49700',
  trainNumber:'222M',serviceDate:'2026-11-05',calendarType:'weekday',
  trainType:'odpt.TrainType:JR-East.Local',railDirection:'odpt.RailDirection:Inbound',
  plannedVehicleCandidateStatus:'unresolved',
  plannedVehicleCandidates:['701系','E721系'],scheduledStopKeys:up,
  ...extra
 };
}
test('all 50 historical north numbers in two calendars yield candidate-only metadata',()=>{
 const numbers=Array.from({length:52},(_,i)=>i+222)
   .filter(n=>n!==224&&n!==229);
 assert.equal(numbers.length,50);
 let count=0;
 for(const [date,calendar] of [['2026-11-05','weekday'],['2026-11-07','holiday']]){
  for(const n of numbers){
   const direction=n%2===0?'Inbound':'Outbound';
   const short=n===250||n===270?['Sakamoto','Shinchi']:
      n===255||n===271?['Shinchi','Sakamoto']:direction==='Inbound'?up:up.slice().reverse();
   const p=row({trainNumber:n+'M',serviceDate:date,calendarType:calendar,
     runningChainId:'canonical-sql-trip:'+date+':49700',
     railDirection:'odpt.RailDirection:'+direction,scheduledStopKeys:short});
   const matched=N(p);
   assert.ok(matched,JSON.stringify({n,date,direction,short}));
   assert.equal(matched.authorizesPNG,false);
   assert.equal(matched.actualVehicleConfirmed,false);
   assert.equal(matched.candidateModels.join('|'),'701系|E721系');
   assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false).kind,'candidate');
   assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false).iconSrc,'');
   count++;
  }
 }
 assert.equal(count,100);
});
test('source mismatch and false carset evidence cannot authorize northern candidate metadata',()=>{
 for(const delta of [
  {trainNumber:'224M'},{trainNumber:'229M'},{trainNumber:'274M'},
  {serviceDate:'2026-12-01'},{serviceDate:'2026-11-07'},
  {calendarType:'holiday'},{railDirection:'odpt.RailDirection:Outbound'},
  {scheduledStopKeys:['Sakamoto','Shinchi','Kashima','Haranomachi']},
  {scheduledStopKeys:['Sendai',...up]},
  {plannedVehicleCandidates:['701系']},{plannedVehicleCandidates:['E531系']},
  {canonicalGroupEvidence:'verified_continuation'},{canonicalLineIds:['Joban']},
  {positionLineId:'Joban'},{displayLineId:'Joban'},
  {sourceRailway:'odpt.Railway:JR-East.JobanRapid'},
  {timetableDateVerified:true},{vehicleIdentityStatus:'EXACT'},
  {vehicleFormationId:'F28'},{vehicleResolvedFromRealtime:true},
  {positionSource:'realtime-api'},{runningChainId:'bad'}
 ]){
  assert.equal(N(row(delta)),null,JSON.stringify(delta));
 }
});
test('701 Sendai and E721 Sendai assets are gated to north candidate, not exact image',()=>{
 const p1='../images/列车/JR東日本/JR東日本_701系_仙台地区.png';
 const p2='../images/列车/JR東日本/JR東日本_E721系_仙台地区.png';
 assert.equal(root.VehicleGaragePngMap.matchModelPath('701系',p1,'JobanMain'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('E721系',p2,'JobanMain'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('701系',p1,'Joban'),false);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('E721系',p2,'JobanLocal'),false);
 const marker=root.TrainVehicle.selectMarkerArtwork(row(),false);
 assert.equal(marker.kind,'candidate');
 assert.equal(marker.iconSrc,'');
 assert.equal(marker.planned,false);
 assert.equal(marker.actualVehicleConfirmed,false);
 assert.deepEqual(Array.from(marker.candidateAssets),[p1,p2]);
});
