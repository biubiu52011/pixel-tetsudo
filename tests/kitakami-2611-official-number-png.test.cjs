'use strict';
/* JR East 2611 Kitakami: NO railway on Hotto-Yuda–Yokote,
 * 9729/9730 Hinabi only October, 725D Sunday/national-holiday off.
 * PNG is reference fleet, never individual vehicle or realtime location.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const p of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-kitakami-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:p});
const render=fs.readFileSync('js/trains-render.js','utf8');
const a=render.indexOf('  function _trainMarkerDomKind(');
const b=render.indexOf('  // Public identification boundary:',a);
assert.ok(a>=0&&b>a);
vm.runInContext(render.slice(a,b),ctx);
const idx=win.JREastKitakamiNumberIndex202611;
const png='../images/列车/JR東日本/JR東日本_キハ110系.png';
const urn=k=>'odpt.Station:JR-East.'+k;
function stops(from,to,start='07:30',end='08:00',mid=[]){
  return [
    {'odpt:departureStation':urn(from),'odpt:departureTime':start},
    ...mid.map(k=>({'odpt:departureStation':urn(k),
      'odpt:departureTime':'07:45'})),
    {'odpt:arrivalStation':urn(to),'odpt:arrivalTime':end}
  ];
}
function position(n,dir,date='2026-11-05',cal='weekday',extra={}){
  return {trainNumber:n,positionLineId:'Kitakami',trainOperator:'JR-East',
    sourceRailway:idx.railway,
    railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.Local',
    calendarType:cal,serviceDate:date,
    positionSource:'supabase-train-run',estimated:true,
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    plannedVehicleCandidates:['キハ110系'],officialNumberVerified:true,
    ...extra};
}
function verify(p,raw){
  return idx.verify(p.trainNumber,p.sourceRailway,p.railDirection,
    p.trainType,p.calendarType,p.serviceDate,raw);
}
test('five precisely numbered SQL locals validate route and render KiHa110',()=>{
  assert.deepEqual(Array.from(idx.inbound),['722D','724D','736D']);
  assert.deepEqual(Array.from(idx.outbound),['725D','735D']);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('キハ110系',png,'Kitakami'),true);
  for(const [n,route]of Object.entries(idx.routes)){
    const weekday=position(n,route.dir),sourceStops=stops(route.from,route.to);
    assert.equal(verify(weekday,sourceStops).number,n);
    const v=win.TrainVehicle.lookupTrainNumberRangePng(weekday);
    assert.equal(v?.pngPath,png,n);
    assert.equal(v?.planned,true);
    const marker=ctx._trainMarkerSpec(weekday,n,'Kitakami');
    assert.equal(marker.kind,'vehicle');
    assert.equal(marker.iconSrc,png);
    assert.equal(marker.planned,true);
    assert.equal(weekday.vehicleIdentityStatus,'UNKNOWN');
    const unverified=position(n,route.dir,'2026-11-05','weekday',
      {officialNumberVerified:false});
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(unverified),null,
      'no raw-stop verified position => no PNG');
  }
});
test('725D Saturdays run; Sundays and November holidays do not',()=>{
  const route=idx.routes['725D'],src=stops(route.from,route.to);
  assert.equal(verify(position('725D','Outbound','2026-11-07','holiday'),src).number,'725D');
  for(const d of ['2026-11-01','2026-11-03','2026-11-08',
    '2026-11-15','2026-11-22','2026-11-23','2026-11-29']){
    assert.equal(verify(position('725D','Outbound',d,'holiday'),src),false,d);
  }
  assert.equal(verify(position('735D','Outbound','2026-11-08','holiday'),
    stops('Kitakami','Hotto-Yuda')).number,'735D');
});
test('flood damaged bus section, October-only Hinabi and fake numbers excluded',()=>{
  for(const [n,dir]of [['9729D','Outbound'],['9730D','Inbound'],
      ['3730D','Inbound'],['723D','Outbound']]){
    const p=position(n,dir,'2026-11-07','holiday');
    assert.equal(verify(p,stops('Kitakami','Hotto-Yuda')),false,n);
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null,n);
  }
  for(const raw of [
    stops('Kitakami','Yokote',undefined,undefined,['Hotto-Yuda']),
    stops('Kitakami','Hotto-Yuda',undefined,undefined,['Yokote']),
    stops('Kitakami','Fujine'),
    []
  ])assert.equal(verify(position('735D','Outbound'),raw),false);
  const wrong=position('722D','Inbound');
  for(const extra of [
    {sourceRailway:'odpt.Railway:JR-East.Yamada'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainOperator:'JR-West'},
    {positionLineId:'Yamada'},
    {serviceDate:'2026-12-01'}, {calendarType:'holiday'},
    {plannedVehicleCandidates:['キハ100系']},
    {realtimeVehicleType:'キハ100系'}
  ])assert.equal(win.TrainVehicle.lookupTrainNumberRangePng({...wrong,...extra}),null,
    'bad '+JSON.stringify(extra));
  assert.equal(verify(position('722D','Inbound','2026-12-01'),stops('Hotto-Yuda','Kitakami')),null);
});
test('estimator drops October special and impossible route; verifies public train number',()=>{
  const iso='2026-11-04T22:45:00Z'; // Nov 5 07:45 JST
  class FixedDate extends Date{
    constructor(...a){super(...(a.length?a:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},JREastKitakamiNumberIndex202611:idx,
    ODPTClient:{LINE_RAILWAY_CODE:{Kitakami:'Kitakami'},
      LINE_TO_OPERATOR:{Kitakami:'JR-East'}}};
  const runtime=vm.createContext({window:root,Date:FixedDate,console:quiet});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),runtime);
  function timetable(n,dir,from,to,mid=[]){
    const raw=stops(from,to,'07:30','08:00',mid);
    return {'@id':'sql:Kitakami:'+n,
      'odpt:trainNumber':n,'odpt:railway':idx.railway,
      'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:'+dir,
      'odpt:trainType':'odpt.TrainType:JR-East.Local',
      'odpt:destinationStation':[urn(to)],
      'odpt:trainTimetableObject':raw,
      _positionSource:'supabase-train-run',_sqlLineId:'Kitakami',
      _serviceDate:'2026-11-05',_timetableDateVerified:false,
      _timetableValidity:'undated_not_current_verified'};
  }
  root.TrainPositionEstimator.registerManualTimetable('Kitakami',[
    timetable('722D','Inbound','Hotto-Yuda','Kitakami'),
    timetable('725D','Outbound','Kitakami','Fujine'),
    timetable('735D','Outbound','Kitakami','Yokote',['Hotto-Yuda']),
    timetable('9729D','Outbound','Kitakami','Hotto-Yuda')
  ]);
  const positions=root.TrainPositionEstimator.estimateAllPositions({
    Kitakami:{stations:['Kitakami','Yanagihara','Ezuriko','Fujine',
      'Tatekawame','Yokokawame','Iwasawa','Waka-Sennin',
      'Yuda-Kinshuko','Hotto-Yuda','Yokote'],operator:'JR-East'}
  },{},{},null,{lineIds:['Kitakami']}).Kitakami||[];
  assert.deepEqual(Array.from(positions,p=>p.trainNumber),['722D','725D']);
  for(const p of positions){
    assert.equal(p.officialNumberVerified,true);
    assert.equal(p.estimated,true);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    assert.equal(p.timetableDateVerified,false);
  }
});
