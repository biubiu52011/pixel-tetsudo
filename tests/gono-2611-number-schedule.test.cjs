'use strict';
/* 2026-11 Gono service-number admission, existing planned SQL station
 * clocks, and official fleet/reference labels. No physical car IDs.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const indexSource=fs.readFileSync('data/timetables/jreast-gono-2611-number-index.js','utf8');
const root={};
vm.runInNewContext(indexSource,{window:root,console});
const index=root.JREastGonoNumberIndex202611;
const G='odpt.Railway:JR-East.Gono';
const direction=n=>'odpt.RailDirection:'+(Number(n.slice(0,-1))%2?'Outbound':'Inbound');
const local='odpt.TrainType:JR-East.Local';
function sourceCalendar(date){
  const day=new Date(date+'T12:00:00Z').getUTCDay();
  return 'odpt.Calendar:'+
    ((day===0||day===6||date==='2026-11-03'||date==='2026-11-23')
      ?'SaturdayHoliday':'Weekday');
}
function verify(n,d='2026-11-05',extra={}){
  return index.verify(n,extra.railway||G,extra.direction||direction(n),
    extra.trainType||local,extra.calendar||sourceCalendar(d),d);
}
test('official exact 47 ordinary/rapid numbers are admitted on both service calendars',()=>{
  const n=[...index.regularInbound,...index.regularOutbound];
  assert.equal(index.regularInbound.length,23);
  assert.equal(index.regularOutbound.length,24);
  assert.equal(new Set(n).size,47);
  for(const number of n)for(const [calendar,date] of [
    ['odpt.Calendar:Weekday','2026-11-05'],
    ['odpt.Calendar:SaturdayHoliday','2026-11-07']
  ]){
    const found=verify(number,date,{calendar});
    assert.equal(found.kind,'regular',number);
    assert.equal(found.trainType,
      ['3524D','3526D'].includes(number)?'Rapid':'Local',number);
    assert.equal(found.model,'GV-E400系',number);
  }
  for(const n of ['9524D','9122D','9826D','9525D','9529D',
    '9730D','9737D','8632D','8634D','8621D','8622D','8631D','8635D',
    '9225D','100D','740D','123M']){
    assert.equal(verify(n),false,'do not synthesize '+n);
  }
  assert.equal(verify('320D','2026-12-05'),null);
  assert.equal(verify('320D','2026-11-05',{railway:'odpt.Railway:JR-East.Ou'}),false);
  assert.equal(verify('320D','2026-11-05',{direction:'odpt.RailDirection:Outbound'}),false);
});
test('2611 source calendar rejects wrong dates and wrong vehicle categories',()=>{
  for(const n of ['122D','3524D','8522D']){
    assert.equal(verify(n,'2026-11-07',
      {calendar:'odpt.Calendar:Weekday'}),false,
      n+' cannot be weekday service on Sat');
    assert.equal(verify(n,'2026-11-05',
      {calendar:'odpt.Calendar:SaturdayHoliday'}),false,
      n+' cannot be holiday service on Thu');
    assert.equal(verify(n,'2026-11-03',
      {calendar:'odpt.Calendar:Weekday'}),false,
      n+' must use national-holiday calendar');
    assert.ok(verify(n,'2026-11-03',
      {calendar:'odpt.Calendar:SaturdayHoliday'}));
  }
  assert.equal(verify('122D','2026-11-05',
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'}),false);
  assert.equal(verify('8522D','2026-11-05',
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'}),false);
  assert.equal(verify('8522D','2026-11-05').fleetReference,
    'HB-E300系（橅）');
  assert.equal(verify('8521D','2026-11-05').fleetReference,
    'HB-E300系（青池）');
  assert.equal(verify('8523D','2026-11-05').fleetReference,
    'キハ48形（くまげら）');
});
test('dated named Resort Shirakami Gono sections are not GVE400 locals',()=>{
  for(const [num,number,expected] of [
    ['8521D',1,'aoi'],['8522D',2,'buna'],['8523D',3,'kumagera'],
    ['8524D',4,'aoi'],['8525D',5,'buna'],['8526D',6,'kumagera']
  ]){
    const p=verify(num);
    assert.equal(p.kind,'resort');
    assert.equal(p.resortNumber,number);
    assert.equal(p.livery,expected);
    assert.equal(p.trainType,'Rapid');
    assert.equal(p.serviceName,'リゾートしらかみ'+number+'号');
    assert.equal(p.model,'');
  }
  for(const n of ['8523D','8526D']){
    assert.equal(verify(n,'2026-11-10'),false,n+' rests 10-13');
    assert.equal(verify(n,'2026-11-13'),false,n+' rests 10-13');
    assert.equal(verify(n,'2026-11-14').livery,'kumagera');
  }
  assert.equal(verify('8521D','2026-11-10').livery,'kumagera');
  assert.equal(verify('8521D','2026-11-14').livery,'buna');
  assert.equal(verify('8522D','2026-11-14').livery,'aoi');
  assert.equal(verify('8524D','2026-11-10').livery,'kumagera');
  assert.equal(verify('8525D','2026-11-13').livery,'aoi');
});
test('Gono 47 ordinary/rapid approved gallery PNGs, not the resort variants',()=>{
  const ctx={window:{},Date,console};
  const files=['data/timetables/vehicle-garage-png-map.js',
    'data/timetables/jreast-gono-2611-number-index.js',
    'data/timetables/train-number-png-ranges.js','js/train-vehicle.js',
    'data/timetables/vehicle-operation-evidence-data.js'];
  const c=vm.createContext(ctx);
  for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
  const png='../images/列车/JR東日本/JR東日本_GV-E400系.png';
  for(const n of [...index.regularInbound,...index.regularOutbound]){
    const mode=verify(n);
    const p={trainNumber:n,positionLineId:'Gono',sourceRailway:G,
      trainOperator:'JR-East',serviceDate:'2026-11-05',
      calendarType:'weekday',positionSource:'supabase-train-run',estimated:true,
      trainType:'odpt.TrainType:JR-East.'+mode.trainType,
      railDirection:direction(n),plannedVehicleCandidates:['GV-E400系'],
      vehicleIdentityStatus:'UNKNOWN'};
    const image=ctx.window.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(image?.pngPath,png,n);
    assert.equal(image.planned,true,n);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
  for(const n of index.resortSegmentNumbers){
    const pos={trainNumber:n,positionLineId:'Gono',sourceRailway:G,
      serviceDate:'2026-11-05',calendarType:'weekday',
      trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Rapid',
      railDirection:direction(n),positionSource:'supabase-train-run',estimated:true,
      plannedVehicleCandidates:['GV-E400系']};
    assert.equal(ctx.window.TrainVehicle.lookupTrainNumberRangePng(pos),null,
      'resort must never receive GV-E400 cab '+n);
  }
});
test('Gono PNG never grants a wrong-date official train number or resort vehicle',()=>{
  const assets=['data/timetables/vehicle-garage-png-map.js',
    'data/timetables/jreast-gono-2611-number-index.js',
    'data/timetables/train-number-png-ranges.js','js/train-vehicle.js',
    'data/timetables/vehicle-operation-evidence-data.js'];
  const root={},ctx=vm.createContext({window:root,Date,console});
  for(const file of assets)
    vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
  const standard={trainNumber:'122D',positionLineId:'Gono',
    sourceRailway:G,trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',
    railDirection:'odpt.RailDirection:Inbound',
    positionSource:'supabase-train-run',estimated:true,
    plannedVehicleCandidates:['GV-E400系'],
    vehicleIdentityStatus:'UNKNOWN'};
  for(const changed of [
    {serviceDate:'2026-11-07',calendarType:'weekday'},
    {serviceDate:'2026-11-05',calendarType:'holiday'},
    {serviceDate:'2026-11-23',calendarType:'weekday'},
    {serviceDate:'2026-12-05',calendarType:'holiday'},
    {serviceDate:'2026-11-05',calendarType:'weekday',
      trainType:'odpt.TrainType:JR-East.LimitedExpress'}
  ])assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(
    {...standard,...changed}),null,
    'invalid calendar/type should never receive a front '+JSON.stringify(changed));
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...standard,serviceDate:'2026-11-03',calendarType:'holiday'
  })?.pngPath,'../images/列车/JR東日本/JR東日本_GV-E400系.png');
  for(const [number,day,cal]of [
    ['8521D','2026-11-05','weekday'],
    ['8522D','2026-11-05','weekday'],
    ['8523D','2026-11-05','weekday'],
    ['8523D','2026-11-10','weekday'],
    ['8526D','2026-11-10','weekday']
  ]){
    const directionName=Number(number.slice(0,-1))%2?'Outbound':'Inbound';
    const pos={...standard,trainNumber:number,serviceDate:day,
      calendarType:cal,trainType:'odpt.TrainType:JR-East.Rapid',
      railDirection:'odpt.RailDirection:'+directionName};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(pos),null);
  }
});
test('Gono scheduled train fallback projects source SQL clocks and route aliases',()=>{
  const route=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8')).lines.Gono;
  const estimatorSource=fs.readFileSync('js/train-position-estimator.js','utf8');
  const samples=[
    ['320D','Inbound','Yokoiso','Higashi-Noshiro',[
      ['Yokoiso',null,'05:35'],['Henashi','05:40','05:40'],
      ['WeSPa-Tsubakiyama','05:43','05:44'],
      ['Juniko','05:55','05:56'],['Iwadate','06:05','06:06'],
      ['Higashi-Noshiro','07:03',null]]],
    ['2525D','Outbound','Higashi-Noshiro','Fukaura',[
      ['Higashi-Noshiro',null,'07:22'],['Noshiro','07:27','07:32'],
      ['Omaigoshi','08:30','08:31'],['Fukaura','09:11',null]]],
    ['8522D','Inbound','Kawabe','Higashi-Noshiro',[
      ['Kawabe',null,'08:55'],['Fujisaki','09:05','09:05'],
      ['Goshogawara','09:26','09:27'],['Ajigasawa','09:52','09:54'],
      ['Fukaura','10:55','10:59'],['Higashi-Noshiro','12:19',null]]]
  ];
  function runAt(iso){
    class FakeDate extends Date {
      constructor(...x){super(...(x.length?x:[iso]));}
      static now(){return Date.parse(iso);}
    }
    const root={RuntimeConfig:{},JREastGonoNumberIndex202611:index,
      ODPTClient:{LINE_RAILWAY_CODE:{Gono:'Gono'},LINE_TO_OPERATOR:{Gono:'JR-East'}}};
    const c=vm.createContext({window:root,Date:FakeDate,
      console:{log(){},debug(){},warn(){},error(){}}});
    vm.runInContext(estimatorSource,c,{filename:'js/train-position-estimator.js'});
    const entries=samples.map(([n,dir,from,dest,stops])=>({
      '@id':'sql:Gono:'+n,'odpt:railway':G,'odpt:trainNumber':n,
      'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:'+dir,
      'odpt:trainType':'odpt.TrainType:JR-East.Local',
      'odpt:destinationStation':['odpt.Station:JR-East.Gono.'+dest],
      'odpt:trainTimetableObject':stops.map(([station,arr,dep])=>({
        ...(arr?{'odpt:arrivalStation':'odpt.Station:JR-East.Gono.'+station,
           'odpt:arrivalTime':arr}:{}),
        ...(dep?{'odpt:departureStation':'odpt.Station:JR-East.Gono.'+station,
           'odpt:departureTime':dep}:{})
      })),
      _positionSource:'supabase-train-run',_sqlLineId:'Gono',
      _serviceDate:'2026-11-05',_canonicalGroupEvidence:'source_only',
      _timetableValidity:'undated_not_current_verified',
      _timetableDateVerified:false
    }));
    root.TrainPositionEstimator.registerManualTimetable('Gono',entries);
    const v=root.TrainPositionEstimator.estimateAllPositions({Gono:route},
      {},{},null,{lineIds:['Gono']});
    return v.Gono||[];
  }
  for(const [utc,n] of [
    ['2026-11-04T20:42:00Z','320D'],
    ['2026-11-04T23:30:00Z','2525D'],
    ['2026-11-05T01:10:00Z','8522D']
  ]){
    const pos=runAt(utc).find(x=>x.trainNumber===n);
    assert.ok(pos,n+' estimated from official-numbered SQL stops');
    assert.equal(pos.positionSource,'supabase-train-run');
    assert.equal(pos.estimated,true);
    assert.equal(pos.timetableDateVerified,false);
    assert.ok(pos.stationIndex>=0);
    assert.ok(pos.segmentToIndex==null || pos.segmentToIndex>=0);
    if(n==='8522D'){
      assert.equal(pos.typeName,'JR-East.Rapid');
      assert.equal(pos.trainType,'odpt.TrainType:JR-East.Rapid');
      assert.equal(pos.serviceName,'リゾートしらかみ2号');
    }
  }
});


test('Gono resort display corrects legacy GV-E400 SQL candidate without manufacturing cab',()=>{
  const sourceFiles=[
    'data/timetables/vehicle-garage-png-map.js',
    'data/timetables/jreast-gono-2611-number-index.js',
    'data/timetables/train-number-png-ranges.js',
    'js/train-vehicle.js',
    'data/timetables/vehicle-operation-evidence-data.js',
    'js/train-position-estimator.js'
  ];
  const render=fs.readFileSync('js/trains-render.js','utf8');
  const mStart=render.indexOf('  function _trainMarkerDomKind(');
  const mEnd=render.indexOf('  // Public identification boundary:',mStart);
  assert.ok(mEnd>mStart);
  function at(number,day,clock,dir){
    const iso=day+'T'+clock+':00Z'; // 10:10 JST for 01:10Z
    class FakeDate extends Date{
      constructor(...a){super(...(a.length?a:[iso]));}
      static now(){return Date.parse(iso);}
    }
    const root={RuntimeConfig:{},ODPTClient:{
      LINE_RAILWAY_CODE:{Gono:'Gono'},LINE_TO_OPERATOR:{Gono:'JR-East'}
    }};
    const noLog={log(){},debug(){},warn(){},error(){}};
    const context=vm.createContext({
      window:root,Date:FakeDate,console:noLog,
      _isTrainArtworkFailureActive(){return false}
    });
    for(const p of sourceFiles)
      vm.runInContext(fs.readFileSync(p,'utf8'),context,{filename:p});
    vm.runInContext(render.slice(mStart,mEnd),context);
    const from=dir==='Inbound'?'Kawabe':'Higashi-Noshiro';
    const to=dir==='Inbound'?'Higashi-Noshiro':'Kawabe';
    const tt={'@id':'sql:Gono:'+number,'odpt:railway':G,
      'odpt:trainNumber':number,
      'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:'+dir,
      'odpt:trainType':'odpt.TrainType:JR-East.Local',
      'odpt:destinationStation':['odpt.Station:JR-East.Gono.'+to],
      'odpt:trainTimetableObject':[
        {'odpt:departureStation':'odpt.Station:JR-East.Gono.'+from,
         'odpt:departureTime':'08:55'},
        {'odpt:arrivalStation':'odpt.Station:JR-East.Gono.'+to,
         'odpt:arrivalTime':'12:19'}
      ],_positionSource:'supabase-train-run',_sqlLineId:'Gono',
      _serviceDate:day,
      _sqlVehicleCandidateLabel:'GV-E400系',
      _timetableValidity:'undated_not_current_verified',
      _timetableDateVerified:false};
    root.TrainPositionEstimator.registerManualTimetable('Gono',[tt]);
    const ps=root.TrainPositionEstimator.estimateAllPositions({
      Gono:{stations:['Higashi-Noshiro','Kawabe'],operator:'JR-East'}
    },{},{},null,{lineIds:['Gono']}).Gono||[];
    return {ps,marker:context._trainMarkerSpec};
  }
  for(const [n,day,dir,expected]of [
    ['8522D','2026-11-05','Inbound','HB-E300系（橅）'],
    ['8523D','2026-11-05','Outbound','キハ48形（くまげら）'],
    ['8521D','2026-11-05','Outbound','HB-E300系（青池）'],
    ['8521D','2026-11-10','Outbound','キハ48形（くまげら）']
  ]){
    const scenario=at(n,day,'01:10',dir);
    assert.equal(scenario.ps.length,1,n+'/'+day);
    const p=scenario.ps[0];
    assert.equal(p.trainNumber,n);
    assert.equal(p.officialNumberVerified,true);
    assert.equal(p.trainType,'odpt.TrainType:JR-East.Rapid');
    assert.equal(p.publishedFleetReference,expected);
    assert.deepEqual(Array.from(p.plannedVehicleCandidates),[expected]);
    assert.deepEqual(Array.from(p.vehiclePlan.models),[expected]);
    assert.ok(!p.vehicleCandidates.includes('GV-E400系'));
    assert.equal(p.vehicleIconPath,'');
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    assert.equal(p.timetableDateVerified,false);
    assert.equal(scenario.marker(p,n,'Gono').kind,'unresolved');
  }
  const cancelled=at('8523D','2026-11-10','01:10','Outbound');
  assert.equal(cancelled.ps.length,0,
    'No Resort Shirakami no. 3 on Nov 10–13');
});
test('inert Gono index must be present with exact line scope and 12-hex version',()=>{
  const manifest=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
  const indexFile='data/timetables/jreast-gono-2611-number-index.js';
  assert.ok(manifest.lazy.trains.includes(indexFile));
  assert.deepEqual(Array.from(manifest.lazyScopes.trains[indexFile]),['Gono']);
  const html=fs.readFileSync('pages/trains.html','utf8');
  const template=html.match(/<template id="pt-trains-detail-assets">([\s\S]*?)<\/template>/);
  assert.ok(template);
  assert.match(template[1],
    /data-script-src="\.\.\/data\/timetables\/jreast-gono-2611-number-index\.js\?v=[a-f0-9]{12}" data-line-scope="Gono"/);
  for(const [,file,rev] of template[1].matchAll(
    /data-script-src="\.\.\/([^?"]+)\?v=([^"]+)"/g)){
    assert.match(rev,/^[a-f0-9]{12}$/,file+' cache key');
  }
});
