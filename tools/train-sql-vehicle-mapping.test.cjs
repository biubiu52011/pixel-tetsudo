'use strict';

// Regression: a SQL source_single_type_candidate is a timetable reference,
// NOT confirmation of the actual vehicle and not a licence to show an EXACT PNG.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/train-vehicle.js', 'utf8');
const window = {};
vm.runInNewContext(source, {
  window,
  console: { debug() {}, warn() {}, error() {}, log() {} },
  Date, Map, Set, WeakSet, WeakMap, Promise, Object, Array, Number, String, Math,
}, { filename: 'js/train-vehicle.js', timeout: 10000 });

assert.ok(window.TrainVehicle && window.TrainVehicle.resolveTimetableRun);

function plannedFixture(lineId, operator, vehicleType, level) {
  const run = {
    trainNumber: 'NON_REALTIME_FIXTURE_123',
    calendar: 'odpt.Calendar:Weekday',
    destinationStationUrn: '',
    trainType: '',
    timetableIdentity: 'fixture|' + lineId + '|' + vehicleType + '|' + level,
  };
  const tt = {
    _positionSource: 'supabase-train-run',
    _sqlVehicleMappingLevel: level,
    _sqlVehicleCandidateLabel: vehicleType,
    vehicleType,
    _serviceDate: '2026-10-30',
    _timetableValidity: 'undated_not_current_verified',
  };
  return window.TrainVehicle.resolveTimetableRun(run, tt, lineId, { operator }, '2026-10-30');
}

const cases = [
  ['Yokohama', 'JR-East', 'E233系6000番台'],
  ['Ome', 'JR-East', 'E233系0番台'],
  ['Nippori_Toneri', 'Toei', '330形'],
  ['TamaMonorail', 'TamaMonorail', '1000系'],
  ['TobuUtsunomiya', 'Tobu', '20400型'],
  ['Rinkai', 'TWR', 'E233系7000番台'],
];

for (const [line, operator, vehicle] of cases) {
  const result = plannedFixture(line, operator, vehicle, 'source_single_type_candidate');
  assert.equal(result.vehicleResult.identityStatus, 'UNKNOWN',
    line + ': a unique candidate is not the actual vehicle');
  assert.equal(result.vehicleResult.iconPath, '',
    line + ': a unique candidate must not emit an EXACT PNG');
  assert.equal(result.timetableVehicleInput, '',
    line + ': a SQL candidate must not feed the actual-identity resolver');
  assert.equal(result.vehicleResult.vehiclePlan?.status, 'PLANNED_CANDIDATES',
    line + ': unverified source must remain a planned candidate, not a certified model');
  assert.equal(result.vehicleResult.vehiclePlan?.iconPath, '',
    line + ': an unverified source cannot authorize a catalog PNG');

  const display = window.TrainVehicle.selectMarkerArtwork({
    positionLineId: line,
    vehicleResolutionLineId: line,
    vehicleIdentityStatus: result.vehicleResult.identityStatus,
    vehicleResolvedUpstream: false,
    vehicleResolution: result.vehicleResult,
    vehiclePlan: result.vehicleResult.vehiclePlan,
    estimated: true,
  }, false);
  assert.equal(display.kind, 'unresolved',
    line + ': an unverified source candidate must remain a neutral position marker');
  const liveDisplay = window.TrainVehicle.selectMarkerArtwork({
    positionLineId: line,
    vehicleResolutionLineId: line,
    vehicleIdentityStatus: result.vehicleResult.identityStatus,
    vehicleResolvedUpstream: false,
    vehicleResolution: result.vehicleResult,
    vehiclePlan: result.vehicleResult.vehiclePlan,
    estimated: false,
  }, false);
  assert.equal(liveDisplay.kind, 'unresolved',
    line + ': a timetable model must not be projected onto a realtime record');
}

for (const [line, operator, name] of [
  ['Odawara', 'Odakyu', '小田急4000形'],
  ['Odawara', 'Odakyu', '小田急60000形'],
  ['Odawara', 'Odakyu', '小田急70000形'],
  ['Odawara', 'Odakyu', '小田急1000形'],
]) {
  // Distinguish the SQL artwork-view gap from a missing JS canonical mapping.
  const exact = plannedFixture(line, operator, name, 'dated_schedule_rule');
  assert.equal(exact.vehicleResult.identityStatus, 'EXACT',
    name + ': separately source-backed scheduled mapping must not be lost');
  assert.ok(exact.vehicleResult.iconPath.includes('/小田急電鉄/'),
    name + ': original vehicle-specific catalog image remains present');
}

