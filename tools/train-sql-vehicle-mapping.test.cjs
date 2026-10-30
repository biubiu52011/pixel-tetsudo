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
];

for (const [line, operator, vehicle] of cases) {
  const result = plannedFixture(line, operator, vehicle, 'source_single_type_candidate');
  assert.equal(result.vehicleResult.identityStatus, 'UNKNOWN',
    line + ': a unique candidate is not the actual vehicle');
  assert.equal(result.vehicleResult.iconPath, '',
    line + ': a unique candidate must not emit an EXACT PNG');
  assert.equal(result.timetableVehicleInput, '',
    line + ': a SQL candidate must not feed the actual-identity resolver');
  assert.equal(result.vehicleResult.vehiclePlan?.status, 'PLANNED_MODEL',
    line + ': source name may only be retained as a planned reference');
  assert.ok(result.vehicleResult.vehiclePlan?.iconPath,
    line + ': catalog model reference remains available');

  const display = window.TrainVehicle.selectMarkerArtwork({
    positionLineId: line,
    vehicleResolutionLineId: line,
    vehicleIdentityStatus: result.vehicleResult.identityStatus,
    vehicleResolvedUpstream: false,
    vehicleResolution: result.vehicleResult,
    vehiclePlan: result.vehicleResult.vehiclePlan,
    estimated: true,
  }, false);
  assert.equal(display.kind, 'vehicle', line + ': a planned reference may use the catalog PNG');
  assert.equal(display.planned, true,
    line + ': it must be marked planned and never masquerade as the actual train');
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

console.log('SQL vehicle mapping contract: PASS (candidate-only vs sourced model, planned PNG, 9 cases)');
