'use strict';
/* 2026-11 Boso nominal train-number / SVG sprite contract.
 * Source numbers are already present in the owner's SQL timetable and
 * are cross-referenced with JR East Nov 2026 line schedules:
 * 221u/d (Uchibo), 220u/d (Sotobo). This does not recertify full SQL
 * times or assert same-day physical trainset allocations.
 * Run: node --test tests/boso-202611-number-artwork.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const window={};
const ctx=vm.createContext({
  window,Date,console:{debug(){},log(){},warn(){},error(){}},
  _isTrainArtworkFailureActive(){return false}
});
const files=[
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-chiba-number-index-202611.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
];
for(const file of files)
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const a=render.indexOf('  function _trainMarkerDomKind(');
const b=render.indexOf('  // Public identification boundary:',a);
assert.ok(a>=0&&b>a);
vm.runInContext(render.slice(a,b),ctx,{filename:'trains-render.js:marker'});
const picture={
  boso209:'../images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png',
  keiyo233:'../images/列车/JR東日本/JR東日本_E233系5000番台.png',
  sobu235:'../images/列车/JR東日本/JR東日本_E235系_1000番台.png',
  express257:'../images/列车/JR東日本/JR東日本_E257系_500番台.png'
};
function position(number,line,kind='Local',source='realtime-api',
  calendar='weekday'){
  return {
    trainNumber:number,
    trainId:'odpt.Train:JR-East.'+line+'.'+number,
    positionLineId:line,
    sourceRailway:'odpt.Railway:JR-East.'+line,
    trainOperator:source==='supabase-train-run'?'':'JR-East',
    trainType:'odpt.TrainType:JR-East.'+kind,
    serviceDate:calendar==='weekday'?'2026-11-04':'2026-11-03',
    calendarType:calendar,positionSource:source,
    estimated:source!=='realtime-api',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  };
}
test('existing Boso 209 nominal numbered M reference selects PNG but not physical identity',()=>{
  for(const [line,numbers] of [
    ['Uchibo',['123M','129M','137M','1133M']],
    ['Sotobo',['221M','244M','286M','1226M']]
  ])for(const number of numbers)for(const source of
    ['realtime-api','supabase-train-run','train-timetable']){
    const p=position(number,line,'Local',source);
    const ref=window.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(ref,line+' '+number+' '+source);
    assert.equal(ref.trainNumber,number);
    assert.equal(ref.model,'209系2000番台 / 2100番台');
    assert.equal(ref.pngPath,picture.boso209);
    assert.equal(ref.representative,true);
    const spec=ctx._trainMarkerSpec(p,p.trainId,line);
    assert.equal(spec.kind,'vehicle');
    assert.equal(spec.iconSrc,picture.boso209);
    assert.equal(spec.planned,true);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    assert.equal(p.vehiclePlan,undefined);
  }
});
test('Sotobo Y stock reference stays numbered and is not a Keiyo-wide fleet claim',()=>{
  for(const n of ['3680Y','4883Y','5680Y','5983Y']){
    const p=position(n,'Sotobo');
    const ref=window.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(ref,n);
    assert.equal(ref.trainNumber,n);
    assert.equal(ref.pngPath,picture.keiyo233);
    assert.equal(ctx._trainMarkerSpec(p,p.trainId,'Sotobo').iconSrc,picture.keiyo233);
  }
  const conflicting=position('3680Y','Sotobo');
  conflicting.vehiclePlan={status:'PLANNED_CANDIDATES',
    models:['E233系5000番台','209系500番台']};
  assert.equal(window.TrainVehicle.lookupTrainNumberRangePng(conflicting),null);
});
test('previously indexed E235 rapid and E257 Wakashio / Sazanami remain distinct',()=>{
  for(const [line,n,kind,expected] of [
    ['Uchibo','3680F','Rapid',picture.sobu235],
    ['Sotobo','3591F','Rapid',picture.sobu235],
    ['Sotobo','1051M','LimitedExpress',picture.express257],
    ['Uchibo','1002M','LimitedExpress',picture.express257]
  ]){
    const p=position(n,line,kind);
    const ref=window.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(ref,n+' '+line);
    assert.equal(ref.pngPath,expected);
    assert.equal(ctx._trainMarkerSpec(p,p.trainId,line).iconSrc,expected);
  }
});
test('Boso M, F, A, Y suffixes never imply one stock type without matching source',()=>{
  const base=position('221M','Sotobo');
  for(const extra of [
    {trainNumber:'222M'},{trainNumber:'1051M'},
    {trainNumber:'221F'},{trainNumber:'221A'},
    {trainNumber:'221Y'},{trainNumber:'1235M'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {positionLineId:'Uchibo'},
    {sourceRailway:'odpt.Railway:JR-East.Uchibo'},
    {trainOperator:'JR-Central'},
    {serviceDate:'2026-10-31'},
    {serviceDate:'2026-12-01'},
    {realtimeVehicleType:'E131系'},
    {realtimeVehicleType:'E233系5000番台'},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',models:[
      '209系','E233系（房総地区・改造車）']}}
  ]){
    const p={...base,...extra};
    assert.equal(window.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'invalid 209 train-number photo reference '+JSON.stringify(extra));
  }
  assert.equal(ctx._trainMarkerSpec(base,base.trainId,'Uchibo').kind,'unresolved');
  assert.equal(window.TrainVehicle.selectMarkerArtwork(
    {...base,displayLineId:'Sotobo'},true).kind,'unresolved');
});
