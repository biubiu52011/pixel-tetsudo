'use strict';
// JR-West Kyoto/Kobe/Kosei: verified Nov-2026 evidence must not grant
// stock certainty, positions from number-only references, or phantom runs.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261107110000_jrwest_kosei_verified_clock_and_through_number_evidence.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const fleet=fs.readFileSync('supabase/migrations/20261107052500_jrwest_kosei_2611_source_fleet_candidates.sql','utf8');
test('eight source-clock fingerprints are calendar-specific and number-preserving',()=>{
 const rows=[
  ['1802M','Weekday','342a34ea099c46bd807ac3be32ddc04b'],
  ['1802MH','SaturdayHoliday','342a34ea099c46bd807ac3be32ddc04b'],
  ['1804M','Weekday','c9a68d9d017ef85ab3fc3a71a0f88cca'],
  ['1804MH','SaturdayHoliday','e62ee3438c828fd4d4283aa94eafe752'],
  ['1806M','Weekday','87258fe27f530047b175a6a9076abb6b'],
  ['1806MH','SaturdayHoliday','f5306e4437c987b915324df3cf6132dd'],
  ['1808M','Weekday','365f27c3b22992a487f453a121606d1a'],
  ['1808MH','SaturdayHoliday','a78e1bd3aaa3063b83602439deeab735']
 ];
 for(const [n,c,hash] of rows)
   assert.ok(sql.includes("('"+n+"','"+c+"','"+hash+"'"),n);
 assert.match(sql,/published_jrwest_kosei_2611_verified_source_clocks/);
 assert.match(sql,/published_jrwest_kosei_2611_clock_evidence/);
 assert.match(sql,/WITH \(security_invoker=true\)/);
 assert.match(sql,/s\.source_revision_date IS NULL/);
 assert.match(sql,/x\.actual_hash=p\.source_stops_md5/);
 assert.match(sql,/verified_source_match/);
 assert.match(sql,/<>8/);
 assert.match(sql,/source_train_number=published_train_number\|\|'H'/);
});
test('crossline public number changes remain non-positional',()=>{
 for(const [n,key] of [
  ['3479M','biwako-himeji-3479'],
  ['3107M','tsuruga-aboshi-3107-3507'],
  ['3507M','tsuruga-aboshi-3107-3507'],
  ['4006M','thunderbird-6']
 ])assert.ok(sql.includes("'"+n+"'")&&sql.includes("'"+key+"'"),n);
 for(const token of [
  'CHECK(NOT stop_clocks_verified)','CHECK(NOT actual_vehicle_confirmed)',
  'CHECK(NOT authorizes_png)','CHECK(NOT authorizes_position)',
  'published_jrwest_2611_crossline_number_reference'
 ])assert.ok(sql.includes(token),token);
});
test('the existing canonical SQL run owner exposes references separately and guards every clock',()=>{
 const kosei=edge.slice(edge.indexOf('// Date-verified Kosei published'),edge.indexOf('// JR-West Kyoto/Kobe through corridor'));
 for(const t of [
  'published_jrwest_kosei_2611_clock_evidence',
  'JRWEST_KOSEI_2611_VERIFIED_CLOCK_COVERAGE_CHANGED',
  'JRWEST_KOSEI_2611_VERIFIED_CLOCK_SOURCE_CONFLICT',
  'run.canonical_group_evidence!=="source_only"',
  'run.train_number!==p.source_train_number',
  'stops.length!==18',
  'run.published_train_number=p.published_train_number',
  'run.timetable_date_verified=true',
  'run.plan_source="official-2611-kosei-source-clock-verified"',
  'run.published_number_fleet_reference.stopClocksVerified=true'
 ])assert.ok(kosei.includes(t),t);
 assert.ok(edge.includes('jrwest_official_number_references: jrwestOfficialNumberReferences'));
 const refs=edge.slice(edge.indexOf('// Independently published through-service NUMBER evidence only.'));
 for(const t of ['authorizes_position!==false','authorizes_png!==false',
  'stop_clocks_verified!==false','continuation_key:p.continuous_service_key'])
   assert.ok(refs.includes(t),t);
 assert.ok(fleet.includes('authorizes_png boolean NOT NULL DEFAULT false'));
 assert.ok(!kosei.includes('run.vehicle_artwork_path='));
});
