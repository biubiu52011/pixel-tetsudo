'use strict';
/* JR East 2611 Iiyama official 54 local D numbers + 4 dated specials.
 * Generic KiHa110 artwork is not a false Oykot / Shu*Kura liveried set.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-iiyama-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const a=render.indexOf('  function _trainMarkerDomKind(');
const b=render.indexOf('  // Public identification boundary:',a);
assert.ok(a>=0&&b>a);
vm.runInContext(render.slice(a,b),ctx);
const index=win.JREastIiyamaNumberIndex202611,
  source=index.railway,png='../images/列车/JR東日本/JR東日本_キハ110系.png';
function position(number,dir,type='Local',date='2026-11-05',cal='weekday',extra={}){
  return {trainNumber:number,positionLineId:'Iiyama',sourceRailway:source,
    trainOperator:'JR-East',railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.'+type,
    serviceDate:date,calendarType:cal,positionSource:'supabase-train-run',
    estimated:true,vehicleIdentityStatus:'UNKNOWN',
    vehicleResolvedUpstream:false,plannedVehicleCandidates:['キハ110系'],...extra};
}
const verify=p=>index.verify(p.trainNumber,p.sourceRailway,p.railDirection,
  p.trainType,p.calendarType,p.serviceDate);
test('54 exact Iiyama ordinary D train numbers render scoped approved KiHa110 marker',()=>{
  assert.equal(index.normalInbound.length,30);
  assert.equal(index.normalOutbound.length,24);
  assert.equal(new Set([...index.normalInbound,...index.normalOutbound]).size,54);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('キハ110系',png,'Iiyama'),true);
  for(const [ns,dir]of [[index.normalInbound,'Inbound'],[index.normalOutbound,'Outbound']])
    for(const n of ns)for(const [day,cal]of [
      ['2026-11-05','weekday'],['2026-11-07','holiday']]){
      const p=position(n,dir,'Local',day,cal);
      assert.equal(verify(p).kind,'regular',n+'/'+day);
      const image=win.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.equal(image?.pngPath,png,n+'/'+day);
      assert.equal(image?.planned,true);
      const marker=ctx._trainMarkerSpec(p,n,'Iiyama');
      assert.equal(marker.kind,'vehicle',n+'/'+day);
      assert.equal(marker.iconSrc,png);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    }
});
test('OyKot 8140/8141 admit 12 November dates but have no approved livery PNG',()=>{
  assert.equal(index.oykotDays.length,12);
  for(const [n,dir] of [['8140D','Inbound'],['8141D','Outbound']]){
    for(const date of index.oykotDays){
      const cal=date==='2026-11-02'?'weekday':'holiday';
      const p=position(n,dir,'Rapid',date,cal);
      const admitted=verify(p);
      assert.equal(admitted.kind,'oykot');
      assert.equal(admitted.serviceName,'おいこっと');
      assert.equal(admitted.pngAvailable,false);
      assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
      assert.equal(ctx._trainMarkerSpec(p,n,'Iiyama').kind,'unresolved');
    }
    const monday=position(n,dir,'Rapid','2026-11-02','holiday');
    assert.equal(verify(monday).holidayTemplateOnWeekday,true);
    for(const [date,cal] of [
      ['2026-11-04','weekday'],['2026-11-06','weekday'],
      ['2026-11-09','weekday'],['2026-11-30','weekday']]){
      const p=position(n,dir,'Rapid',date,cal);
      assert.equal(verify(p),false);
    }
  }
});
test('Shu*Kura 8124/8133 admits only November 20,21,27,28,29 and no KiHa110 art',()=>{
  assert.equal(index.shuKuraDays.length,5);
  for(const [n,dir] of [['8124D','Inbound'],['8133D','Outbound']]){
    for(const date of index.shuKuraDays){
      const weekend=['2026-11-21','2026-11-28','2026-11-29'].includes(date);
      const p=position(n,dir,'Rapid',date,weekend?'holiday':'weekday');
      assert.equal(verify(p).kind,'shukura');
      assert.equal(verify(p).model,'キハ40・48形（越乃Shu＊Kura）');
      assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
      assert.equal(ctx._trainMarkerSpec(p,n,'Iiyama').kind,'unresolved');
    }
    for(const date of ['2026-11-05','2026-11-06','2026-11-23']){
      const cal=date==='2026-11-23'?'holiday':'weekday';
      assert.equal(verify(position(n,dir,'Rapid',date,cal)),false);
    }
  }
});
test('never borrow local PNG for unknown ranges, historical 2027 specials or other railway',()=>{
  const p=position('120D','Inbound');
  for(const bad of [
    {trainNumber:'9140D'},{trainNumber:'8124D'},
    {trainNumber:'119D'},{trainNumber:'120M'},
    {trainOperator:'JR-West'}, {sourceRailway:'odpt.Railway:JR-East.Ominato'},
    {positionLineId:'RikutoEast'}, {displayLineId:'Ishinomaki'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {calendarType:'holiday'},{serviceDate:'2026-12-05'},
    {plannedVehicleCandidates:['キハ100系']},
    {realtimeVehicleType:'キハ100系'}
  ]){
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng({...p,...bad}),null,
      'should reject '+JSON.stringify(bad));
  }
  assert.equal(verify(position('120D','Inbound','Local','2026-12-05','weekday')),null);
});
function estimateAt(iso,serviceDate,numbers){
  class FixedDate extends Date{
    constructor(...args){super(...(args.length?args:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},JREastIiyamaNumberIndex202611:index,
    ODPTClient:{LINE_RAILWAY_CODE:{Iiyama:'Iiyama'},
      LINE_TO_OPERATOR:{Iiyama:'JR-East'}}};
  const local=vm.createContext({window:root,Date:FixedDate,console:quiet});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),local);
  function tt(n,calendar='odpt.Calendar:Weekday'){
    return {'@id':'sql:Iiyama:'+n+':'+calendar,'odpt:railway':source,
      'odpt:trainNumber':n,'odpt:calendar':calendar,
      'odpt:railDirection':'odpt.RailDirection:Outbound',
      'odpt:trainType':'odpt.TrainType:JR-East.'+
        (n.startsWith('81')?'Rapid':'Local'),
      'odpt:trainTimetableObject':[
        {'odpt:departureStation':'odpt.Station:JR-East.Iiyama.Nagano',
          'odpt:departureTime':'08:10'},
        {'odpt:arrivalStation':'odpt.Station:JR-East.Iiyama.TogariNozawaOnsen',
          'odpt:arrivalTime':'09:00'}
      ],
      _positionSource:'supabase-train-run',_sqlLineId:'Iiyama',
      _serviceDate:serviceDate,
      _timetableValidity:'undated_not_current_verified',
      _timetableDateVerified:false};
  }
  root.TrainPositionEstimator.registerManualTimetable('Iiyama',
    numbers.map(([n,cal])=>tt(n,cal)));
  return root.TrainPositionEstimator.estimateAllPositions({
    Iiyama:{stations:['Nagano','TogariNozawaOnsen'],operator:'JR-East'}
  },{},{},null,{lineIds:['Iiyama']}).Iiyama||[];
}
test('11/5 scheduled SQL only regular, 11/2 special Oykot holiday template allowed',()=>{
  const day5=estimateAt('2026-11-04T23:30:00Z','2026-11-05',[
    ['123D','odpt.Calendar:Weekday'],
    ['8141D','odpt.Calendar:Weekday'],
    ['8133D','odpt.Calendar:Weekday'],
    ['193D','odpt.Calendar:Weekday']
  ]);
  assert.deepEqual(Array.from(day5,x=>x.trainNumber),['123D','193D']);
  const day2=estimateAt('2026-11-01T23:30:00Z','2026-11-02',[
    ['123D','odpt.Calendar:Weekday'],
    ['8141D','odpt.Calendar:SaturdayHoliday'],
    ['8133D','odpt.Calendar:Weekday']
  ]);
  assert.deepEqual(Array.from(day2,x=>x.trainNumber),['123D','8141D']);
  assert.equal(day2[1].serviceName,'おいこっと');
  assert.equal(day2[1].trainType,'odpt.TrainType:JR-East.Rapid');
  assert.equal(day2[1].vehicleIdentityStatus,'UNKNOWN');
  assert.equal(day2[1].timetableDateVerified,false);
});
test('Shu Kura SQL train only appears on source-published Nov 20/21/27–29',()=>{
  const days=[['2026-11-20','2026-11-19T23:30:00Z','Weekday'],
    ['2026-11-21','2026-11-20T23:30:00Z','SaturdayHoliday']];
  for(const [day,iso,cal]of days){
    const ps=estimateAt(iso,day,[['8133D','odpt.Calendar:'+cal]]);
    assert.deepEqual(Array.from(ps,x=>x.trainNumber),['8133D']);
    assert.equal(ps[0].serviceName,'越乃Shu＊Kura');
  }
});
