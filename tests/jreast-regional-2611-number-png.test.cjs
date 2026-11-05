'use strict';
/* Official 2611 JR East Kururi / Karasuyama / Hachinohe train numbers,
 * day-scoped cancellations and existing vehicle PNG in the real SVG marker.
 * No station clocks, vehicle formations or GPS fixes are invented.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={};
const quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-regional-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start);
vm.runInContext(render.slice(start,end),ctx,{filename:'js/trains-render.js:marker'});
const index=win.JREastRegionalNumberIndex202611;
const fleets={
  Kururi:['キハE130形100番台',
    '../images/列车/JR東日本/JR東日本_キハE130系100番台.png'],
  Karasuyama:['EV-E301系',
    '../images/列车/JR東日本/JR東日本_EV-E301系.png'],
  Hachinohe:['キハE130形500番台',
    '../images/列车/JR東日本/JR東日本_キハE130系500番台.png']
};
const prefix=line=>'odpt.Railway:JR-East.'+line;
const make=(line,number,dir,date='2026-11-07',cal='holiday',
    typ='Local',extra={})=>({
  trainNumber:number,trainId:'planned:'+line+':'+number,
  positionLineId:line,sourceRailway:prefix(line),
  trainOperator:'JR-East',railDirection:'odpt.RailDirection:'+dir,
  trainType:'odpt.TrainType:JR-East.'+typ,
  serviceDate:date,calendarType:cal,
  positionSource:'supabase-train-run',estimated:true,
  vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
  plannedVehicleCandidates:[line==='Karasuyama'?'EV-E301系（ACCUM）':fleets[line][0]],
  ...(line==='Kururi'&&!index.kururiClosedRailNumbers.includes(number)?{
    scheduledStopKeys:dir==='Outbound'?
      ['Kisarazu','Gion','KazusaKiyokawa','HigashiKiyokawa',
       'Yokota','HigashiYokota','Makuta','Shimogori','Obitsu','Tawarada','Kururi']:
      ['Kururi','Tawarada','Obitsu','Shimogori','Makuta','HigashiYokota',
       'Yokota','HigashiKiyokawa','KazusaKiyokawa','Gion','Kisarazu'],
    sqlPublishedNumberFleetReference:{
      source:'sql-jreast-2611-number-roster',lineId:'Kururi',
      trainNumber:number,serviceDate:date,
      direction:'odpt.RailDirection:'+dir,
      calendar:'odpt.Calendar:'+(cal==='holiday'?'SaturdayHoliday':'Weekday'),
      trainType:'odpt.TrainType:JR-East.Local',
      segmentKey:'kisarazu_kururi_rail',railScope:'open_rail_only',
      railwayFrom:dir==='Outbound'?'Kisarazu':'Kururi',
      railwayTo:dir==='Outbound'?'Kururi':'Kisarazu',
      model:'キハE130形100番台',
      pngReference:'../images/列车/JR東日本/JR東日本_キハE130系100番台.png',
      officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/217'+
        (dir==='Outbound'?'d':'u')+(cal==='holiday'?'2':'1')+'.html',
      stopClockStatus:'historical_not_2611_verified',
      closedRailSection:'Kururi–KazusaKameyama',
      referenceOnly:true,actualVehicleConfirmed:false
    }
  }:{}),
  ...extra
});
const verify=p=>index.verify(p.positionLineId,p.trainNumber,
  p.sourceRailway,p.railDirection,p.trainType,p.calendarType,p.serviceDate);
test('three regional official rosters: closed-only Kururi numbers never map to railway PNG',()=>{
  assert.deepEqual(Object.keys(index.lines).sort(),
    ['Hachinohe','Karasuyama','Kururi']);
  assert.deepEqual([index.lines.Kururi.up.length,index.lines.Kururi.down.length],[20,20]);
  assert.deepEqual([index.lines.Karasuyama.up.length,index.lines.Karasuyama.down.length],[13,14]);
  assert.deepEqual([index.lines.Hachinohe.up.length,index.lines.Hachinohe.down.length],[21,20]);
  for(const [line,[model,png]] of Object.entries(fleets)){
    assert.equal(win.VehicleGaragePngMap.matchModelPath(model,png,line),true);
    for(const [nums,dir] of [
      [index.lines[line].up,'Inbound'],
      [index.lines[line].down,'Outbound']
    ])for(const number of nums){
      for(const [date,calendar] of [['2026-11-07','holiday'],['2026-11-06','weekday']]){
        const p=make(line,number,dir,date,calendar);
        const allowed=verify(p);
        const vehicle=win.TrainVehicle.lookupTrainNumberRangePng(p);
        const icon=ctx._trainMarkerSpec(p,p.trainId,line);
        if(allowed===false){
          assert.equal(vehicle,null,line+' cancelled '+number+'/'+date);
          assert.equal(icon.kind,'unresolved',line+' cancelled icon '+number);
        }else{
          assert.equal(allowed.number,number);
          assert.equal(allowed.model,model);
          assert.equal(vehicle?.pngPath,png,line+'/'+number);
          assert.equal(vehicle?.planned,true);
          assert.equal(icon.kind,'vehicle',line+'/'+number);
          assert.equal(icon.iconSrc,png);
          assert.equal(icon.planned,true);
          assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
        }
      }
    }
  }
});
test('Karasuyama six cancelled trips suppressed only on the five official November work days',()=>{
  const cancelled=[
    ...['330M','332M','334M'].map(n=>[n,'Inbound']),
    ...['329M','331M','333M'].map(n=>[n,'Outbound'])
  ];
  for(const [number,dir] of cancelled){
    for(const d of index.karasuyamaWorkDays){
      const p=make('Karasuyama',number,dir,d,'weekday');
      assert.equal(verify(p),false,number+'/'+d);
      assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
      assert.equal(ctx._trainMarkerSpec(p,p.trainId,'Karasuyama').kind,'unresolved');
    }
    assert.equal(verify(make('Karasuyama',number,dir,'2026-11-09','weekday')).number,number);
  }
  assert.equal(verify(make('Karasuyama','327M','Outbound','2026-11-05','weekday')).number,'327M');
  assert.equal(verify(make('Karasuyama','336M','Inbound','2026-11-05','weekday')).number,'336M');
});
test('Hachinohe 11/4-5 replacement locals, shortened runs, time-changed trip and Sunday market',()=>{
  const work=['2026-11-04','2026-11-05'];
  for(const date of work){
    for(const [number,dir] of [['435D','Outbound'],['436D','Inbound'],
      ['441D','Outbound'],['442D','Inbound'],['445D','Outbound'],
      ['446D','Inbound'],['1440D','Inbound']]){
      const p=make('Hachinohe',number,dir,date,'weekday');
      assert.equal(verify(p),false,number+' old SQL cannot describe '+date);
      assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
    }
    for(const [number,dir]of [['9445D','Outbound'],['9446D','Inbound']]){
      const p=make('Hachinohe',number,dir,date,'weekday');
      assert.equal(verify(p).kind,'special');
      assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p)?.pngPath,fleets.Hachinohe[1]);
      assert.equal(ctx._trainMarkerSpec(p,p.trainId,'Hachinohe').kind,'vehicle');
    }
  }
  for(const [n,d]of [['9445D','Outbound'],['9446D','Inbound']]){
    assert.equal(verify(make('Hachinohe',n,d,'2026-11-06','weekday')),false);
  }
  for(const day of index.hachinoheSundayMarketDays){
    const p=make('Hachinohe','8471D','Outbound',day,'holiday','Rapid');
    assert.equal(verify(p).kind,'special');
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p)?.pngPath,fleets.Hachinohe[1]);
  }
  for(const d of ['2026-11-03','2026-11-07','2026-11-23']){
    assert.equal(verify(make('Hachinohe','8471D','Outbound',d,'holiday','Rapid')),false);
  }
  assert.equal(verify(make('Hachinohe','8471D','Outbound','2026-11-08','weekday','Rapid')),false);
});
test('wrong number/line/direction/type/calendar/stock/date never borrows PNG',()=>{
  for(const [line,def]of Object.entries(index.lines)){
    const p=make(line,def.up[0],'Inbound','2026-11-06','weekday');
    const suffix=line==='Karasuyama'?'M':'D';
    for(const bad of [
      {trainNumber:'9999'+suffix},{trainNumber:p.trainNumber.slice(0,-1)+'E'},
      {positionLineId:'Hachinohe',sourceRailway:'odpt.Railway:JR-East.Unknown'},
      {sourceRailway:'odpt.Railway:JR-East.Ishinomaki'},
      {displayLineId:'Ishinomaki'},
      {trainOperator:'JR-West'}, {railDirection:'odpt.RailDirection:Outbound'},
      {trainType:'odpt.TrainType:JR-East.Rapid'},
      {serviceDate:'2026-12-05'},
      {calendarType:'holiday'},
      {plannedVehicleCandidates:['E233系0番台']},
      {realtimeVehicleType:'E233系0番台'}
    ]){
      const wrong={...p,...bad};
      assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(wrong),null,
        line+' rejected '+JSON.stringify(bad));
    }
  }
  assert.equal(index.verify('Unknown','920D','odpt.Railway:JR-East.Unknown',
    'Inbound','Local','weekday','2026-11-06'),null);
  assert.equal(index.verify('Kururi','920D',prefix('Kururi'),
    'Inbound','Local','weekday','2026-12-06'),null);
});
test('planned estimator uses official numbers but cannot resurrect dated cancelled SQL services',()=>{
  const iso='2026-11-05T01:40:00Z'; // 10:40 JST
  class FixedDate extends Date {
    constructor(...x){super(...(x.length?x:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},JREastRegionalNumberIndex202611:index,
    ODPTClient:{LINE_RAILWAY_CODE:{Karasuyama:'Karasuyama'},
      LINE_TO_OPERATOR:{Karasuyama:'JR-East'}}};
  const sandbox=vm.createContext({window:root,Date:FixedDate,console:quiet});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),sandbox);
  function timetable(n){
    return {'@id':'sql:Karasuyama:'+n,
      'odpt:railway':prefix('Karasuyama'),'odpt:trainNumber':n,
      'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:Outbound',
      'odpt:trainType':'odpt.TrainType:JR-East.Local',
      // Synthetic fixture clocks test algorithm behaviour, not real schedule.
      'odpt:trainTimetableObject':[
        {'odpt:departureStation':'odpt.Station:JR-East.Karasuyama.Hoshakuji',
          'odpt:departureTime':'10:30'},
        {'odpt:arrivalStation':'odpt.Station:JR-East.Karasuyama.Karasuyama',
          'odpt:arrivalTime':'11:00'}
      ],
      _positionSource:'supabase-train-run',_sqlLineId:'Karasuyama',
      _serviceDate:'2026-11-05',_timetableValidity:'undated_not_current_verified',
      _timetableDateVerified:false};
  }
  root.TrainPositionEstimator.registerManualTimetable('Karasuyama',
    [timetable('327M'),timetable('329M'),timetable('331M'),timetable('923M')]);
  const positions=root.TrainPositionEstimator.estimateAllPositions({
    Karasuyama:{stations:['Hoshakuji','Karasuyama'],operator:'JR-East'}
  },{},{},null,{lineIds:['Karasuyama']}).Karasuyama||[];
  assert.deepEqual(Array.from(positions,p=>p.trainNumber),['327M']);
  assert.equal(positions[0].estimated,true);
  assert.equal(positions[0].positionSource,'supabase-train-run');
  assert.equal(positions[0].vehicleIdentityStatus,'UNKNOWN');
  assert.equal(positions[0].timetableDateVerified,false);
});
