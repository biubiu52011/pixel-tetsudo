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

test('SVG fallback transfer badges reuse shared, cached text measurement', () => {
  const src = read('js/trains-render.js');
  const begin = src.indexOf('function _badgeLabel(it) {');
  const end = src.indexOf('function _rememberTrainArtworkFailure(',begin);
  assert.ok(begin >= 0 && end > begin);
  const window = {ThroughChip:{measureWidth(label,size){
    assert.equal(label,'中央本线');
    assert.equal(size,9);
    return 54;
  }}};
  vm.runInNewContext(src.slice(begin,end) + '\nwindow.badgeWidth = _badgeW;', {window});
  assert.equal(window.badgeWidth({name:'中央本线'},true),62);
  assert.match(src,/var _lineName = _badgeLabel\(txl\);/);
});
