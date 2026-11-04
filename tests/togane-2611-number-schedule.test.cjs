'use strict';
/* JR East 2611 Togane full-number, SQL planned-stops, and artwork tests.
 * Existing Pixel Tetsudo SQL snapshot clocks are used for regression,
 * not a bulk copy of JR East published timetable. Full number parity
 * is independently checked against official 216u1/2, 216d1/2.
 * This does not certify physical trainsets or undated SQL revision.
 * Run: node --test tests/togane-2611-number-schedule.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const files=[
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-chiba-number-index-202611.js',
  'data/timetables/jreast-togane-number-index-202611.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
];
const root={};
const ctx=vm.createContext({
  window:root,Date,console:{debug(){},log(){},warn(){},error(){}},
  _isTrainArtworkFailureActive(){return false}
});
for(const file of files)
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start);
vm.runInContext(render.slice(start,end),ctx,{filename:'trains-render:marker'});
const index=root.JREastToganeNumberIndex202611;
const image='../images/列车/JR東日本/JR東日本_E233系5000番台.png';
function p(number,source='supabase-train-run',extra={}){
  return {
    trainNumber:number,
    trainId:'odpt.Train:JR-East.Togane.'+number,
    positionLineId:'Togane',sourceRailway:'odpt.Railway:JR-East.Togane',
    trainOperator:source==='supabase-train-run'?'':'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-04',calendarType:'weekday',
    positionSource:source,estimated:source!=='realtime-api',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    ...extra
  };
}
test('Togane exact public number admission accepts both calendars, both directions',()=>{
  assert.equal(index.publishedUniqueNumbers,61);
  assert.equal(index.storedCalendarTemplates,122);
  for(const calendar of ['odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday']){
    for(const [num,dir] of [
      ['620M','Inbound'],['622M','Inbound'],['1624M','Inbound'],
      ['5680Y','Inbound'],['1674M','Inbound'],['676M','Inbound'],
      ['621M','Outbound'],['1625M','Outbound'],['1639M','Outbound'],
      ['5983Y','Outbound'],['1675M','Outbound'],['679M','Outbound']
    ]) {
      assert.equal(index.verify(num,'odpt.Railway:JR-East.Togane',
        'odpt.RailDirection:'+dir,'odpt.TrainType:JR-East.Local',
        calendar,'2026-11-04'),true,num+' '+calendar);
    }
  }
  assert.equal(index.verify('680Y','odpt.Railway:JR-East.Togane',
    'odpt.RailDirection:Inbound','odpt.TrainType:JR-East.Local',
    'odpt.Calendar:Weekday','2026-11-04'),false);
  assert.equal(index.verify('5680Y','odpt.Railway:JR-East.Sotobo',
    'odpt.RailDirection:Inbound','odpt.TrainType:JR-East.Local',
    'odpt.Calendar:Weekday','2026-11-04'),false);
  assert.equal(index.verify('5680Y','odpt.Railway:JR-East.Togane',
    'odpt.RailDirection:Outbound','odpt.TrainType:JR-East.Local',
    'odpt.Calendar:Weekday','2026-11-04'),false);
  assert.equal(index.verify('5680Y','odpt.Railway:JR-East.Togane',
    'odpt.RailDirection:Inbound','odpt.TrainType:JR-East.Rapid',
    'odpt.Calendar:Weekday','2026-11-04'),false);
  assert.equal(index.verify('5680Y','odpt.Railway:JR-East.Togane',
    'odpt.RailDirection:Inbound','odpt.TrainType:JR-East.Local',
    'odpt.Calendar:Weekday','2026-12-01'),null,
    'old edition must not assert a different month');
});
test('Togane 5680Y and 5983Y select E233-5000 reference artwork on all sources',()=>{
  for(const n of ['5680Y','5983Y'])
    for(const source of ['realtime-api','supabase-train-run','train-timetable']){
      const pos=p(n,source);
      const mapped=root.TrainVehicle.lookupTrainNumberRangePng(pos);
      assert.ok(mapped,n+' '+source);
      assert.equal(mapped.trainNumber,n);
      assert.equal(mapped.lineId,'Togane');
      assert.equal(mapped.model,'E233系5000番台');
      assert.equal(mapped.pngPath,image);
      assert.equal(mapped.planned,true);
      assert.equal(mapped.representative,true);
      const svg=ctx._trainMarkerSpec(pos,pos.trainId,'Togane');
      assert.equal(svg.kind,'vehicle');
      assert.equal(svg.iconSrc,image);
      assert.equal(svg.planned,true);
      assert.equal(pos.vehicleIdentityStatus,'UNKNOWN');
      assert.equal(pos.vehiclePlan,undefined);
    }
});
test('Keiyo coupling numbers are NOT the same Togane train numbers, and M remains mixed',()=>{
  const base=p('5680Y');
  for(const extra of [
    {trainNumber:'3680Y'}, {trainNumber:'4883Y'},
    {trainNumber:'5681Y'}, {trainNumber:'5984Y'},
    {trainNumber:'1624M'}, {trainNumber:'1625M'},
    {trainNumber:'620M'}, {trainNumber:'621M'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {sourceRailway:'odpt.Railway:JR-East.Sotobo'},
    {sourceRailway:'odpt.Railway:JR-East.Keiyo'},
    {positionLineId:'Sotobo'}, {positionLineId:'Keiyo'},
    {serviceDate:'2026-10-31'}, {serviceDate:'2026-12-01'},
    {trainOperator:'JR-Central'},
    {realtimeVehicleType:'209系2000番台'},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',
      models:['E233系5000番台','209系500番台']}}
  ]) {
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(
      {...base,...extra}),null,'reject '+JSON.stringify(extra));
  }
  assert.equal(ctx._trainMarkerSpec(p('620M'),'sql:Togane:620M','Togane').kind,
    'unresolved','without train-specific evidence, do not invent an M fleet');
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...base,displayLineId:'Togane'},true).kind,'unresolved',
    'broken PNG stays neutral');
});
const line=JSON.parse(fs.readFileSync(
  'data/core/railway_data.compact.json','utf8')).lines.Togane;
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
const samples=[
  // Number + full SQL source stop-clock samples, 2611 reference checked:
  ['620M','Inbound','Togane.Oami',[
    ['Naruto',null,'04:56'],['Gumyo','05:01','05:01'],
    ['Togane','05:05','05:06'],['Fukutawara','05:09','05:09'],
    ['Oami','05:14',null]]],
  ['621M','Outbound','Togane.Naruto',[
    ['Oami',null,'05:25'],['Fukutawara','05:29','05:29'],
    ['Togane','05:32','05:33'],['Gumyo','05:37','05:37'],
    ['Naruto','05:42',null]]],
  ['5680Y','Inbound','Keiyo.Tokyo',[
    ['Naruto',null,'06:51'],['Gumyo','06:55','06:57'],
    ['Togane','07:01','07:08'],['Fukutawara','07:11','07:11'],
    ['Oami','07:16',null]]],
  ['5983Y','Outbound','Togane.Naruto',[
    ['Oami',null,'19:47'],['Fukutawara','19:51','19:52'],
    ['Togane','19:55','19:55'],['Gumyo','19:59','20:00'],
    ['Naruto','20:05',null]]],
  ['1674M','Inbound','Togane.Oami',[
    ['Togane',null,'22:12'],['Fukutawara','22:15','22:15'],
    ['Oami','22:20',null]]],
  ['1675M','Outbound','Togane.Togane',[
    ['Oami',null,'21:59'],['Fukutawara','22:03','22:03'],
    ['Togane','22:06',null]]]
];
function rows(source,serviceDate){
  return samples.map(([number,dir,dest,stops])=>({
    '@id':'togane:sample:'+source+':'+number,
    'odpt:railway':'odpt.Railway:JR-East.Togane',
    'odpt:trainNumber':number,
    'odpt:calendar':'odpt.Calendar:Weekday',
    'odpt:railDirection':'odpt.RailDirection:'+dir,
    'odpt:trainType':'odpt.TrainType:JR-East.Local',
    'odpt:destinationStation':['odpt.Station:JR-East.'+dest],
    'odpt:trainTimetableObject':stops.map(([station,arr,dep])=>({
      ...(arr?{'odpt:arrivalStation':'odpt.Station:JR-East.Togane.'+station,
               'odpt:arrivalTime':arr}:{}),
      ...(dep?{'odpt:departureStation':'odpt.Station:JR-East.Togane.'+station,
               'odpt:departureTime':dep}:{})
    })),
    _positionSource:source,
    ...(source==='supabase-train-run'?{_sqlLineId:'Togane'}:{}),
    _serviceDate:serviceDate,
    _timetableValidity:'undated_not_current_verified',
    _timetableDateVerified:false,
    _canonicalGroupEvidence:'source_only'
  }));
}
function estimateAt(utc,{source='supabase-train-run',fakeNumber=false}={}){
  class FakeDate extends Date {
    constructor(...x){super(...(x.length?x:[utc]))}
    static now(){return Date.parse(utc)}
  }
  const window={
    RuntimeConfig:{},
    ODPTClient:{
      LINE_RAILWAY_CODE:{Togane:'Togane'},
      LINE_TO_OPERATOR:{Togane:'JR-East'}
    }
  };
  const context=vm.createContext({window,Date:FakeDate,
    console:{debug(){},log(){},error(){},warn(){}}});
  vm.runInContext(fs.readFileSync(
    'data/timetables/jreast-togane-number-index-202611.js','utf8'),context);
  vm.runInContext(estimator,context,{filename:'js/train-position-estimator.js'});
  const templates=rows(source,'2026-11-04');
  if(fakeNumber) {
    const clone=JSON.parse(JSON.stringify(templates[1]));
    clone['@id']='fake:9999M';
    clone['odpt:trainNumber']='9999M';
    templates.push(clone);
  }
  window.TrainPositionEstimator.registerManualTimetable('Togane',templates);
  return window.TrainPositionEstimator.estimateAllPositions(
    {Togane:line},{},{},null,{lineIds:['Togane']}).Togane||[];
}
function located(utc,number,start,next){
  const p=estimateAt(utc).find(x=>x.trainNumber===number);
  assert.ok(p,number+' must exist at '+utc);
  assert.equal(line.stations[p.stationIndex],start);
  assert.equal(next?line.stations[p.segmentToIndex]:p.segmentToIndex,
    next||null);
  assert.equal(p.estimated,true);
  assert.equal(p.positionSource,'supabase-train-run');
  assert.equal(p.serviceDate,'2026-11-04');
  assert.equal(p.timetableDateVerified,false);
  return p;
}
test('Togane actual station clocks move 620M / 621M without extrapolated stop',()=>{
  located('2026-11-03T20:00:00Z','620M','Naruto','Gumyo');
  located('2026-11-03T20:29:30Z','621M','Fukutawara','Togane');
  assert.equal(estimateAt('2026-11-03T20:43:00Z')
    .some(x=>x.trainNumber==='621M'),false,
    'after 05:42 terminus, train must disappear');
});
test('5680Y dwells at Togane until 07:08, full number and section preserved',()=>{
  located('2026-11-03T22:04:00Z','5680Y','Togane',null);
  located('2026-11-03T22:09:00Z','5680Y','Togane','Fukutawara');
});
test('Togane 1674M and 1675M are 3-stop turns, not fabricated Naruto services',()=>{
  located('2026-11-04T12:59:30Z','1675M','Oami','Fukutawara');
  located('2026-11-04T13:13:00Z','1674M','Togane','Fukutawara');
  assert.equal(estimateAt('2026-11-04T13:13:00Z')
    .some(x=>x.trainNumber==='1675M'),false,
    '1675M terminates at Togane 22:06');
  assert.equal(estimateAt('2026-11-04T13:21:00Z')
    .some(x=>x.trainNumber==='1674M'),false,
    '1674M terminates Oami 22:20');
});
test('November SQL plan filters invented number without touching independent timetables',()=>{
  const out=estimateAt('2026-11-03T20:29:30Z',{fakeNumber:true});
  assert.ok(out.some(x=>x.trainNumber==='621M'));
  assert.equal(out.some(x=>x.trainNumber==='9999M'),false);
  const other=estimateAt('2026-11-03T20:29:30Z',{
    source:'train-timetable',fakeNumber:true
  });
  assert.ok(other.some(x=>x.trainNumber==='621M'),
    'existing timetable-source estimates are not suppressed by SQL guard');
});

test('Togane through Y-number PNG uses published direction and SQL calendar',()=>{
  const base=p('5680Y','supabase-train-run',{
    railDirection:'odpt.RailDirection:Inbound'
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(base)?.pngPath,image);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,railDirection:'odpt.RailDirection:Outbound'
  }),null,'5680Y is not a Tokyo-bound outbound source run');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainNumber:'5983Y',railDirection:'odpt.RailDirection:Outbound'
  })?.pngPath,image);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,calendarType:'',serviceId:'odpt.Calendar:Weekday'
  })?.pngPath,image);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,railDirection:''
  })?.pngPath,image,'keep exact-number fallback when direction is absent');
});
