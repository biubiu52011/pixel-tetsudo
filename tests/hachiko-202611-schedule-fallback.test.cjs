'use strict';
/* Hachiko schedule fallback: exact train numbers and already stored
 * SQL timetable clocks. These fixtures are not a full 2026-11 publication
 * audit and do not upgrade undated SQL to a current verified revision.
 * Run: node --test tests/hachiko-202611-schedule-fallback.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const railway=JSON.parse(fs.readFileSync(
  'data/core/railway_data.compact.json','utf8')).lines.Hachiko;
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
// SQL Hachiko template stop-clocks, sampled 2026-11-04. A final clock
// is an ARRIVAL, not a terminal departure or a fabricated extra segment.
const north220=[
  ['Takasaki','05:28'],['Kuragano','05:32'],
  ['KitaFujioka','05:37'],['GummaFujioka','05:45'],
  ['Tansho','05:50'],['Kodama','05:55'],['Matsuhisa','06:00'],
  ['Yodo','06:04'],['Yorii','06:09'],['Orihara','06:14'],
  ['Takezawa','06:19'],['Ogawamachi','06:24'],
  ['Myokaku','06:32'],['Ogose','06:38'],['Moro','06:42'],
  ['Komagawa','06:49',true]
];
const south461=[
  ['Hachioji','04:45'],['KitaHachioji','04:49'],
  ['Komiya','04:52'],['Haijima','05:01'],['HigashiFussa','05:05'],
  ['Hakonegasaki','05:09'],['Kaneko','05:14'],
  ['HigashiHanno','05:20'],['Komagawa','05:26',true]
];
const south568=[
  ['Komagawa','05:09'],['HigashiHanno','05:21'],
  ['Kaneko','05:27'],['Hakonegasaki','05:32'],
  ['HigashiFussa','05:38'],['Haijima','05:44'],
  ['Komiya','05:49'],['KitaHachioji','05:55'],
  ['Hachioji','05:59',true]
];
function row(number,stops,direction,dest){
  return {
    '@id':'test:sql:Hachiko:'+number,
    'odpt:trainNumber':number,
    'odpt:railway':'odpt.Railway:JR-East.Hachiko',
    'odpt:calendar':'odpt.Calendar:Weekday',
    'odpt:railDirection':'odpt.RailDirection:'+direction,
    'odpt:trainType':'odpt.TrainType:JR-East.Local',
    'odpt:destinationStation':['odpt.Station:JR-East.'+dest],
    'odpt:trainTimetableObject':stops.map(([s,t,last])=>({
      [last?'odpt:arrivalStation':'odpt:departureStation']:
        'odpt.Station:JR-East.Hachiko.'+s,
      [last?'odpt:arrivalTime':'odpt:departureTime']:t
    })),
    _positionSource:'supabase-train-run',
    _sqlLineId:'Hachiko',
    _serviceDate:'2026-11-04',
    _timetableValidity:'undated_not_current_verified',
    _timetableDateVerified:false,
    _canonicalGroupEvidence:'source_only'
  };
}
const templates=[
  row('220D',north220,'Inbound','Hachiko.Komagawa'),
  row('461E',south461,'Outbound','Kawagoe.Kawagoe'),
  row('568E',south568,'Inbound','Hachiko.Hachioji')
];
function at(iso){
  class FakeDate extends Date {
    constructor(...args){super(...(args.length?args:[iso]))}
    static now(){return Date.parse(iso)}
  }
  const window={
    RuntimeConfig:{},
    ODPTClient:{
      LINE_RAILWAY_CODE:{Hachiko:'Hachiko'},
      LINE_TO_OPERATOR:{Hachiko:'JR-East'}
    }
  };
  const ctx=vm.createContext({window,Date:FakeDate,
    console:{debug(){},warn(){},log(){},error(){}}});
  vm.runInContext(estimator,ctx,{filename:'js/train-position-estimator.js'});
  window.TrainPositionEstimator.registerManualTimetable('Hachiko',templates);
  return window.TrainPositionEstimator.estimateAllPositions(
    {Hachiko:railway},{},{},null,{lineIds:['Hachiko']}).Hachiko||[];
}
test('04:55 JST: 461E remains scheduled Hachiko train, not an invented live position',()=>{
  const p=at('2026-11-03T19:55:00Z');
  assert.deepEqual(Array.from(p,x=>x.trainNumber),['461E']);
  assert.equal(railway.stations[p[0].stationIndex],'Komiya');
  assert.equal(railway.stations[p[0].segmentToIndex],'Haijima');
  assert.equal(p[0].positionSource,'supabase-train-run');
  assert.equal(p[0].estimated,true);
  assert.equal(p[0].timetableDateVerified,false);
});
test('05:40 JST: north HB-E220 220D and south 568E coexist by independent train numbers',()=>{
  const p=at('2026-11-03T20:40:00Z');
  assert.deepEqual(Array.from(p,x=>x.trainNumber).sort(),['220D','568E']);
  const north=p.find(x=>x.trainNumber==='220D');
  const south=p.find(x=>x.trainNumber==='568E');
  assert.equal(railway.stations[north.stationIndex],'Kita-Fujioka');
  assert.equal(railway.stations[north.segmentToIndex],'Gumma-Fujioka');
  assert.equal(railway.stations[south.stationIndex],'Higashi-Fussa');
  assert.equal(railway.stations[south.segmentToIndex],'Haijima');
  assert.equal(new Set(p.map(x=>x.runningChainId)).size,2);
  assert.ok(p.every(x=>x.positionSource==='supabase-train-run'));
});
test('05:45 JST: source stop-clocks advance without converting 220D or 568E to operations',()=>{
  const p=at('2026-11-03T20:45:00Z');
  assert.deepEqual(Array.from(p,x=>x.trainNumber).sort(),['220D','568E']);
  const north=p.find(x=>x.trainNumber==='220D');
  const south=p.find(x=>x.trainNumber==='568E');
  assert.equal(railway.stations[north.stationIndex],'Gumma-Fujioka');
  assert.equal(railway.stations[north.segmentToIndex],'Tansho');
  assert.equal(railway.stations[south.stationIndex],'Haijima');
  assert.equal(railway.stations[south.segmentToIndex],'Komiya');
  assert.ok(p.every(x=>x.serviceDate==='2026-11-04'));
});
test('after a timetable end, no phantom scheduled train is extended',()=>{
  const p=at('2026-11-03T21:05:00Z');
  assert.equal(p.some(x=>x.trainNumber==='461E'),false);
  assert.equal(p.some(x=>x.trainNumber==='568E'),false);
  assert.equal(p.some(x=>x.trainNumber==='220D'),true);
});
