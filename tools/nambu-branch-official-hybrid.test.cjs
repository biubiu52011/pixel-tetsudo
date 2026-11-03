'use strict';
/* Hamakawasaki branch: JR East H numbers + SQL-only estimation + strict
 * opportunistic ODPT realtime admission. No inferred live carset.
 * Run: node tools/nambu-branch-official-hybrid.test.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const indexFile = 'data/timetables/nambu-branch-official-202611.js';
const indexText = fs.readFileSync(indexFile,'utf8');
const win = {};
vm.runInNewContext(indexText,{window:win},{filename:indexFile});
const official = win.NambuBranchOfficial202611;
assert.ok(official);
assert.equal(official.inboundCount,39);
assert.equal(official.outboundCount,41);
const railway='odpt.Railway:JR-East.NambuBranch';
const type='odpt.TrainType:JR-East.Local';
const weekday='odpt.Calendar:Weekday';
const holiday='odpt.Calendar:SaturdayHoliday';
const inbound='odpt.RailDirection:Inbound';
const outbound='odpt.RailDirection:Outbound';
const verify=(n,d,cal=holiday,date='2026-11-03',source=railway,kind=type)=>
  official.verify(n,source,d,kind,cal,date);
for(const calendar of [weekday,holiday]) {
  for(const number of ['500H','700H','702H','910H','920H','2210H']) {
    assert.equal(verify(number,inbound,calendar),true,number+' inbound');
    assert.equal(verify(number,outbound,calendar),false,number+' wrong direction');
  }
  for(const number of ['411H','701H','703H','921H','2101H','2211H']) {
    assert.equal(verify(number,outbound,calendar),true,number+' outbound');
    assert.equal(verify(number,inbound,calendar),false,number+' wrong direction');
  }
}
for(const n of ['999H','2212H','2211F','2211','', '3110H']) {
  assert.equal(verify(n,outbound),false,'no invented official service '+n);
}
assert.equal(verify('2211H',outbound,holiday,'2026-10-31'),null);
assert.equal(verify('2211H',outbound,holiday,'2026-12-01'),null);
assert.equal(verify('2211H',outbound,holiday,'2026-11-03','odpt.Railway:JR-East.Nambu'),false);
assert.equal(verify('2211H',outbound,holiday,'2026-11-03','odpt.Railway:TokyoMetro.NambuBranch'),false);
assert.equal(verify('2211H',outbound,holiday,'2026-11-03',railway,'odpt.TrainType:JR-East.Rapid'),false);
assert.equal(verify('2211H',outbound,'odpt.Calendar:Holiday'),false);

// End-to-end timetable estimation at the last confirmed 2026-11-03 service.
// The clocks are retained SQL fixture facts, not generated train positions.
const railwayData=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
const estimatorText=fs.readFileSync('js/train-position-estimator.js','utf8');
function estimate(iso, trainNumber='2211H', edits={}) {
  class FixedDate extends Date {
    constructor(...a){super(...(a.length?a:[iso]));}
    static now(){return Date.parse(iso);}
  }
  const window={
    NambuBranchOfficial202611:official,
    RuntimeConfig:{},
    ODPTClient:{
      LINE_RAILWAY_CODE:{NambuBranch:'NambuBranch'},
      LINE_TO_OPERATOR:{NambuBranch:'JR-East'}
    }
  };
  const context=vm.createContext({window,Date:FixedDate,
    console:{debug(){},warn(){},log(){},error(){}}});
  vm.runInContext(estimatorText,context,{filename:'js/train-position-estimator.js'});
  const stations=[
    ['HamaKawasaki','22:59',false],['Odasakae','23:01',false],
    ['KawasakiShimmachi','23:03',false],['Hatchonawate','23:04',false],
    ['Shitte','23:07',true]
  ];
  const tt={
    '@id':'planned-trip:2026-11-03|JR-East|NambuBranch|'+trainNumber,
    'odpt:trainNumber':trainNumber,
    'odpt:calendar':holiday,
    'odpt:railway':railway,
    'odpt:trainType':type,
    'odpt:railDirection':outbound,
    'odpt:destinationStation':['odpt.Station:JR-East.NambuBranch.Shitte'],
    'odpt:trainTimetableObject':stations.map(([station,clock,last])=>({
      [last?'odpt:arrivalStation':'odpt:departureStation']:
        'odpt.Station:JR-East.NambuBranch.'+station,
      [last?'odpt:arrivalTime':'odpt:departureTime']:clock
    })),
    _positionSource:'supabase-train-run',_sqlLineId:'NambuBranch',
    _serviceDate:'2026-11-03',
    _timetableValidity:'undated_not_current_verified',
    _timetableDateVerified:false,
    ...edits
  };
  window.TrainPositionEstimator.registerManualTimetable('NambuBranch',[tt]);
  const r=window.TrainPositionEstimator.estimateAllPositions(
    {NambuBranch:railwayData.lines.NambuBranch},{},{},null,
    {lineIds:['NambuBranch']});
  return r.NambuBranch || [];
}
assert.equal(estimate('2026-11-03T13:55:00Z').length,0,'no train before departure');
const mid=estimate('2026-11-03T14:02:00Z');
assert.equal(mid.length,1,'22:59 Shitte-bound last train visible at 23:02 JST');
assert.equal(mid[0].trainNumber,'2211H','use published H train number');
assert.equal(mid[0].positionSource,'supabase-train-run');
assert.equal(mid[0].estimated,true,'SQL position is NEVER realtime');
assert.equal(mid[0].timetableDateVerified,false,'monthly number audit does not certify every SQL stop clock');
assert.equal(mid[0].vehicleIdentityStatus,'UNKNOWN','E127 / 205 physical stock remains unverified');
assert.ok(mid[0].runningChainId,'source train identity survives rendering');
assert.equal(estimate('2026-11-03T14:10:00Z').length,0,'no post-terminal phantom');
for(const edits of [
  {'odpt:railway':'odpt.Railway:JR-East.Nambu'},
  {'odpt:railDirection':inbound},
  {'odpt:trainType':'odpt.TrainType:JR-East.Rapid'},
  {'odpt:calendar':'odpt.Calendar:Weekday'}
]){
  assert.equal(estimate('2026-11-03T14:02:00Z','2211H',edits).length,0,
    'a mismatched monthly source/calendar cannot create a branch train');
}
assert.equal(estimate('2026-11-03T14:02:00Z','2212H').length,0,
  'unpublished H number cannot be substituted by an operation number');

// Exact operator-wide feed probe: an excluded railway stays timetable-only
// unless a fresh ODPT record states the same JR-East.NambuBranch identity.
// Unknown railway, Nambu mainline and other operators cannot claim live branch.
const api=fs.readFileSync('data/api/odpt-unified.js','utf8');
const rtConfig=fs.readFileSync('data/core/runtime-config.js','utf8');
assert.match(rtConfig,/excludes: Object.freeze\(\[[^\]]*"NambuBranch"/);
assert.match(api,/function isNambuBranchOnDemandProbe\(lineId\)/);
assert.match(api,/hasRealtimePositionApi\(lineId\)\s*\|\|\s*isNambuBranchOnDemandProbe\(lineId\)/);
const start=api.indexOf('    function _matchesActiveRealtimeRailway(');
const end=api.indexOf('    // ========== 公共 API ==========',start);
assert.ok(start>=0&&end>start);
function parseRailwayIdentity(v){
  const m=String(v||'').match(/^odpt\.Railway:([^.]+)\.(.+)$/);
  return m?{operator:m[1],railwayCode:m[2],key:m[1]+'::'+m[2]}:null;
}
const rows=[
  {id:'branch','odpt:railway':railway},
  {id:'main','odpt:railway':'odpt.Railway:JR-East.Nambu'},
  {id:'foreign','odpt:railway':'odpt.Railway:TokyoMetro.NambuBranch'},
  {id:'missing'},
  {id:'local','odpt:railway':'odpt.Railway:JR-East.JobanLocal'}
];
const liveWindow={ODPT_TRAIN_POSITIONS:{'JR-East':rows}};
const active={'JR-East':['NambuBranch']};
const ctx=vm.createContext({
  window:liveWindow,_activeRealtimeLineIds:active,
  parseRailwayIdentity,getLineRailwayIdentity:(lineId)=>
    lineId==='NambuBranch'?{key:'JR-East::NambuBranch'}:null
});
vm.runInContext(api.slice(start,end),ctx,{filename:'odpt-unified.js:railway-scope'});
assert.deepEqual(Array.from(ctx._rebuildRealtimePositionViews()['JR-East'],r=>r.id),
  ['branch'],'only exact provider branch railway enters the scoped realtime view');
assert.match(fs.readFileSync('js/data-fusion.js','utf8'),
  /targetLine\.lid === "NambuBranch"[\s\S]*?"odpt\.Railway:JR-East\.NambuBranch"/,
  'fusion must block train-number/station inferred live branch positions');

const page=fs.readFileSync('pages/trains.html','utf8');
const version=official.version;
assert.ok(page.includes('nambu-branch-official-202611.js?v='+version));
assert.ok(page.indexOf('nambu-branch-official-202611.js')<
  page.indexOf('train-position-estimator.js'),
  'official month-number source loads before the estimator');
console.log('NambuBranch 2026-11 official H timetable + opportunistic live isolation: PASS');
