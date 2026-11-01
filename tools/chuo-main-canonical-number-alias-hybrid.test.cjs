'use strict';

// Explicit JR-East ChuoMain M ↔ ChuoRapid T/H aliases are already in
// verified canonical SQL member records. Never guess a train number suffix.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const resolverText=fs.readFileSync('js/running-chain-resolver.js','utf8');
const fusionText=fs.readFileSync('js/data-fusion.js','utf8');
const edgeText=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const apiText=fs.readFileSync('data/api/odpt-unified.js','utf8');
const estText=fs.readFileSync('js/train-position-estimator.js','utf8');
const cfgText=fs.readFileSync('data/core/runtime-config.js','utf8');

const window={UNIFIED_LINES:{},RuntimeConfig:{VERIFIED_CANONICAL_PLAN_PARTNERS:{
  ChuoRapid:['Ome','ChuoMain'],ChuoMain:['ChuoRapid'],Ome:['ChuoRapid'],
}}};
vm.runInNewContext(resolverText,{window,console});
const resolver=window.RunningChainResolver;
assert.equal(typeof resolver.chuoMainCanonicalBridgeKeys,'function');
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('ChuoMain')),['ChuoRapid']);
const a=fusionText.indexOf('  function _linkVerifiedCanonicalRealtime(');
const b=fusionText.indexOf('  function loadTrainPositions()',a);
assert.ok(a>=0 && b>a);
const ctx={window,console};vm.createContext(ctx);
vm.runInContext(fusionText.slice(a,b),ctx);
const link=ctx._linkVerifiedCanonicalRealtime;
const aliases=[
  {line_key:'ChuoMain',train_number:'640M',railway_urn:'odpt.Railway:JR-East.ChuoMain',
    direction_urn:'odpt.RailDirection:Inbound'},
  {line_key:'ChuoMain',train_number:'640T',railway_urn:'odpt.Railway:JR-East.ChuoMain',
    direction_urn:'odpt.RailDirection:Inbound'},
  {line_key:'ChuoRapid',train_number:'640T',railway_urn:'odpt.Railway:JR-East.ChuoRapid',
    direction_urn:'odpt.RailDirection:Inbound'},
];
function plan(id=66496,opts={}) {
  return Object.assign({serviceDate:'2026-11-02',trainNumber:'640M',railDirection:'Inbound',
    sourceRailway:'odpt.Railway:JR-East.ChuoMain',positionSource:'supabase-train-run',
    estimated:true,canonicalGroupEvidence:'verified_continuation',
    canonicalTimetableId:id,canonicalLineIds:['ChuoMain','ChuoRapid'],
    canonicalTrainNumberAliases:aliases,
    canonicalStopKeys:['Otsuki','Takao','Tachikawa','Nakano','Tokyo'],
    runningChainId:'canonical-sql-trip:2026-11-02:'+id},opts);
}
function live(opts={}) {
  return Object.assign({serviceDate:'2026-11-02',trainNumber:'640T',
    railDirection:'Inbound',sourceRailway:'odpt.Railway:JR-East.ChuoRapid',
    positionSource:'realtime-api',estimated:false,
    sourceFromStation:'odpt.Station:JR-East.ChuoRapid.Tachikawa',
    sourceToStation:'odpt.Station:JR-East.ChuoRapid.Nakano'},opts);
}

const observed=live();
assert.equal(link({ChuoMain:[plan()]},{ChuoRapid:[observed]}),1,
  '640T rapid live must link to the canonical 640M Chuo plan');
assert.equal(observed.runningChainId,'canonical-sql-trip:2026-11-02:66496');
assert.equal(observed.canonicalTimetableId,'66496');
assert.equal(observed.positionSource,'realtime-api');
assert.equal(observed.vehicleFormationId,undefined);
assert.equal(observed.vehicleType,undefined);
const inverse=live({sourceRailway:'odpt.Railway:JR-East.Chuo',
  trainNumber:'640M',
  sourceFromStation:'odpt.Station:JR-East.Chuo.Takao',
  sourceToStation:'odpt.Station:JR-East.Chuo.Tachikawa'});
