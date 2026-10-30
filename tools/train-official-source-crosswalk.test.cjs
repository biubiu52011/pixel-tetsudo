'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const crosswalk = fs.readFileSync(
  'supabase/migrations/20261030114512_crosswalk_official_train_run_numbers_to_service_names_20261030.sql',
  'utf8'
);
const planSource = fs.readFileSync(
  'supabase/migrations/20261030114616_official_nishi_kyushu_n700s_scoped_planned_fleet_20261030.sql',
  'utf8'
);
const js = fs.readFileSync('js/train-vehicle.js', 'utf8');

// Every documented source must refer to this specific run, operating date and line.
assert.match(crosswalk, /official_train_run_service_crosswalk/);
assert.match(crosswalk, /official-published-service-dates/);
assert.match(crosswalk, /source_details->>'trainNumber'/);
assert.match(crosswalk, /source_details->>'lineId'/);
assert.match(crosswalk, /'operatingDates'/);
assert.match(crosswalk, /service_date/);
assert.match(crosswalk, /primary_train_number/);
assert.match(crosswalk, /published_service_name/);
assert.match(crosswalk, /COUNT\(DISTINCT|count\(DISTINCT/);
assert.match(crosswalk, /CANONICAL_TIMETABLE_VERSION_UNVERIFIED/);
assert.match(crosswalk, /actual_vehicle_identity_status/);
assert.match(crosswalk, /'UNKNOWN'::text/);
assert.match(crosswalk, /REVOKE ALL ON rail_audit\.official_train_run_service_crosswalk/);
assert.doesNotMatch(crosswalk, /\bUPDATE\s+(?:public\.)?train_runs\b/i);
assert.doesNotMatch(crosswalk, /\bINSERT\s+INTO\s+(?:public\.)?train_timetable_vehicle_mappings\b/i);

// Official N700S model family cannot silently grant a physical car identity.
assert.match(planSource, /jrkyushu\.co\.jp\/train\/kids\/guardian\/train_equipment/);
assert.match(planSource, /NishiKyushuShinkansen/);
assert.match(planSource, /JR九州N700S系/);
assert.match(planSource, /'planOnly'|\\"planOnly\\"|"planOnly"/);
assert.match(planSource, /NULL,NULL,ARRAY\['JR九州N700S系'\]/);
assert.match(planSource, /evidence_grade/);
assert.doesNotMatch(planSource, /\bUPDATE\s+public\.train_runs\b/i);

const browser = { window: {}, console: { debug(){}, warn(){}, error(){}, log(){} } };
// Test-only exposure of the internal plan resolver, without changing product exports.
const injected = js.replace(
  'window.TrainVehicle = {',
  'window.__testPlanResolution = resolveTimetableVehiclePlan;\nwindow.TrainVehicle = {'
);
assert.notEqual(injected, js);
vm.runInNewContext(injected, browser, {filename:'js/train-vehicle.js',timeout:12000});
const t = browser.window.TrainVehicle;
const catalog = t.resolveCanonicalVehicle('JR九州N700S系');
assert.ok(catalog);
assert.equal(catalog.asset, null, 'no imaginary JR Kyushu N700S PNG');
assert.equal(catalog.plannedAsset, null);
assert.equal(Array.from(catalog.lineIds).join(','), 'NishiKyushuShinkansen');
assert.equal(catalog.candidateOnly, true);
const planned = browser.window.__testPlanResolution('JR九州N700S系', {
  lineId:'NishiKyushuShinkansen', operator:'JR-Kyushu', trainType:'Shinkansen'
});
assert.equal(planned.status,'PLANNED_MODEL');
assert.deepEqual(Array.from(planned.models), ['JR九州N700S系（西九州新幹線）']);
assert.ok(!planned.iconPath, 'do not reuse N700, 800 or another company PNG');
const others = browser.window.__testPlanResolution('JR九州N700S系', {
  lineId:'SanyoShinkansen', operator:'JR-West', trainType:'Shinkansen'
});
assert.ok(!others.iconPath, 'no picture outside licensed line');
console.log('Official service-name crosswalk + N700S scoped model: PASS');
