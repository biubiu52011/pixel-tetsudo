'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('train platform lookup is edition-scoped, strict, and extensible without changing resolver code', () => {
  const window = {};
  vm.runInNewContext(read('data/core/platform-data.js'), { window, Date });
  assert.equal(window.PLATFORM_TRAIN_PLAN_EDITIONS[0].validFrom, '2026-11-01');
  assert.equal(window.PLATFORM_TRAIN_PLAN_EDITIONS[0].validTo, '2026-11-30');
  const find = window.PlatformResolver.resolveTrain;

  // Real published November evidence and an unverified date.
  assert.equal(find('SaikyoKawagoe','683S','Weekday','2026-11-09','Osaki','06:51','departure'), '8');
  assert.equal(find('SaikyoKawagoe','683S','Weekday','2026-12-09','Osaki','06:51','departure'), null);
  assert.equal(find('SaikyoKawagoe','683S','Weekday','2026-11-31','Osaki','06:51','departure'), null);

  // Simulate an independently sourced future edition; no code update needed.
  window.PLATFORM_TRAIN_PLAN_EDITIONS.push({
    id:'future-test', validFrom:'2027-01-01', validTo:'2027-01-31',
    plans:{Example:{'12M':{Weekday:{stops:{ExampleStation:[null,'11:03','9']}}}}}
  });
  assert.equal(find('Example','12M','Weekday','2027-01-11','ExampleStation','11:03','departure'),'9');
  assert.equal(find('Example','12M','Weekday','2027-01-11','ExampleStation','11:04','departure'),null);
  assert.equal(find('Example','12M','Weekday','2027-02-01','ExampleStation','11:03','departure'),null);
  // Conflicting overlapping publications must not choose a platform.
  window.PLATFORM_TRAIN_PLAN_EDITIONS.push({
    id:'conflict-test', validFrom:'2027-01-01', validTo:'2027-01-31',
    plans:{Example:{'12M':{Weekday:{stops:{ExampleStation:[null,'11:03','8']}}}}}
  });
  assert.equal(find('Example','12M','Weekday','2027-01-11','ExampleStation','11:03','departure'),null);
});

test('transfer resolver preserves structured walking times and marks absent times unknown', () => {
  const src = read('js/route-search.js');
  const begin = src.indexOf('  function declaredWalkMinutes(transfer) {');
  const end = src.indexOf('  // 零换乘直通边', begin);
  assert.ok(begin >= 0 && end > begin, 'use existing route-search transfer owner');
  const ctx = vm.createContext({});
  vm.runInContext(src.slice(begin, end),ctx);
  assert.equal(ctx.declaredWalkMinutes({walkMinutes:2,note:'徒歩約9分'}),2);
  assert.equal(ctx.declaredWalkMinutes({walk_minutes:4}),4);
  assert.equal(ctx.declaredWalkMinutes({note:'徒歩約5分'}),5);
  assert.equal(ctx.declaredWalkMinutes({samePlatform:true,walkMinutes:0}),0);
  assert.equal(ctx.declaredWalkMinutes({note:'不明'}),null);
  assert.match(src,/const walkingDuration = declaredWalkMinutes\(declaration\)/);
});

test('two-minute verified transfer is feasible; unknown walking time is not silently zero', async () => {
  const rows = {
    LineA:[{
      _serviceDate:'2026-11-09', 'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:trainNumber':'A1','odpt:trainTimetableObject':[
        {'odpt:departureStation':'Start','odpt:departureTime':'10:00'},
        {'odpt:arrivalStation':'Middle','odpt:arrivalTime':'10:10'}
      ]
    }],
    LineB:[{
      _serviceDate:'2026-11-09', 'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:trainNumber':'B1','odpt:trainTimetableObject':[
        {'odpt:departureStation':'Middle','odpt:departureTime':'10:12'},
        {'odpt:arrivalStation':'End','odpt:arrivalTime':'10:30'}
      ]
    }]
  };
  const window = {
    RuntimeConfig:{PUBLISHED_JP_HOLIDAYS:{'2026':[]}},
    RailwayDB:{getLine(id){return rows[id] ? {} : null;}},
    ODPTClient:{getCachedTrainRuns(id){return Promise.resolve(rows[id] || []);}}
  };
  vm.runInNewContext(read('js/route-timetable.js'),{window,Date,console});
  const segments = (minutes) => [
    {type:'ride',lineId:'LineA',fromStation:'Start',toStation:'Middle'},
    {type:'transfer',station:'Middle',toStation:'Middle',walkingDuration:minutes},
    {type:'ride',lineId:'LineB',fromStation:'Middle',toStation:'End'}
  ];
  const options = {mode:'depart',date:'2026-11-09',time:'09:55'};
  const verified = await window.RouteTimetable.enrichSegments(segments(2),options);
  assert.equal(verified.complete,true);
  assert.equal(verified.connections[1].walk,2);
  assert.equal(verified.arrival,'10:30');
  assert.equal(window.RouteTimetable.getTransferBuffer({walkingDuration:0,samePlatform:true}),0);
  assert.equal(window.RouteTimetable.getTransferBuffer({walking:true}),5);
  const unknown = await window.RouteTimetable.enrichSegments(segments(null),options);
  assert.equal(unknown.complete,false);
  assert.equal(unknown.reason,'no-service');
});

