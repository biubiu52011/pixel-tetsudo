'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261108221000_fukuchiyama_november_2531m_official_sample_and_2774m_type.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');

test('2531M and 2531MH reuse canonical one-stop sources and complete the full ten northern stops',()=>{
 assert.match(sql,/id IN\(68234,68235\)/);
 assert.match(sql,/train_timetable_members/);
 assert.match(sql,/last_stop_sequence=9/);
 for(const stop of ['Tamba-Oyama','Shimotaki','Tanigawa','Kaibara-Hyogo',
 'Iso-Tamba','Kuroi-Tamba','Ichijima','Tamba-Takeda','Fukuchiyama']){
   assert.ok(sql.includes("'"+stop+"'"),stop);
 }
 assert.match(edge,/08:37/);
 assert.match(sql,/09:29/);
 assert.match(sql,/official-sampled:fukuchiyama:2611:2531M/);
 assert.match(sql,/2026-11-01/);
 assert.match(sql,/2026-11-30/);
 assert.match(sql,/source_template_id IN\(68234,68235\)\)<>0/);
 assert.doesNotMatch(sql,/(?:INSERT INTO|UPDATE) public\.train_timetable_stops\b/);
 assert.doesNotMatch(sql,/(?:INSERT INTO|UPDATE) public\.train_timetables\b/);
});

test('source sample is date-filtered and never upgrades fleet confirmation',()=>{
 const start=edge.indexOf('// JR-West\'s published 2531M example is whitelisted');
 const end=edge.indexOf('// Kabe / 可部線:',start);
 assert.ok(start>=0&&end>start);
 const scoped=edge.slice(start,end);
 assert.match(scoped,/lineId==="Fukuchiyama"/);
 assert.match(scoped,/official-sampled:fukuchiyama:/);
 assert.match(scoped,/operating_dates/);
 assert.match(scoped,/===serviceDate/);
 const begin=edge.indexOf('// Exact-date train NUMBER and 10-stop proof');
 const finish=edge.indexOf('// Incomplete source rows are preserved',begin);
 assert.ok(begin>=0&&finish>begin);
 const proof=edge.slice(begin,finish);
 assert.match(proof,/2026-11-\\d\{2\}/);
 assert.match(proof,/officialId=selectedCalendar/);
 assert.match(proof,/68234:68235/);
 assert.match(proof,/stops\.length!==10/);
 assert.match(proof,/date_verified/);
 assert.match(proof,/vehicle_plan_confirmed=false/);
 assert.match(proof,/vehicle_artwork_path=null/);
 assert.doesNotMatch(proof,/actual_vehicle_confirmed\s*=\s*true/);
});

test('weekday 2774M type correction is synchronized with historical SQL proof',()=>{
 assert.match(sql,/id=68301/);
 assert.match(sql,/SET train_type_urn='odpt\.TrainType:JR-West\.Rapid'/);
 assert.match(sql,/source_template_id=68301/);
 assert.match(sql,/published_jrwest_fukuchiyama_2611_source_fleet/);
 assert.match(sql,/<>357/);
});
