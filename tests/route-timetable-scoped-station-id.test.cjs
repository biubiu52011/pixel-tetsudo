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
