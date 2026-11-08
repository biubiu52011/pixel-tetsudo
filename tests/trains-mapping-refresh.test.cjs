'use strict';
// Mapping evidence may arrive after position coordinates. Verify both
// DataFusion notification and the existing train-detail view fingerprint.
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const fusion=fs.readFileSync('js/data-fusion.js','utf8');
const fStart=fusion.indexOf('  function classifyPositionChanges(');
const fEnd=fusion.indexOf('  function emitUpdate(',fStart);
assert.ok(fStart>=0&&fEnd>fStart,'DataFusion change owner moved');
const fusionContext=vm.createContext({
  _positionIdentity(p){return String(p.runningChainId||p.trainId||'');},
  JSON
});
vm.runInContext(fusion.slice(fStart,fEnd)+
  '\nthis.classifyPositionChanges=classifyPositionChanges;',fusionContext);
const classify=fusionContext.classifyPositionChanges;

const page=fs.readFileSync('js/trains-page.js','utf8');
const pStart=page.indexOf('posHash += (_tp.runningChainId');
const pEnd=page.indexOf('\n                  ;',pStart);
assert.ok(pStart>=0&&pEnd>pStart,'Detail fingerprint owner moved');
const fingerprint=vm.runInNewContext(
  '(function(_tp){var posHash="",_pi=0;\n'+
  page.slice(pStart,pEnd)+'\n;return posHash;})',
  {JSON,Math},{timeout:2000});

const base={
  trainId:'Yokohama_408K',trainNumber:'408K',
  stationIndex:1,segmentToIndex:2,segmentProgress:0.25,
  positionLineId:'Yokohama',sourceRailway:'odpt.Railway:JR-East.Yokohama',
  trainOperator:'JR-East',railDirection:'Inbound',
  trainType:'odpt.TrainType:JR-East.Local',
  calendarType:'weekday',serviceId:'odpt.Calendar:Weekday',
  serviceDate:'2026-11-09',positionSource:'supabase-train-run',
  plannedVehicleCandidates:['E233系6000番台'],
  vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
};
test('stationary Yokohama train refreshes on any PNG-mapping evidence change',()=>{
  const cases=[
    ['trainNumber','999K'],
    ['sourceRailway','odpt.Railway:JR-East.KeihinTohokuNegishi'],
    ['positionLineId','KeihinTohoku'],
    ['fusionLineId','KeihinTohoku'],
    ['fusionRole','extension'],
    ['trainOperator','JR-West'],
    ['railDirection','Outbound'],
    ['trainType','odpt.TrainType:JR-East.LimitedExpress'],
    ['calendarType','holiday'],
    ['serviceId','odpt.Calendar:SaturdayHoliday'],
    ['realtimeVehicleType','E233系1000番台'],
    ['realtimeDerivedVehicleType','E233系1000番台'],
    ['timetableVehicleType','E233系1000番台'],
    ['officialNumberVerified',true],
    ['plannedVehicleCandidates',['E233系6000番台','E233系1000番台']],
    ['plannedVehicleCandidateStatus','unresolved-mixed-fleet'],
    ['plannedVehicleCandidateArtworkPath','../images/wrong.png'],
    ['plannedVehicleCandidateArtworkStatus','official'],
    ['candidateArtworkConfirmedByDatedRule',true],
    ['vehicleIconPath','../images/changed.png'],
    ['vehicleResolvedUpstream',true],
    ['vehicleResolvedFromRealtime',true],
    ['vehicleResolvedFromRealtimeDerived',true],
    ['vehiclePlan',{status:'FLEET_REFERENCE',models:['E233系6000番台']}]
  ];
  for(const [field,value]of cases){
    const changed={...base,[field]:value};
    const observed=classify([base],[changed]);
    assert.ok(observed.display||observed.position,'DataFusion suppressed '+field);
    assert.notEqual(fingerprint(base),fingerprint(changed),
      'detail SVG did not invalidate for '+field);
  }
});
test('ordinary unchanged evidence does not force a redraw',()=>{
  const copy={...base,plannedVehicleCandidates:['E233系6000番台']};
  const delta=classify([base],[copy]);
  assert.deepEqual([delta.position,delta.display,delta.metadata],[false,false,false]);
  assert.equal(fingerprint(base),fingerprint(copy));
});
test('source expiry remains metadata-only, movement remains position change',()=>{
  const expiry=classify([base],[{...base,sourceValidUntil:'2026-11-09T23:59:00Z'}]);
  assert.equal(expiry.metadata,true);
  assert.equal(expiry.position,false);
  assert.equal(expiry.display,false);
  const moved=classify([base],[{...base,stationIndex:2}]);
  assert.equal(moved.position,true);
  assert.notEqual(fingerprint(base),fingerprint({...base,stationIndex:2}));
});
