'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const sql=fs.readFileSync('supabase/migrations/20261111040000_tokaido_central_authorized_plan_import.sql','utf8');
const audit=fs.readFileSync('supabase/queries/tokaido_central_plan_status.sql','utf8');

test('JR-Central imported train plans use existing canonical SQL tables and not separate simulations',()=>{
 for(const table of ['manual_timetable_templates','manual_timetable_template_stops',
   'train_timetables','train_timetable_members','published_timetable_coverage_audit'])
   assert.ok(sql.includes('public.'+table),table);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.import_tokaido_central_authorized_plan/);
 assert.doesNotMatch(sql,/\bCREATE TABLE\b/i);
 assert.doesNotMatch(sql,/INSERT INTO public\.train_runs\b/i);
});

test('rights, calendar, precise stop clocks and physical station identities must be confirmed',()=>{
 for(const guard of ['JRC_PLAN_SOURCE_RIGHTS_UNVERIFIED','JRC_PLAN_EDITION_NOT_DATED',
  'JRC_PLAN_WRONG_STATION_ORDER','JRC_PLAN_UNKNOWN_STATION',
  'JRC_PLAN_INVALID_CLOCK','JRC_PLAN_CONFLICTING_TRAIN_DATES',
  'JRC_PLAN_SERVICE_CALENDAR_CONFLICT'])
   assert.ok(sql.includes(guard),guard);
 assert.match(sql,/authorization_evidence_url/);
 assert.match(sql,/TokaidoCentral/);
 assert.match(sql,/source_only/);
 assert.match(sql,/date_verified/);
 assert.match(sql,/coverage_status='sampled'/);
 assert.match(sql,/2026-11-03/);
 assert.match(sql,/2026-11-23/);
 assert.ok(audit.includes('published_timetable_full_day_acceptance'));
});
