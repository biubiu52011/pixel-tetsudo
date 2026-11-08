'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261108233500_fukuchiyama_danbaro_eight_numbers_and_holiday_suspensions.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const more=fs.readFileSync('supabase/migrations/20261108234500_fukuchiyama_danbaro_four_more_numbers_calendar.sql','utf8');
const eight=[2751,2753,2765,2772,2777,2778,2779,2786];

test('eight JR-West 2611 verified Tambaji Rapid numbers correct only 16 historical source variants',()=>{
 for(const n of eight)assert.match(sql,new RegExp(String(n)));
 assert.match(sql,/source_template_id IN\(68099,68100,68107,68108,68141,68143,68299,68300,68176,68177,68310,68311,68184,68185,68322,68323\)/);
 assert.match(sql,/train_type_urn='odpt\.TrainType:JR-West\.Rapid'/);
 assert.match(sql,/published_jrwest_fukuchiyama_2611_source_fleet/);
 assert.match(sql,/<>15/);
 assert.match(sql,/<>16/);
 assert.match(sql,/<>254/);
 assert.doesNotMatch(sql,/\bINSERT INTO public\.manual_timetable_template_stops\b/);
 assert.doesNotMatch(sql,/\bUPDATE public\.train_timetable_stops\b/);
 assert.doesNotMatch(sql,/\bUPDATE public\.train_timetable_lines\b/);
});
test('2751MH and 2778MH are retained for audit but never projected as Saturday/Holiday service',()=>{
 assert.match(sql,/WHERE id IN\(68100,68311\)/);
 assert.match(sql,/SET operating_dates=ARRAY\[\]::date\[\]/);
 const a=edge.indexOf('// JR-West\'s published 2531M example is whitelisted');
 const b=edge.indexOf('// Kabe / 可部線',a);
 assert.ok(a>=0 && b>a);
 const filter=edge.slice(a,b);
 assert.match(filter,/const dated=Array\.isArray\(t\.operating_dates\)/);
 assert.match(filter,/t\.operating_dates\.some\(/);
 assert.match(filter,/String\(date\)\.slice\(0,10\)===serviceDate/);
 assert.doesNotMatch(filter,/const scopedExpress=/);
});
test('2779M and overnight 2783M on Nov 28 terminate at Shinmita, not the bus leg',()=>{
 const a=edge.indexOf('// JR-West 2026-11-28: both 2779M and 2783M');
 const b=edge.indexOf('// Incomplete source rows are preserved',a);
 assert.ok(a>=0 && b>a);
 const section=edge.slice(a,b);
 assert.match(section,/serviceDate==="2026-11-28"/);
 assert.match(section,/id:68185,number:"2779MH"/);
 assert.match(section,/id:68195,number:"2783MH"/);
 assert.match(section,/boundary:"00:15"/);
 assert.match(section,/end:"00:40"/);
 assert.match(section,/selectedCalendar!=="odpt.Calendar:SaturdayHoliday"/);
 assert.match(section,/run\.train_number!==notice\.number/);
 assert.match(section,/run\.stops\.length!==expected\.length/);
 assert.match(section,/run\.stops=run\.stops\.slice\(0,9\)/);
 assert.match(section,/run\.stops\[8\]\.departure_time=null/);
 assert.match(section,/run\.destination_station=run\.stops\[8\]\.station_urn/);
 assert.match(section,/run\.timetable_validity="partial_service_disruption"/);
 assert.match(section,/vehicle_plan_confirmed=false/);
 assert.match(section,/vehicle_artwork_path=null/);
 assert.doesNotMatch(section,/timetable_date_verified=true|actual_vehicle_confirmed=true/);
});

test('2759M daily and 2763M/2764M/2766M weekday-only source classifications match official November references',()=>{
 for(const id of [68123,68125,68133,68134,68285,68286,68287,68288])
   assert.ok(more.includes(String(id)),String(id));
 assert.match(more,/source_template_id IN\(68123,68125,68133,68134,68285,68286,68287,68288\)/);
 assert.match(more,/train_type_urn='odpt.TrainType:JR-West.Rapid'/);
 assert.match(more,/WHERE id IN\(68134,68286,68288\)/);
 assert.match(more,/operating_dates=ARRAY\[\]::date\[\]/);
 assert.match(more,/source_template_id IN\(68123,68125,68133,68134,68285,68286,68287,68288\)\)<>128/);
 assert.doesNotMatch(more,/\bINSERT INTO public\.manual_timetable_template_stops\b/);
 assert.doesNotMatch(more,/\bUPDATE public\.train_timetable_stops\b/);
});
