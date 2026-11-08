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
