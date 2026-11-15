'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('route timetable matches official Nippo Kanda token to unique Kyushu ID',async()=>{
  const window={
    RuntimeConfig:{
      STATION_ALIAS_BY_RAILWAY:{Nippo:{Kanda:'Kanda-Fukuoka'}},
      PUBLISHED_JP_HOLIDAYS:{'2026':[]}
    },
    RailwayDB:{getLine:()=>({operator:'JR-Kyushu'})},
    ODPTClient:{getCachedTrainRuns:()=>Promise.resolve([{
      _sqlLineId:'Nippo',_serviceDate:'2026-11-09',
      'odpt:trainNumber':'550M','odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:trainTimetableObject':[
        {'odpt:departureStation':'odpt.Station:JR-Kyushu.Nippo.Kanda','odpt:departureTime':'06:00'},
        {'odpt:arrivalStation':'odpt.Station:JR-Kyushu.Nippo.Obase-Nishikōdai-Mae','odpt:arrivalTime':'06:05'}
      ]
    }])}
  };
  vm.runInNewContext(fs.readFileSync('js/route-timetable.js','utf8'),{window,Date,console});
  const plan=await window.RouteTimetable.enrichSegments([
    {type:'ride',lineId:'Nippo',fromStation:'Kanda-Fukuoka',toStation:'Obase-Nishikōdai-Mae'}
  ],{mode:'depart',date:'2026-11-09',time:'05:55'});
  assert.equal(plan.complete,true);
  assert.equal(plan.departure,'06:00');
  assert.equal(plan.arrival,'06:05');
});

test('JR-West Kure source Akitsu resolves to Hiroshima canonical station without changing source URN',async()=>{
  const window={
    RailwayDB:{getLine:()=>({operator:'JR-West'})},
    ODPTClient:{getCachedTrainRuns:()=>Promise.resolve([{
      _sqlLineId:'Kure',_serviceDate:'2026-11-16',
      'odpt:trainNumber':'150M','odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:trainTimetableObject':[
        {'odpt:departureStation':'odpt.Station:JR-West.Kure.Akitsu','odpt:departureTime':'06:00'},
        {'odpt:arrivalStation':'odpt.Station:JR-West.Kure.Kazahaya','odpt:arrivalTime':'06:09'}
      ]
    }])}
  };
  vm.runInNewContext(fs.readFileSync('data/core/runtime-config.js','utf8'),
    {window,Date,console,Map,Set,Object});
  assert.equal(window.RuntimeConfig.STATION_ALIAS_BY_RAILWAY.Kure.Akitsu,'Akitsu-Kure');
  vm.runInNewContext(fs.readFileSync('js/route-timetable.js','utf8'),{window,Date,console});
  const plan=await window.RouteTimetable.enrichSegments([
    {type:'ride',lineId:'Kure',fromStation:'Akitsu-Kure',toStation:'Kazahaya'}
  ],{mode:'depart',date:'2026-11-16',time:'05:55'});
  assert.equal(plan.complete,true);
  assert.equal(plan.departure,'06:00');
  assert.equal(plan.arrival,'06:09');
});
