'use strict';
/* 2026-11 Yamada 19 regional local trains, NO fake bus IDs or
 * Morioka–Miyako through services, date-scoped rockfall cancellations.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const p of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-yamada-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:p});
const render=fs.readFileSync('js/trains-render.js','utf8');
const a=render.indexOf('  function _trainMarkerDomKind(');
const b=render.indexOf('  // Public identification boundary:',a);
assert.ok(a>=0&&b>a);
vm.runInContext(render.slice(a,b),ctx);
const idx=win.JREastYamadaNumberIndex202611;
const png='../images/列车/JR東日本/JR東日本_キハ110系.png';
const urn=k=>'odpt.Station:JR-East.'+k;
function stops(from,to,start='06:30',end='07:30',extras=[]){
  return [
    {'odpt:departureStation':urn(from),'odpt:departureTime':start},
    ...extras.map(s=>({'odpt:departureStation':urn(s),
      'odpt:departureTime':'06:55'})),
    {'odpt:arrivalStation':urn(to),'odpt:arrivalTime':end}
  ];
}
function position(n,dir,date='2026-11-05',cal='weekday',extra={}){
  return {trainNumber:n,positionLineId:'Yamada',trainOperator:'JR-East',
    sourceRailway:idx.railway,
    railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.Local',
    calendarType:cal,serviceDate:date,
    positionSource:'supabase-train-run',estimated:true,
    officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
    vehicleResolvedUpstream:false,plannedVehicleCandidates:['キハ110系'],
    ...extra};
}
function verify(p,raw){
  return idx.verify(p.trainNumber,p.sourceRailway,p.railDirection,
    p.trainType,p.calendarType,p.serviceDate,raw);
}
const north=[
  ...Array.from(idx.northInbound,n=>[n,'Inbound']),
  ...Array.from(idx.northOutbound,n=>[n,'Outbound'])
];
const south=[
  ...Array.from(idx.southInbound,n=>[n,'Inbound']),
  ...Array.from(idx.southOutbound,n=>[n,'Outbound'])
];
test('19 official local rail numbers have correct direction + original KiHa110 PNG',()=>{
  assert.deepEqual(
    [idx.northInbound.length,idx.northOutbound.length,
      idx.southInbound.length,idx.southOutbound.length],[6,7,3,3]);
  assert.equal(new Set([...north,...south].map(p=>p[0])).size,19);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('キハ110系',png,'Yamada'),true);
  for(const [n,dir]of [...north,...south]){
    const [from,to]=idx.endpoints[n];
    const p=position(n,dir),raw=stops(from,to);
    assert.equal(verify(p,raw)?.number,n);
    const v=win.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(v?.pngPath,png,n);
    assert.equal(v?.planned,true);
    const marker=ctx._trainMarkerSpec(p,n,'Yamada');
    assert.equal(marker.kind,'vehicle');
    assert.equal(marker.iconSrc,png);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    // Bypass protection: the published number alone is not enough
    // when RAW SQL stops are not proved to be on an operating segment.
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(
      position(n,dir,'2026-11-05','weekday',
        {officialNumberVerified:false})),null);
  }
});
test('Morioka-Kami-Yonai and Kawauchi-Miyako never form one phantom train',()=>{
  assert.equal(verify(position('633D','Outbound'),
    stops('Morioka','Miyako','06:32','09:01',
      ['Kami-Yonai','Kuzakai','Kawauchi'])),false);
  assert.equal(verify(position('642D','Inbound'),
    stops('Miyako','Morioka','17:14','19:48',
      ['Kawauchi','Kuzakai','Kami-Yonai'])),false);
  const p=position('9631D','Outbound');
  assert.equal(verify(p,stops('Morioka','Kami-Yonai')).number,'9631D');
  assert.equal(verify(p,stops('Morioka','Miyako')),false);
  assert.equal(verify(p,stops('Morioka','Kami-Yonai',
    '06:30','07:30',['Kuzakai'])),false);
  assert.equal(verify(position('631D','Outbound'),
    stops('Kawauchi','Miyako','06:32','07:36')).number,'631D');
  assert.equal(verify(position('631D','Outbound'),
    stops('Morioka','Miyako','06:32','07:36')),false);
});
test('bus numbers, winter rapid and next-year specials never become rail PNGs',()=>{
  const bad=['1','2','10','24','633D','640D','642D','3636D',
    '3637D','3639D','9635D','9638D','9640D','1234D'];
  for(const n of bad){
    const p=position(n,parseInt(n,10)%2===0?'Inbound':'Outbound');
    assert.equal(verify(p,stops('Morioka','Miyako')),false,n);
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null,n);
  }
  for(const extra of [
    {sourceRailway:'odpt.Railway:JR-East.Kitakami'},
    {trainOperator:'JR-West'}, {positionLineId:'Kitakami'},
    {railDirection:'odpt.RailDirection:Inbound'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {serviceDate:'2026-12-05'}, {calendarType:'holiday'},
    {plannedVehicleCandidates:['GV-E400系']},
    {realtimeVehicleType:'GV-E400系'}
  ]){
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng({
      ...position('9631D','Outbound'),...extra}),null,
      'bad '+JSON.stringify(extra));
  }
});
test('11/5–6 daytime south rockfall suppressed; 11/7–8 all-day south suppressed',()=>{
  for(const date of ['2026-11-05','2026-11-06']){
    const before=position('631D','Outbound',date);
    assert.equal(verify(before,stops('Kawauchi','Miyako','06:32','07:36')).number,'631D');
    const after=position('646D','Inbound',date);
    assert.equal(verify(after,stops('Miyako','Kawauchi','19:36','20:39')).number,'646D');
    const blocked=position('9633D','Outbound',date);
    assert.equal(verify(blocked,stops('Moichi','Miyako','08:37','09:01')),false);
    assert.equal(verify(position('641D','Outbound',date),
      stops('Moichi','Miyako','18:37','19:00')),false);
  }
  for(const date of ['2026-11-07','2026-11-08']){
    for(const [n,d]of south){
      const [from,to]=idx.endpoints[n];
      assert.equal(verify(position(n,d,date,'holiday'),
        stops(from,to,'06:32','07:36')),false,n+'/'+date);
    }
    assert.equal(verify(position('9631D','Outbound',date,'holiday'),
      stops('Morioka','Kami-Yonai')).number,'9631D');
  }
});
test('2633D/2634D Sunday and holiday off; 2639D also Saturday off',()=>{
  for(const [n,dir] of [['2633D','Outbound'],['2634D','Inbound']]){
    const [from,to]=idx.endpoints[n],raw=stops(from,to);
    assert.equal(verify(position(n,dir,'2026-11-07','holiday'),raw).number,n);
    for(const date of ['2026-11-03','2026-11-08','2026-11-23'])
      assert.equal(verify(position(n,dir,date,'holiday'),raw),false,n+'/'+date);
  }
  const raw=stops('Morioka','Kami-Yonai');
  assert.equal(verify(position('2639D','Outbound','2026-11-05'),raw).number,'2639D');
  assert.equal(verify(position('2639D','Outbound','2026-11-07','holiday'),raw),false);
});
function estimateAt(iso,serviceDate,records){
  class Clock extends Date{
    constructor(...a){super(...(a.length?a:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},JREastYamadaNumberIndex202611:idx,
    ODPTClient:{LINE_RAILWAY_CODE:{Yamada:'Yamada'},
      LINE_TO_OPERATOR:{Yamada:'JR-East'}}};
  const runtime=vm.createContext({window:root,Date:Clock,console:quiet});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),runtime);
  const trips=records.map(([n,dir,from,to,mid=[]])=>{
    const raw=stops(from,to,'08:30','09:00',mid);
    return {'@id':'sql:Yamada:'+n,'odpt:railway':idx.railway,
      'odpt:trainNumber':n,'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:'+dir,
      'odpt:trainType':'odpt.TrainType:JR-East.Local',
      'odpt:trainTimetableObject':raw,'odpt:destinationStation':[urn(to)],
      _positionSource:'supabase-train-run',_sqlLineId:'Yamada',
      _serviceDate:serviceDate,_timetableDateVerified:false,
      _timetableValidity:'undated_not_current_verified'};
  });
  root.TrainPositionEstimator.registerManualTimetable('Yamada',trips);
  return root.TrainPositionEstimator.estimateAllPositions({
    Yamada:{stations:['Morioka','Kami-Morioka','Yamagishi','Kami-Yonai',
      'Kuzakai','Matsukusa','Kawauchi','Hakoishi','Rikuchu-Kawai',
      'Haratai','Moichi','Hikime','Kebaraichi','Sentoku','Miyako'],
      operator:'JR-East'}
  },{},{},null,{lineIds:['Yamada']}).Yamada||[];
}
test('Nov 5 SQL estimates only an actual local rail section; no bus or rockfall train',()=>{
  const p=estimateAt('2026-11-04T23:45:00Z','2026-11-05',[
    ['2635D','Outbound','Morioka','Kami-Yonai'],
    ['9633D','Outbound','Moichi','Miyako'],
    ['633D','Outbound','Morioka','Miyako',['Kuzakai','Kawauchi']],
    ['3','Outbound','Morioka','Miyako'],
    ['3637D','Outbound','Morioka','Miyako']
  ]);
  assert.deepEqual(Array.from(p,x=>x.trainNumber),['2635D']);
  assert.equal(p[0].officialNumberVerified,true);
  assert.equal(p[0].vehicleIdentityStatus,'UNKNOWN');
  assert.equal(p[0].estimated,true);
  assert.equal(p[0].timetableDateVerified,false);
});
