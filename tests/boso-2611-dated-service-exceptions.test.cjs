'use strict';
/* Nov 7 2026 Boso scheduled service exception contract.
 * JR East published 2611 holiday tables explicitly cancel these
 * original F-numbered rapid runs on 11/7 and show different 9xxx
 * service numbers. We do NOT fabricate replacement SQL stop times.
 * Run: node --test tests/boso-2611-dated-service-exceptions.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const lines=JSON.parse(fs.readFileSync(
  'data/core/railway_data.compact.json','utf8')).lines;
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
const items=[
  ['Uchibo','3680F','Inbound','Kimitsu','06:02','Kisarazu','06:10','Chiba','06:49'],
  ['Uchibo','3606F','Inbound','Kimitsu','06:29','Kisarazu','06:37','Chiba','07:15'],
  ['Sotobo','3573F','Outbound','Chiba','05:21','Soga','05:27','KazusaIchinomiya','06:01'],
  ['Sotobo','3719F','Outbound','Chiba','09:27','Soga','09:39','KazusaIchinomiya','10:13'],
  ['Sotobo','3845F','Outbound','Chiba','10:26','Soga','10:37','KazusaIchinomiya','11:11']
];
function row(item,positionSource='supabase-train-run'){
  const [line,number,dir,start,t1,middle,t2,end,t3]=item;
  return {
    '@id':'boso:sample:'+line+':'+number,
    'odpt:railway':'odpt.Railway:JR-East.'+line,
    'odpt:trainNumber':number,
    'odpt:calendar':'odpt.Calendar:SaturdayHoliday',
    'odpt:railDirection':'odpt.RailDirection:'+dir,
    'odpt:trainType':'odpt.TrainType:JR-East.Rapid',
    'odpt:destinationStation':['odpt.Station:JR-East.'+line+'.'+end],
    'odpt:trainTimetableObject':[
      {'odpt:departureStation':'odpt.Station:JR-East.'+line+'.'+start,
       'odpt:departureTime':t1},
      {'odpt:arrivalStation':'odpt.Station:JR-East.'+line+'.'+middle,
       'odpt:arrivalTime':t2},
      {'odpt:arrivalStation':'odpt.Station:JR-East.'+line+'.'+end,
       'odpt:arrivalTime':t3}
    ],
    _positionSource:positionSource,
    ...(positionSource==='supabase-train-run'?{_sqlLineId:line}:{}),
    _timetableValidity:'undated_not_current_verified',
    _timetableDateVerified:false
  };
}
function run(utc,source='supabase-train-run'){
  class FakeDate extends Date {
    constructor(...x){super(...(x.length?x:[utc]))}
    static now(){return Date.parse(utc)}
  }
  const window={RuntimeConfig:{},ODPTClient:{
    LINE_RAILWAY_CODE:{Uchibo:'Uchibo',Sotobo:'Sotobo'},
    LINE_TO_OPERATOR:{Uchibo:'JR-East',Sotobo:'JR-East'}
  }};
  const ctx=vm.createContext({window,Date:FakeDate,
    console:{debug(){},warn(){},error(){},log(){}}});
  vm.runInContext(estimator,ctx,{filename:'js/train-position-estimator.js'});
  for(const line of ['Uchibo','Sotobo'])
    window.TrainPositionEstimator.registerManualTimetable(line,
      items.filter(x=>x[0]===line).map(x=>row(x,source)));
  const result=window.TrainPositionEstimator.estimateAllPositions(
    {Uchibo:lines.Uchibo,Sotobo:lines.Sotobo},
    {},{},null,{lineIds:['Uchibo','Sotobo']});
  return [...(result.Uchibo||[]),...(result.Sotobo||[])];
}
test('11/7 05:24: cancelled Sotobo 3573F is not shown as a normal holiday train',()=>{
  assert.ok(!run('2026-11-06T20:24:00Z')
    .some(x=>x.trainNumber==='3573F'));
  assert.ok(run('2026-11-07T20:24:00Z')
    .some(x=>x.trainNumber==='3573F'),'normal Sunday 11/8 unaffected');
});
test('11/7 06:32: cancelled Uchibo 3606F does not appear',()=>{
  const p=run('2026-11-06T21:32:00Z');
  assert.ok(!p.some(x=>x.trainNumber==='3606F'));
  assert.ok(!p.some(x=>x.trainNumber==='3680F'));
  const sunday=run('2026-11-07T21:32:00Z');
  assert.ok(sunday.some(x=>x.trainNumber==='3606F'));
  assert.ok(sunday.some(x=>x.trainNumber==='3680F'));
});
test('11/7 09:30 and 10:29: 3719F and 3845F are suppressed only on the exceptional date',()=>{
  for(const [hour,number] of [['09:30','3719F'],['10:29','3845F']]){
    const [h,m]=hour.split(':').map(Number);
    const utc='2026-11-07T'+String(h-9).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00Z';
    // JST time 09:xx => UTC 00:xx, 10:xx => UTC 01:xx.
    const corrected='2026-11-07T'+String((h+15)%24).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00Z';
    assert.ok(!run(corrected).some(x=>x.trainNumber===number),number);
    const normal='2026-11-08T'+String((h+15)%24).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00Z';
    assert.ok(run(normal).some(x=>x.trainNumber===number),
      'Sunday 11/8 '+number+' still runs');
  }
});
test('2026-11-07 Supabase edge uses verified official numbered Sotobo replacements, no legacy train_runs writes',()=>{
  const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
  assert.match(edge,/applyBosoNovember7DatedNumbers/);
  assert.match(edge,/serviceDate !== "2026-11-07"/);
  for(const [normal,official] of [['3573F','9573M'],['3719F','9887M'],['3845F','8939M'],['3680F','9680M'],['3606F','9606M']]){
    assert.match(edge,new RegExp('"'+normal+'": \\{number:"'+official+'"'));
  }
  assert.match(edge,/run\.timetable_date_verified = true/);
  assert.match(edge,/run\.canonical_timetable_id = null/);
  assert.match(edge,/run\.operation_code = ""/);
  assert.match(edge,/signature !== replacement\.signature/);
  assert.match(edge,/\.from\("evidence_sources"\)/);
  assert.match(edge,/run\.operation_status = "cancelled"/);
  assert.doesNotMatch(edge,/\.from\("train_runs"\)/,
    'legacy train_runs is intentionally write-disabled and must not be used as an active source');
});
test('dated suppression applies only to SQL planned positions, never a live or independent source',()=>{
  const p=run('2026-11-06T20:24:00Z','train-timetable');
  assert.ok(p.some(x=>x.trainNumber==='3573F'));
  assert.ok(p.every(x=>x.positionSource==='train-timetable'));
});
