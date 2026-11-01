'use strict';

// Tests one current JR-East observation against exactly one SQL-verified
// ChuoRapid/Ome canonical train. ChuoMain trains often change train numbers;
// being on ChuoRapid alone is NOT proof that a train traverses Ome.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const resolverText=fs.readFileSync('js/running-chain-resolver.js','utf8');
const fusionText=fs.readFileSync('js/data-fusion.js','utf8');
const apiText=fs.readFileSync('data/api/odpt-unified.js','utf8');
const estText=fs.readFileSync('js/train-position-estimator.js','utf8');
const edgeText=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const cfgText=fs.readFileSync('data/core/runtime-config.js','utf8');

const window={ UNIFIED_LINES:{},RuntimeConfig:{VERIFIED_CANONICAL_PLAN_PARTNERS:{
  ChuoRapid:['Ome'],Ome:['ChuoRapid'],
  Joban:['JobanMain'],JobanMain:['Joban'],
}} };
vm.runInNewContext(resolverText,{window,console},{filename:'running-chain-resolver.js'});
const resolver=window.RunningChainResolver;
assert.equal(typeof resolver.omeCanonicalBridgeKey,'function');
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('ChuoRapid')),['Ome']);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('Ome')),['ChuoRapid']);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('ChuoMain')),[]);
const start=fusionText.indexOf('  function _linkVerifiedCanonicalRealtime(');
const end=fusionText.indexOf('  function loadTrainPositions()',start);
assert.ok(start>=0 && end>start,'the shared canonical/live bridge exists');
const ctx={window,console};
vm.createContext(ctx);
vm.runInContext(fusionText.slice(start,end),ctx);
const link=ctx._linkVerifiedCanonicalRealtime;
assert.equal(typeof link,'function');

function plan(id, opts={}) {
  return Object.assign({
    serviceDate:'2026-11-01',trainNumber:'1087T',railDirection:'Outbound',
    sourceRailway:'odpt.Railway:JR-East.Ome',
    positionSource:'supabase-train-run',estimated:true,
    canonicalGroupEvidence:'verified_continuation',
    canonicalTimetableId:id,
    canonicalLineIds:['Ome','ChuoRapid'],
    canonicalStopKeys:['Tokyo','Tachikawa','Haijima','Ome'],
    runningChainId:'canonical-sql-trip:2026-11-01:'+id,
  },opts);
}
function live(opts={}) {
  return Object.assign({
    serviceDate:'2026-11-01',trainNumber:'1087T',railDirection:'Outbound',
    sourceRailway:'odpt.Railway:JR-East.ChuoRapid',
    positionSource:'realtime-api',estimated:false,
    sourceFromStation:'odpt.Station:JR-East.ChuoRapid.Tachikawa',
    sourceToStation:'odpt.Station:JR-East.ChuoRapid.Haijima',
  },opts);
}
const observed=live();
assert.equal(link({Ome:[plan(168581)]},{ChuoRapid:[observed]}),1);
assert.equal(observed.runningChainId,'canonical-sql-trip:2026-11-01:168581');
assert.equal(observed.canonicalTimetableId,'168581');
assert.equal(observed.runningChainEvidence,'VERIFIED_SQL_CANONICAL_REALTIME_STATION');
assert.equal(observed.positionSource,'realtime-api');
assert.equal(observed.vehicleFormationId,undefined,'no actual formation inferred');
assert.equal(observed.vehicleType,undefined,'no actual series inferred');

const reverse=live({sourceRailway:'odpt.Railway:JR-East.Ome'});
assert.equal(link({ChuoRapid:[plan(168581,{
  sourceRailway:'odpt.Railway:JR-East.ChuoRapid',
})]},{Ome:[reverse]}),1);

const cases=[
  ['ChuoRapid/ChuoMain is NOT Ome', {ChuoRapid:[plan(168579,{
    canonicalLineIds:['ChuoRapid','ChuoMain'],
  })]}, {Ome:[live({sourceRailway:'odpt.Railway:JR-East.Ome'})]}],
  ['no canonical line proof', {Ome:[plan(168581,{
    canonicalLineIds:[],
  })]}, {ChuoRapid:[live()]}],
  ['source-only plan', {Ome:[plan(168581,{
    canonicalGroupEvidence:'source_only',
  })]}, {ChuoRapid:[live()]}],
  ['different plan number', {Ome:[plan(168581,{
    trainNumber:'1087H',
  })]}, {ChuoRapid:[live()]}],
  ['different service day', {Ome:[plan(168581)]},
    {ChuoRapid:[live({serviceDate:'2026-11-02'})]}],
  ['different direction', {Ome:[plan(168581)]},
    {ChuoRapid:[live({railDirection:'Inbound'})]}],
  ['wrong source operator', {Ome:[plan(168581)]},
    {ChuoRapid:[live({sourceRailway:'odpt.Railway:TokyoMetro.ChuoRapid'})]}],
  ['not the local railway', {Ome:[plan(168581)]},
    {ChuoSobuLocal:[live()]}],
  ['observed station absent', {Ome:[plan(168581)]},
    {ChuoRapid:[live({sourceFromStation:'odpt.Station:JR-East.ChuoRapid.Ueno'})]}],
  ['provider says movement backwards', {Ome:[plan(168581)]},
    {ChuoRapid:[live({sourceFromStation:'odpt.Station:JR-East.ChuoRapid.Haijima',
      sourceToStation:'odpt.Station:JR-East.ChuoRapid.Tachikawa'})]}],
  ['two different canonical candidates', {Ome:[plan(168581),plan(168582)]},
    {ChuoRapid:[live()]}],
  ['two observed positions', {Ome:[plan(168581)]},
    {ChuoRapid:[live(),live()]}],
  ['Ome rapid source never equals Joban', {Ome:[plan(168581)]},
    {Joban:[live({sourceRailway:'odpt.Railway:JR-East.Joban'})]}],
];
for (const [label,planned,realtime] of cases) {
  const rows=Object.values(realtime).flat();
  assert.equal(link(planned,realtime),0,label);
  assert.ok(rows.every(r=>!r.runningChainId),label+': no guessed shared identity');
}
assert.match(edgeText,/\.from\("train_timetable_lines"\)/);
assert.match(edgeText,/canonical_line_ids:\s*mapped\.group_evidence/);
assert.match(apiText,/"_canonicalLineIds":Array\.isArray\(run\.canonical_line_ids\)/);
assert.match(estText,/canonicalLineIds: Array\.isArray\(tt\._canonicalLineIds\)/);
assert.match(estText,/pos\.runningChainId=pos\.timetableIdentity/);
assert.match(fusionText,/_linkVerifiedCanonicalRealtime\(estimated,\s*posMap\)/);
assert.match(cfgText,/ChuoRapid: Object\.freeze\(\["Ome"\]\)/);

console.log('JR-East ChuoRapid/Ome canonical HYBRID match: PASS');
