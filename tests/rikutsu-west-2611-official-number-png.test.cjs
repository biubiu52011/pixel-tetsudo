'use strict';
/* JR East 2611 陸羽西線: authoritative public train numbers and
 * KiHa110 model-gallery illustration, NOT actual-day car identity.
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const f of ['data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-rikutsu-west-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js']){
  vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
}
const render=fs.readFileSync('js/trains-render.js','utf8');
const a=render.indexOf('  function _trainMarkerDomKind(');
const b=render.indexOf('  // Public identification boundary:',a);
assert.ok(a>=0&&b>a);
vm.runInContext(render.slice(a,b),ctx,{filename:'js/trains-render.js:marker'});
const idx=win.JREastRikutsuWestNumberIndex202611;
const source=idx.railway,png='../images/列车/JR東日本/JR東日本_キハ110系.png';
function position(number,direction,type='Local',date='2026-11-05',cal='weekday',extra={}){
  return {trainNumber:number,positionLineId:'RikutsuWest',trainOperator:'JR-East',
    sourceRailway:source,railDirection:'odpt.RailDirection:'+direction,
    trainType:'odpt.TrainType:JR-East.'+type,
    serviceDate:date,calendarType:cal,positionSource:'supabase-train-run',
    estimated:true,plannedVehicleCandidates:['キハ110系'],
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,...extra};
}
test('all 18 official numbers match scoped KiHa110 artwork, both dates and directions',()=>{
  assert.equal(idx.inbound.length,9);assert.equal(idx.outbound.length,9);
  assert.equal(new Set([...idx.inbound,...idx.outbound]).size,18);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('キハ110系',png,'RikutsuWest'),true);
  for(const [numbers,dir] of [[idx.inbound,'Inbound'],[idx.outbound,'Outbound']])
    for(const n of numbers){
      const rapid=n==='3131D'||n==='3132D';
      for(const [date,cal] of [['2026-11-05','weekday'],['2026-11-07','holiday']]){
        const p=position(n,dir,rapid?'Rapid':'Local',date,cal);
        const published=idx.verify(n,source,p.railDirection,p.trainType,cal,date);
        assert.equal(published.number,n);
        assert.equal(published.trainType,rapid?'Rapid':'Local');
        assert.equal(published.serviceName,rapid?'最上川':'');
        const image=win.TrainVehicle.lookupTrainNumberRangePng(p);
        assert.equal(image?.model,'キハ110系',n+'/'+date);
        assert.equal(image?.pngPath,png);
        assert.equal(image?.planned,true);
        const marker=ctx._trainMarkerSpec(p,n,'RikutsuWest');
        assert.equal(marker.kind,'vehicle');
        assert.equal(marker.iconSrc,png);
        assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
      }
    }
});
test('legacy 3131D/3132D Local source is admitted but official type must be Rapid',()=>{
  for(const [n,dir] of [['3131D','Outbound'],['3132D','Inbound']]){
    const p=position(n,dir,'Local');
    const published=idx.verify(n,source,p.railDirection,p.trainType,
      p.calendarType,p.serviceDate);
    assert.equal(published.trainType,'Rapid');
    assert.equal(published.serviceName,'最上川');
    // Raw legacy Local must not claim Rapid image before the estimator
    // restores the official public service class.
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
  }
});
test('foreign, out-of-month, wrong-type and absent 9166D cannot receive art',()=>{
  const p=position('150D','Inbound');
  for(const changed of [
    {trainNumber:'9166D'},{trainNumber:'149D'},{trainNumber:'165M'},
    {trainNumber:'3133D'}, {positionLineId:'BanetsuEast'},
    {displayLineId:'BanetsuWest'}, {sourceRailway:'odpt.Railway:JR-East.RikutoEast'},
    {trainOperator:'JR-West'}, {railDirection:'odpt.RailDirection:Outbound'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {calendarType:'holiday'},{serviceDate:'2026-12-05'},
    {plannedVehicleCandidates:['GV-E400系']},{realtimeVehicleType:'GV-E400系'},
    {vehiclePlan:{confirmed:true,status:'PLANNED_MODEL',models:['GV-E400系']}}
  ]){
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng({...p,...changed}),null,
      'reject '+JSON.stringify(changed));
  }
  assert.equal(idx.verify('9166D',source,'Inbound','Local','holiday','2026-11-07'),false);
  assert.equal(idx.verify('150D',source,'Inbound','Local','weekday','2026-12-05'),null);
});
test('SQL estimated position retains official number and restores Mogamigawa Rapid',()=>{
  const iso='2026-11-04T23:30:00Z'; // Nov 5 08:30 JST
  class FixedDate extends Date{
    constructor(...args){super(...(args.length?args:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},JREastRikutsuWestNumberIndex202611:idx,
    ODPTClient:{LINE_RAILWAY_CODE:{RikutsuWest:'RikutsuWest'},
      LINE_TO_OPERATOR:{RikutsuWest:'JR-East'}}};
  const c=vm.createContext({window:root,Date:FixedDate,console:quiet});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),c);
  const stops=[['Shinjo',null,'08:10'],['Furukuchi','08:45','08:45'],
    ['Amarume','09:00',null]];
  function trip(n){
    return {'@id':'sql:RikutsuWest:'+n,'odpt:railway':source,
      'odpt:trainNumber':n,'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:Outbound',
      'odpt:trainType':'odpt.TrainType:JR-East.Local',
      'odpt:destinationStation':['odpt.Station:JR-East.RikutsuWest.Amarume'],
      'odpt:trainTimetableObject':stops.map(([station,arr,dep])=>({
        ...(arr?{'odpt:arrivalStation':'odpt.Station:JR-East.RikutsuWest.'+station,
          'odpt:arrivalTime':arr}:{}),
        ...(dep?{'odpt:departureStation':'odpt.Station:JR-East.RikutsuWest.'+station,
          'odpt:departureTime':dep}:{})
      })),
      _positionSource:'supabase-train-run',_sqlLineId:'RikutsuWest',
      _serviceDate:'2026-11-05',
      _timetableValidity:'undated_not_current_verified',
      _timetableDateVerified:false};
  }
  root.TrainPositionEstimator.registerManualTimetable('RikutsuWest',
    [trip('3131D'),trip('151D'),trip('9166D')]);
  const ps=root.TrainPositionEstimator.estimateAllPositions({
    RikutsuWest:{stations:['Shinjo','Furukuchi','Amarume'],operator:'JR-East'}
  },{},{},null,{lineIds:['RikutsuWest']}).RikutsuWest||[];
  assert.deepEqual(Array.from(ps,x=>x.trainNumber),['3131D','151D']);
  assert.equal(ps[0].trainType,'odpt.TrainType:JR-East.Rapid');
  assert.equal(ps[0].serviceName,'最上川');
  assert.equal(ps[0].estimated,true);
  assert.equal(ps[0].vehicleIdentityStatus,'UNKNOWN');
  assert.equal(ps[0].timetableDateVerified,false);
});