// Source-backed line-fleet labels remain informative but never identify a
// particular departure's planned or physical vehicle, even if a PNG exists.
for (const level of ['official_single_fleet_plan', 'official_model_family_plan']) {
  const fleet = plannedFixture('TamaMonorail', 'TamaMonorail', '1000系', level);
  assert.equal(fleet.vehicleResult.identityStatus, 'UNKNOWN');
  assert.equal(fleet.timetableVehicleInput, '',
    level + ': route fleet must not be used by the actual-identity resolver');
  assert.equal(fleet.vehicleResult.vehiclePlan?.status, 'FLEET_REFERENCE');
  assert.equal(fleet.vehicleResult.vehiclePlan?.evidenceRole, 'route-fleet-reference');
  assert.ok(fleet.vehicleResult.vehiclePlan?.models?.length,
    level + ': the known fleet model remains readable as a route reference');
  assert.equal(fleet.vehicleResult.vehiclePlan?.iconPath, '',
    level + ': a source-backed route fleet must not authorize a train PNG');
}
const edgeSource = fs.readFileSync('supabase/functions/train-runs/index.ts', 'utf8');
assert.match(edgeSource, /const fleetReferenceLabel = \['official_single_fleet_plan',/,
  'the API must expose an official line fleet as reference-only candidate data');
assert.match(edgeSource, /vehicle_type_candidates: trainCandidate \|\| fleetReferenceLabel \|\|/,
  'train-level candidate priority and official route reference fallback must both survive');
assert.match(edgeSource, /vehicle_historical_source_label: t\.vehicle_type_label \|\| null/,
  'source-historical label must remain separately available for audits');
assert.match(edgeSource, /vehicle_candidate_source_url: mapped\.mapping_level/,
  'existing train-specific candidate provenance must not be lost');

// A source-registered cross-operator alias is a scoped planned artwork mapping,
// never an operator-wide default nor a realtime vehicle assignment.
for (const [line, operator, model] of [
  ['Tojo', 'Tobu', 'E233系7000番台'],
  ['Rinkai', 'TWR', 'E235系1000番台'],
]) {
  const mismatched = plannedFixture(line, operator, model, 'source_single_type_candidate');
  assert.equal(mismatched.vehicleResult.identityStatus, 'UNKNOWN');
  assert.equal(mismatched.vehicleResult.vehiclePlan?.iconPath || '', '',
    line + ': unregistered cross-line vehicle type must not borrow a PNG');
}

console.log('SQL vehicle mapping contract: PASS (unverified candidates, dated exact, scoped negatives)');


// JR-West JR Tozai scoped model-family contract.
for (const lineId of ['JRTozai','Gakkentoshi','Fukuchiyama','TokaidoKansai']) {
  const family=window.TrainVehicle.resolve({
    lineId,operator:'JR-West',timetableVehicleType:'207系'
  });
  assert.equal(family.name,'JR西日本207系',lineId+': 207 family alias');
  assert.equal(family.identityStatus,'EXACT',lineId+': verified model name');
  assert.equal(family.iconPath,'',lineId+': NK/Y2 unproved');
  for (const [model,filename] of [
    ['JR西日本207系（NK）','JR西日本_207系_NK.png'],
    ['JR西日本207系（Y2）','JR西日本_207系_Y2.png'],
    ['321系','JR西日本_321系.png']
  ]) {
    const result=window.TrainVehicle.resolve({
      lineId,operator:'JR-West',timetableVehicleType:model
    });
    assert.equal(result.identityStatus,'EXACT',lineId+': '+model);
    assert.ok(result.iconPath.endsWith(filename),lineId+': '+model);
  }
}
const metro=window.TrainVehicle.resolve({
  lineId:'Tozai',operator:'TokyoMetro',
  railway:'odpt.Railway:TokyoMetro.Tozai',timetableVehicleType:'207系'
});
assert.equal(metro.name,'','Metro Tozai must not borrow JR-West 207');
for (const name of ['207系','JR西日本207系']) {
  const family=window.TrainVehicle.resolveCanonicalVehicle(name);
  assert.equal(family?.id,'jr-west-207-family');
  assert.equal(family.asset,null);
}
assert.equal(window.TrainIcons.resolveVehicleArtwork('JR西日本207系'),null);
window.TrainIcons.hydrateVerifiedArtworkCatalog([{
  image_path:'images/列车/JR西日本/JR西日本_207系_NK.png',
  vehicle_type:'207系',asset_scope:'subseries',subseries:'NK'
}]);
assert.equal(window.TrainIcons.resolveVehicleArtwork('JR西日本207系'),null);
for(const lineId of ['JRTozai','Gakkentoshi']) {
  const candidate=plannedFixture(lineId,'JR-West','207系','source_single_type_candidate');
  assert.equal(candidate.vehicleResult.identityStatus,'UNKNOWN');
  assert.equal(candidate.vehicleResult.iconPath,'');
}
