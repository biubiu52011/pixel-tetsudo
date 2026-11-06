'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const runtime=fs.readFileSync('data/core/runtime-config.js','utf8');
const estimated=fs.readFileSync('js/train-position-estimator.js','utf8');
const routing=fs.readFileSync('js/route-timetable.js','utf8');

function fragment(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0 && b>a,'calendar extraction boundary unavailable');
  return source.slice(a,b);
}
function setup(overrides){
  const window={};
  const context=vm.createContext({window});
  vm.runInContext(runtime,context,{filename:'data/core/runtime-config.js'});
  window.RuntimeConfig.SERVICE_DAY_CALENDAR=overrides || {};
  vm.runInContext(fragment(estimated,
    '  function _calendarsForJstDate(', '  function getCurrentCalendars('),
    context,{filename:'js/train-position-estimator.js:calendar'});
  vm.runInContext(fragment(routing,
    '  function calendarsForDate(', '  function context(options)'),
    context,{filename:'js/route-timetable.js:calendar'});
  return {
    window,
    estimate:date=>Array.from(context.getCalendarsForDate(date)).map(x=>x.split(':').pop()),
    route:date=>Array.from(context.calendarsForDate(date))
  };
}

test('both railway timetable consumers use one published holiday source',()=>{
  assert.doesNotMatch(estimated,/var PUBLISHED_JP_HOLIDAYS\s*=/);
  assert.doesNotMatch(routing,/var publishedHolidays\s*=/);
  assert.match(runtime,/PUBLISHED_JP_HOLIDAYS: PUBLISHED_JP_HOLIDAYS/);
  const b=setup();
  for(const date of ['2026-11-03','2026-11-04','2026-11-07','2026-11-08','2027-02-23']){
    assert.deepEqual(b.route(date),b.estimate(date),'route vs estimator on '+date);
  }
  assert.deepEqual(b.route('2026-11-03'),['Holiday','SaturdayHoliday','Sunday']);
  assert.deepEqual(b.route('2026-11-04'),['Weekday']);
});

test('operator-specific overrides affect both consumers without modifying static facts',()=>{
  const b=setup({'2026-11-04':'holiday','2026-11-03':'weekday'});
  assert.deepEqual(b.route('2026-11-04'),['Holiday','SaturdayHoliday','Sunday']);
  assert.deepEqual(b.estimate('2026-11-04'),b.route('2026-11-04'));
  assert.deepEqual(b.route('2026-11-03'),['Weekday']);
  assert.deepEqual(b.estimate('2026-11-03'),b.route('2026-11-03'));
});

test('dates with unpublished holiday tables are not silently verified by route search',()=>{
  const b=setup();
  assert.deepEqual(b.route('2028-11-03'),[]);
  assert.deepEqual(b.estimate('invalid-date'),[]);
});
