'use strict';

// Regression: JR East JobanRapid / Joban share an already verified SQL
// canonical train identity across the Toride source boundary. A match must
// never make a planned fleet an observed physical carset.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const resolverText = fs.readFileSync('js/running-chain-resolver.js', 'utf8');
const fusionText = fs.readFileSync('js/data-fusion.js', 'utf8');
const estimatorText = fs.readFileSync('js/train-position-estimator.js', 'utf8');
const configText = fs.readFileSync('data/core/runtime-config.js', 'utf8');
const pageText = fs.readFileSync('js/trains-page.js', 'utf8');

const window = {
  UNIFIED_LINES: {},
  RuntimeConfig: {
    VERIFIED_CANONICAL_PLAN_PARTNERS: {
      Joban: ['JobanMain'], JobanMain: ['Joban'],
    },
  },
};
vm.runInNewContext(resolverText, { window, console }, { filename: 'running-chain-resolver.js' });
const resolver = window.RunningChainResolver;
assert.ok(resolver?.jobanCanonicalBridgeKey);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('Joban')),
  ['JobanMain']);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('JobanMain')),
  ['Joban']);
assert.deepEqual(Array.from(resolver.getVerifiedCanonicalPartners('JobanLocal')),
  []);
assert.deepEqual(Array.from(resolver.getDirectThroughLines('Joban')),
  [], 'source-fetch partners must not invent a physical through edge');

const start = fusionText.indexOf('  function _linkVerifiedCanonicalRealtime(');
const end = fusionText.indexOf('  function loadTrainPositions()', start);
assert.ok(start >= 0 && end > start);
const ctx = { window, console };
vm.createContext(ctx);
vm.runInContext(fusionText.slice(start, end), ctx);
const link = ctx._linkVerifiedCanonicalRealtime;
assert.equal(typeof link, 'function');

function plan(id, opts = {}) {
  return Object.assign({
    serviceDate: '2026-11-01',
    trainNumber: '1234M',
    railDirection: 'Inbound',
    canonicalTimetableId: id,
    canonicalGroupEvidence: 'verified_continuation',
    positionSource: 'supabase-train-run',
    sourceRailway: 'odpt.Railway:JR-East.Joban',
    estimated: true,
    runningChainId: 'canonical-sql-trip:2026-11-01:' + id,
    canonicalStopKeys: ['Mito', 'Tsuchiura', 'Toride', 'Ueno'],
  }, opts);
}
function live(opts = {}) {
  return Object.assign({
    serviceDate: '2026-11-01',
    trainNumber: '1234M',
    railDirection: 'Inbound',
    sourceFromStation: 'odpt.Station:JR-East.JobanRapid.Tsuchiura',
    sourceToStation: 'odpt.Station:JR-East.JobanRapid.Toride',
    sourceRailway: 'odpt.Railway:JR-East.JobanRapid',
    positionSource: 'realtime-api',
    estimated: false,
  }, opts);
}
function expectMatched(plans, lives, expected) {
  const count = link(plans, lives);
  assert.equal(count, expected);
}
const rt = live();
expectMatched({ JobanMain: [plan(80)] }, { Joban: [rt] }, 1);
assert.equal(rt.canonicalTimetableId, '80');
assert.equal(rt.runningChainId, 'canonical-sql-trip:2026-11-01:80');
assert.equal(rt.runningChainEvidence,
  'VERIFIED_SQL_CANONICAL_REALTIME_STATION');
assert.equal(rt.positionSource, 'realtime-api');
assert.equal(rt.vehicleType, undefined, 'no fake actual fleet');
assert.equal(rt.vehicleFormationId, undefined, 'no physical carset');

const mainRt = live({ sourceRailway: 'odpt.Railway:JR-East.Joban' });
expectMatched({ Joban: [plan(80, {
  sourceRailway: 'odpt.Railway:JR-East.JobanRapid',
})] }, { JobanMain: [mainRt] }, 1);

