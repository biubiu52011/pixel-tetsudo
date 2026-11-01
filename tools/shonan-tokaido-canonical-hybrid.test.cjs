'use strict';

// Only the 35 reciprocal, exact-clock Ofuna train segments are granted a
// canonical train across ShonanShinjuku and Tokaido. Never apply this to
// similarly numbered unproven Yokosuka/Takasaki/Utsunomiya records.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const resolverText=fs.readFileSync('js/running-chain-resolver.js','utf8');
const fusionText=fs.readFileSync('js/data-fusion.js','utf8');
const edgeText=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const cfgText=fs.readFileSync('data/core/runtime-config.js','utf8');
const estText=fs.readFileSync('js/train-position-estimator.js','utf8');
const win={UNIFIED_LINES:{},RuntimeConfig:{VERIFIED_CANONICAL_PLAN_PARTNERS:{
  ShonanShinjuku:['Tokaido'],Tokaido:['ShonanShinjuku']
}}};
vm.runInNewContext(resolverText,{window:win,console});
const resolver=win.RunningChainResolver;
assert.equal(typeof resolver.shonanTokaidoCanonicalBridgeKeys,'function');
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('ShonanShinjuku')),['Tokaido']);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('Tokaido')),['ShonanShinjuku']);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('Yokosuka')),[]);
const a=fusionText.indexOf('  function _linkVerifiedCanonicalRealtime(');
const b=fusionText.indexOf('  function loadTrainPositions()',a);
assert.ok(a>=0&&b>a);
const ctx={window:win,console};
vm.createContext(ctx);
vm.runInContext(fusionText.slice(a,b),ctx);
const link=ctx._linkVerifiedCanonicalRealtime;

const northAliases=[
  {line_key:'Tokaido',train_number:'2820Y',
   railway_urn:'odpt.Railway:JR-East.Tokaido',
   direction_urn:'odpt.RailDirection:Inbound'},
  {line_key:'ShonanShinjuku',train_number:'2820Y',
   railway_urn:'odpt.Railway:JR-East.ShonanShinjuku',
   direction_urn:'odpt.RailDirection:Northbound'},
];
const southAliases=[
  {line_key:'ShonanShinjuku',train_number:'2823Y',
   railway_urn:'odpt.Railway:JR-East.ShonanShinjuku',
   direction_urn:'odpt.RailDirection:Southbound'},
  {line_key:'Tokaido',train_number:'2823Y',
   railway_urn:'odpt.Railway:JR-East.Tokaido',
   direction_urn:'odpt.RailDirection:Outbound'},
];
function plan(opts={}) {
  return Object.assign({
    serviceDate:'2026-11-01',trainNumber:'2820Y',railDirection:'Inbound',
    sourceRailway:'odpt.Railway:JR-East.Tokaido',
    positionSource:'supabase-train-run',estimated:true,
    canonicalGroupEvidence:'verified_continuation',
    canonicalTimetableId:172636,
    canonicalLineIds:['Tokaido','ShonanShinjuku'],
    canonicalTrainNumberAliases:northAliases,
    canonicalStopKeys:['Kozu','Hiratsuka','Fujisawa','Ofuna','Totsuka','Osaki','Shinjuku','Omiya'],
    runningChainId:'canonical-sql-trip:2026-11-01:172636',
  },opts);
}
function live(opts={}) {
  return Object.assign({
    serviceDate:'2026-11-01',trainNumber:'2820Y',railDirection:'Northbound',
    sourceRailway:'odpt.Railway:JR-East.ShonanShinjuku',
    positionSource:'realtime-api',estimated:false,
    sourceFromStation:'odpt.Station:JR-East.ShonanShinjuku.Ofuna',
    sourceToStation:'odpt.Station:JR-East.ShonanShinjuku.Totsuka',
  },opts);
}
const rt=live();
assert.equal(link({Tokaido:[plan()]},{ShonanShinjuku:[rt]}),1);
assert.equal(rt.canonicalTimetableId,'172636');
assert.equal(rt.runningChainId,'canonical-sql-trip:2026-11-01:172636');
assert.equal(rt.positionSource,'realtime-api');
assert.equal(rt.vehicleFormationId,undefined);
assert.equal(rt.vehicleType,undefined);
const southLive=live({
  trainNumber:'2823Y',railDirection:'Outbound',
  sourceRailway:'odpt.Railway:JR-East.Tokaido',
  sourceFromStation:'odpt.Station:JR-East.Tokaido.Ofuna',
  sourceToStation:'odpt.Station:JR-East.Tokaido.Fujisawa'
});
const southPlan=plan({trainNumber:'2823Y',railDirection:'Southbound',
  sourceRailway:'odpt.Railway:JR-East.ShonanShinjuku',
  canonicalTimetableId:173900,
  runningChainId:'canonical-sql-trip:2026-11-01:173900',
  canonicalTrainNumberAliases:southAliases,
  canonicalStopKeys:['Omiya','Shinjuku','Osaki','Totsuka','Ofuna','Fujisawa','Hiratsuka','Kozu']});
