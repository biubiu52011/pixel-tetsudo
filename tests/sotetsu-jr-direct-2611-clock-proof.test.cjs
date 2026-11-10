'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = p => fs.readFileSync(p, 'utf8');

test('Sotetsu-JR uses one source-scoped SQL position gate for all months', () => {
  const host = {};
  vm.runInNewContext(read('data/core/runtime-config.js'), { window: host, Object, Date, console });
  assert.deepEqual(Array.from(host.RuntimeConfig.SQL_POSITION_VERIFICATION_MONTHS.SotetsuJRDirect), ['*']);
  assert.equal(read('data/core/data-config-bundle.js'),
    require('../data/core/gen-config-bundle.js').buildBundle(),
    'published config bundle must match canonical files');
  const estimator = read('js/train-position-estimator.js');
  assert.match(estimator, /requireSqlDateProof && tt\._timetableDateVerified!==true\) continue/);
});

test('November 2611 stop clocks have a dedicated proof and dated variants, not a second timetable', () => {
  const migration = read('supabase/migrations/20261110150000_sotetsu_jr_direct_2611_four_stop_clock_verification_and_dated_variations.sql');
  const edge = read('supabase/functions/train-runs/index.ts');
  assert.match(migration, /published_sotetsu_jr_2611_clock_proof/);
  assert.match(migration, /published_sotetsu_jr_2611_dated_clock_variation/);
  assert.match(migration, /SOTETSU_JR_2611_PUBLISHED_BASE_CLOCK_SOURCE_CHANGED/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(edge, /clock\.source_stop_signature!==signature/);
  assert.match(edge, /SOTETSU_JR_2611_SOURCE_CLOCK_DRIFT/);
  assert.match(edge, /run\.timetable_date_verified=true/);
  assert.match(edge, /run\.schedule_exception_date=serviceDate/);
  assert.match(edge, /date_verified_runs: dateVerifiedRuns/);
  assert.match(edge, /sotetsuNovemberComplete\s*=\s*lineId===\"SotetsuJRDirect\"/);
  assert.match(edge, /plan_status:sotetsuNovemberComplete \? 'verified_2611_four_stop'/);
  assert.match(edge, /run\.vehicle_artwork_path=null/);
  assert.match(edge, /run\.vehicle_plan_confirmed=false/);
});

test('date exceptions remain limited to explicit JR East 11/07 and 11/22 clocks', () => {
  const migration = read('supabase/migrations/20261110150000_sotetsu_jr_direct_2611_four_stop_clock_verification_and_dated_variations.sql');
  assert.equal((migration.match(/DATE '2026-11-07',ARRAY/g) || []).length, 7);
  assert.equal((migration.match(/DATE '2026-11-22',ARRAY/g) || []).length, 1);
  assert.doesNotMatch(migration, /DATE '2026-12-/);
});

test('four-language official links are presentation only and offer recovery on load failure', () => {
  const controller = read('js/trains-page.js');
  assert.match(controller, /if \(lineId === \"SotetsuJRDirect\"\)/);
  assert.match(controller, /traininfo\.jreast\.co\.jp\/train_info\/line\.aspx/);
  assert.match(controller, /www\.sotetsu\.co\.jp\/train\/status\//);
  assert.match(controller, /628d1p\.html/);
  assert.match(controller, /628u2p\.html/);
  assert.match(controller, /if \(currentLine\) updateOfficialRuninfoSource\(currentLine\)/);
  assert.match(controller, /TrainsDetailLoader\.load\(lineId\)/);
  assert.match(controller, /window\.DataState\.setPageStateRetry\(mapEl, function\(\) \{/);
});