// A source-only single E531 candidate is explicitly scoped to the
// one validated SQL canonical service. It is not live rolling-stock evidence.
const candidatePlan = plan(174919, {
  serviceDate:'2026-11-03',trainNumber:'1257M',railDirection:'Outbound',
  runningChainId:'canonical-sql-trip:2026-11-03:174919',
  positionLineId:'JobanMain',canonicalLineIds:['Joban','JobanMain'],
  plannedVehicleCandidateStatus:'source_single_type_candidate',
  plannedVehicleCandidates:['E531系'],
  canonicalStopKeys:['Shinagawa','Ueno','Toride','Tsuchiura','Mito','Katsuta']
});
const candidateLive = live({
  serviceDate:'2026-11-03',trainNumber:'1257M',railDirection:'Outbound',
  positionLineId:'Joban',
  sourceFromStation:'odpt.Station:JR-East.JobanRapid.Ueno',
  sourceToStation:'odpt.Station:JR-East.JobanRapid.Toride'
});
expectMatched({JobanMain:[candidatePlan]}, {Joban:[candidateLive]}, 1);
assert.equal(candidateLive.runningChainId,'canonical-sql-trip:2026-11-03:174919');
assert.deepEqual(JSON.parse(JSON.stringify(candidateLive.canonicalPlannedVehicleReference)),{
  source:'verified-canonical-sql-source-candidate',
  model:'E531系',canonicalTimetableId:'174919',
  serviceDate:'2026-11-03',trainNumber:'1257M',confirmed:false
});
assert.equal(candidateLive.vehicleType,undefined,'do not invent actual type');
assert.equal(candidateLive.vehicleFormationId,undefined,'do not invent formation');
const conflictingLive = live({
  serviceDate:'2026-11-03',trainNumber:'1257M',railDirection:'Outbound',
  positionLineId:'Joban',
  sourceFromStation:'odpt.Station:JR-East.JobanRapid.Ueno',
  sourceToStation:'odpt.Station:JR-East.JobanRapid.Toride'
});
expectMatched({JobanMain:[plan(174919,{
  ...candidatePlan,plannedVehicleCandidates:['E531系','E231系0番台']
})]}, {Joban:[conflictingLive]}, 1);
assert.equal(conflictingLive.canonicalPlannedVehicleReference,undefined,
  'conflicting canonical source models cannot authorize E531 artwork');

for (const [label, plans, lives] of [
  ['two plans with same number', { JobanMain: [plan(80), plan(81)] }, { Joban: [live()] }],
  ['two simultaneous live snapshots', { JobanMain: [plan(80)] },
    { Joban: [live(), live({ sourceRailway: 'odpt.Railway:JR-East.Joban' })] }],
  ['no published station match', { JobanMain: [plan(80)] },
    { Joban: [live({ sourceFromStation: 'odpt.Station:JR-East.JobanRapid.Sendai' })] }],
  ['wrong stop order', { JobanMain: [plan(80)] },
    { Joban: [live({ sourceFromStation: 'odpt.Station:JR-East.JobanRapid.Toride',
      sourceToStation: 'odpt.Station:JR-East.JobanRapid.Tsuchiura' })] }],
  ['different service date', { JobanMain: [plan(80)] },
    { Joban: [live({ serviceDate: '2026-11-02' })] }],
  ['different direction', { JobanMain: [plan(80)] },
    { Joban: [live({ railDirection: 'Outbound' })] }],
  ['different train number', { JobanMain: [plan(80)] },
    { Joban: [live({ trainNumber: '1334M' })] }],
  ['other operator namespace', { JobanMain: [plan(80)] },
    { Joban: [live({ sourceRailway: 'odpt.Railway:TokyoMetro.JobanRapid' })] }],
  ['local-line isolation', { JobanMain: [plan(80)] },
    { JobanLocal: [live()] }],
  ['source-only SQL is not verified', { JobanMain: [plan(80, { canonicalGroupEvidence: 'source_only' })] },
    { Joban: [live()] }],
  ['unmapped plans not canonical', { JobanMain: [plan(80, { canonicalTimetableId: null })] },
    { Joban: [live()] }],
]) {
  const rows = Object.values(lives).flat();
  expectMatched(plans, lives, 0);
  assert.ok(rows.every(x => !x.runningChainId),
    label + ': ambiguous source must not inherit canonical identity');
}

assert.match(estimatorText, /canonicalStopKeys:\s*tt\._canonicalGroupEvidence/);
assert.match(estimatorText, /pos\.runningChainId=pos\.timetableIdentity/);
assert.match(estimatorText, /pos\.runningChainEvidence="VERIFIED_SQL_CANONICAL"/);
assert.match(fusionText, /_linkVerifiedCanonicalRealtime\(estimated,\s*posMap\)/);
assert.match(configText, /VERIFIED_CANONICAL_PLAN_PARTNERS/);
assert.match(pageText, /getVerifiedCanonicalPartners\(lineId\)/);
assert.match(fusionText, /deps = deps\.concat\(_canonicalPlanPartners\(id\)\)/);

console.log('Joban realtime canonical-train hybrid matching: PASS');
