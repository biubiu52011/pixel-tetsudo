'use strict';
/* Hakushin 2026 Nov public D/M train numbers, SQL fleet correction,
 * 14 Kairi days and image scope. Service number is not a carset.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const quiet={log(){},debug(){},warn(){},error(){}},win={};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-hakushin-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const a=render.indexOf('  function _trainMarkerDomKind(');
const b=render.indexOf('  // Public identification boundary:',a);
assert.ok(a>=0&&b>a);
vm.runInContext(render.slice(a,b),ctx);
const idx=win.JREastHakushinNumberIndex202611;
const png='../images/列车/JR東日本/JR東日本_E129系.png';
const G='odpt.Railway:JR-East.Hakushin';
const urn=k=>'odpt.Station:JR-East.'+k;
const raw=(dir,from,to)=>[
  {'odpt:departureStation':urn(from),'odpt:departureTime':'10:00'},
  ...(from==='Toyosaka'||to==='Toyosaka'?[]:[{
    'odpt:departureStation':urn('Toyosaka'),'odpt:departureTime':'10:17'
  }]),
  {'odpt:arrivalStation':urn(to),'odpt:arrivalTime':'11:00'}
];
function context(n,dir='Outbound',type='Local',day='2026-11-05',cal='weekday',more={}){
  return {trainNumber:n,positionLineId:'Hakushin',trainOperator:'JR-East',
    sourceRailway:G,railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.'+type,
    serviceDate:day,calendarType:cal,positionSource:'supabase-train-run',
    estimated:true,vehicleIdentityStatus:'UNKNOWN',
    vehicleResolvedUpstream:false,plannedVehicleCandidates:['E129系'],
    ...more};
}
const verify=(p,stops)=>idx.verify(p.trainNumber,p.sourceRailway,
  p.railDirection,p.trainType,p.calendarType,p.serviceDate,stops);
test('exact 90 E129 locals plus 3921M rapid, two-day gallery scope checks',()=>{
  assert.equal(idx.localInbound.length,46);
  assert.equal(idx.localOutbound.length,44);
  assert.equal(new Set([...idx.localInbound,...idx.localOutbound]).size,90);
  assert.equal(idx.rapidNumber,'3921M');
  assert.equal(win.VehicleGaragePngMap.matchModelPath('E129系',png,'Hakushin'),true);
  let count=0;
  for(const [ns,dir,typ] of [
    [idx.localInbound,'Inbound','Local'],
    [idx.localOutbound,'Outbound','Local'],
    [[idx.rapidNumber],'Outbound','Rapid']
  ])for(const n of ns)for(const [day,cal]of [
    ['2026-11-05','weekday'],['2026-11-07','holiday'],
    ['2026-11-03','holiday'],['2026-11-23','holiday']
  ]){
    const p=context(n,dir,typ,day,cal);
    const from=dir==='Inbound'?'Shibata':'Niigata',
      to=dir==='Inbound'?'Niigata':'Shibata';
    assert.equal(verify(p,raw(dir,from,to))?.number,n,n+'/'+day);
    const approved=win.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(approved?.pngPath,png,n+'/'+day);
    assert.equal(approved?.planned,true);
    assert.equal(ctx._trainMarkerSpec(p,n,'Hakushin').kind,'vehicle');
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    count++;
  }
  assert.equal(count,364);
});
test('7 regular Inaho numbers require E653 not E129 PNG and proper service type',()=>{
  assert.deepEqual(Array.from(idx.inahoNumbers).sort(),
    ['1M','3M','5M','7M','9M','11M','13M'].sort());
  for(const n of idx.inahoNumbers)for(const [day,cal]of [
    ['2026-11-05','weekday'],['2026-11-07','holiday']
  ]){
    const p=context(n,'Outbound','Local',day,cal);
    const plan=verify(p,raw('Outbound','Niigata','Shibata'));
    assert.equal(plan.kind,'inaho');
    assert.equal(plan.trainType,'LimitedExpress');
    assert.equal(plan.serviceName,'いなほ'+parseInt(n,10)+'号');
    assert.equal(plan.model,'E653系（いなほ）');
    assert.equal(plan.pngAvailable,false);
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
    assert.equal(ctx._trainMarkerSpec(p,n,'Hakushin').kind,'unresolved');
  }
});
test('HB-E300 Kairi 8853D only on 14 explicit November operating dates',()=>{
  assert.equal(idx.kairiNumber,'8853D');
  assert.equal(idx.kairiDays.length,14);
  for(const day of idx.kairiDays){
    const dayOfWeek=new Date(day+'T12:00:00Z').getUTCDay();
    const holiday=dayOfWeek===0||dayOfWeek===6||
      day==='2026-11-03'||day==='2026-11-23';
    const p=context('8853D','Outbound','Local',day,
      holiday?'holiday':'weekday');
    const plan=verify(p,raw('Outbound','Niigata','Shibata'));
    assert.equal(plan?.kind,'kairi',day);
    assert.equal(plan?.model,'HB-E300系（海里）');
    assert.equal(plan?.trainType,'Rapid');
    assert.equal(plan?.serviceName,'海里');
    assert.equal(plan?.pngAvailable,false);
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
  }
  for(const [day,cal] of [
    ['2026-11-02','weekday'],['2026-11-05','weekday'],
    ['2026-11-09','weekday'],['2026-11-12','weekday'],
    ['2026-11-23','holiday'],['2026-11-30','weekday']
  ])assert.equal(verify(context('8853D','Outbound','Local',day,cal)),false);
});
test('December-only Inaho 8055M / 9083M and old 9883D never render',()=>{
  assert.deepEqual(Array.from(idx.excludedLegacy).sort(),
    ['8055M','9083M','9883D'].sort());
  for(const n of idx.excludedLegacy){
    const p=context(n,'Outbound','Local','2026-11-07','holiday');
    assert.equal(verify(p,raw('Outbound','Niigata','Shibata')),false,n);
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null,n);
  }
});
test('opposite direction, neighbour line, wrong calendar/type and mixed plan excluded',()=>{
  const p=context('1620M','Inbound','Local');
  for(const change of [
    {positionLineId:'Shinetsu'}, {displayLineId:'Uetsu'},
    {sourceRailway:'odpt.Railway:JR-East.Uetsu'},
    {trainOperator:'JR-West'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {calendarType:'holiday'}, {serviceDate:'2026-12-05'},
    {serviceDate:'2026-11-07',calendarType:'weekday'},
    {plannedVehicleCandidates:['E653系（いなほ）']},
    {realtimeVehicleType:'E653系（いなほ）'}
  ]){
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng({...p,...change}),
      null,JSON.stringify(change));
  }
  for(const stops of [
    raw('Inbound','Sakata','Niigata'),
    raw('Inbound','Shibata','Sakata'),
    [raw('Inbound','Shibata','Niigata')[0]],
    raw('Outbound','Niigata','Shibata')
  ])assert.equal(verify(p,stops),false);
  assert.equal(verify(context('1620M','Inbound','Local','2026-12-05')),null);
});
function estimateAt(iso,day,numbers,calendar='odpt.Calendar:Weekday'){
  class FakeDate extends Date{
    constructor(...args){super(...(args.length?args:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},JREastHakushinNumberIndex202611:idx,
    ODPTClient:{LINE_RAILWAY_CODE:{Hakushin:'Hakushin'},
      LINE_TO_OPERATOR:{Hakushin:'JR-East'}}};
  const localCtx=vm.createContext({window:root,Date:FakeDate,console:quiet});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),
    localCtx,{filename:'js/train-position-estimator.js'});
  function timetable(n){
    const type=n==='3921M'?'Rapid':'Local';
    return {'@id':'sql:Hakushin:'+n,'odpt:railway':G,
      'odpt:trainNumber':n,'odpt:calendar':calendar,
      'odpt:railDirection':'odpt.RailDirection:Outbound',
      'odpt:trainType':'odpt.TrainType:JR-East.'+type,
      'odpt:destinationStation':[urn('Shibata')],
      'odpt:trainTimetableObject':raw('Outbound','Niigata','Shibata'),
      _positionSource:'supabase-train-run',_sqlLineId:'Hakushin',
      _serviceDate:day,_sqlVehicleCandidateLabel:'E129系',
      _timetableValidity:'undated_not_current_verified',
      _timetableDateVerified:false};
  }
  root.TrainPositionEstimator.registerManualTimetable('Hakushin',
    numbers.map(timetable));
  const positions=root.TrainPositionEstimator.estimateAllPositions({
    Hakushin:{stations:['Niigata','Higashi-Niigata','Oogata','Niizaki',
      'Hayado','Toyosaka','Kuroyama','Sasaki','Nishi-Shibata','Shibata'],
      operator:'JR-East'}
  },{},{},null,{lineIds:['Hakushin']}).Hakushin||[];
  return {positions,root};
}
test('runtime corrects old SQL 1M and 8853D and hides December-only trains',()=>{
  const {positions}=estimateAt('2026-11-06T01:10:00Z','2026-11-06',
    ['623M','3921M','1M','8853D','8055M','9083M','9883D']);
  assert.deepEqual(Array.from(positions,p=>p.trainNumber),
    ['623M','3921M','1M','8853D']);
  for(const p of positions){
    assert.equal(p.officialNumberVerified,true);
    assert.equal(p.estimated,true);
    assert.equal(p.timetableDateVerified,false);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
  for(const [n,expectedType,fleet,name] of [
    ['1M','LimitedExpress','E653系（いなほ）','いなほ1号'],
    ['8853D','Rapid','HB-E300系（海里）','海里']
  ]){
    const p=positions.find(p=>p.trainNumber===n);
    assert.equal(p.trainType,'odpt.TrainType:JR-East.'+expectedType);
    assert.equal(p.serviceName,name);
    assert.equal(p.publishedFleetReference,fleet);
    assert.deepEqual(Array.from(p.plannedVehicleCandidates),[fleet]);
    assert.deepEqual(Array.from(p.vehiclePlan.models),[fleet]);
    assert.equal(p.vehiclePlan.iconPath,'');
    assert.equal(p.vehicleIconPath,'');
    assert.equal(p.vehicleCandidates.includes('E129系'),false);
  }
  assert.equal(positions.find(p=>p.trainNumber==='623M')
    .publishedFleetReference,'');
});
test('No Friday Kairi on Thursday and none on November 23 despite holiday',()=>{
  const thu=estimateAt('2026-11-05T01:10:00Z','2026-11-05',
    ['1M','8853D','3921M']).positions;
  assert.deepEqual(Array.from(thu,p=>p.trainNumber),['1M','3921M']);
  const mon=estimateAt('2026-11-23T01:10:00Z','2026-11-23',
    ['1M','8853D','3921M'],'odpt.Calendar:SaturdayHoliday').positions;
  assert.deepEqual(Array.from(mon,p=>p.trainNumber),['1M','3921M']);
});
test('Hakushin index remains lazy and exclusively scoped to Hakushin',()=>{
  const spec=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
  const path='data/timetables/jreast-hakushin-2611-number-index.js';
  assert.equal(spec.lazy.trains.includes(path),true);
  assert.deepEqual(Array.from(spec.lazyScopes.trains[path]),['Hakushin']);
  const html=fs.readFileSync('pages/trains.html','utf8');
  assert.match(html,
    /data-script-src="\.\.\/data\/timetables\/jreast-hakushin-2611-number-index\.js\?v=[a-f0-9]{12}" data-line-scope="Hakushin"/);
});