test('SVG fallback transfer badges use the shared StationInfoLayout measurement model', () => {
  const src = read('js/trains-data.js');
  const begin = src.indexOf('window.StationInfoLayout = (function() {');
  const end = src.indexOf('})();', begin);
  assert.ok(begin >= 0 && end > begin, 'shared L3 layout owns badge sizes');
  let calls = 0;
  const window = {
    RuntimeConfig: {TRANSFER_MAX_ROWS: 4},
    ThroughChip: {measureWidth(label, size) {
      assert.equal(label, '中央本线');
      assert.equal(size, 9);
      calls++;
      return 54;
    }}
  };
  vm.runInNewContext(src.slice(begin, end + 5), {
    window,
    _losGroupKey() { return ''; }
  });
  const badge = {name:'中央本线',lineId:'ChuoMain'};
  const plan = window.StationInfoLayout.plan([badge],'Tokyo','東京',true,100);
  assert.equal(plan.shown.length, 1);
  assert.equal(plan.shown[0].label, '中央本线');
  assert.equal(plan.shown[0].badgeWidth, 62);
  assert.equal(plan.totalWidth, 62);
  assert.equal(calls, 1);
  assert.match(read('js/trains-render.js'), /window\.StationInfoLayout\.plan\(/);
});

test('ODPT feed health separates capability, first load, failed refresh, and stale observations', () => {
  const source = read('data/api/odpt-unified.js');
  const start = source.indexOf('    function getRunInfoSourceHealth(operator, nowMillis) {');
  const end = source.indexOf('    // ========== 公共 API ==========',start);
  assert.ok(start >= 0 && end > start);
  const window = {
    RuntimeConfig:{ODPT_INFORMATION_INTERVAL:30000},
    ODPT_DELAY_DATA:{Seibu:[{'@id':'old-status'}]},
    ODPT_REALTIME_STATUS:{}
  };
  const env = {
    window,ODPT_ENDPOINTS:{Seibu:{trainInformation:'official'},Disabled:{}}
  };
  vm.runInNewContext(source.slice(start,end)+'\nthis.health=getRunInfoSourceHealth;',env);
  const health = env.health;
  assert.equal(health('Disabled',100000).state,'unsupported');
  assert.equal(health('Seibu',100000).state,'cached');
  delete window.ODPT_DELAY_DATA.Seibu;
  assert.equal(health('Seibu',100000).state,'loading');
  window.ODPT_DELAY_DATA.Seibu = [{'@id':'old-status'}];
  window.ODPT_REALTIME_STATUS['Seibu:delay']={ok:true,at:100000};
  assert.equal(health('Seibu',110000).state,'ready');
  assert.equal(health('Seibu',200001).state,'stale');
  window.ODPT_REALTIME_STATUS['Seibu:delay']={ok:false,at:205000,status:403,message:'HTTP 403'};
  const failed=health('Seibu',205001);
  assert.equal(failed.state,'failed');
  assert.equal(failed.httpStatus,403);
  assert.equal(failed.fresh,false);
  // A later successful empty response is valid but must not imply normal.
  window.ODPT_DELAY_DATA.Seibu=[];
  window.ODPT_REALTIME_STATUS['Seibu:delay']={ok:true,at:210000};
  assert.equal(health('Seibu',211000).state,'ready');
  assert.equal(health('Seibu',211000).hasRecords,false);
});

test('DataFusion never treats failed ODPT request with retained payload as live', () => {
  const source = read('js/data-fusion.js');
  const start = source.indexOf('  function getApiDelayInfo(line, lineId) {');
  const end = source.indexOf('  function fuseLine(lineId) {', start);
  assert.ok(start >= 0 && end > start);
  let phase = 'ready';
  const window = {ODPTClient:{getRunInfoSourceHealth(){return {state:phase};}}};
  const env = {
    window, Date,
    odptData:{delayInfo:{Seibu:[{
      'odpt:trainInformationText':'事故による遅延',
      'dc:date':'2026-11-09T08:00:00+09:00'
    }]}},
    getOperatorForLine(){return 'Seibu';},
    _normalizeOperator(op){return op;},
    pickRecords(rows){return rows;},
    evaluateRecord(){return {status:'delayed',source:'odpt'};},
    recordText(rec){return rec['odpt:trainInformationText'];}
  };
  vm.runInNewContext(source.slice(start,end)+'\nthis.readLive=getApiDelayInfo;',env);
  assert.equal(env.readLive({operator:'Seibu'},'SeibuShinjuku').status,'delayed');
  phase='failed';
  assert.equal(env.readLive({operator:'Seibu'},'SeibuShinjuku'),null);
  phase='stale';
  assert.equal(env.readLive({operator:'Seibu'},'SeibuShinjuku'),null);
  assert.match(source,/var _delaySourceSignatures = \{\}/);
  assert.match(source,/apiHealth && apiHealth.state === 'ready'/);
});

test('schedule search retries deeper topology only when first alternatives have no valid service', async () => {
  const source = read('js/search-ui.js');
  const start = source.indexOf('    loadRouteOptions: function(candidates,t,timeOptions,generation) {');
  const end = source.indexOf('    renderRouteOptionList: function(entries,t,generation) {',start);
  assert.ok(start >= 0 && end > start);
  const make = id => ({
    path:['A','B'],durationMin:id==='Fast'?12:25,
    routeSegments:[{type:'ride',lineId:id,fromStation:'A',toStation:'B'}]
  });
  const first=make('Fast'), second=make('Other'), valid=make('Scheduled');
  let probes=0;
  const window={
    RouteSearch:{findRouteCandidates(a,b,mode,cap){
      assert.equal(a,'A');assert.equal(b,'B');assert.equal(mode,'duration');
      assert.equal(cap,20);probes++;return [first,second,valid];
    }},
    RouteTimetable:{enrichSegments(segs) {
      return Promise.resolve(segs[0].lineId==='Scheduled'
        ? {complete:true,arrivalClockConfirmed:true,departure:'09:00',arrival:'09:20',durationMin:20}
        : {complete:false,reason:'no-service'});
    }}
  };
  const ctx={window,Promise,Set};
  vm.runInNewContext('this.owner={'+source.slice(start,end)+
    'renderRouteOptionList:function(entries){this.rendered=entries;}};',ctx);
  const owner=ctx.owner;
  owner.resultsDiv={};owner.currentMode='duration';owner._renderGeneration=7;
  const options={mode:'depart',date:'2026-11-09',time:'08:50'};
  const result=await owner.loadRouteOptions([first,second],x=>x,options,7);
  assert.equal(probes,1);
  assert.equal(result[0].route,valid);
  assert.equal(result[0].schedule.complete,true);
  assert.equal(valid.timeOptions,options);
  assert.equal(owner.rendered.length,3);
});

test('route timetable indexes same-date train snapshots once and rebuilds on new source rows',async()=>{
  const source=read('js/route-timetable.js');
  let rows=[{
    _serviceDate:'2026-11-09','odpt:trainNumber':'A1','odpt:calendar':'odpt.Calendar:Weekday',
    'odpt:trainTimetableObject':[
      {'odpt:departureStation':'odpt.Station:JR-East.Example.A','odpt:departureTime':'09:00'},
      {'odpt:arrivalStation':'odpt.Station:JR-East.Example.B','odpt:arrivalTime':'09:10'},
      {'odpt:departureStation':'odpt.Station:JR-East.Example.B','odpt:departureTime':'09:11'},
      {'odpt:arrivalStation':'odpt.Station:JR-East.Example.C','odpt:arrivalTime':'09:25'}
    ]
  }];
  const window={
    RuntimeConfig:{PUBLISHED_JP_HOLIDAYS:{'2026':[]}},
    RailwayDB:{getLine:()=>({operator:'JR-East'})},
    ODPTClient:{getCachedTrainRuns(){return Promise.resolve(rows);}}
  };
  vm.runInNewContext(source,{window,console,Date,Promise,Map,Set,WeakMap});
  const service=window.RouteTimetable;
  const seg=[{type:'ride',lineId:'Example',fromStation:'A',toStation:'C'}];
  const opts={mode:'depart',date:'2026-11-09',time:'08:55'};
  const one=await service.enrichSegments(seg,opts);
  assert.equal(one.complete,true);
  assert.equal(one.departure,'09:00');
  assert.equal(one.arrival,'09:25');
  assert.equal(service.getIndexStats().builds,1);
  const two=await service.enrichSegments(seg,opts);
  assert.equal(two.complete,true);
  assert.equal(service.getIndexStats().builds,1,'same rows and date must reuse station index');
  assert.ok(service.getIndexStats().reuses>=1);
  rows=[{...rows[0],'odpt:trainNumber':'B1','odpt:trainTimetableObject':[
    {'odpt:departureStation':'odpt.Station:JR-East.Example.A','odpt:departureTime':'09:15'},
    {'odpt:arrivalStation':'odpt.Station:JR-East.Example.C','odpt:arrivalTime':'09:28'}
  ]}];
  const refreshed=await service.enrichSegments(seg,opts);
  assert.equal(refreshed.departure,'09:15');
  assert.equal(service.getIndexStats().builds,2,'new source array invalidates index');
  const differentDay=await service.enrichSegments(seg,{...opts,date:'2026-11-10'});
  assert.equal(differentDay.complete,false,'dated rows never leak to another service day');
});

test('schedule options rank confirmed midnight journeys by railway service-day minutes',async()=>{
  const source=read('js/search-ui.js');
  const start=source.indexOf('    loadRouteOptions: function(candidates,t,timeOptions,generation) {');
  const end=source.indexOf('    renderRouteOptionList: function(entries,t,generation) {',start);
  assert.ok(start>=0&&end>start);
  function route(id){return {path:['A','B'],durationMin:12,
    routeSegments:[{type:'ride',lineId:id,fromStation:'A',toStation:'B'}]};}
  const afterMidnight=route('Night'),beforeMidnight=route('Evening');
  const window={
    RouteTimetable:{enrichSegments(segs){
      return Promise.resolve(segs[0].lineId==='Night'
        ? {complete:true,arrivalClockConfirmed:true,departure:'23:55',departureMinute:1435,arrival:'00:05',arrivalMinute:1445,durationMin:10}
        : {complete:true,arrivalClockConfirmed:true,departure:'23:50',departureMinute:1430,arrival:'23:59',arrivalMinute:1439,durationMin:9});
    }},
    RouteSearch:{findRouteCandidates(){throw Error('should not retry already complete journey');}}
  };
  const ctx={window,Promise,Set};
  vm.runInNewContext('this.owner={'+source.slice(start,end)+
    'renderRouteOptionList:function(entries){this.rendered=entries;}};',ctx);
  const owner=ctx.owner;
  owner.currentMode='duration';owner._renderGeneration=5;owner.resultsDiv={};
  const options={mode:'depart',date:'2026-11-09',time:'23:45'};
  const result=await owner.loadRouteOptions([afterMidnight,beforeMidnight],x=>x,options,5);
  assert.equal(result[0].route,beforeMidnight);
  assert.equal(result[1].route,afterMidnight);
});

test('fleet reference date windows are sourced, not inferred from operation numbers',()=>{
  const source=read('data/core/major-vehicle-fleet-presets.js');
  const window={};
  vm.runInNewContext(source,{window,Date,Set,Map,Number,Object,Array,String,Math});
  const fleet=window.MajorVehicleFleetPresets;
  const row={validFrom:'2026-11-01',validTo:'2026-11-15'};
  assert.equal(fleet.isValidForDate(row,'2026-11-09'),true);
  assert.equal(fleet.isValidForDate(row,'2026-10-31'),false);
  assert.equal(fleet.isValidForDate(row,'2026-11-16'),false);
  assert.equal(fleet.isValidForDate(row,''),false,'dated fleet cannot be used without a date');
  assert.equal(fleet.isValidForDate({},'2026-11-09'),true,'undated is reference-only');
  const t='odpt.TrainType:JR-East.Local';
  const valid=fleet.lookup('Yamanote','JR-East',t,{serviceDate:'2026-11-09'});
  assert.equal(valid.evidenceRole,'route-fleet-reference');
  assert.equal(valid.planOverride,false);
  assert.equal(valid._fleetReferenceOnly,true);
  assert.equal(valid.asOf,'2026-11-03');
  assert.equal(fleet.lookup('Yamanote','JR-East',t,{serviceDate:'2026-02-30'}),null);
  assert.match(read('js/train-vehicle.js'),/serviceDate: tt\._serviceDate \|\| tt\.serviceDate \|\| ''/);
});