assert.equal(link({ChuoRapid:[plan(66496,{sourceRailway:'odpt.Railway:JR-East.ChuoRapid',
  trainNumber:'640T'})]},{ChuoMain:[inverse]}),1,
  '640M main live links to the same 640T rapid canonical train');

const rejects=[
  ['unlisted 640H number', {ChuoMain:[plan()]}, {ChuoRapid:[live({trainNumber:'640H'})]}],
  ['unlisted 740M', {ChuoMain:[plan()]}, {ChuoMain:[live({
    sourceRailway:'odpt.Railway:JR-East.Chuo',trainNumber:'740M'})]}],
  ['wrong provider railroad', {ChuoMain:[plan()]}, {ChuoRapid:[live({
    sourceRailway:'odpt.Railway:TokyoMetro.ChuoRapid'})]}],
  ['640M is not a rapid-source alias', {ChuoMain:[plan()]}, {ChuoRapid:[live({
    sourceRailway:'odpt.Railway:JR-East.ChuoRapid',trainNumber:'640M'})]}],
  ['non-canonical source', {ChuoMain:[plan(66496,{
    canonicalGroupEvidence:'source_only'})]}, {ChuoRapid:[live()]}],
  ['Ome canonical route does not apply', {ChuoRapid:[plan(168581,{
    canonicalLineIds:['ChuoRapid','Ome']})]}, {ChuoRapid:[live()]}],
  ['no source aliases', {ChuoMain:[plan(66496,{
    canonicalTrainNumberAliases:[]})]}, {ChuoRapid:[live()]}],
  ['source alias directions do not match', {ChuoMain:[plan(66496,{
    canonicalTrainNumberAliases:aliases.map(x=>Object.assign({},x,{
      direction_urn:'odpt.RailDirection:Outbound'}))})]}, {ChuoRapid:[live()]}],
  ['wrong service day', {ChuoMain:[plan()]}, {ChuoRapid:[live({serviceDate:'2026-11-03'})]}],
  ['wrong direction', {ChuoMain:[plan()]}, {ChuoRapid:[live({railDirection:'Outbound'})]}],
  ['station outside route', {ChuoMain:[plan()]}, {ChuoRapid:[live({
    sourceFromStation:'odpt.Station:JR-East.ChuoRapid.Ueno'})]}],
  ['reverse station order', {ChuoMain:[plan()]}, {ChuoRapid:[live({
    sourceFromStation:'odpt.Station:JR-East.ChuoRapid.Nakano',
    sourceToStation:'odpt.Station:JR-East.ChuoRapid.Tachikawa'})]}],
  ['duplicate plan canonical IDs', {ChuoMain:[plan(66496),plan(66499)]},
    {ChuoRapid:[live()]}],
  ['duplicate realtime reports', {ChuoMain:[plan()]},
    {ChuoRapid:[live(),live()]}],
  ['local-line realtime kept separate', {ChuoMain:[plan()]},
    {ChuoSobuLocal:[live()]}],
];
for (const [name,p,r] of rejects) {
  const liveRows=Object.values(r).flat();
  assert.equal(link(p,r),0,name);
  assert.ok(liveRows.every(x=>!x.runningChainId),name+': never fake a match');
}
assert.match(edgeText,/canonical_number_aliases:\s*mapped\.group_evidence/);
assert.match(edgeText,/\.from\("train_timetable_members"\)/);
assert.match(apiText,/"_canonicalTrainNumberAliases":Array\.isArray\(run\.canonical_number_aliases\)/);
assert.match(estText,/canonicalTrainNumberAliases: Array\.isArray\(tt\._canonicalTrainNumberAliases\)/);
assert.match(cfgText,/"ChuoMain": true/);
assert.match(apiText,/"ChuoMain": "Chuo"/);
console.log('ChuoMain/ChuoRapid real-number alias canonical matching: PASS');
