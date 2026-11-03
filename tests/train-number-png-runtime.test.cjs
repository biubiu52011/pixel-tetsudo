'use strict';
/* Train number -> approved PNG -> actual SVG marker.
 * Feed exactly the fields delivered by ODPT realtime and Supabase SQL.
 * A known MODEL is still PLANNED, never a claimed physical carset.
 * node --test tests/train-number-png-runtime.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root={},ctx=vm.createContext({
  window:root,Date,console:{debug(){},warn(){},log(){},error(){}},
  _isTrainArtworkFailureActive(){return false}
});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0 && end>start,'map SVG marker selection functions missing');
vm.runInContext(render.slice(start,end),ctx,{filename:'js/trains-render.js:marker'});
function live(extra={}){
  return {
    trainNumber:'8084M',trainId:'odpt:train:8084M',
    serviceDate:'2026-11-03',calendarType:'holiday',
    sourceRailway:'odpt.Railway:JR-East.Chuo',
    positionLineId:'ChuoMain',trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    positionSource:'realtime-api',estimated:false,
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    ...extra
  };
}
function sql(extra={}){
  const x=live({...extra,positionSource:'supabase-train-run',estimated:true});
  if(!Object.prototype.hasOwnProperty.call(extra,'calendarType')){
    x.calendarType='';
    x.serviceId='odpt.Calendar:SaturdayHoliday';
  }
  return x;
}
const png='../images/列车/JR東日本/JR東日本_E353系.png';
function marker(p,lineId='ChuoMain'){
  return ctx._trainMarkerSpec(p,p.trainId,lineId);
}
test('ODPT realtime number -> garage PNG -> ChuoMain SVG image without preattached plan',()=>{
  const p=live();
  assert.equal(p.vehiclePlan,undefined);
  const resolved=root.TrainVehicle.lookupTrainNumberPng(p);
  assert.equal(resolved.trainNumber,'8084M');
  assert.equal(resolved.lineId,'ChuoMain');
  assert.equal(resolved.model,'E353系');
  assert.equal(resolved.pngPath,png);
  assert.equal(resolved.source,'official-published-number');
  const m=marker(p);
  assert.equal(m.kind,'vehicle');
  assert.equal(m.compact,false);
  assert.equal(m.planned,true);
  assert.equal(m.iconSrc,png);
  assert.equal(p.vehiclePlan,undefined,'lookup does not mutate actual-day train');
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN','artwork does not prove a carset');
});
test('Supabase SQL train number + source service calendar -> garage PNG on same line',()=>{
  const p=sql();
  assert.equal(p.calendarType,'');
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p).pngPath,png);
  assert.equal(marker(p).iconSrc,png);
  assert.equal(marker(p).planned,true);
});
test('Supabase certified single-model plan uses the same number-to-PNG map',()=>{
  const run={
    trainNumber:'37M',calendar:'odpt.Calendar:SaturdayHoliday',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    railDirection:'odpt.RailDirection:Inbound',
    destinationStationUrn:'odpt.Station:JR-East.Chuo.Shiojiri',
    timetableIdentity:'canonical-test-37M'
  };
  const tt={
    _positionSource:'supabase-train-run',
    _sqlVehicleMappingLevel:'official_service_vehicle_plan',
    _sqlVerifiedPublishedVehicleType:'E353系',
    _sqlVerifiedPublishedVehicleSourceUrl:'https://www.jreast.co.jp/train/express/azusa_kaiji.html',
    _serviceDate:'2026-11-03',
    'odpt:trainType':'odpt.TrainType:JR-East.LimitedExpress',
    'odpt:railway':'odpt.Railway:JR-East.Chuo',
    'odpt:operator':'odpt.Operator:JR-East',
    'odpt:trainTimetableObject':[]
  };
  const identity=root.TrainVehicle.resolveTimetableRun(
    run,tt,'ChuoMain',{operator:'JR-East'},'2026-11-03');
  const p=sql({
    trainNumber:'37M',
    vehiclePlan:identity.vehicleResult.vehiclePlan
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p).pngPath,png);
  assert.equal(marker(p).iconSrc,png);
  assert.equal(marker(p).planned,true);
  assert.equal(identity.vehicleResult.identityStatus,'UNKNOWN');
});
test('wrong date, line, source railway, train type, operator or missing fields never get PNG',()=>{
  for(const p of [
    live({serviceDate:'2026-11-07'}),
    live({serviceDate:''}),
    live({calendarType:''}),
    live({trainNumber:'442M',trainType:'odpt.TrainType:JR-East.Local'}),
    live({sourceRailway:'odpt.Railway:JR-East.Joban'}),
    live({positionLineId:'Joban'}),
    live({trainOperator:'JR-Central'}),
    live({trainType:'odpt.TrainType:JR-East.Local'}),
    live({displayLineId:'ChuoRapid'}),
    live({trainNumber:''}),
    sql({serviceId:'',calendarType:''})
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null,
      'invalid reference must not map '+JSON.stringify(p));
    assert.equal(marker(p,p.displayLineId||p.positionLineId).kind,'unresolved');
  }
});
test('date-restricted 9086M is mapped only on 22/23 November, never 3 November',()=>{
  const allowed=live({trainNumber:'9086M',serviceDate:'2026-11-22'});
  const denied=live({trainNumber:'9086M',serviceDate:'2026-11-03'});
  assert.equal(marker(allowed).iconSrc,png);
  assert.equal(marker(denied).kind,'unresolved');
});
test('conflicting upstream model candidates cannot silently be replaced by same-number PNG',()=>{
  const p=live({vehiclePlan:{
    lineId:'ChuoMain',status:'PLANNED_CANDIDATES',
    models:['211系（長野地区）'],iconPath:''
  }});
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null);
  assert.equal(marker(p).kind,'unresolved');
});
test('failed image requests fall back to neutral dot without changing the train number',()=>{
  const p=live();
  const trainNo=p.trainNumber;
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...p,displayLineId:'ChuoMain'},true).kind,'unresolved');
  assert.equal(p.trainNumber,trainNo);
});
test('renderer always queries the unified number-to-PNG selector on the displayed line',()=>{
  assert.match(render,/TrainVehicle\.selectMarkerArtwork\(selectionPosition, artworkFailed\)/);
  assert.match(render,/displayLineId: lineId/);
  assert.match(render,/var markerSpec = _trainMarkerSpec\(p, trainUid, lineId\)/);
  assert.match(render,/caption\.textContent=captionBase;/,
    'ordinary train numbers must not reappear in folded list');
});
