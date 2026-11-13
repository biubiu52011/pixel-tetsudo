'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const ranges = fs.readFileSync(
  path.join(root, 'data/timetables/train-number-png-ranges.js'),
  'utf8',
);
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20261113142000_gotemba_2611_png_number_ranges.sql'),
  'utf8',
);
const garage = fs.readFileSync(
  path.join(root, 'data/timetables/vehicle-garage-png-map.js'),
  'utf8',
);
const vehicle = fs.readFileSync(
  path.join(root, 'js/train-vehicle.js'),
  'utf8',
);

const localNumbers = [
  '2226M','2521M','2522M','2524M','2525M','2526M','2527M','2528M',
  '2529M','2530M','2531M','2532M','2533G','2534M','2535M','2536M',
  '2538G','2539M','2540G','2541G','2542G','2543G','2544M','2545G',
  '2546M','2547M','2549M','2550M','2551M','2552G','2553G','2554M',
  '2555M','2556G','2557M','2558M','2559M','2560M','2561M','2562M',
  '2563G','2564M','2565M','2566M','2567M','2569G','2570M','2571M',
  '2572M','2573M','2574M','2575M','2576M','2577M','2610M','2611M',
  '2612M','2613M','2614G','2615M','2616M','2617M','2618M','2619M',
  '2620M','2621M','2622M','2623M','2624M','2625G','2626M','2627M',
  '2628M','2629M','2630M','2631M','2632M','2633M','2635G','2637G',
  '2639M','2641M','2643M','2645M','2751M','5535M','5539M','5550M',
];

test('Gotemba ordinary roster uses the 315 reference PNG only for imported local numbers', () => {
  const gotemba = ranges.match(/lineIds:\["Gotemba"\][\s\S]*?(?=\n\s*\/\/ Fujikyu)/)?.[0];
  assert.ok(gotemba, 'Gotemba range row must be present');
  assert.match(gotemba, /model:"315系"/);
  for (const number of localNumbers) assert.match(gotemba, new RegExp(`"${number}"`));
  for (const number of ['1M', '2M', '3M', '4M', '5M', '6M']) {
    assert.doesNotMatch(gotemba, new RegExp(`"${number}"`));
  }
  assert.match(gotemba, /JR-Central\.Gotemba/);
  assert.match(gotemba, /JR東海\/JR東海_315系\.png/);
});

test('Gotemba SQL range migration keeps both suffix ranges reference-only', () => {
  assert.match(migration, /gotemba_local_315_reference/);
  assert.match(migration, /2226,5550,'M'/);
  assert.match(migration, /2533,2637,'G'/);
  assert.match(migration, /requires_exact_roster/);
  assert.match(migration, /actual_vehicle_confirmed[\s\S]*?true,false/);
  assert.match(migration, /GOTEMBA_NUMBER_ROSTER_CHANGED/);
});

test('Gotemba planned local selects the scoped 315 reference marker', () => {
  const scope = {};
  const context = vm.createContext({
    window: scope,
    console: { debug() {}, warn() {}, log() {}, error() {} },
  });
  for (const [name, source] of [
    ['vehicle-garage-png-map.js', garage],
    ['train-vehicle.js', vehicle],
    ['train-number-png-ranges.js', ranges],
  ]) vm.runInContext(source, context, { filename: name });

  const planned = {
    trainNumber: '2544M',
    positionLineId: 'Gotemba',
    displayLineId: 'Gotemba',
    positionSource: 'supabase-train-run',
    estimated: true,
    serviceDate: '2026-11-13',
    calendarType: 'weekday',
    trainOperator: 'JR-Central',
    sourceRailway: 'odpt.Railway:JR-Central.Gotemba',
    railDirection: 'odpt.RailDirection:Inbound',
    trainType: 'odpt.TrainType:JR-Central.Local',
    vehicleIdentityStatus: 'UNKNOWN',
    vehicleResolvedUpstream: false,
    vehicleResolvedFromRealtime: false,
    actualVehicleConfirmed: false,
  };
  const match = scope.TrainNumberPngRanges.match('2544M', 'Gotemba', planned);
  assert.equal(match?.model, '315系');
  assert.equal(scope.TrainVehicle.lookupTrainNumberRangePng(planned)?.model,
    '315系');
  const marker = scope.TrainVehicle.selectMarkerArtwork(planned, false);
  assert.equal(marker.kind, 'vehicle');
  assert.match(marker.iconSrc, /JR東海_315系\.png$/);
  assert.equal(marker.illustrative, true);
  assert.equal(marker.actualVehicleConfirmed, false);
});

console.log('Gotemba PNG number-range contract passed');
