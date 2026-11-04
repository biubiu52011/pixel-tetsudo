'use strict';
/* JR East 2611 Narita / Abiko / Airport timetable projection regression.
 * Stop-clock fixtures are selected samples of the owner's existing
 * Supabase templates. This test does NOT certify the full source edition.
 * Run: node --test tests/narita-2611-number-schedule.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=p=>fs.readFileSync(p,'utf8');
const log={debug(){},log(){},warn(){},error(){}};
const doc={currentScript:{src:'https://example.test/runtime-config.js'}};
const root={};
const picture='../images/列车/JR東日本/JR東日本_E231系_0番台.png';
const ctx=vm.createContext({window:root,document:doc,Date,console:log,
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/core/runtime-config.js',
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/joban-e231-h-202611-index.js',
  'data/timetables/jreast-narita-abiko-number-index-202611.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(source(file),ctx,{filename:file});
const markerSource=source('js/trains-render.js');
const markerStart=markerSource.indexOf('  function _trainMarkerDomKind(');
const markerEnd=markerSource.indexOf('  // Public identification boundary:',markerStart);
assert.ok(markerStart>=0&&markerEnd>markerStart);
vm.runInContext(markerSource.slice(markerStart,markerEnd),ctx,
  {filename:'js/trains-render.js:marker'});
const index=root.JREastNaritaAbikoNumberIndex202611;
const lineData=JSON.parse(source('data/core/railway_data.compact.json')).lines;
const estimator=source('js/train-position-estimator.js');
function p(number,sourceName='supabase-train-run',extra={}){
  return {trainNumber:number,
    trainId:'odpt.Train:JR-East.NaritaAbikoBranch.'+number,
    positionLineId:'NaritaAbikoBranch',
    sourceRailway:'odpt.Railway:JR-East.NaritaAbikoBranch',
    trainOperator:sourceName==='supabase-train-run'?'':'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-04',calendarType:'weekday',
    positionSource:sourceName,estimated:sourceName!=='realtime-api',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,...extra};
}
test('Abiko 80 distinct official numbers, 160 weekday/holiday templates',()=>{
  assert.equal(index.publishedUniqueNumbers,80);
  assert.equal(index.storedCalendarTemplates,160);
  for(const cal of ['odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday'])
    for(let n=820;n<=899;n++){
      const dir=n%2===0?'Inbound':'Outbound';
      assert.equal(index.verify(n+'M','odpt.Railway:JR-East.NaritaAbikoBranch',
        'odpt.RailDirection:'+dir,'odpt.TrainType:JR-East.Local',
        cal,'2026-11-04'),true,n+'M '+cal);
    }
  for(const [number,dir,cal,rail,kind,date] of [
    ['819M','Inbound','odpt.Calendar:Weekday','NaritaAbikoBranch','Local','2026-11-04'],
    ['900M','Inbound','odpt.Calendar:Weekday','NaritaAbikoBranch','Local','2026-11-04'],
    ['820M','Outbound','odpt.Calendar:Weekday','NaritaAbikoBranch','Local','2026-11-04'],
    ['821M','Inbound','odpt.Calendar:Weekday','NaritaAbikoBranch','Local','2026-11-04'],
    ['820M','Inbound','odpt.Calendar:Weekday','Narita','Local','2026-11-04'],
    ['820M','Inbound','odpt.Calendar:Weekday','NaritaAbikoBranch','Rapid','2026-11-04']
  ])assert.equal(index.verify(number,'odpt.Railway:JR-East.'+rail,
    'odpt.RailDirection:'+dir,'odpt.TrainType:JR-East.'+kind,cal,date),
    false,number+' invalid');
  assert.equal(index.verify('820M','odpt.Railway:JR-East.NaritaAbikoBranch',
    'odpt.RailDirection:Inbound','odpt.TrainType:JR-East.Local',
    'odpt.Calendar:Weekday','2026-12-01'),null);
});
test('E231-0 planned SVG on Abiko for realtime, SQL and schedule, no carset claim',()=>{
  for(const number of ['820M','821M','872M','899M'])
    for(const sourceName of ['realtime-api','supabase-train-run','train-timetable']){
      const pos=p(number,sourceName);
      const model=root.TrainVehicle.lookupTrainNumberRangePng(pos);
      assert.ok(model,number+' '+sourceName);
      assert.equal(model.trainNumber,number);
      assert.equal(model.model,'E231系0番台');
      assert.equal(model.pngPath,picture);
      assert.equal(model.representative,true);
      const item=ctx._trainMarkerSpec(pos,pos.trainId,'NaritaAbikoBranch');
      assert.equal(item.kind,'vehicle');
      assert.equal(item.iconSrc,picture);
      assert.equal(item.planned,true);
      assert.equal(pos.vehicleIdentityStatus,'UNKNOWN');
      assert.equal(pos.vehiclePlan,undefined);
    }
});
test('Abiko number cannot leak to main Narita, airport, Keisei or 209/E259 stock',()=>{
  const base=p('820M');
  for(const change of [
    {trainNumber:'820F'}, {trainNumber:'900M'},
    {positionLineId:'Narita'}, {positionLineId:'NaritaAirportBranch'},
    {positionLineId:'NaritaSkyAccess'},
    {sourceRailway:'odpt.Railway:JR-East.Narita'},
    {sourceRailway:'odpt.Railway:Keisei.NaritaSkyAccess'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {trainOperator:'Keisei'},
    {serviceDate:'2026-10-31'}, {serviceDate:'2026-12-01'},
    {realtimeVehicleType:'E259系'},
    {realtimeVehicleType:'209系2000番台'},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',
      models:['E231系0番台','E235系1000番台']}}
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...base,...change}),null,
      JSON.stringify(change));
  }
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...base,displayLineId:'NaritaAbikoBranch'},true).kind,'unresolved');
});
function trip(line,number,direction,destination,stops,sourceName='supabase-train-run'){
  return {'@id':'fixture:'+line+':'+number,
    'odpt:railway':'odpt.Railway:JR-East.'+line,
    'odpt:calendar':'odpt.Calendar:Weekday',
    'odpt:trainNumber':number,
    'odpt:railDirection':'odpt.RailDirection:'+direction,
    'odpt:trainType':'odpt.TrainType:JR-East.'+
      (number.startsWith('200')?'LimitedExpress':'Local'),
    'odpt:destinationStation':['odpt.Station:JR-East.'+destination],
    'odpt:trainTimetableObject':stops.map(([name,arr,dep])=>({
      ...(arr?{'odpt:arrivalStation':'odpt.Station:JR-East.'+line+'.'+name,
        'odpt:arrivalTime':arr}:{}),
      ...(dep?{'odpt:departureStation':'odpt.Station:JR-East.'+line+'.'+name,
        'odpt:departureTime':dep}:{})
    })),
    _positionSource:sourceName,
    ...(sourceName==='supabase-train-run'?{_sqlLineId:line}:{}),
    _timetableValidity:'undated_not_current_verified',
    _timetableDateVerified:false};
}
const byLine={
 NaritaAbikoBranch:[
  trip('NaritaAbikoBranch','820M','Inbound','NaritaAbikoBranch.Abiko',[
    ['Narita',null,'04:47'],['ShimosaManzaki','04:53','04:53'],
    ['Ajiki','04:57','04:58'],['Kobayashi','05:03','05:03'],
    ['Kioroshi','05:08','05:08'],['Fusa','05:11','05:11'],
    ['Araki','05:15','05:15'],['Kohoku','05:19','05:19'],
    ['HigashiAbiko','05:22','05:22'],['Abiko','05:26',null]]),
  trip('NaritaAbikoBranch','872M','Inbound','NaritaAbikoBranch.Abiko',[
    ['Narita',null,'16:14'],['ShimosaManzaki','16:20','16:21'],
    ['Ajiki','16:25','16:26'],['Kobayashi','16:31','16:31'],
    ['Kioroshi','16:35','16:37'],['Fusa','16:39','16:40'],
    ['Araki','16:43','16:44'],['Kohoku','16:47','16:48'],
    ['HigashiAbiko','16:51','16:52'],['Abiko','16:56',null]]),
  trip('NaritaAbikoBranch','899M','Outbound','NaritaAbikoBranch.Narita',[
    ['Abiko',null,'23:54'],['HigashiAbiko','23:58','23:58'],
    ['Kohoku','00:01','00:02'],['Araki','00:04','00:05'],
    ['Fusa','00:08','00:09'],['Kioroshi','00:12','00:12'],
    ['Kobayashi','00:17','00:17'],['Ajiki','00:22','00:22'],
    ['ShimosaManzaki','00:26','00:27'],['Narita','00:33',null]])
 ],
 NaritaAirportBranch:[
  trip('NaritaAirportBranch','1431M','Outbound',
    'NaritaAirportBranch.NaritaAirportTerminal1',[
      ['Narita',null,'08:12'],
      ['NaritaAirportTerminal2and3','08:22','08:22'],
      ['NaritaAirportTerminal1','08:24',null]]),
  trip('NaritaAirportBranch','2002M','Inbound',
    'NaritaAirportBranch.Narita',[
      ['NaritaAirportTerminal1',null,'07:37'],
      ['NaritaAirportTerminal2and3','07:40','07:40'],
      ['Narita','07:48',null]])
 ],
 Narita:[
  trip('Narita','2520M','Inbound','Narita.Sakura',[
    ['Sawara',null,'06:26'],['Oto','06:30','06:30'],
    ['ShimosaKozaki','06:35','06:35'],['Namegawa','06:41','06:41'],
    ['Kuzumi','06:48','06:48'],['Narita','06:56','06:56'],
    ['Shisui','07:03','07:03'],['Sakura','07:09',null]])
 ]
};
function estimate(utc,override){
  class FakeDate extends Date{
    constructor(...a){super(...(a.length?a:[utc]))}
    static now(){return Date.parse(utc)}
  }
  const window={};
  const browser=vm.createContext({window,document:doc,
    Date:FakeDate,console:log});
  vm.runInContext(source('data/core/runtime-config.js'),browser);
  window.ODPTClient={
    LINE_RAILWAY_CODE:{
      Narita:'Narita',NaritaAbikoBranch:'NaritaAbikoBranch',
      NaritaAirportBranch:'NaritaAirportBranch'
    },
    LINE_TO_OPERATOR:{
      Narita:'JR-East',NaritaAbikoBranch:'JR-East',
      NaritaAirportBranch:'JR-East'
    }
  };
  vm.runInContext(source(
    'data/timetables/jreast-narita-abiko-number-index-202611.js'),browser);
  vm.runInContext(estimator,browser);
  const copy=Object.fromEntries(Object.entries(byLine).map(
    ([k,v])=>[k,v.slice()]));
  if(override)override(copy);
  for(const [key,list] of Object.entries(copy))
    window.TrainPositionEstimator.registerManualTimetable(key,list);
  return window.TrainPositionEstimator.estimateAllPositions(
    {Narita:lineData.Narita,
     NaritaAbikoBranch:lineData.NaritaAbikoBranch,
     NaritaAirportBranch:lineData.NaritaAirportBranch},
    {},{},null,{lineIds:Object.keys(copy)});
}
function assertSegment(utc,line,number,station,next){
  const result=estimate(utc);
  const pos=(result[line]||[]).find(x=>x.trainNumber===number);
  assert.ok(pos,'missing '+number+' at '+utc);
  assert.equal(lineData[line].stations[pos.stationIndex],station);
  assert.equal(pos.segmentToIndex==null?null:
    lineData[line].stations[pos.segmentToIndex],next);
  assert.equal(pos.estimated,true);
  assert.equal(pos.positionSource,'supabase-train-run');
  assert.equal(pos.timetableDateVerified,false);
  return pos;
}
test('Narita Abiko branch station Kohoku is scoped, not a station beyond the map',()=>{
  const p=assertSegment('2026-11-03T20:20:00Z',
    'NaritaAbikoBranch','820M','Kohoku-Narita','Higashi-Abiko');
  assert.equal(p.serviceDate,'2026-11-04');
});
test('Narita 872M keeps its weekday/holiday exact identity; no coupling fabricated',()=>{
  const pos=assertSegment('2026-11-04T07:49:00Z',
    'NaritaAbikoBranch','872M','Kohoku-Narita','Higashi-Abiko');
  assert.equal(pos.trainNumber,'872M');
});
test('Narita 899M crosses midnight on the preceding railway service date',()=>{
  const run=assertSegment('2026-11-04T15:15:00Z',
    'NaritaAbikoBranch','899M','Kioroshi','Kobayashi');
  assert.equal(run.serviceDate,'2026-11-04');
  const after=estimate('2026-11-04T15:34:00Z');
  assert.equal((after.NaritaAbikoBranch||[]).some(x=>x.trainNumber==='899M'),false);
});
test('Narita airport terminal aliases restore 1431M and 2002M positions',()=>{
  assertSegment('2026-11-03T23:18:00Z','NaritaAirportBranch',
    '1431M','Narita','Airport-Terminal-2');
  assertSegment('2026-11-03T22:41:00Z','NaritaAirportBranch',
    '2002M','Airport-Terminal-2','Narita');
});
test('Narita ShimosaKozaki alias matches canonical Shimosa-Kanzaki',()=>{
  assertSegment('2026-11-03T21:36:00Z',
    'Narita','2520M','Shimosa-Kanzaki','Namegawa');
});
test('SQL number guard blocks false Abiko 900M; independent timetable is untouched',()=>{
  const fake=trip('NaritaAbikoBranch','900M','Inbound',
    'NaritaAbikoBranch.Abiko',byLine.NaritaAbikoBranch[0]
      ['odpt:trainTimetableObject'].map(s=>{
        const u=s['odpt:departureStation']||s['odpt:arrivalStation'];
        return [u.split('.').pop(),s['odpt:arrivalTime']||null,
          s['odpt:departureTime']||null]}));
  const suppressed=estimate('2026-11-03T20:00:00Z',
    x=>x.NaritaAbikoBranch.push(fake));
  assert.equal(suppressed.NaritaAbikoBranch.some(x=>x.trainNumber==='900M'),false);
  const independent=estimate('2026-11-03T20:00:00Z',
    x=>x.NaritaAbikoBranch.push({...fake,
      '@id':'other:900M',_positionSource:'train-timetable'}));
  assert.equal(independent.NaritaAbikoBranch.some(x=>x.trainNumber==='900M'),true);
});

test('Abiko PNG consults the existing 2611 timetable direction when available',()=>{
  const base=p('820M','supabase-train-run',{
    railDirection:'odpt.RailDirection:Inbound'
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(base)?.pngPath,picture);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,railDirection:'odpt.RailDirection:Outbound'
  }),null,'even inbound number cannot be painted as outbound');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainNumber:'821M',railDirection:'odpt.RailDirection:Outbound'
  })?.pngPath,picture);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,calendarType:'',serviceId:'odpt.Calendar:Weekday'
  })?.pngPath,picture,'SQL calendar URN is a valid timetable calendar');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,railDirection:''
  })?.pngPath,picture,'legacy exact-number source still works without direction');
});
