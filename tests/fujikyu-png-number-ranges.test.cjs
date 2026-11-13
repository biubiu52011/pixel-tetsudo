'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const migrationPath =
  'supabase/migrations/20261112120000_fujikyu_2611_png_number_ranges.sql';
const migration = fs.readFileSync(migrationPath, 'utf8');
const localMigrationPath =
  'supabase/migrations/20261112150000_fujikyu_2611_local_png_number_range.sql';
const localMigration = fs.readFileSync(localMigrationPath, 'utf8');
const throughMigration = fs.readFileSync(
  'supabase/migrations/20261113023257_fujikyu_chuo_through_png_number_range.sql',
  'utf8'
);
const ranges = fs.readFileSync('data/timetables/train-number-png-ranges.js', 'utf8');

function contextFor(calendarType) {
  return {
    positionSource: 'supabase-train-run',
    estimated: true,
    serviceDate: '2026-11-12',
    calendarType,
    trainOperator: 'FujisanrokuElectricRailway',
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

test('Fujikyu SQL migration defines the complete ordinary 1-52 PNG range', () => {
  assert.match(localMigration, /'2611','Fujikyu','fujikyu_local_6000',1,52/);
  assert.match(localMigration, /富士急行6000系（標準色）/);
  assert.match(localMigration, /富士急行_6000系_標準色\.png/);
  assert.match(localMigration, /true,false/);
});

test('Fujikyu SQL migration defines only the evidenced ChuoMain through pair', () => {
  assert.match(throughMigration,
    /'2611','Fujikyu','fujikyu_chuo_through_e233',1455,1456,'M'/);
  assert.match(throughMigration, /E233系0番台/);
  assert.match(throughMigration, /Fujikyu-ChuoMain:1455M-1456M/);
  assert.match(throughMigration, /true,false/);
});

test('Fujikyu number ranges normalize special labels and map ordinary/through services', () => {
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
  assert.ok(ordinary);
  assert.equal(ordinary.model, '富士急行6000系（標準色）');
  assert.match(ordinary.pngPath, /富士急行_6000系_標準色\.png$/);
  const ordinaryMarker = root.TrainVehicle.selectMarkerArtwork({
    ...weekday,
    trainNumber: '45',
    positionLineId: 'Fujikyu',
    displayLineId: 'Fujikyu',
    vehicleIdentityStatus: 'UNKNOWN',
    vehicleResolvedUpstream: false,
    vehicleResolvedFromRealtime: false,
    actualVehicleConfirmed: false
  }, false);
  assert.equal(ordinaryMarker.kind, 'vehicle');
  assert.match(ordinaryMarker.iconSrc, /富士急行_6000系_標準色\.png$/);
  assert.ok(root.TrainNumberPngRanges.match('1', 'Fujikyu', weekday));
  assert.equal(root.TrainNumberPngRanges.match('53', 'Fujikyu', weekday), null);
  const through = root.TrainNumberPngRanges.match('1456M', 'Fujikyu', {
    ...weekday,
    trainNumber: '1456M',
    railDirection: 'odpt.RailDirection:Inbound',
    trainType: 'odpt.TrainType:FujisanrokuElectricRailway.Local'
  });
  assert.ok(through);
  assert.equal(through.model, 'E233系0番台');
  assert.match(through.pngPath, /JR東日本_E233系_0番台\.png$/);
  assert.equal(root.TrainNumberPngRanges.match('2726M', 'Fujikyu', {
    ...weekday,
    trainNumber: '2726M',
    railDirection: 'odpt.RailDirection:Inbound',
    trainType: 'odpt.TrainType:FujisanrokuElectricRailway.Local'
  }), null);

  const holiday = contextFor('holiday');
  assert.ok(root.TrainNumberPngRanges.match('52', 'Fujikyu', holiday));
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
  assert.match(edge, /FUJIKYU_2611_LOCAL_PNG_RANGE_UNAVAILABLE/);
  assert.match(edge, /FUJIKYU_2611_LOCAL_SQL_NUMBER_COVERAGE_DRIFT/);
  assert.match(edge, /vehicle_evidence_source_id="fujikyu-local-6000-2611"/);
});

console.log('Fujikyu SQL PNG number ranges: contract tests loaded');
