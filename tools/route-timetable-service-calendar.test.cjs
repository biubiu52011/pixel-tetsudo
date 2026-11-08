'use strict';
// Regression for Japan holidays in the route-search timetable UI.
// Run: node --test tools/route-timetable-service-calendar.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('js/route-timetable.js','utf8');
const runtimeConfig=fs.readFileSync('data/core/runtime-config.js','utf8');
const lineId='Tsurumi';
function source(number,calendar,dep,arr,extra){
  return {
    'odpt:trainNumber':number,
    'odpt:calendar':'odpt.Calendar:'+calendar,
    'odpt:trainTimetableObject':[
      {'odpt:departureStation':'odpt.Station:JR-East.Tsurumi.Ogimachi','odpt:departureTime':dep},
      {'odpt:arrivalStation':'odpt.Station:JR-East.Tsurumi.Tsurumi','odpt:arrivalTime':arr}
    ],
    ...extra
  };
}
const weekday=source('weekday-2200','Weekday','22:05','22:22');
const holiday=source('2200','SaturdayHoliday','22:10','22:27');
const segment={type:'ride',lineId,fromStation:'Ogimachi',toStation:'Tsurumi'};
function setup(iso,rows,override){
  class FixedDate extends Date {
    constructor(...args){super(...(args.length?args:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const window={
    RuntimeConfig:{SERVICE_DAY_CALENDAR:override||{}},
    RailwayDB:{getLine(id){return id===lineId?{operator:'JR-East'}:null;}},
    ODPTClient:{getCachedTrainRuns(id){
      assert.equal(id,lineId);
      return Promise.resolve(rows);
    }}
  };
  const ctx=vm.createContext({window,Date:FixedDate,console});
  vm.runInContext(runtimeConfig,ctx,{filename:'data/core/runtime-config.js'});
  window.RuntimeConfig.SERVICE_DAY_CALENDAR=override||{};
  vm.runInContext(script,ctx,{filename:'js/route-timetable.js'});
  return window.RouteTimetable;
}
async function route(iso,rows,override,time){
  return setup(iso,rows,override).enrichSegments([segment],{mode:'depart',time:time||'22:00'});
}
test('2026-11-03 Culture Day selects SaturdayHoliday instead of Tuesday Weekday',async()=>{
  const result=await route('2026-11-03T13:00:00Z',[weekday,holiday]);
  assert.equal(result.complete,true);
  assert.equal(result.times[0].train,'2200');
  assert.equal(result.arrival,'22:27');
  assert.equal(result.serviceDate,'2026-11-03');
});
test('2026-11-04 weekday selects weekday and excludes the previous holiday',async()=>{
  const result=await route('2026-11-04T13:00:00Z',[weekday,holiday]);
  assert.equal(result.complete,true);
  assert.equal(result.times[0].train,'weekday-2200');
  assert.equal(result.serviceDate,'2026-11-04');
});
test('Sunday and a manual holiday override use holiday timetable',async()=>{
  for(const [iso,overrides] of [
    ['2026-11-08T13:00:00Z',null],
    ['2026-11-04T13:00:00Z',{'2026-11-04':'holiday'}]
  ]){
    const r=await route(iso,[weekday,holiday],overrides);
    assert.equal(r.complete,true);
    assert.equal(r.times[0].train,'2200');
  }
});
test('before 04:00 JST belongs to the preceding service date',async()=>{
  const overnight=source('after-midnight','SaturdayHoliday','24:15','24:32');
  const result=await route('2026-11-03T16:00:00Z',
    [source('wrong-day','Weekday','24:05','24:20'),overnight],null,'24:00');
  assert.equal(result.complete,true);
  assert.equal(result.times[0].train,'after-midnight');
  assert.equal(result.serviceDate,'2026-11-03');
});
test('dated SQL plans keep their service-date authority, independent of calendar label',async()=>{
  const row=source('dated-SQL','Weekday','22:15','22:30',{_serviceDate:'2026-11-03'});
  const result=await route('2026-11-03T13:00:00Z',[row,holiday]);
  assert.equal(result.complete,true);
  assert.equal(result.times[0].train,'2200','earlier holiday train remains available');
  const only=await route('2026-11-03T13:00:00Z',[row]);
  assert.equal(only.times[0].train,'dated-SQL');
  const wrong=await route('2026-11-04T13:00:00Z',[row]);
  assert.equal(wrong.complete,false,'dated rows cannot leak across service days');
});
test('source completeness remains separate from confirmed omissions',()=>{
  const src=fs.readFileSync('data/api/odpt-unified.js','utf8');
  assert.match(src,/planAvailability:hasPlanRows\?"available":"unconfirmed"/);
  assert.match(src,/sourceVerification:sourceVerified\?"verified":auditStatus/);
  assert.match(src,/recordIntegrity:knownOmissions\?"known_omissions":"no_known_omissions"/);
  assert.match(src,/missingTrainCount:null/);
  assert.match(src,/tt\._timetableCoverage=knownOmissions \? "partial" :/);
});

test('actual SQL cache preserves special-source quarantine diagnostics without inventing missing trains',async()=>{
  const src=fs.readFileSync('data/api/odpt-unified.js','utf8');
  const start=src.indexOf('    function getCachedTrainRuns(');
  const end=src.indexOf('\n    }',start)+6;
  assert.ok(start>0&&end>start);
  for(const [specials,omitted] of [[1,47],[0,48],[undefined,0]]){
    const statuses={};
    const context=vm.createContext({
      usesSqlTimetable:()=>true,_serviceDateJst:()=>'2026-11-09',
      _trainRunCache:{},_trainRunInflight:{},_trainRunLastWarning:{},
      _trainRunLastStatus:statuses,TRAIN_RUN_CACHE_ENDPOINT:'https://example.invalid',
      AbortController,Date,console,setTimeout,clearTimeout,
      fetch:async()=>({ok:true,json:async()=>({
        ok:true,line_id:'OsakaHigashi',service_date:'2026-11-09',
        source:'DATABASE_MANUAL_TEMPLATES',complete:false,partial:true,
        audit_coverage_status:'unverified',omitted_incomplete_runs:omitted,
        suppressed_station_only_source_fragments:omitted-(specials||0),
        suppressed_unverified_osaka_higashi_special_sources:specials,
        runs:[{line_id:'OsakaHigashi',service_date:'2026-11-09',stops:[{},{}]}]
      })}),
      _trainRunToTimetable:()=>({})
    });
    vm.runInContext(src.slice(start,end),context);
    const rows=await context.getCachedTrainRuns('OsakaHigashi');
    assert.equal(rows.length,1);
    const status=statuses.OsakaHigashi;
    assert.equal(status.suppressedUnverifiedOsakaHigashiSpecialSources,specials||0);
    assert.equal(status.suppressedStationOnlyFragments,omitted-(specials||0));
    assert.equal(status.omittedIncompleteRuns,omitted,'reason counts are already included');
    assert.equal(status.missingTrainCount,null,'source fragments are not missing trains');
    assert.equal(status.sourceVerification,'unverified');
    assert.equal(status.recordIntegrity,omitted?'known_omissions':'no_known_omissions');
  }
});


// Timetable-backed route display: no scheduled match on the static best line
// must not suppress a valid alternative. Keep these tests in the existing
// service-calendar suite so both route changes and data scripts trigger CI.
test('route candidates include Yamanote after sparse Saikyo static winner',()=>{
  const railway=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
  const lines=railway.lines;
  const window={
    UNIFIED_LINES:lines,
    LINE_STATION_ORDER:railway.lineStationOrder,
    STATION_COORDS:railway.stations,
    RuntimeConfig:{TRUNK_MAIN_LINE_IDS:[]},
    RailwayDB:{
      getAllLines(){return lines;},
      getLine(id){return lines[id]||null;},
      getData(){return {line_types:railway.line_types};},
      getLineDurations(id){return lines[id]&&lines[id].durations||[];}
    }
  };
  vm.runInContext(fs.readFileSync('js/route-search.js','utf8'),
    vm.createContext({window,console}),{filename:'js/route-search.js'});
  const initial=window.RouteSearch.findRoute('Shinjuku','Ikebukuro','combo');
  assert.equal(initial.routeSegments[0].lineId,'SaikyoKawagoe');
  const candidates=window.RouteSearch.findRouteCandidates('Shinjuku','Ikebukuro','combo',6);
  assert.equal(candidates[0].routeSegments[0].lineId,'SaikyoKawagoe');
  assert.ok(candidates.some(x=>x.routeSegments.length===1&&
    x.routeSegments[0].lineId==='Yamanote'),'Yamanote direct line remains available');
  const home=fs.readFileSync('pages/home.html','utf8');
  assert.ok(home.indexOf('running-chain-resolver.js?v=')<
    home.indexOf('route-search.js?v=')&&home.indexOf('running-chain-resolver.js?v=')>0,
    'real through owner must be loaded before route search on home');
});

test('route timetable never equates published departure-only clock with verified arrival',async()=>{
  const row={
    'odpt:trainNumber':'683S','odpt:calendar':'odpt.Calendar:Weekday',
    'odpt:trainType':'odpt.TrainType:JR-East.CommuterRapid',
    'odpt:trainTimetableObject':[
      {'odpt:departureStation':'odpt.Station:JR-East.SaikyoKawagoe.Osaki','odpt:departureTime':'06:51'},
      {'odpt:departureStation':'odpt.Station:JR-East.SaikyoKawagoe.Omiya','odpt:departureTime':'07:34'}
    ]
  };
  const context=vm.createContext({window:{
    RuntimeConfig:{},
    RailwayDB:{getLine:()=>({})},
    ODPTClient:{getCachedTrainRuns:()=>Promise.resolve([row])}
  },Date,console});
  vm.runInContext(runtimeConfig,context,{filename:'data/core/runtime-config.js'});
  vm.runInContext(script,context,{filename:'js/route-timetable.js'});
  const res=await context.window.RouteTimetable.enrichSegments([
    {type:'ride',lineId:'SaikyoKawagoe',fromStation:'Osaki',toStation:'Omiya'}
  ],{mode:'depart',date:'2026-11-09',time:'06:45'});
  assert.equal(res.complete,true);
  assert.equal(res.times[0].train,'683S');
  assert.equal(res.times[0].trainType,'odpt.TrainType:JR-East.CommuterRapid');
  assert.equal(res.times[0].arrivalClockConfirmed,false);
  assert.equal(res.times[0].arr,'07:34','departure time is only a routing reference');
});

test('short matched through connection is accepted; same-number long layover is not',async()=>{
  async function run(nextDeparture){
    const window={
      RailwayDB:{getLine:()=>({})},
      RuntimeConfig:{PUBLISHED_JP_HOLIDAYS:{'2026':[]}},
      ODPTClient:{getCachedTrainRuns:(line)=>Promise.resolve([{
        'odpt:calendar':'odpt.Calendar:Weekday',
        'odpt:trainNumber':'683S',
        'odpt:trainTimetableObject':line==='Rinkai'?
          [
            {'odpt:departureStation':'odpt.Station:TWR.Rinkai.ShinKiba','odpt:departureTime':'06:30'},
            {'odpt:arrivalStation':'odpt.Station:TWR.Rinkai.Osaki','odpt:arrivalTime':'06:49'}
          ]:[
            {'odpt:departureStation':'odpt.Station:JR-East.SaikyoKawagoe.Osaki','odpt:departureTime':nextDeparture},
            {'odpt:arrivalStation':'odpt.Station:JR-East.SaikyoKawagoe.Kawagoe','odpt:arrivalTime':'09:03'}
          ]
      }])}
    };
    const ctx=vm.createContext({window,Date,console});
    vm.runInContext(script,ctx,{filename:'js/route-timetable.js'});
    return window.RouteTimetable.enrichSegments([
      {type:'ride',lineId:'Rinkai',fromStation:'ShinKiba',toStation:'Osaki'},
      {type:'transfer',station:'Osaki',through:true},
      {type:'ride',lineId:'SaikyoKawagoe',fromStation:'Osaki',toStation:'Kawagoe'}
    ],{date:'2026-11-09',mode:'depart',time:'06:25'});
  }
  const good=await run('06:51');
  assert.equal(good.complete,true);
  assert.equal(good.connections[1].through,true);
  const bad=await run('08:00');
  assert.equal(bad.complete,true);
  assert.equal(bad.connections[1].through,false);
  assert.deepEqual(Array.from(bad.downgrade),[1]);
});
