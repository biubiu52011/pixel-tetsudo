'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261108223000_fukuchiyama_northbound_2528_2532_official_samples.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const ids=[2611082528001,2611082528002,2611082532001,2611082532002];

test('northbound November samples use existing canonical SQL and keep historical fleet unchanged',()=>{
 assert.match(sql,/OVERRIDING SYSTEM VALUE/);
 for(const id of ids)assert.ok(sql.includes(String(id)),String(id));
 assert.match(sql,/INSERT INTO public\.manual_timetable_templates/);
 assert.match(sql,/INSERT INTO public\.manual_timetable_template_stops/);
 assert.match(sql,/INSERT INTO public\.train_timetables/);
 assert.match(sql,/INSERT INTO public\.train_timetable_members/);
 assert.match(sql,/source_only/);
 assert.match(sql,/<>387/);
 assert.match(sql,/<>357/);
 assert.match(sql,/cardinality\(operating_dates\)=30/);
 assert.match(sql,/2026-11-01/);
 assert.match(sql,/2026-11-30/);
 assert.doesNotMatch(sql,/\b(?:INSERT INTO|UPDATE) public\.train_timetable_stops/);
 assert.doesNotMatch(sql,/\bINSERT INTO public\.train_timetable_lines/);
});

test('each official source has 10 northbound stop clocks with no invented interpolation',()=>{
 for(const [number,start,end] of [['2528M','09:01','10:10'],['2532M','11:07','12:04']]){
   const matches=Array.from(sql.matchAll(new RegExp("\\('"+number+"',(\\d+),'([^']+)',(NULL|'[0-9:]+'),(NULL|'[0-9:]+')\\)",'g')));
   assert.equal(matches.length,10,number+' stop count');
   assert.deepEqual(matches.map(m=>Number(m[1])),[0,1,2,3,4,5,6,7,8,9]);
   assert.equal(matches[0][2],'Fukuchiyama');
   assert.equal(matches[9][2],'Shinoyamaguchi');
   assert.equal(matches[0][4],"'"+start+"'");
   assert.equal(matches[9][3],"'"+end+"'");
 }
});

test('runtime verifies only 2026-11 historical source matched numbered local samples',()=>{
 const b=edge.indexOf('// Exact November 2026 JR-West public timetable samples');
 const e=edge.indexOf('// Incomplete source rows are preserved',b);
 assert.ok(b>=0&&e>b,'scoped runtime code must exist');
 const proof=edge.slice(b,e);
 for(const id of ids)assert.ok(proof.includes(String(id)),String(id));
 assert.match(proof,/^\s*if\(lineId==="Fukuchiyama" && \/\^2026-11-/m);
 assert.match(proof,/run\.stops\.length!==10/);
 assert.match(proof,/sample\.number\.replace\(\/H\$\/,""\)/);
 assert.match(proof,/run\.timetable_date_verified=true/);
 assert.match(proof,/run\.vehicle_plan_confirmed=false/);
 assert.match(proof,/run\.vehicle_artwork_path=null/);
 assert.doesNotMatch(proof,/actual_vehicle_confirmed=true/);
});
