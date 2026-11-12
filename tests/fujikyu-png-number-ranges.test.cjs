'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const migrationPath =
  'supabase/migrations/20261112120000_fujikyu_2611_png_number_ranges.sql';
const migration = fs.readFileSync(migrationPath, 'utf8');
const ranges = fs.readFileSync('data/timetables/train-number-png-ranges.js', 'utf8');

function contextFor(calendarType) {
  return {
    positionSource: 'supabase-train-run',
    estimated: true,
    serviceDate: '2026-11-12',
    calendarType,
    trainOperator: 'Fujikyu',
    sourceRailway: 'odpt.Railway:FujisanrokuElectricRailway.Fujikyu',
    railDirection: 'odpt.RailDirection:Outbound',
    trainType: 'odpt.TrainType:FujisanrokuElectricRailway.Local'
  };
}

test('Fujikyu SQL migration defines only the official Fujisan Express PNG ranges', () => {
  assert.match(migration, /line_key,segment_key,min_number,max_number,suffix/);
  assert.match(migration, /'2611','Fujikyu','fujisan_express_8000',701,705/);
  assert.match(migration, /'2611','Fujikyu','fujisan_express_8000',793,794/);
  assert.match(migration, /requires_exact_roster/);
  assert.match(migration, /actual_vehicle_confirmed\s*\)\s*\n?VALUES[\s\S]*true,false/);
  assert.doesNotMatch(migration, /\(45\)/);
});

test('Fujikyu number ranges normalize SQL labels and keep ordinary 45 unresolved', () => {
  const root = {};
  const context = vm.createContext({
    window: root,
    console: { debug() {}, warn() {}, log() {}, error() {} }
  });
  for (const file of [
    'data/timetables/vehicle-garage-png-map.js',
    'js/train-vehicle.js',
    'data/timetables/train-number-png-ranges.js'
  ]) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  }

  const weekday = contextFor('weekday');
  const named = root.TrainNumberPngRanges.match(
    '701 フジサン特急 1号 Fujisan Express 1', 'Fujikyu', weekday);
  assert.ok(named);
  assert.equal(named.model, '富士急行8000系（フジサン特急・顔A）');
  assert.match(named.pngPath, /富士急行_8000系_フジサン特急_顔A\.png$/);

  const ordinary = root.TrainNumberPngRanges.match('45', 'Fujikyu', weekday);
  assert.equal(ordinary, null);

  const holiday = contextFor('holiday');
  assert.ok(root.TrainNumberPngRanges.match('703', 'Fujikyu', holiday));
  assert.equal(root.TrainNumberPngRanges.match('705', 'Fujikyu', holiday), null);
});

test('Fujikyu Edge path carries the clean number and planned-only vehicle fields', () => {
  const edge = fs.readFileSync('supabase/functions/train-runs/index.ts', 'utf8');
  assert.match(edge, /FUJIKYU_2611_FUJISAN_EXPRESS_PNG_RANGES_UNAVAILABLE/);
  assert.match(edge, /official-2611-fujikyu-fujisan-express-number/);
  assert.match(edge, /vehicle_mapping_level="published_number_family_plan"/);
  assert.match(edge, /vehicle_plan_confirmed=false/);
  assert.match(edge, /vehicle_evidence_source_id="fujikyu-fujisan-express-8000-2611"/);
});

console.log('Fujikyu SQL PNG number ranges: contract tests loaded');
