/* Regression tests for Tobu Kameido / Daishi rolling-stock artwork.
 * Run: node --test tests/tobu-kameido-vehicle.test.cjs
 * A/B/C/D train identifiers are NOT evidence of a physical carset.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const RENEWED_10030 = '../images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png';

function loadVehicleRegistry() {
  const window = {};
  const context = vm.createContext({
    window,
    console: { log() {}, info() {}, warn() {}, debug() {}, error() {} }
  });
  for (const file of [
    'data/timetables/vehicle-garage-png-map.js',
    'js/train-vehicle.js'
  ]) vm.runInContext(read(file), context, { filename: file });
  return window;
}

function loadGtfsVehicleType() {
  const script = read('data/api/odpt-unified.js');
  const start = script.indexOf('function _gtfsVehicleType(operator, lineId, vehicleId, vehicleLabel, tripId)');
  const end = script.indexOf('function _gtfsDirection(', start);
  assert.ok(start >= 0 && end > start, 'GTFS vehicle resolver must exist');
  return vm.runInNewContext('(' + script.slice(start, end).trim() + ')');
}

function position(overrides = {}) {
  return {
    lineId: 'Tobu_Kameido',
    positionLineId: 'Tobu_Kameido',
    displayLineId: 'Tobu_Kameido',
    sourceRailway: 'odpt.Railway:Tobu.Kameido',
    positionSource: 'supabase-train-run',
    estimated: true,
    trainNumber: 'A10',
    serviceDate: '2026-11-15',
    ...overrides
  };
}

test('renewed 10030 PNG is the approved gallery asset on both small branches', () => {
  const window = loadVehicleRegistry();
  const model = '東武10030型50番台（亀戸・大師線・2両）';
  const older = '../images/列车/東武鉄道/東武鉄道_10030型_50番台.png';
  assert.ok(fs.existsSync(path.join(ROOT, RENEWED_10030.slice(3))));
  assert.equal(window.VehicleGaragePngMap.matchModelPath(model, RENEWED_10030, 'Tobu_Kameido'), true);
  assert.equal(window.VehicleGaragePngMap.matchModelPath(model, RENEWED_10030, 'Daishi_Tobu'), true);
  assert.equal(window.VehicleGaragePngMap.matchModelPath(model, older, 'Tobu_Kameido'), false);
});

test('undated working numbers never select a car PNG, even if a model was inferred', () => {
  const window = loadVehicleRegistry();
  const paint = window.TrainVehicle.selectMarkerArtwork;
  for (const trainNumber of ['A2', 'A10', 'A106', 'B1', 'C9', 'D8']) {
    const result = paint(position({ trainNumber }), false);
    assert.equal(result.kind, 'unresolved', trainNumber);
    assert.equal(result.iconSrc, '', trainNumber);
  }
  const staleExact = position({
    vehicleIdentityStatus: 'EXACT',
    vehicleResolvedUpstream: true,
    vehicleResolutionLineId: 'Tobu_Kameido',
    vehicleIconPath: RENEWED_10030,
    actualVehicleConfirmed: true
  });
  assert.equal(paint(staleExact, false).kind, 'unresolved',
    'a flattened actualVehicleConfirmed flag must not authorize PNG without evidence provenance');
  const daishi = position({
    lineId: 'Daishi_Tobu',
    positionLineId: 'Daishi_Tobu',
    displayLineId: 'Daishi_Tobu',
    sourceRailway: 'odpt.Railway:Tobu.Daishi',
    trainNumber: 'D8'
  });
  assert.equal(paint(daishi, false).kind, 'unresolved');
});

test('only a provenance-backed exact identity may select a branch PNG', () => {
  const window = loadVehicleRegistry();
  const paint = window.TrainVehicle.selectMarkerArtwork;
  const certified = position({
    vehicleIdentityStatus: 'EXACT',
    vehicleResolvedUpstream: true,
    vehicleResolvedFromRealtime: true,
    vehicleResolutionLineId: 'Tobu_Kameido',
    vehicleResolution: {
      identityStatus: 'EXACT',
      lineId: 'Tobu_Kameido',
      sources: ['realtime']
    },
    vehicleIconPath: RENEWED_10030
  });
  const result = paint(certified, false);
  assert.equal(result.kind, 'vehicle');
  assert.equal(result.iconSrc, RENEWED_10030);
  assert.equal(paint({ ...certified, displayLineId: 'TobuSkytree' }, false).kind, 'unresolved',
    'an exact branch car cannot be replayed on unrelated diagrams');
});

test('retired 8000 series cannot be accepted as current Kameido stock', () => {
  const window = loadVehicleRegistry();
  const result = window.TrainVehicle.resolve({
    lineId: 'Tobu_Kameido', operator: 'Tobu',
    railway: 'odpt.Railway:Tobu.Kameido',
    realtimeVehicleType: '東武8000系'
  });
  assert.notEqual(result.identityStatus, 'EXACT');
  assert.equal(result.iconPath, '');
});

test('GTFS recognizes explicit model labels without reading series from a trip ID', () => {
  const classify = loadGtfsVehicleType();
  assert.equal(classify('Tobu', 'Tobu_Kameido', '11263', '10030型', 'A10000'), '東武10030型');
  assert.equal(classify('Tobu', 'Tobu_Kameido', '11201', '10000型', 'B10030'), '東武10000型');
  assert.equal(classify('Tobu', 'Tobu_Kameido', '11263', '', 'A10030'), '');
  assert.equal(classify('Tobu', 'Tobu_Kameido', '11263', '', ''), '');
  assert.equal(classify('Tobu', 'Tobu_Kameido', '東武10030型', '東武10000型', 'A2'), '',
    'conflicting labels must not prioritize an arbitrary model');
  assert.equal(classify('Tobu', 'TobuSkytree', 'T50050', '', 'A10'), '東武50050系',
    'unrelated Tobu routes must retain existing behavior');
});
