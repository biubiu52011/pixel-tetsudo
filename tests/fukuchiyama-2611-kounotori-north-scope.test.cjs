'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261108224000_fukuchiyama_kounotori_3008_3010_correct_type_north_stops.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const ids=[68244,68245,68251,68252];

test('Kounotori 8 and 10 repair only the four preexisting wrong Local sources',()=>{
 assert.match(sql,/WHERE id IN\(68244,68245,68251,68252\)/);
 assert.match(sql,/train_type_urn='odpt.TrainType:JR-West.LimitedExpress'/);
 assert.match(sql,/published_jrwest_fukuchiyama_2611_source_fleet/);
 assert.match(sql,/candidate_models=ARRAY\['287系','289系'\]::text\[\]/);
 assert.match(sql,/source_template_id NOT IN\(68244,68245,68251,68252\)/);
 assert.match(sql,/source_stop_count/);
 assert.match(sql,/last_stop_sequence/);
 assert.match(sql,/<>387/);
 assert.match(sql,/<>357/);
 assert.match(sql,/source_timed_stop_count/);
 assert.doesNotMatch(sql,/\bINSERT INTO public\.train_timetables/);
 assert.doesNotMatch(sql,/\bUPDATE public\.train_timetable_stops/);
});
test('reused northern express samples preserve the four southern calls and add the real northern ones',()=>{
 for(const [no,expectedCount,firstClock,lastKey] of [
  ['3008M',5,'08:40','Shinoyamaguchi'],
  ['3010M',3,'09:50','Shinoyamaguchi']]){
  const lines=Array.from(sql.matchAll(new RegExp("\\('"+no+"',(\\d+),'([^']+)',(NULL|'[0-9:]+'),(NULL|'[0-9:]+')\\)",'g')));
  assert.equal(lines.length,expectedCount,no);
  assert.equal(lines[0][2],'Fukuchiyama');
  assert.equal(lines[0][4],"'"+firstClock+"'");
  assert.equal(lines[lines.length-1][2],lastKey);
 }
 for(const id of ids)assert.ok(sql.includes(String(id)));
 assert.match(sql,/stop_sequence=stop_sequence\+10/);
 assert.match(sql,/stop_sequence=stop_sequence-CASE/);
 assert.match(sql,/stop_sequence BETWEEN 10 AND 13/);
 assert.match(edge,/p\.candidate_png_paths\.length!==0/);
 assert.match(sql,/authorizes_png OR actual_vehicle_confirmed OR number_date_verified/);
});
test('API keeps old historical proof working before migration, verifies only November 2026 express segment after',()=>{
 assert.match(edge,/The historical 30xx \/ seasonal 70xx sources are Kounotori/);
 assert.match(edge,/\? "287系\|289系" : acceptedModels/);
 assert.match(edge,/const scopedExpress= \/\^\(30\|70\)/);
 const start=edge.indexOf('// Kounotori 8/10:');
 const end=edge.indexOf('// Incomplete source rows are preserved',start);
 assert.ok(start>=0&&end>start);
 const section=edge.slice(start,end);
 assert.match(section,/run\.stops\.length!==4/);
 assert.match(section,/run\.stops\.length!==sample\.keys\.length/);
 assert.match(section,/run\.train_type!=="odpt.TrainType:JR-West.LimitedExpress"/);
 assert.match(section,/run\.vehicle_type_candidates!=="287系 \/ 289系"/);
 assert.match(section,/run\.timetable_date_verified=true/);
 assert.match(section,/vehicle_plan_confirmed=false/);
 assert.match(section,/vehicle_artwork_path=null/);
 assert.doesNotMatch(section,/authorizes_png=true|actual_vehicle_confirmed=true/);
});
