'use strict';
/* Central Main pure timetable trains with no ODPT live position. Historical
 * weekday stop clocks are test fixtures, not confirmation of operation on
 * November 4, 2026. Run: node --test tests/chuo-main-timetable-only.test.cjs
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const railway=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
const fusion=fs.readFileSync('js/data-fusion.js','utf8');
const start=fusion.indexOf('  function _chuoMainSourceOnlyLiveMatch(');
const end=fusion.indexOf('  // A verified ChuoMain',start);
assert.ok(start>=0&&end>start,'source-only matching helper must exist');
function setup(iso) {
  class FakeDate extends Date {
    constructor(...args){super(...(args.length?args:[iso]))}
    static now(){return Date.parse(iso)}
  }
  const window={
    RuntimeConfig:{},ODPTClient:{
      LINE_RAILWAY_CODE:{ChuoMain:'ChuoMain'},
      LINE_TO_OPERATOR:{ChuoMain:'JR-East'}
    }
  };
  const ctx=vm.createContext({window,Date:FakeDate,console:{debug(){},warn(){},log(){},error(){}}});
  vm.runInContext(estimator,ctx);
  vm.runInContext(fusion.slice(start,end)+'\nthis.matchChuoSourceOnly=_chuoMainSourceOnlyLiveMatch;',ctx);
  return {window,ctx};
}
function sourceOnly(number,stops,overrides={}) {
  return {
    '@id':'planned-trip:ChuoMain:2026-11-04:'+number,
    'odpt:trainNumber':number,
    'odpt:railway':'odpt.Railway:JR-East.ChuoMain',
    'odpt:calendar':'odpt.Calendar:Weekday',
    'odpt:railDirection':'odpt.RailDirection:Outbound',
    'odpt:trainType':'odpt.TrainType:JR-East.Local',
    'odpt:destinationStation':['odpt.Station:JR-East.Chuo.Nirasaki'],
    'odpt:trainTimetableObject':stops.map(([station,clock,last])=>({
      [last?'odpt:arrivalStation':'odpt:departureStation']:
        'odpt.Station:JR-East.Chuo.'+station,
      [last?'odpt:arrivalTime':'odpt:departureTime']:clock
    })),
    _positionSource:'supabase-train-run',_sqlLineId:'ChuoMain',
    _serviceDate:'2026-11-04',_timetableValidity:'undated_not_current_verified',
    _timetableDateVerified:false,_canonicalGroupEvidence:'source_only',
    ...overrides
  };
}
// Clocks and public numbers originate in the historical ChuoMain SQL source,
// not guessed intervals between stops.
const realStops321=[
 ['Enzan','05:38'],['Higashi-Yamanashi','05:42'],
 ['Yamanashishi','05:45'],['Kasugai-cho','05:48'],
 ['Isawa-Onsen','05:51'],['Sakaori','05:55'],['Kofu','05:59'],
 ['Ryuo','06:03'],['Shiozaki','06:07'],['Nirasaki','06:12',true]
];
const realStops323=[
 ['Otsuki','05:54'],['Hatsukari','06:00'],['Sasago','06:07'],
 ['Kai-Yamato','06:12'],['Katsunuma-budokyo','06:18'],
 ['Enzan','06:22'],['Higashi-Yamanashi','06:26'],
 ['Yamanashishi','06:29'],['Kasugai-cho','06:32'],
 ['Isawa-Onsen','06:35'],['Sakaori','06:38'],['Kofu','06:41',true]
];
function getPositions(iso,rows){
  const {window,ctx}=setup(iso);
  window.TrainPositionEstimator.registerManualTimetable('ChuoMain',rows);
  const map=window.TrainPositionEstimator.estimateAllPositions(
    {ChuoMain:railway.lines.ChuoMain},{},{},null,{lineIds:['ChuoMain']});
  return {positions:map.ChuoMain||[],match:ctx.matchChuoSourceOnly,window};
}
test('321M pure timetable train moves from Shiozaki toward Nirasaki at 06:10 JST',()=>{
  const x=getPositions('2026-11-03T21:10:00Z',[
    sourceOnly('321M',realStops321)
  ]);
  assert.equal(x.positions.length,1);
  const p=x.positions[0],stations=railway.lines.ChuoMain.stations;
  assert.equal(stations[p.stationIndex],'Shiozaki');
  assert.equal(stations[p.segmentToIndex],'Nirasaki');
  assert.ok(p.segmentProgress>0.5 && p.segmentProgress<0.7);
  assert.equal(p.trainNumber,'321M');
  assert.equal(p.positionSource,'supabase-train-run');
  assert.equal(p.canonicalGroupEvidence,'source_only');
  assert.equal(p.estimated,true);
  assert.equal(p.timetableDateVerified,false);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  assert.notEqual(p.runningChainId,'','distinct scheduled source identity');
});
test('independent 323M has its own running ID, even when both are pure timetable',()=>{
  const x=getPositions('2026-11-03T21:10:00Z',[
    sourceOnly('323M',realStops323,{
      'odpt:destinationStation':['odpt.Station:JR-East.Chuo.Kofu']
    }),
    sourceOnly('321M',realStops321)
  ]);
  assert.equal(x.positions.length,2);
  assert.equal(new Set(x.positions.map(p=>p.runningChainId)).size,2);
  const p=x.positions.find(p=>p.trainNumber==='323M');
  assert.equal(railway.lines.ChuoMain.stations[p.stationIndex],'Sasago');
  assert.equal(railway.lines.ChuoMain.stations[p.segmentToIndex],'Kai-Yamato');
});
test('before departure and after published final clock the train is absent',()=>{
  assert.equal(getPositions('2026-11-03T20:50:00Z',[sourceOnly('323M',realStops323)]).positions.length,0);
  assert.equal(getPositions('2026-11-03T21:14:00Z',[sourceOnly('321M',realStops321)]).positions.length,0);
});
test('station-only and unknown stopped records never fabricate a moving train',()=>{
  const x=getPositions('2026-11-03T21:10:00Z',[
    sourceOnly('999M',[['Kofu','06:01',true]]),
    sourceOnly('321M',realStops321)
  ]);
  assert.deepEqual(Array.from(x.positions,p=>p.trainNumber),['321M']);
});
test('realtime number collision outside scheduled stops does not hide pure estimate',()=>{
  const x=getPositions('2026-11-03T21:10:00Z',[sourceOnly('321M',realStops321)]);
  const p=x.positions[0];
  const live={
    trainNumber:'321M',serviceDate:'2026-11-04',
    railDirection:'odpt.RailDirection:Outbound',
    trainType:'odpt.TrainType:JR-East.Local',
    positionSource:'realtime-api',
    sourceRailway:'odpt.Railway:JR-East.Chuo',
    sourceFromStation:'odpt.Station:JR-East.Chuo.Otsuki',
    sourceToStation:'odpt.Station:JR-East.Chuo.Takao'
  };
  assert.equal(x.match(p,[live]),false);
  assert.equal(x.match(p,[{...live,trainNumber:'323M'}]),false);
  assert.equal(x.match(p,[{...live,railDirection:'odpt.RailDirection:Inbound'}]),false);
  assert.equal(x.match(p,[{...live,serviceDate:'2026-11-05'}]),false);
  assert.equal(x.match(p,[{...live,sourceRailway:'odpt.Railway:JR-East.ChuoRapid'}]),false);
});
test('only one fresh matching live observation with published stop order can take ownership',()=>{
  const x=getPositions('2026-11-03T21:10:00Z',[sourceOnly('321M',realStops321)]);
  const p=x.positions[0];
  const live={
    trainNumber:'321M',serviceDate:'2026-11-04',
    railDirection:'odpt.RailDirection:Outbound',
    trainType:'odpt.TrainType:JR-East.Local',
    positionSource:'realtime-api',sourceRailway:'odpt.Railway:JR-East.Chuo',
    sourceFromStation:'odpt.Station:JR-East.Chuo.Shiozaki',
    sourceToStation:'odpt.Station:JR-East.Chuo.Nirasaki'
  };
  assert.equal(x.match(p,[live]),true);
  assert.equal(x.match(p,[live,live]),false);
  assert.equal(x.match(p,[{...live,sourceToStation:'odpt.Station:JR-East.Chuo.Enzan'}]),false);
  assert.equal(x.match(p,[{...live,sourceValidUntil:'2026-11-03T00:00:00Z'}]),false);
});
test('ChuoRapid/verified continuation are not changed by source-only protection',()=>{
  const x=getPositions('2026-11-03T21:10:00Z',[sourceOnly('321M',realStops321)]);
  const p=x.positions[0];
  assert.equal(x.match({...p,canonicalGroupEvidence:'verified_continuation'},[]),null);
  assert.equal(x.match({...p,positionLineId:'ChuoRapid'},[]),null);
});
