'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261111160000_jr_central_clear_stale_station_audit_flags.sql','utf8');
const audit=fs.readFileSync('supabase/queries/jr_central_all_lines_plan_status.sql','utf8');
test('clear obsolete JR Central station issue only after topology and geography precheck',()=>{
 assert.match(sql,/v_count<>11/);
 assert.match(sql,/data_kind='station_topology_only'/);
 assert.match(sql,/station\.id IS NULL/);
 assert.match(sql,/WHEN 'Sangu' THEN 10/);
 assert.match(sql,/array_remove\(c\.issues,'NO_STATION_REGISTRY'\)/);
 assert.match(sql,/JRC_STALE_STATION_AUDIT_VERIFY_FAILED/);
});
test('do not turn missing source trains into fake acceptance',()=>{
 assert.match(sql,/published_source_templates=0/);
 assert.match(sql,/raw_coverage_status='missing_all_plans'/);
 assert.match(sql,/acceptance_status='blocked_no_published_trains'/);
 assert.match(sql,/NOT a\.full_day_timetable_acceptance_passed/);
 assert.match(sql,/NO_PUBLISHED_SATURDAY_HOLIDAY_TRAIN_PLAN/);
 assert.doesNotMatch(sql,/INSERT INTO public\.manual_timetable_templates/);
 assert.doesNotMatch(sql,/SET\s+coverage_status\s*=/);
});
test('full-operator audit joins actual station, timetable, proof, vehicle owners',()=>{
 for(const name of ['railway_lines','stations','line_stations','manual_timetable_templates',
  'published_train_number_evidence','train_timetable_vehicle_mappings',
  'published_timetable_full_day_acceptance','line_data_inventory'])assert.ok(audit.includes(name),name);
 assert.match(audit,/l\.timetable_operator='JR-Central'/);
 assert.match(audit,/actual_vehicle_confirmed_rows/);
 assert.match(audit,/all_stations_geocoded/);
 assert.match(audit,/full_day_timetable_acceptance_passed/);
 assert.doesNotMatch(audit,/\b(?:INSERT|UPDATE|DELETE|CREATE|DROP)\s+(?:INTO|TABLE|FROM|public)/i);
});
