'use strict';
// Jōban Main source-only E531 is an illustrative gallery entry, NEVER an
// actual consist or a verified current 2611 timetable/operating-day claim.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root={};
const ctx=vm.createContext({window:root,Date,
  console:{debug(){},warn(){},log(){},error(){}},
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
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
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const png='../images/列车/JR東日本/JR東日本_E531系.png';
const fn=root.TrainVehicle.lookupJobanMainSourceOnlyE531Illustration;
function sourceOnly(extra={}){
  return {
    estimated:true,positionSource:'supabase-train-run',
    positionLineId:'JobanMain',displayLineId:'JobanMain',
    sourceRailway:'odpt.Railway:JR-East.Joban',trainOperator:'JR-East',
    canonicalGroupEvidence:'source_only',canonicalLineIds:[],
    timetableValidity:'undated_not_current_verified',
    timetableDateVerified:false,vehicleIdentityStatus:'UNKNOWN',
    canonicalTimetableId:49700,
    runningChainId:'canonical-sql-trip:2026-11-05:49700',
    trainNumber:'520M',serviceDate:'2026-11-05',calendarType:'weekday',
    trainType:'odpt.TrainType:JR-East.Local',
    railDirection:'odpt.RailDirection:Inbound',
    plannedVehicleCandidateStatus:'source_single_type_candidate',
    plannedVehicleCandidates:['E531系'],
    scheduledStopKeys:['Mito','Katsuta'],...extra
  };
}
test('JobanMain source-only E531 is illustrative and uses approved JR East gallery',()=>{
  const image=fn(sourceOnly());
  assert.ok(image);
  assert.equal(image.pngPath,png);
  assert.equal(image.model,'E531系');
  assert.equal(image.referenceOnly,true);
  assert.equal(image.illustrative,true);
  assert.equal(image.actualVehicleConfirmed,false);
  assert.equal(root.VehicleGaragePngMap.matchModelPath('E531系',png,'JobanMain'),true);
});
test('reject ambiguous north stock, unverified provenance, and cross-line leakage',()=>{
  for(const fields of [
    {plannedVehicleCandidates:['701系','E721系']},
    {plannedVehicleCandidates:['E531系','E721系']},
    {plannedVehicleCandidates:[]},
    {plannedVehicleCandidateStatus:'unresolved'},
    {canonicalGroupEvidence:'verified_continuation'},
    {canonicalLineIds:['Joban','JobanMain']},
    {canonicalLineIds:null},
    {canonicalTimetableId:null},
    {runningChainId:'canonical-sql-trip:2026-11-05:49701'},
    {positionLineId:'Joban'},
    {displayLineId:'Joban'},
    {sourceRailway:'odpt.Railway:JR-East.JobanRapid'},
    {sourceRailway:'odpt.Railway:JR-East.Mito'},
    {trainOperator:'JR-West'},
    {timetableValidity:'date_verified'},
    {timetableDateVerified:true},
    {vehicleIdentityStatus:'EXACT'},
    {vehicleIdentityStatus:'NARROWED'},
    {vehicleResolvedUpstream:true},
    {vehicleResolvedFromRealtime:true},
    {vehicleResolution:{identityStatus:'EXACT'}},
    {actualVehicleConfirmed:true},
    {vehicleFormationId:'K423'},
    {realtimeVehicleType:'E657系'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E531系']}},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',models:['E531系','E657系']}},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',models:['701系']}},
    {vehicleIconPath:'custom.png'},
    {positionSource:'realtime-api'},
    {estimated:false},
    {serviceDate:'2026-12-01'},
    {serviceDate:'2026-11-07'},
    {trainNumber:'521M'},
    {trainNumber:'1M'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {calendarType:'holiday'},
    {scheduledStopKeys:['Mito']}
  ]){
    assert.equal(fn(sourceOnly(fields)),null,JSON.stringify(fields));
  }
  const mixed=sourceOnly({trainNumber:'222M',
    plannedVehicleCandidateStatus:'unresolved',
    plannedVehicleCandidates:['701系','E721系']});
  assert.equal(root.TrainVehicle.lookupJobanMainSourceOnlyE531Illustration(mixed),null);
});
test('canonical Joban E531 and published E657 lookups stay independently scoped',()=>{
  const ex=root.TrainVehicle.lookupTrainNumberRangePng({
    trainNumber:'2M',serviceDate:'2026-11-05',calendarType:'weekday',
    positionLineId:'JobanMain',sourceRailway:'odpt.Railway:JR-East.Joban',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.LimitedExpress',
    positionSource:'supabase-train-run',estimated:true
  });
  assert.ok(ex);
  assert.equal(ex.model,'E657系');
  assert.equal(fn(sourceOnly({trainNumber:'2M'})),null);
});
