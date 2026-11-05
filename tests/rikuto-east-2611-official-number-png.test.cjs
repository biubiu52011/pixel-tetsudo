'use strict';
/* 陸羽東線 2026-11 official numbers, 2024 flood suspended segment and
 * KiHa110 planned-only PNG. node --test tests/rikuto-east-2611-official-number-png.test.cjs
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={log(){},debug(){},warn(){},error(){}};
const context=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-rikuto-east-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start);
vm.runInContext(render.slice(start,end),context,{filename:'js/trains-render.js:marker'});
const idx=win.JREastRikutoEastNumberIndex202611;
const src='odpt.Railway:JR-East.RikutoEast';
const png='../images/列车/JR東日本/JR東日本_キハ110系.png';
function position(n,dir,type='Local',date='2026-11-05',cal='weekday',extra={}){
  return {trainNumber:n,positionLineId:'RikutoEast',trainOperator:'JR-East',
    sourceRailway:src,railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.'+type,
    serviceDate:date,calendarType:cal,positionSource:'supabase-train-run',
    estimated:true,plannedVehicleCandidates:['キハ110系'],
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    ...extra};
}
function verify(p){return idx.verify(p.trainNumber,p.sourceRailway,p.railDirection,
  p.trainType,p.calendarType,p.serviceDate);}
test('45 official 2611 regular numbers use only scoped planned KiHa110 PNGs',()=>{
  assert.equal(idx.normalInbound.length,22);
  assert.equal(idx.normalOutbound.length,23);
  assert.equal(new Set([...idx.normalInbound,...idx.normalOutbound]).size,45);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('キハ110系',png,'RikutoEast'),true);
  for(const [numbers,direction] of [[idx.normalInbound,'Inbound'],[idx.normalOutbound,'Outbound']]){
    for(const n of numbers){
      for(const [date,cal] of [['2026-11-05','weekday'],['2026-11-07','holiday']]){
        const p=position(n,direction,'Local',date,cal);
        assert.equal(verify(p).kind,'regular',n+'/'+date);
        const v=win.TrainVehicle.lookupTrainNumberRangePng(p);
        assert.equal(v?.pngPath,png,n+'/'+date);
        assert.equal(v?.planned,true);
        const marker=context._trainMarkerSpec(p,p.trainNumber,'RikutoEast');
        assert.equal(marker.kind,'vehicle',n+'/'+date);
        assert.equal(marker.iconSrc,png);
        assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
      }
    }
  }
});
test('six Omoide Yukemuri 972xD rapids match published November dates and true train type',()=>{
  assert.equal(idx.rapidInbound.length,3);
  assert.equal(idx.rapidOutbound.length,3);
  assert.equal(idx.specialDates.length,12);
  for(const [numbers,dir] of [[idx.rapidInbound,'Inbound'],[idx.rapidOutbound,'Outbound']]){
    for(const n of numbers){
      for(const date of idx.specialDates){
        const cal=date==='2026-11-02'?'weekday':'holiday';
        const p=position(n,dir,'Rapid',date,cal);
        const rule=verify(p);
        assert.equal(rule.kind,'rapid',n+'/'+date);
        assert.equal(rule.trainType,'Rapid');
        assert.equal(rule.serviceName,'おもいで湯けむり'+parseInt(n.slice(0,-1),10)%10+'号');
        assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p)?.pngPath,png);
      }
      // Legacy SQL imports holiday-calendar Rapid as Local. Index may
      // admit that RECORD but the estimate must publish Rapid class.
      const legacy=position(n,dir,'Local','2026-11-07','holiday');
      assert.equal(verify(legacy).trainType,'Rapid');
      for(const [date,cal] of [
        ['2026-11-04','weekday'],['2026-11-06','weekday'],
        ['2026-11-09','weekday'],['2026-11-30','weekday']]){
        const p=position(n,dir,'Rapid',date,cal);
        assert.equal(verify(p),false);
        assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
        assert.equal(context._trainMarkerSpec(p,p.trainNumber,'RikutoEast').kind,'unresolved');
      }
    }
  }
});
test('reject 2027 seasonal and foreign source/line/direction/model',()=>{
  const base=position('1720D','Inbound');
  const bad=[
    {trainNumber:'9727D'},{trainNumber:'9728D'},{trainNumber:'1720M'},
    {trainNumber:'1729D'},{trainNumber:'5727D'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {positionLineId:'Ishinomaki'}, {displayLineId:'Ominato'},
    {trainOperator:'JR-West'},
    {sourceRailway:'odpt.Railway:JR-East.Ominato'},
    {serviceDate:'2026-12-05'}, {calendarType:'holiday'},
    {plannedVehicleCandidates:['キハ100系']},
    {realtimeVehicleType:'キハ100系'},
    {vehiclePlan:{status:'PLANNED_MODEL',confirmed:true,models:['キハ100系']}}
  ];
  for(const b of bad)assert.equal(win.TrainVehicle.lookupTrainNumberRangePng({...base,...b}),null,
    'bad '+JSON.stringify(b));
  assert.equal(idx.verify('1720D',src,'Inbound','Local','weekday','2026-12-05'),null);
  assert.equal(idx.verify('9727D',src,'Outbound','Local','holiday','2026-11-07'),false);
});
function estimateAt(iso,serviceDate,entries){
  class FixedDate extends Date{
    constructor(...a){super(...(a.length?a:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},JREastRikutoEastNumberIndex202611:idx,
    ODPTClient:{LINE_RAILWAY_CODE:{RikutoEast:'RikutoEast'},
      LINE_TO_OPERATOR:{RikutoEast:'JR-East'}}};
  const ctx=vm.createContext({window:root,Date:FixedDate,console:quiet});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),ctx);
  const stops=[['Kogota',null,'07:45'],['Furukawa','08:20','08:21'],
    ['Naruko-Onsen','10:00',null]];
  const trip=(number,calendar='odpt.Calendar:Weekday',extra={})=>({
    '@id':'sql:RikutoEast:'+number+':'+calendar,
    'odpt:railway':src,'odpt:trainNumber':number,
    'odpt:calendar':calendar,
    'odpt:railDirection':'odpt.RailDirection:Outbound',
    'odpt:trainType':'odpt.TrainType:JR-East.Local',
    'odpt:destinationStation':['odpt.Station:JR-East.RikutoEast.Naruko-Onsen'],
    'odpt:trainTimetableObject':(extra.stops||stops).map(([station,arr,dep])=>({
      ...(arr?{'odpt:arrivalStation':'odpt.Station:JR-East.RikutoEast.'+station,
        'odpt:arrivalTime':arr}:{}),
      ...(dep?{'odpt:departureStation':'odpt.Station:JR-East.RikutoEast.'+station,
        'odpt:departureTime':dep}:{})
    })),
    _positionSource:'supabase-train-run',_sqlLineId:'RikutoEast',
    _serviceDate:serviceDate,_timetableValidity:'undated_not_current_verified',
    _timetableDateVerified:false});
  root.TrainPositionEstimator.registerManualTimetable('RikutoEast',
    entries.map(e=>trip(e[0],e[1],e[2]||{})));
  return root.TrainPositionEstimator.estimateAllPositions({
    RikutoEast:{stations:['Kogota','Furukawa','Naruko-Onsen',
      'Nakayamadaira-Onsen','Sakaida','Shinjo'],operator:'JR-East'}
  },{},{},null,{lineIds:['RikutoEast']}).RikutoEast||[];
}
test('November 5 SQL plan only admits regular official runs; closed section never projected',()=>{
  const date='2026-11-05';
  const closed=[['Kogota',null,'07:45'],['Furukawa','08:20','08:21'],
    ['Naruko-Onsen','10:00','10:05'],['Nakayamadaira-Onsen','10:12','10:12'],
    ['Shinjo','11:35',null]];
  const p=estimateAt('2026-11-04T23:30:00Z',date,[
    ['1721D','odpt.Calendar:Weekday'],
    ['9721D','odpt.Calendar:Weekday'],
    ['9727D','odpt.Calendar:Weekday'],
    ['1723D','odpt.Calendar:Weekday',{stops:closed}]
  ]);
  assert.deepEqual(Array.from(p,x=>x.trainNumber),['1721D']);
  assert.equal(p[0].estimated,true);
  assert.equal(p[0].positionSource,'supabase-train-run');
  assert.equal(p[0].vehicleIdentityStatus,'UNKNOWN');
  assert.equal(p[0].timetableDateVerified,false);
});
test('Nov 2 officially running holiday-template rapid retains official number and Rapid class',()=>{
  const p=estimateAt('2026-11-01T23:30:00Z','2026-11-02',[
    ['9721D','odpt.Calendar:SaturdayHoliday'],
    ['9727D','odpt.Calendar:SaturdayHoliday']
  ]);
  assert.deepEqual(Array.from(p,x=>x.trainNumber),['9721D']);
  assert.equal(p[0].trainType,'odpt.TrainType:JR-East.Rapid');
  assert.equal(p[0].serviceName,'おもいで湯けむり1号');
  assert.equal(p[0].vehicleIdentityStatus,'UNKNOWN');
});
