'use strict';
/* Ominato public numbers, Nov maintenance, Shimokita rapid, and safe
 * "no approved KiHa100 PNG" fallback. No trainset ID is inferred.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const quiet={log(){},debug(){},warn(){},error(){}},win={};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-ominato-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const a=render.indexOf('  function _trainMarkerDomKind(');
const b=render.indexOf('  // Public identification boundary:',a);
assert.ok(a>=0&&b>a);
vm.runInContext(render.slice(a,b),ctx);
const idx=win.JREastOminatoNumberIndex202611,source=idx.railway;
function make(n,dir,type='Local',date='2026-11-05',cal='weekday',extra={}){
  return {trainNumber:n,positionLineId:'Ominato',sourceRailway:source,
    trainOperator:'JR-East',railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.'+type,
    serviceDate:date,calendarType:cal,positionSource:'supabase-train-run',
    estimated:true,vehicleIdentityStatus:'UNKNOWN',
    vehicleResolvedUpstream:false,
    plannedVehicleCandidates:['キハ100系','キハ110系'],...extra};
}
const verify=p=>idx.verify(p.trainNumber,p.sourceRailway,p.railDirection,
  p.trainType,p.calendarType,p.serviceDate);
test('2611 permits 13 locals plus 5 Shimokita rapids with exact direction',()=>{
  assert.deepEqual([idx.ordinaryInbound.length,idx.ordinaryOutbound.length],
    [6,7]);
  assert.deepEqual([idx.rapidInbound.length,idx.rapidOutbound.length],[3,2]);
  for(const [numbers,dir,type]of [
    [idx.ordinaryInbound,'Inbound','Local'],
    [idx.ordinaryOutbound,'Outbound','Local'],
    [idx.rapidInbound,'Inbound','Rapid'],
    [idx.rapidOutbound,'Outbound','Rapid']
  ])for(const n of numbers)for(const [date,cal]of [
    ['2026-11-05','weekday'],['2026-11-07','holiday']
  ]){
    const p=make(n,dir,type,date,cal),approved=verify(p);
    assert.equal(approved.number,n,n+'/'+date);
    assert.equal(approved.trainType,type);
    assert.equal(approved.serviceName,type==='Rapid'?'しもきた':'');
    assert.equal(approved.model,'キハ100系');
    assert.equal(approved.pngAvailable,false);
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'Do not borrow visually wrong KiHa110 PNG '+n);
    assert.equal(ctx._trainMarkerSpec(p,n,'Ominato').kind,'unresolved');
  }
});
test('six 10–13 November cancelled trains do not appear as scheduled',()=>{
  assert.deepEqual(Array.from(idx.cancelledNumbers).sort(),
    ['223D','229D','234D','3225D','3228D','3230D'].sort());
  for(const n of idx.cancelledNumbers)for(const date of idx.maintenanceDates){
    const up=(parseInt(n,10)%2)===0;
    const p=make(n,up?'Inbound':'Outbound',n.startsWith('32')?'Rapid':'Local',
      date,'weekday');
    assert.equal(verify(p),false,n+'/'+date);
  }
  for(const n of ['3226D','3233D','222D','241D']){
    const up=(parseInt(n,10)%2)===0;
    const p=make(n,up?'Inbound':'Outbound',n.startsWith('32')?'Rapid':'Local',
      '2026-11-11','weekday');
    assert.equal(verify(p).number,n,n+' keeps running');
  }
});
test('December-only Hinabi, Furusato numbers & old SQL junk excluded in November',()=>{
  for(const [n,dir] of [
    ['9227D','Outbound'],['9231D','Outbound'],['9236D','Inbound'],
    ['3227D','Outbound'],['229M','Outbound']
  ]){
    const p=make(n,dir,'Rapid','2026-11-07','holiday');
    assert.equal(verify(p),false,n);
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
  }
  for(const bad of [
    {sourceRailway:'odpt.Railway:JR-East.Hachinohe'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {calendarType:'holiday'},
    {serviceDate:'2026-12-05'}
  ]){
    const p=make('222D','Inbound','Local','2026-11-05','weekday',bad);
    assert.ok(verify(p)===false||verify(p)===null);
  }
});
function estimate(iso,serviceDate,numbers){
  class Clock extends Date{
    constructor(...a){super(...(a.length?a:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},JREastOminatoNumberIndex202611:idx,
    ODPTClient:{LINE_RAILWAY_CODE:{Ominato:'Ominato'},
      LINE_TO_OPERATOR:{Ominato:'JR-East'}}};
  const con=vm.createContext({window:root,Date:Clock,console:quiet});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),con);
  function tt(n){
    return {'@id':'sql:Ominato:'+n,'odpt:railway':source,'odpt:trainNumber':n,
      'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:Outbound',
      'odpt:trainType':'odpt.TrainType:JR-East.Local',
      'odpt:trainTimetableObject':[
        {'odpt:departureStation':'odpt.Station:JR-East.Ominato.Noheji',
          'odpt:departureTime':'08:00'},
        {'odpt:arrivalStation':'odpt.Station:JR-East.Ominato.Ominato',
          'odpt:arrivalTime':'09:00'}
      ],_positionSource:'supabase-train-run',_sqlLineId:'Ominato',
      _serviceDate:serviceDate,_timetableValidity:'undated_not_current_verified',
      _timetableDateVerified:false};
  }
  root.TrainPositionEstimator.registerManualTimetable('Ominato',numbers.map(tt));
  return root.TrainPositionEstimator.estimateAllPositions({
    Ominato:{stations:['Noheji','Ominato'],operator:'JR-East'}
  },{},{},null,{lineIds:['Ominato']}).Ominato||[];
}
test('legacy SQL 3225D is correctly restored to Rapid Shimokita; December special dropped',()=>{
  const p=estimate('2026-11-04T23:30:00Z','2026-11-05',
    ['221D','3225D','9227D','9231D']);
  assert.deepEqual(Array.from(p,x=>x.trainNumber),['221D','3225D']);
  assert.equal(p[1].trainType,'odpt.TrainType:JR-East.Rapid');
  assert.equal(p[1].serviceName,'しもきた');
  assert.equal(p[1].vehicleIdentityStatus,'UNKNOWN');
  assert.equal(p[1].estimated,true);
});
test('Ominato 11/10–13 cancelled SQL service never shows train position',()=>{
  const p=estimate('2026-11-10T23:30:00Z','2026-11-11',
    ['221D','223D','229D','3225D','3233D']);
  assert.deepEqual(Array.from(p,x=>x.trainNumber),['221D','3233D']);
});
