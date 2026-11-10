'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const shared=fs.readFileSync('supabase/migrations/20261111100000_jr_central_shared_authorized_plan_import.sql','utf8');
const old=fs.readFileSync('supabase/migrations/20261111040000_tokaido_central_authorized_plan_import.sql','utf8');
const client=fs.readFileSync('data/api/odpt-unified.js','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');

test('One invoker-only JR Central importer supports exactly ChuoCentral and TokaidoCentral',()=>{
 assert.match(shared,/import_jr_central_authorized_plan\(p_line_key text, p_document jsonb\)/);
 assert.match(shared,/p_line_key NOT IN \('ChuoCentral','TokaidoCentral'\)/);
 assert.match(shared,/v_expected_count := CASE WHEN p_line_key='ChuoCentral' THEN 40 ELSE 84 END/);
 assert.match(shared,/v_railway_code := CASE WHEN p_line_key='ChuoCentral' THEN 'Chuo' ELSE 'Tokaido' END/);
 assert.match(shared,/LANGUAGE plpgsql SECURITY INVOKER/);
 assert.match(shared,/REVOKE ALL ON FUNCTION public\.import_jr_central_authorized_plan\(text,jsonb\)/);
 assert.match(shared,/REVOKE ALL ON FUNCTION public\.import_tokaido_central_authorized_plan\(jsonb\)/);
 assert.doesNotMatch(shared,/CREATE TABLE|INSERT INTO public\.train_runs/i);
 assert.match(shared,/\bSELECT \* FROM public\.import_jr_central_authorized_plan\('TokaidoCentral',p_document\)/);
 assert.match(old,/import_tokaido_central_authorized_plan/,'old migration remains reproducible');
});
test('canonical network, station, date and source-rights contract is SQL-first and client compatible',()=>{
 assert.match(shared,/odpt\.Railway:JR-Central\.'\|\|v_railway_code/);
 assert.match(shared,/odpt\.Station:JR-Central\.'\|\|v_railway_code\|\|'\.'/);
 for(const token of ['JRC_PLAN_SOURCE_RIGHTS_UNVERIFIED','JRC_PLAN_EDITION_NOT_DATED',
  'JRC_PLAN_SERVICE_CALENDAR_CONFLICT','JRC_PLAN_UNKNOWN_STATION',
  'JRC_PLAN_CONFLICTING_TRAIN_DATES','JRC_PLAN_CLOCK_REVERSAL',
  'coverage_status=\x27sampled\x27','train_timetable_members','manual_timetable_template_stops']){
    assert.ok(shared.includes(token.replace('\\x27',"'")),token);
 }
 assert.match(client,/"ChuoCentral": "Chuo"/);
 assert.match(client,/"TokaidoCentral": "Tokaido"/);
 assert.match(client,/"ChuoCentral": "JR-Central"/);
 assert.match(client,/"TokaidoCentral": "JR-Central"/);
 assert.match(edge,/\.eq\("line_key", lineId\)\.eq\("calendar_urn", calendar\)/);
});
