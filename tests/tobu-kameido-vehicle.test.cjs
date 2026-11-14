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
    'data/timetables/train-number-png-ranges.js',
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

test('Kameido A/B/C and Daishi nD number ranges project examples, not real stock', () => {
  const window = loadVehicleRegistry();
  const paint = window.TrainVehicle.selectMarkerArtwork;
  const cases = [
    ['A2', RENEWED_10030],
    ['A100', RENEWED_10030],
    ['B1', RENEWED_10030],
    ['B101', RENEWED_10030],
    ['C4', '../images/列车/東武鉄道/東武鉄道_10000型_更新車.png'],
    ['C21', '../images/列车/東武鉄道/東武鉄道_10000型_更新車.png']
  ];
  for (const [trainNumber, expectedPng] of cases) {
    const result = paint(position({ trainNumber }), false);
    assert.equal(result.kind, 'vehicle', trainNumber);
    assert.equal(result.iconSrc, expectedPng, trainNumber);
    assert.equal(result.illustrative, true, trainNumber);
    assert.equal(result.planned, true, trainNumber);
    assert.equal(result.representativeOnly, true, trainNumber);
    assert.equal(result.actualVehicleConfirmed, false, trainNumber);
  }
  for (const invalid of ['A1', 'A106', 'B103', 'C23', 'D8', 'C04', 'C999']) {
    const result = paint(position({trainNumber:invalid}), false);
    assert.equal(result.kind, 'unresolved', invalid);
    assert.equal(result.iconSrc, '', invalid);
  }
  const daishi = {
    lineId:'Daishi_Tobu',positionLineId:'Daishi_Tobu',
    displayLineId:'Daishi_Tobu',sourceRailway:'odpt.Railway:Tobu.Daishi'
  };
  for (const number of ['1D', '218D']) {
    const result = paint(position({...daishi,trainNumber:number}),false);
    assert.equal(result.kind,'vehicle',number);
    assert.equal(result.illustrative,true,number);
  }
  for (const number of ['219D', '220D', 'D8', '00D']) {
    assert.equal(paint(position({...daishi,trainNumber:number}),false).kind,'unresolved',number);
  }
});

test('weekday maxima, date, calendar, source and route are enforced', () => {
  const window = loadVehicleRegistry();
  const paint = window.TrainVehicle.selectMarkerArtwork;
  const weekday = {serviceDate:'2026-11-16',calendarType:'weekday'};
  for (const n of ['A106','B103','C23']) {
    const ref = paint(position({...weekday,trainNumber:n}),false);
    assert.equal(ref.kind,'vehicle',n);
    assert.equal(ref.illustrative,true,n);
  }
  const daishi = {lineId:'Daishi_Tobu',positionLineId:'Daishi_Tobu',
    displayLineId:'Daishi_Tobu',sourceRailway:'odpt.Railway:Tobu.Daishi'};
  assert.equal(paint(position({...daishi,...weekday,trainNumber:'220D'}),false).kind,'vehicle');
  for (const bad of [
    {serviceDate:'2026-12-01'},
    {serviceDate:'2025-11-15'},
    {calendarType:'weekday'},
    {sourceRailway:'odpt.Railway:Tobu.Nikko'},
    {displayLineId:'TobuSkytree'},
    {positionLineId:'TobuSkytree'},
    {positionSource:'realtime-api',estimated:true},
    {positionSource:'supabase-train-run',estimated:false}
  ]) {
    assert.equal(paint(position({...bad,trainNumber:'C4'}),false).kind,'unresolved',
      JSON.stringify(bad));
  }
  assert.equal(paint(position({trainNumber:'C4'}),true).kind,'unresolved',
    'failed image loading must never be silently replaced');
});

test('unverified flat EXACT flag may not turn the fleet example into actual stock', () => {
  const window = loadVehicleRegistry();
  const result = window.TrainVehicle.selectMarkerArtwork(position({
    trainNumber:'C4',
    vehicleIdentityStatus:'EXACT',
    vehicleResolvedUpstream:true,
    vehicleResolutionLineId:'Tobu_Kameido',
    vehicleIconPath:RENEWED_10030,
    actualVehicleConfirmed:true
  }),false);
  assert.equal(result.kind,'vehicle');
  assert.equal(result.illustrative,true);
  assert.equal(result.actualVehicleConfirmed,false);
  assert.notEqual(result.iconSrc,RENEWED_10030);
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


test('C4 live-position displays reference image without asserting a physical carset', () => {
  const window = loadVehicleRegistry();
  const p = position({
    trainNumber:'C4',
    positionSource:'realtime-api',
    estimated:false,
    calendarType:'holiday',
    sourceUpdatedAt:'2026-11-15T06:03:00+09:00',
    vehicleIdentityStatus:'UNKNOWN'
  });
  const art=window.TrainVehicle.selectMarkerArtwork(p,false);
  assert.equal(art.kind,'vehicle');
  assert.equal(art.illustrative,true);
  assert.equal(art.actualVehicleConfirmed,false);
  assert.equal(art.illustrationRole,'tobu-branch-working-fleet-example-not-observed');
  assert.equal(art.iconSrc,'../images/列车/東武鉄道/東武鉄道_10000型_更新車.png');
  assert.equal(window.TrainVehicle.selectMarkerArtwork({
    ...p,sourceRailway:'odpt.Railway:Tobu.Nikko'
  },false).iconSrc,'');
});

test('SVG marker spec publishes the vehicle rejection reason without rewriting live provenance', () => {
  const window = loadVehicleRegistry();
  const source = read('js/trains-render.js');
  const start = source.indexOf('function _trainMarkerSpec(p, trainUid, lineId)');
  const end = source.indexOf('\n  }\n', start);
  assert.ok(start >= 0 && end > start, 'marker spec function must exist');
  const markerSpec = vm.runInNewContext('(' + source.slice(start, end + 5) + ')', {
    window, _isTrainArtworkFailureActive: () => false
  });
  const p = position({trainNumber: 'C4', positionSource: 'realtime-api', estimated: false});
  const spec = markerSpec(p, 'planned-trip:2026-11-15|Tobu|C4', 'Tobu_Kameido');
  assert.equal(spec.kind, 'vehicle');
  assert.equal(spec.compact, false);
  assert.equal(spec.illustrative, true);
  assert.equal(spec.illustrationRole, 'tobu-branch-working-fleet-example-not-observed');
  assert.equal(spec.unresolvedReason, '');
});
