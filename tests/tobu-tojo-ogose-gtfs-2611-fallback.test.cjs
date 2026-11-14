'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sha='bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';
const migration=fs.readFileSync('supabase/migrations/20261114232000_tobu_tojo_ogose_tokyogtfs_2611_plan_fallback.sql','utf8');
const audit=fs.readFileSync('supabase/migrations/20261114234500_tobu_tojo_ogose_2611_coverage_and_tjliner.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const runtime=fs.readFileSync('data/core/runtime-config.js','utf8');
const bundle=fs.readFileSync('data/core/data-config-bundle.js','utf8');
const d=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const compact=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));

test('Tojo/Ogose GTFS source-only plans retain trip and stop integrity checks',()=>{
  assert.ok(migration.includes(sha));
  assert.match(migration,/\('Tojo','Tobu\.Tojo',1760,933,827,24064,39,33\)/);
  assert.match(migration,/\('Ogose','Tobu\.Ogose',290,146,144,2320,8,8\)/);
  assert.match(migration,/staged_stop_time_count=279607/);
  assert.match(migration,/source_only','undated_not_current_verified'/);
  assert.match(migration,/vehicle_type_label,source_path/);
  assert.match(migration,/NULL::text,v_source/);
  assert.match(migration,/sql_planned_fallback_enabled=true/);
  assert.match(migration,/tobu_tokyogtfs_active_trip_ids/);
  assert.match(migration,/REVOKE ALL ON FUNCTION public\.tobu_tokyogtfs_active_trip_ids/);
  assert.match(audit,/coverage_status = 'unverified'/);
});

test('Existing train-runs service gates Tojo and Ogose by checksum and active service day',()=>{
  assert.match(edge,/Tojo: "Tobu\.Tojo\."/);
  assert.match(edge,/Ogose: "Tobu\.Ogose\."/);
  assert.match(edge,/tobu_tokyogtfs_active_trip_ids/);
  assert.match(edge,/tobuGtfsActiveTripIds\?\.has\(String\(t\.source_trip_id\)\)/);
  assert.match(edge,/TOBU_GTFS_DATE_SCOPE_UNAVAILABLE/);
  assert.match(migration,/WHEN 'Tojo' THEN 'Tobu\.Tojo'/);
  assert.match(migration,/WHEN 'Ogose' THEN 'Tobu\.Ogose'/);
});

test('Ogose Kawakado is resolved on its own railway without global station changes',()=>{
  for(const source of [runtime,bundle])
    assert.match(source,/"Ogose": \{ "Kawakado": "Kawa_kaku" \}/);
  assert.deepEqual(d.lines.Ogose.stations,[
    'Sakado','Ippommatsu','Nishi-Oya','Kawa_kaku',
    'Bushu-Nagase','Higashi_Moro','Bushu-Karasawa','Ogose'
  ]);
});

test('All 45 published GTFS-derived local station intervals replace two-minute placeholders',()=>{
  for(const [id,length] of [['Tojo',38],['Ogose',7]]){
    const line=d.lines[id];
    assert.equal(line.durations.length,length);
    assert.ok(line.durations.every(n=>Number.isInteger(n)&&n>=1&&n<=10));
    assert.ok(line.durations.some(n=>n!==2));
    assert.equal(line.durationDerivation.feed_sha,sha);
    assert.match(line.durationDerivation.method,/representative only/);
    assert.ok(line.durationDerivation.minimumSamples>=150);
    assert.deepEqual(compact.lines[id].durations,line.durations);
  }
  assert.equal(d.lines.Tojo.durations[31],7);
  assert.equal(d.lines.Ogose.durations[0],4);
  const file=fs.readFileSync('data/core/railway-data.file.js','utf8');
  assert.equal(file,'window.RAILWAY_DATA = '+JSON.stringify(compact).replace(/<\/script/gi,'<\\/script')+';\n');
});
