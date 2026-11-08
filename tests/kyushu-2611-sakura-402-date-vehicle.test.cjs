'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const edge = fs.readFileSync('supabase/functions/train-runs/index.ts', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20261108105303_kyushu_402a_daily_timetable_date_vehicle_plan.sql',
  'utf8');

const helperStart = edge.indexOf('function selectDatedVehiclePlan(');
const helperEnd = edge.indexOf('\nfunction scheduleVehicleType(', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart,
  'dated vehicle selector exists before recurring plan selection');
const helperSource = edge.slice(helperStart, helperEnd)
  .replace('rows: any[], context: any', 'rows, context')
  .replaceAll('(row: any)', '(row)');
const context = vm.createContext({ Array, String });
vm.runInContext(helperSource + '\nthis.selectDatedVehiclePlan = selectDatedVehiclePlan;', context);
const selectDatedVehiclePlan = context.selectDatedVehiclePlan;

const officialUrl =
  'https://www.jrkyushu-timetable.jp/sp/2611/0034/00349401.html?d=20261101&t=2900700';
const identity = {
  serviceDate: '2026-11-21',
  operator: 'JR-Kyushu',
  networkKey: 'odpt.Railway:JR-Kyushu.KyushuShinkansen',
  trainNumber: '402A',
  serviceName: 'さくら402',
  direction: 'odpt.RailDirection:Inbound'
};
function rule(overrides = {}) {
  return {
    id: 1,
    operator: identity.operator,
    network_key: identity.networkKey,
    train_number: identity.trainNumber,
    service_name: identity.serviceName,
    direction: identity.direction,
    valid_date: identity.serviceDate,
    vehicle_type: '800系',
    source_id: 9001,
    evidence_sources: {
      source_url: officialUrl,
      source_type: 'official',
      evidence_grade: 'A'
    },
    ...overrides
  };
}

test('Sakura 402 exact dated plan accepts the official single-model row', () => {
  const selected = selectDatedVehiclePlan([rule()], identity);
  assert.equal(selected.status, 'verified');
  assert.equal(selected.vehicle_type, '800系');
  assert.equal(selected.source_url, officialUrl);
});

test('dated plan requires exact date, owner, network, number, service and direction', () => {
  const mismatches = [
    { valid_date: '2026-11-22' },
    { operator: 'JR-West' },
    { network_key: 'odpt.Railway:JR-West.SanyoShinkansen' },
    { train_number: '404A' },
    { service_name: 'さくら404' },
    { direction: 'odpt.RailDirection:Outbound' }
  ];
  for (const mismatch of mismatches) {
    assert.equal(selectDatedVehiclePlan([rule(mismatch)], identity).status, 'unmatched');
  }
});

test('duplicate or invalid dated evidence fails closed', () => {
  assert.equal(selectDatedVehiclePlan([rule(), rule({ id: 2 })], identity).status,
    'conflict');
  assert.equal(selectDatedVehiclePlan([rule({ source_id: null })], identity).status,
    'invalid');
  assert.equal(selectDatedVehiclePlan([rule({ evidence_sources: {
    source_url: officialUrl, source_type: 'reference', evidence_grade: 'A'
  } })], identity).status, 'invalid');
  assert.equal(selectDatedVehiclePlan([rule({ evidence_sources: {
    source_url: 'http://example.invalid/402', source_type: 'official', evidence_grade: 'A'
  } })], identity).status, 'invalid');
});

test('migration records all 30 dates and only the two official 800-series exceptions', () => {
  assert.match(migration,
    /generate_series\('2026-11-01'::date,'2026-11-30'::date,interval '1 day'\)/);
  assert.match(migration,
    /extract\(day FROM d\) IN \(21,23\) THEN '800系' ELSE 'N700系'/);
  assert.match(migration, /vehicle_type='800系'\)<>2/);
  assert.match(migration, /vehicle_type='N700系'\)<>28/);
  assert.match(migration, /train_number='402A'/);
  assert.match(migration, /service_name='さくら402'/);
  assert.match(migration, /direction='odpt\.RailDirection:Inbound'/);
  assert.doesNotMatch(migration,
    /INSERT INTO public\.train_timetable_vehicle_mappings/i);
  assert.doesNotMatch(migration,
    /INSERT INTO public\.published_train_png_number_ranges/i);
});

