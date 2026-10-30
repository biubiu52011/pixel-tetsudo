'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
function migration(path){return fs.readFileSync('supabase/migrations/'+path+'.sql','utf8');}
const kyushu=migration('20261030115225_jr_kyushu_mixed_n700_800_service_plan_without_guess_20261030');
const sanyo=migration('20261030115316_official_sanyo_multiple_n700_variants_prevent_png_guess_20261030');
const plans=migration('20261030115351_join_official_service_runs_to_scoped_planned_vehicle_families_20261030');
const tokaido=migration('20261030115444_official_tokaido_n700_n700a_n700s_planned_candidates_20261030');
const nishi=migration('20261030114616_official_nishi_kyushu_n700s_scoped_planned_fleet_20261030');

assert.match(kyushu,/jrkyushu\.co\.jp\/railway\/ticket\/rule\/tokudai_baggage/);
assert.match(kyushu,/PLAN:KYUSHU-SAKURA-MIXED-FLEET/);
assert.match(kyushu,/PLAN:KYUSHU-TSUBAME-MIXED-FLEET/);
assert.match(kyushu,/JR九州800系/);
assert.match(kyushu,/ARRAY\['JR西日本N700系7000番台','JR九州N700系8000番台','JR九州800系'\]/);
assert.match(kyushu,/candidateLabelsAny/);
assert.match(kyushu,/planOnly/);
assert.match(sanyo,/smart-ex\.jp\/en\/beginner\/equipment\/n700/);
assert.match(sanyo,/PLAN:REMAIN-57/);
assert.match(sanyo,/N700A系/);
assert.match(sanyo,/N700S系/);
assert.match(tokaido,/PLAN:REMAIN-52/);
assert.match(tokaido,/N700A系/);
assert.match(tokaido,/N700S系/);
assert.match(nishi,/PLAN:NISHIKYUSHU-KAMOME-N700S/);
assert.match(nishi,/JR九州N700S系/);

assert.match(plans,/VIEW rail_audit\.official_train_run_planned_fleet/);
assert.match(plans,/official_train_run_service_crosswalk/);
assert.match(plans,/OFFICIAL_RUN_SERVICE_LINK/);
assert.match(plans,/candidateLabelsAny/);
assert.match(plans,/effective_from/);
assert.match(plans,/effective_to/);
assert.match(plans,/planOnly/);
assert.match(plans,/AMBIGUOUS_SCOPED_PLAN_RULES/);
assert.match(plans,/SCOPED_PLANNED_FLEET/);
assert.match(plans,/actual_vehicle_confirmed/);
assert.match(plans,/false AS actual_vehicle_confirmed/);
assert.match(plans,/NULL::text AS exact_png_path/);
assert.match(plans,/REVOKE ALL ON rail_audit\.official_train_run_planned_fleet/);
assert.doesNotMatch(plans,/\bUPDATE\s+public\.train_runs\b/i);
assert.doesNotMatch(plans,/\bINSERT\s+INTO\s+public\.train_timetable_vehicle_mappings\b/i);
for(const migrationSql of [kyushu,sanyo,tokaido,nishi]){
 assert.doesNotMatch(migrationSql,/\bUPDATE\s+public\.train_runs\b/i,
  'do not turn a planned candidate into a confirmed train run');
}
console.log('Official JR Kyushu/West/Central scoped model plan: PASS');