assert.equal(link({ShonanShinjuku:[southPlan]},{Tokaido:[southLive]}),1);

const rejected=[
  ['unmerged Yokosuka same number', {Tokaido:[plan()]},
    {Yokosuka:[live({sourceRailway:'odpt.Railway:JR-East.Yokosuka'})]}],
  ['candidate Yokosuka route is not Tokaido', {Tokaido:[plan({
     canonicalLineIds:['ShonanShinjuku','Yokosuka']})]},
    {ShonanShinjuku:[live()]}],
  ['unverified plan', {Tokaido:[plan({canonicalGroupEvidence:'source_only'})]},
    {ShonanShinjuku:[live()]}],
  ['different service day', {Tokaido:[plan()]},
    {ShonanShinjuku:[live({serviceDate:'2026-11-02'})]}],
  ['different train number', {Tokaido:[plan()]},
    {ShonanShinjuku:[live({trainNumber:'2821Y'})]}],
  ['wrong direction', {Tokaido:[plan()]},
    {ShonanShinjuku:[live({railDirection:'Southbound'})]}],
  ['wrong operator', {Tokaido:[plan()]},
    {ShonanShinjuku:[live({sourceRailway:'odpt.Railway:TokyoMetro.ShonanShinjuku'})]}],
  ['wrong source railway', {Tokaido:[plan()]},
    {ShonanShinjuku:[live({sourceRailway:'odpt.Railway:JR-East.Tokaido'})]}],
  ['station not on canonical route', {Tokaido:[plan()]},
    {ShonanShinjuku:[live({sourceFromStation:'odpt.Station:JR-East.ShonanShinjuku.Sendai'})]}],
  ['station order reversed', {Tokaido:[plan()]},
    {ShonanShinjuku:[live({sourceFromStation:'odpt.Station:JR-East.ShonanShinjuku.Shinjuku',
      sourceToStation:'odpt.Station:JR-East.ShonanShinjuku.Ofuna'})]}],
  ['two canonical trains for one live row',{Tokaido:[plan(),plan({
    canonicalTimetableId:172650,runningChainId:'canonical-sql-trip:2026-11-01:172650'})]},
    {ShonanShinjuku:[live()]}],
  ['two live rows for one canonical train',{Tokaido:[plan()]},
    {ShonanShinjuku:[live(),live()]}],
  ['missing member aliases',{Tokaido:[plan({canonicalTrainNumberAliases:[]})]},
    {ShonanShinjuku:[live()]}],
];
for(const [name,p,r] of rejected){
  const rows=Object.values(r).flat();
  assert.equal(link(p,r),0,name);
  assert.ok(rows.every(x=>!x.runningChainId),name+' must not inherit identity');
}
assert.match(edgeText,/aliasIds.*connectedIds/);
assert.match(edgeText,/lines\.includes\("ShonanShinjuku"\) && lines\.includes\("Tokaido"\)/);
assert.match(estText,/memberLines\.indexOf\("ShonanShinjuku"\)/);
assert.match(cfgText,/ShonanShinjuku: Object\.freeze\(\["Tokaido"\]\)/);
assert.match(fusionText,/shonanTokaidoCanonicalBridgeKeys/);
console.log('Shonan/Tokaido 35 verified Ofuna services HYBRID: PASS');