test('migration replaces the coarse nine-stop source with all 16 official events', () => {
  assert.match(migration, /changed_<>9/);
  assert.match(migration, /SET last_stop_sequence=15/);
  assert.match(migration, /Kagoshima-Chuo@11:14#D/);
  assert.match(migration, /Sendai','Sendai','Izumi','Izumi'/);
  assert.match(migration, /'11:14','11:25','11:26','11:37','11:38','11:44','11:45','12:02'/);
  assert.match(migration, /'12:03','12:16','12:17','12:39','12:40','12:44','12:45','12:57'/);
  assert.match(migration, /count\(\*\).*<>16/s);
  assert.match(migration, /timetable_validity='date_verified'/);
});

test('Edge Function reads date rules and exposes only a unique native operator PNG', () => {
  assert.match(edge, /db\.from\("train_vehicle_date_rules"\)/);
  assert.match(edge, /\.eq\("valid_date",serviceDate\)/);
  assert.match(edge, /\.eq\("operator",officialShinkansenRailwayOwner\)/);
  assert.match(edge, /\.eq\("network_key",networkKey\)/);
  assert.match(edge, /\.eq\("file_format_status","native_png"\)/);
  assert.match(edge, /datedArtworkPaths\.length===1/);
  assert.match(edge, /vehicle_mapping_level: scheduleLevel/);
  assert.match(edge, /datedVehiclePlan \? "database-dated-schedule-rule"/);
  assert.match(edge, /vehicle_plan_confirmed: Boolean\([\s\S]*!datedVehiclePlan/);
});

test('frontend keeps 800 artwork date-scoped and N700 as a neutral no-PNG plan', () => {
  const window = {};
  const frontContext = vm.createContext({
    window, Date,
    console: { log() {}, warn() {}, error() {}, debug() {} }
  });
  for (const file of ['data/timetables/vehicle-garage-png-map.js', 'js/train-vehicle.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), frontContext, { filename: file });
  }
  function resolve(model, artwork, serviceDate) {
    const run = {
      trainNumber: '402A', calendar: 'odpt.Calendar:Weekday',
      trainType: 'odpt.TrainType:JR-Kyushu.Shinkansen',
      destinationStationUrn: 'odpt.Station:JR-Kyushu.KyushuShinkansen.Hakata',
      timetableIdentity: '402A|' + serviceDate
    };
    const timetable = {
      _positionSource: 'supabase-train-run', _serviceDate: serviceDate,
      'odpt:operator': 'odpt.Operator:JR-Kyushu',
      'odpt:railway': 'odpt.Railway:JR-Kyushu.KyushuShinkansen',
      'odpt:trainType': 'odpt.TrainType:JR-Kyushu.Shinkansen',
      'odpt:trainNumber': '402A',
      vehicleType: model,
      _sqlVehicleMappingLevel: 'dated_schedule_rule',
      _sqlVehicleArtworkPath: artwork,
      _sqlVehiclePlanConfirmed: false,
      'odpt:trainTimetableObject': []
    };
    return window.TrainVehicle.resolveTimetableRun(
      run, timetable, 'KyushuShinkansen', { operator: 'JR-Kyushu' }, serviceDate);
  }

  const exception = resolve('800系', 'images/列车/JR九州/JR九州_800系.png',
    '2026-11-21');
  assert.equal(exception.vehicleResult.identityStatus, 'EXACT');
  assert.equal(exception.vehicleResult.iconPath, '../images/列车/JR九州/JR九州_800系.png');
  assert.equal(exception.timetableVehicleInput, '800系');

  const normal = resolve('N700系', '', '2026-11-20');
  assert.equal(normal.timetableVehicleInput, 'N700系');
  assert.equal(normal.vehicleResult.identityStatus, 'UNKNOWN');
  assert.equal(normal.vehicleResult.vehiclePlan.status, 'PLANNED_MODEL');
  assert.equal(normal.vehicleResult.vehiclePlan.iconPath, '');
});
