'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const sql=fs.readFileSync('supabase/migrations/20261128074912_tokyogtfs_shared_date_scope_keio_p0.sql','utf8');
const acl=fs.readFileSync('supabase/migrations/20261128074950_tokyogtfs_shared_date_scope_private_stage_privileges.sql','utf8');
test('Keio and Tobu use one exact feed/date/route gate, not realtime evidence',()=>{
 for(const [key,route] of [['KeioMain','Keio.Keio'],['KeioInokashira','Keio.Inokashira'],['KeioTakao','Keio.Takao'],['Tojo','Tobu.Tojo'],['Noda','Tobu.TobuUrbanPark']]){
  assert.ok(edge.includes(key+': "'+route+'."'));
  assert.ok(sql.includes("WHEN '"+key+"' THEN '"+route+"'"));
 }
 assert.ok(edge.includes('db.rpc("tokyogtfs_active_trip_ids"'));
 assert.ok(edge.includes('t.source_path === tokyoGtfsSource'));
 assert.ok(edge.includes('tokyoGtfsActiveTripIds?.has(String(t.source_trip_id))'));
 assert.ok(sql.includes('Keio.Takao.Meidaimae'));
 assert.ok(sql.includes('p_service_date BETWEEN f.service_start AND f.service_end'));
 assert.ok(acl.includes('FROM PUBLIC,anon,authenticated'));
 assert.ok(acl.includes('TO service_role'));
 assert.ok(!sql.includes('UPDATE public.railway_lines'));
});
