'use strict';
/* JR East 2611 Joetsu: source-scoped published train numbers and
 * vehicle SERIES, not actual-day stock, operation number or GPS evidence.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const quiet={log(){},debug(){},warn(){},error(){}},win={};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const range=win.TrainNumberPngRanges;
const south=['Takasaki','Ino','Shin-Maebashi','Yagihara','Shibukawa','Minakami'];
const north=['Echigo-Yuzawa','Ishiuchi','Shiozawa','Muikamachi','Urasa','Nagaoka'];
const pn='../images/列车/JR東日本/';
function p(number,dir,stops,date='2026-11-05',type='Local',more={}){
  const cal=['2026-11-03','2026-11-23'].includes(date)||
    [0,6].includes(new Date(date+'T12:00:00Z').getUTCDay())
      ?'holiday':'weekday';
  return {trainNumber:number,positionLineId:'Joetsu',displayLineId:'Joetsu',
    sourceRailway:'odpt.Railway:JR-East.Joetsu',trainOperator:'JR-East',
    railDirection:'odpt.RailDirection:'+dir,trainType:'odpt.TrainType:JR-East.'+type,
    scheduledStopKeys:stops,serviceDate:date,calendarType:cal,
    positionSource:'supabase-train-run',estimated:true,
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,...more};
}
const verify=x=>range.verifyJoetsuService(x);
const artwork=x=>win.TrainVehicle.selectMarkerArtwork(x,false);
test('211 southern and E129 northern regular services retain distinct stock and physical UNKNOWN',()=>{
  for(const [number,dir,stops,model,file]of [
    ['721M','Outbound',south,'211系（高崎地区）','JR東日本_211系_湘南色.png'],
    ['720M','Inbound',south,'211系（高崎地区）','JR東日本_211系_湘南色.png'],
    ['1721M','Outbound',north,'E129系','JR東日本_E129系.png'],
    ['1720M','Inbound',north,'E129系','JR東日本_E129系.png'],
    ['1752M','Inbound',north,'E129系','JR東日本_E129系.png']
  ]){
    const x=p(number,dir,stops),approved=verify(x);
    assert.equal(approved.model,model);
    assert.equal(approved.actualVehicleConfirmed,false);
    assert.equal(win.VehicleGaragePngMap.matchModelPath(model,pn+file,'Joetsu'),true);
    assert.equal(artwork(x).iconSrc,pn+file);
    assert.equal(artwork(x).planned,true);
    assert.equal(x.vehicleIdentityStatus,'UNKNOWN');
  }
});
test('Hokuhoku M, Iiyama D and region/railway/calendar mismatches never inherit E129 or 211',()=>{
  for(const [number,dir,stops]of [
    ['820M','Outbound',north],['821M','Inbound',north],
    ['1121D','Outbound',north],['1120D','Inbound',north],
    ['1721M','Outbound',south],['721M','Outbound',north],
    ['1722M','Outbound',north],['1729M','Inbound',north]
  ]){
    const x=p(number,dir,stops);
    assert.equal(verify(x),null,number);
    assert.equal(artwork(x).kind,'unresolved',number);
  }
  const x=p('1721M','Outbound',north);
  for(const bad of [
    {sourceRailway:'odpt.Railway:JR-East.JoetsuShinkansen'},
    {trainOperator:'JR-West'},{displayLineId:'Takasaki'},
    {calendarType:'holiday'},{serviceDate:'2026-12-05'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {scheduledStopKeys:[]},{scheduledStopKeys:['Muikamachi']},
    {scheduledStopKeys:['Muikamachi','Takasaki']},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['211系（高崎地区）']}},
    {realtimeVehicleType:'211系（高崎地区）'}
  ]){
    const y={...x,...bad};
    if(!('vehiclePlan' in bad)&&!('realtimeVehicleType' in bad))
      assert.equal(verify(y),null,JSON.stringify(bad));
    assert.equal(artwork(y).kind,'unresolved',JSON.stringify(bad));
  }
});
test('Shu*Kura 2611 date/number/region and fleet mapping is not generic E129',()=>{
  const examples=[
    ['9780D','Inbound','2026-11-03','あかねShu＊Kura'],
    ['9783D','Outbound','2026-11-03','あかねShu＊Kura'],
    ['9762D','Inbound','2026-11-06','ゆざわShu＊Kura'],
    ['9765D','Outbound','2026-11-09','ゆざわShu＊Kura'],
    ['9781D','Outbound','2026-11-07','摂田屋Shu＊Kura'],
    ['9782D','Inbound','2026-11-08','摂田屋Shu＊Kura'],
    ['8124D','Inbound','2026-11-20','越乃Shu＊Kura'],
    ['8133D','Outbound','2026-11-29','越乃Shu＊Kura']
  ];
  for(const [number,dir,day,name]of examples){
    const x=p(number,dir,north,day,'Rapid'),v=verify(x);
    assert.equal(v.kind,'shukura');
    assert.equal(v.serviceName,name);
    assert.equal(v.model,'キハ40・48形（越乃Shu＊Kura）');
    assert.equal(artwork(x).iconSrc,
      pn+'JR東日本_キハ40・48形_越乃Shu＊Kura.png');
    assert.equal(artwork(x).planned,true);
    assert.equal(x.vehicleIdentityStatus,'UNKNOWN');
    assert.equal(verify({...x,serviceDate:'2026-11-05'}),null);
    assert.equal(verify({...x,scheduledStopKeys:south}),null);
    assert.equal(artwork({...x,trainType:'odpt.TrainType:JR-East.Local'}).kind,
      'unresolved','a stale SQL Local must be corrected by estimator first');
  }
  for(const number of ['9721D','9726D','9784D']){
    assert.equal(verify(p(number,'Outbound',north,'2026-11-07','Rapid')),null);
  }
});
test('estimator corrects sourced November SQL Shu*Kura Local/E129 to Rapid and actual-day UNKNOWN',()=>{
  const iso='2026-11-06T01:10:00Z'; // JST 10:10
  class FakeDate extends Date{
    constructor(...args){super(...(args.length?args:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},TrainVehicle:win.TrainVehicle,
    TrainNumberPngRanges:range,ODPTClient:{
      LINE_RAILWAY_CODE:{Joetsu:'Joetsu'},
      LINE_TO_OPERATOR:{Joetsu:'JR-East'}}};
  const local=vm.createContext({window:root,console:quiet,Date:FakeDate});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),
    local,{filename:'js/train-position-estimator.js'});
  const urn=name=>'odpt.Station:JR-East.Joetsu.'+name;
  function row(n,dir,stops){
    return {'@id':'sql:Joetsu:'+n,'odpt:railway':'odpt.Railway:JR-East.Joetsu',
      'odpt:trainNumber':n,'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:'+dir,
      'odpt:trainType':'odpt.TrainType:JR-East.Local',
      'odpt:destinationStation':[urn(stops.at(-1))],
      'odpt:trainTimetableObject':[
        {'odpt:departureStation':urn(stops[0]),'odpt:departureTime':'10:00'},
        {'odpt:arrivalStation':urn(stops.at(-1)),'odpt:arrivalTime':'10:30'}
      ],
      _positionSource:'supabase-train-run',_sqlLineId:'Joetsu',
      _serviceDate:'2026-11-06',_sqlVehicleCandidateLabel:'E129系',
      _timetableValidity:'undated_not_current_verified',
      _timetableDateVerified:false};
  }
  root.TrainPositionEstimator.registerManualTimetable('Joetsu',[
    row('721M','Outbound',['Takasaki','Shin-Maebashi']),
    row('1721M','Outbound',['Echigo-Yuzawa','Shiozawa']),
    row('9765D','Outbound',['Echigo-Yuzawa','Shiozawa'])
  ]);
  const pos=root.TrainPositionEstimator.estimateAllPositions({
    Joetsu:{stations:[
      'Takasaki','Ino','Shin-Maebashi','Shibukawa','Minakami',
      'Echigo-Yuzawa','Ishiuchi','Shiozawa','Muikamachi','Nagaoka'
    ],operator:'JR-East'}
  },{},{},null,{lineIds:['Joetsu']}).Joetsu||[];
  assert.equal(pos.length,3);
  for(const [n,model,typ]of [
    ['721M','211系（高崎地区）','Local'],
    ['1721M','E129系','Local'],
    ['9765D','キハ40・48形（越乃Shu＊Kura）','Rapid']
  ]){
    const one=pos.find(x=>x.trainNumber===n);
    assert.ok(one,n);
    assert.equal(one.vehicleIdentityStatus,'UNKNOWN');
    assert.deepEqual(Array.from(one.vehiclePlan.models),[model]);
    assert.equal(one.trainType,'odpt.TrainType:JR-East.'+typ);
    assert.equal(one.estimated,true);
    assert.equal(one.timetableDateVerified,false);
    assert.equal(artwork({...one,displayLineId:'Joetsu'}).kind,'vehicle');
  }
});
