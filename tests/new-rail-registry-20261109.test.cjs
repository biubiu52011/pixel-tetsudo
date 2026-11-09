'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync('supabase/queries/register_topology_only_lines_20261109.sql','utf8');
test('new registration is opt-in and has no inferred timetable or realtime feed',()=>{
 assert.match(sql,/INSERT INTO public\.railway_lines/);
 assert.match(sql,/ON CONFLICT \(id\) DO NOTHING/);
 for(const [id,operator]of Object.entries({
  Fujikyu:'FujisanrokuElectricRailway',Nikko:'JR-East',
  TohokuRifu:'JR-East',ChikuhiWest:'JR-Kyushu'
 })){
  assert.ok(sql.includes("('"+id+"','"+operator+"',false,false,false)"),id);
 }
 assert.ok(!/\bUPDATE\b|\bDELETE\b|\bTRUNCATE\b/i.test(sql));
});
