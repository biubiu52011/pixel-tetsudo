'use strict';
/* 陸羽東線 2026-11 official numbers, 2024 flood suspended segment and
 * KiHa110 planned-only PNG. node --test tests/rikuto-east-2611-official-number-png.test.cjs
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={log(){},debug(){},warn(){},error(){}};
const context=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-rikuto-east-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start);
vm.runInContext(render.slice(start,end),context,{filename:'js/trains-render.js:marker'});
const idx=win.JREastRikutoEastNumberIndex202611;
const src='odpt.Railway:JR-East.RikutoEast';
const png='../images/列车/JR東日本/JR東日本_キハ110系.png';
const omoidePng='../images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png';
function proof(n,dir,type,date,cal,stops){
  const rapid=/^972[1-6]D$/.test(n);
  return {source:'sql-jreast-2611-number-roster',
    lineId:'RikutoEast',segmentKey:rapid?
      'kogota_naruko_omoide_rapid':'kogota_naruko_regular',
    trainNumber:n,serviceDate:date,
    calendar:'odpt.Calendar:'+(cal==='holiday'?'SaturdayHoliday':'Weekday'),
    direction:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.'+(rapid?'Rapid':'Local'),
    serviceName:rapid?'おもいで湯けむり'+n.slice(-2,-1)+'号':'',
    sourceTemplateId:2343,sourceStopKeys:stops.slice(),
    validDates:rapid?Array.from(idx.specialDates):[],
    plannedCandidates:['キハ110系'],
    model:'キハ110系',pngReference:rapid?omoidePng:png,
    officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/268'+
      (dir==='Inbound'?'u':'d')+(cal==='holiday'?'2':'1')+'.html',
    stopClockStatus:'historical_not_2611_verified',
    referenceOnly:true,actualVehicleConfirmed:false
  };
}
function position(n,dir,type='Local',date='2026-11-05',cal='weekday',extra={}){
  const stops=dir==='Inbound'?['Naruko-Onsen','Furukawa','Kogota']:
    ['Kogota','Furukawa','Naruko-Onsen'];
  return {trainNumber:n,positionLineId:'RikutoEast',trainOperator:'JR-East',
    sourceRailway:src,railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.'+type,
    serviceDate:date,calendarType:cal,positionSource:'supabase-train-run',
    estimated:true,plannedVehicleCandidates:['キハ110系'],
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    scheduledStopKeys:stops,
    officialNumberVerified:true,
    sqlPublishedNumberFleetReference:proof(n,dir,type,date,cal,stops),
    ...extra};
}
function verify(p){return idx.verify(p.trainNumber,p.sourceRailway,p.railDirection,
  p.trainType,p.calendarType,p.serviceDate);}
test('45 official 2611 regular numbers use only scoped planned KiHa110 PNGs',()=>{
  assert.equal(idx.normalInbound.length,22);
  assert.equal(idx.normalOutbound.length,23);
  assert.equal(new Set([...idx.normalInbound,...idx.normalOutbound]).size,45);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('キハ110系',png,'RikutoEast'),true);
  for(const [numbers,direction] of [[idx.normalInbound,'Inbound'],[idx.normalOutbound,'Outbound']]){
    for(const n of numbers){
      for(const [date,cal] of [['2026-11-05','weekday'],['2026-11-07','holiday']]){
        const p=position(n,direction,'Local',date,cal);
        assert.equal(verify(p).kind,'regular',n+'/'+date);
        const v=win.TrainVehicle.lookupTrainNumberRangePng(p);
        assert.equal(v?.pngPath,png,n+'/'+date);
        assert.equal(v?.planned,true);
        const marker=context._trainMarkerSpec(p,p.trainNumber,'RikutoEast');
        assert.equal(marker.kind,'vehicle',n+'/'+date);
        assert.equal(marker.iconSrc,png);
        assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
      }
    }
  }
});
test('six Omoide Yukemuri 972xD rapids match published November dates and true train type',()=>{
  assert.equal(idx.rapidInbound.length,3);
  assert.equal(idx.rapidOutbound.length,3);
  assert.equal(idx.specialDates.length,12);
  for(const [numbers,dir] of [[idx.rapidInbound,'Inbound'],[idx.rapidOutbound,'Outbound']]){
    for(const n of numbers){
      for(const date of idx.specialDates){
        // Nov 2 is a weekday but runs on the published HOLIDAY SQL source.
        const cal='holiday';
        const p=position(n,dir,'Rapid',date,cal);
        const rule=verify(p);
        assert.equal(rule.kind,'rapid',n+'/'+date);
        assert.equal(rule.trainType,'Rapid');
        assert.equal(rule.serviceName,'おもいで湯けむり'+parseInt(n.slice(0,-1),10)%10+'号');
        assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p)?.pngPath,omoidePng);
      }
      // Legacy SQL imports holiday-calendar Rapid as Local. Index may
      // admit that RECORD but the estimate must publish Rapid class.
      const legacy=position(n,dir,'Local','2026-11-07','holiday');
      assert.equal(verify(legacy).trainType,'Rapid');
      for(const [date,cal] of [
        ['2026-11-04','weekday'],['2026-11-06','weekday'],
        ['2026-11-09','weekday'],['2026-11-30','weekday']]){
        const p=position(n,dir,'Rapid',date,cal);
        assert.equal(verify(p),false);
        assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
        assert.equal(context._trainMarkerSpec(p,p.trainNumber,'RikutoEast').kind,'unresolved');
      }
    }
  }
});
test('reject 2027 seasonal and foreign source/line/direction/model',()=>{
  const base=position('1720D','Inbound');
  const bad=[
    {trainNumber:'9727D'},{trainNumber:'9728D'},{trainNumber:'1720M'},
    {trainNumber:'1729D'},{trainNumber:'5727D'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {positionLineId:'Ishinomaki'}, {displayLineId:'Ominato'},
    {trainOperator:'JR-West'},
    {sourceRailway:'odpt.Railway:JR-East.Ominato'},
    {serviceDate:'2026-12-05'}, {calendarType:'holiday'},
    {plannedVehicleCandidates:['キハ100系']},
    {realtimeVehicleType:'キハ100系'},
    {vehiclePlan:{status:'PLANNED_MODEL',confirmed:true,models:['キハ100系']}}
  ];
  for(const b of bad)assert.equal(win.TrainVehicle.lookupTrainNumberRangePng({...base,...b}),null,
    'bad '+JSON.stringify(b));
  assert.equal(idx.verify('1720D',src,'Inbound','Local','weekday','2026-12-05'),null);
  assert.equal(idx.verify('9727D',src,'Outbound','Local','holiday','2026-11-07'),false);
});
function estimateAt(iso,serviceDate,entries){
  class FixedDate extends Date{
    constructor(...a){super(...(a.length?a:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const root={RuntimeConfig:{},JREastRikutoEastNumberIndex202611:idx,
    TrainNumberPngRanges:win.TrainNumberPngRanges,
    ODPTClient:{LINE_RAILWAY_CODE:{RikutoEast:'RikutoEast'},
      LINE_TO_OPERATOR:{RikutoEast:'JR-East'}}};
  const ctx=vm.createContext({window:root,Date:FixedDate,console:quiet});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),ctx);
  const stops=[['Kogota',null,'07:45'],['Furukawa','08:20','08:21'],
    ['Naruko-Onsen','10:00',null]];
  const trip=(number,calendar='odpt.Calendar:Weekday',extra={})=>{
    const st=extra.stops||stops;
    const rapid=/^972[1-6]D$/.test(number),
      cal=calendar.includes('SaturdayHoliday')?'holiday':'weekday',
      keys=st.map(x=>x[0]);
    return {
    '@id':'sql:RikutoEast:'+number+':'+calendar,
    'odpt:railway':src,'odpt:trainNumber':number,
    'odpt:calendar':calendar,
    'odpt:railDirection':'odpt.RailDirection:Outbound',
    'odpt:trainType':'odpt.TrainType:JR-East.'+(rapid?'Rapid':'Local'),
    'odpt:destinationStation':['odpt.Station:JR-East.RikutoEast.Naruko-Onsen'],
    'odpt:trainTimetableObject':st.map(([station,arr,dep])=>({
      ...(arr?{'odpt:arrivalStation':'odpt.Station:JR-East.RikutoEast.'+station,
        'odpt:arrivalTime':arr}:{}),
      ...(dep?{'odpt:departureStation':'odpt.Station:JR-East.RikutoEast.'+station,
        'odpt:departureTime':dep}:{})
    })),
    _positionSource:'supabase-train-run',_sqlLineId:'RikutoEast',
    _serviceDate:serviceDate,_timetableValidity:'undated_not_current_verified',
    _timetableDateVerified:false,
    _sqlPublishedNumberFleetReference:proof(number,'Outbound',
      rapid?'Rapid':'Local',serviceDate,cal,keys)};
  };
  root.TrainPositionEstimator.registerManualTimetable('RikutoEast',
    entries.map(e=>trip(e[0],e[1],e[2]||{})));
  return root.TrainPositionEstimator.estimateAllPositions({
    RikutoEast:{stations:['Kogota','Furukawa','Naruko-Onsen',
      'Nakayamadaira-Onsen','Sakaida','Shinjo'],operator:'JR-East'}
  },{},{},null,{lineIds:['RikutoEast']}).RikutoEast||[];
}
test('November 5 SQL plan only admits regular official runs; closed section never projected',()=>{
  const date='2026-11-05';
  const closed=[['Kogota',null,'07:45'],['Furukawa','08:20','08:21'],
    ['Naruko-Onsen','10:00','10:05'],['Nakayamadaira-Onsen','10:12','10:12'],
    ['Shinjo','11:35',null]];
  const p=estimateAt('2026-11-04T23:30:00Z',date,[
    ['1721D','odpt.Calendar:Weekday'],
    ['9721D','odpt.Calendar:Weekday'],
    ['9727D','odpt.Calendar:Weekday'],
    ['1723D','odpt.Calendar:Weekday',{stops:closed}]
  ]);
  assert.deepEqual(Array.from(p,x=>x.trainNumber),['1721D']);
  assert.equal(p[0].estimated,true);
  assert.equal(p[0].positionSource,'supabase-train-run');
  assert.equal(p[0].vehicleIdentityStatus,'UNKNOWN');
  assert.equal(p[0].timetableDateVerified,false);
});
test('Nov 2 officially running holiday-template rapid retains official number and Rapid class',()=>{
  const p=estimateAt('2026-11-01T23:30:00Z','2026-11-02',[
    ['9721D','odpt.Calendar:SaturdayHoliday'],
    ['9727D','odpt.Calendar:SaturdayHoliday']
  ]);
  assert.deepEqual(Array.from(p,x=>x.trainNumber),['9721D']);
  assert.equal(p[0].trainType,'odpt.TrainType:JR-East.Rapid');
  assert.equal(p[0].serviceName,'おもいで湯けむり1号');
  assert.equal(p[0].vehicleIdentityStatus,'UNKNOWN');
});

test('2611 is not a 2027 special, not an arbitrary number range, and not an observed carset',()=>{
  assert.equal(fs.existsSync('images/列车/JR東日本/JR東日本_キハ110系_おもいで車両.png'),true);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('キハ110系',omoidePng,'RikutoEast'),true);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('キハ110系',omoidePng,'Ominato'),false);
  const good=position('9721D','Outbound','Rapid','2026-11-02','holiday');
  assert.equal(win.TrainNumberPngRanges.verifyRikutoEastService(good)?.kind,'rapid');
  assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(good)?.pngPath,omoidePng);
  const sourceProof=good.sqlPublishedNumberFleetReference;
  const invalid=[
    {sqlPublishedNumberFleetReference:null},
    {sqlPublishedNumberFleetReference:{...sourceProof,sourceTemplateId:0}},
    {sqlPublishedNumberFleetReference:{...sourceProof,sourceStopKeys:['Kogota','Shinjo']}},
    {sqlPublishedNumberFleetReference:{...sourceProof,validDates:[]}},
    {sqlPublishedNumberFleetReference:{...sourceProof,actualVehicleConfirmed:true}},
    {sqlPublishedNumberFleetReference:{...sourceProof,pngReference:png}},
    {sqlPublishedNumberFleetReference:{...sourceProof,serviceName:'おもいで湯けむり2号'}},
    {sqlPublishedNumberFleetReference:{...sourceProof,officialSourceUrl:'https://example.invalid'}},
    {scheduledStopKeys:['Kogota','Furukawa','Shinjo']},
    {positionSource:'realtime-api'},
    {trainType:'odpt.TrainType:JR-East.Local'}
  ];
  for(const bad of invalid)
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng({...good,...bad}),null,
      'must reject forged source '+JSON.stringify(bad).slice(0,90));
  assert.equal(good.vehicleIdentityStatus,'UNKNOWN');
});
test('96 SQL-issued numbers and Nov 2 cross-calendar backend must guard old import',()=>{
  const migration=fs.readFileSync('supabase/migrations/'+
    '20261106180000_rikuto_east_2611_96_official_sources_8_legacy_exclusions.sql','utf8');
  const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
  for(const s of ['published_rikuto_east_2611_number_roster','<>96',
    'published_rikuto_east_2611_excluded_source_audit','<>8',
    "'9727D','9728D'",'historical_not_2611_verified',
    'actual_vehicle_confirmed boolean NOT NULL DEFAULT false',
    '2026-11-02','おもいで車両.png'])
    assert.ok(migration.includes(s),'missing SQL certification '+s);
  for(const s of ['RIKUTO_EAST_2611_OFFICIAL_ROSTER_UNAVAILABLE',
    'RIKUTO_EAST_2611_NOV2_RAPID_PROOF_UNAVAILABLE',
    'selectedCalendar==="odpt.Calendar:Weekday"',
    'templates.push(...rapidSources)',
    'forbidden.has(id)','keys.length!==p.source_stop_keys.length',
    'run.train_type=p.train_type_urn',
    'run.vehicle_plan_confirmed=false',
    'run.published_number_fleet_reference={'])
    assert.ok(edge.includes(s),'missing backend admission '+s);
});
