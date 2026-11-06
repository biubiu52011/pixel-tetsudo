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
  '![18,21].includes(stops.length)',
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

test('second Kosei expansion is 26 exact original-source proofs, 17 per calendar',()=>{
 const extra=fs.readFileSync(
  'supabase/migrations/20261107123000_jrwest_kosei_2611_expand_verified_source_clocks.sql','utf8');
 const numbers=['1810','1812','1814','1816','1818','1820','1824',
   '1826','1828','1830','1832','1834','1836'];
 for(const n of numbers){
  assert.ok(extra.includes("('"+n+"M','Weekday'"),n+' weekday');
  assert.ok(extra.includes("('"+n+"MH','SaturdayHoliday'"),n+' holiday');
 }
 assert.ok(extra.includes("'931de61b84f4752e4e0d91fe37fb6c2e'"));
 assert.ok(extra.includes("'6eeadbaa57e1dd0345f0e89f0f12dd5b'"));
 assert.ok(extra.includes("'2e0c7ef96d3f3a56998912d966881f53'"));
 assert.ok(extra.includes("'9f1d589121b4ccac67b129b5d860b5c6'"));
 for(const t of ['m.actual_hash=e.expected_hash','m.n=e.expected_count::integer',
  'stop_count IN(18,21)','<>34','<>17',
  'published_jrwest_kosei_2611_clock_evidence'])
   assert.ok(extra.includes(t),t);
 const kosei=edge.slice(edge.indexOf('// Date-verified Kosei published'),
   edge.indexOf('// JR-West Kyoto/Kobe through corridor'));
 assert.ok(kosei.includes('new Set((clocks||[]).map((p:any)=>Number(p.source_template_id))).size!==17'));
 assert.ok(kosei.includes('run.train_number_verification="official-2611-kosei-source-stop-clock"'));
 assert.ok(!kosei.includes('run.vehicle_plan_confirmed=true'));
});
test('five Kyoto/Kobe new-rapid original segments certified; vehicles still unverified',()=>{
 const extra=fs.readFileSync(
 'supabase/migrations/20261107124500_jrwest_kyoto_kobe_2611_five_verified_source_clocks.sql','utf8');
 for(const [n,sha] of [
  ['3447M','cb52493b61c4157550a216b7dddcff11'],
  ['3465M','f46e2b48b71ac3d9ddb55cf758aae710'],
  ['3473M','eb57680addd7e6b863112898faf103fc'],
  ['3472M','2b6d07c81663d5eef6b584268adfe07a'],
  ['3530M','63dc6bc136c50a59e312fbe049e86952']
 ])assert.ok(extra.includes("'"+n+"'")&&extra.includes("'"+sha+"'"),n);
 for(const t of [
  'published_jrwest_kyoto_kobe_2611_clock_evidence',
  'WITH (security_invoker=true)',
  'x.n=f.official_stop_count AND x.md5=f.official_stop_md5',
  "official_public_train_type='SpecialRapid'",
  'actual_vehicle_confirmed=false AND authorizes_png=false',
  '<>5'
 ])assert.ok(extra.includes(t),t);
 const block=edge.slice(edge.indexOf('// Five JR-West Kyoto/Kobe'),
  edge.indexOf('// Sotetsu-JR 2611:',edge.indexOf('// Five JR-West Kyoto/Kobe')));
 for(const t of [
  'JRWEST_KYOTO_KOBE_2611_CLOCK_PROOF_COVERAGE_CHANGED',
  'JRWEST_KYOTO_KOBE_2611_CLOCK_PROOF_CONFLICT',
  'run.published_train_number=p.official_train_number',
  'run.timetable_date_verified=true',
  'candidate.stopClocksVerified=true',
  'p.actual_vehicle_confirmed!==false',
  'p.authorizes_png!==false',
 ])assert.ok(block.includes(t),t);
 assert.ok(!block.includes('run.vehicle_plan_confirmed=true'));
});
test('frontend keeps historical matching IDs separate from display numbers',()=>{
 const api=fs.readFileSync('data/api/odpt-unified.js','utf8');
 const position=fs.readFileSync('js/train-position-estimator.js','utf8');
 assert.ok(api.includes('"_sqlPublishedTrainNumber":run.timetable_date_verified===true'));
 assert.ok(position.includes('displayTrainNumber:tt._positionSource==="supabase-train-run"'));
 assert.ok(position.includes('official-2611-kosei-source-stop-clock'));
 assert.ok(position.includes('official-2611-kyoto-kobe-source-stop-clock'));
 assert.ok(position.includes('String(officialJrWestKyotoKobePlan.historicalNumberSuffix||"")'));
});

test('four additional Kyoto-Kobe 7-stop sources join the same evidence owner',()=>{
 const extra=fs.readFileSync(
  'supabase/migrations/20261107132000_jrwest_kyoto_kobe_verified_nine_and_calendar_conflicts.sql','utf8');
 for(const [number,sha] of [
  ['3452M','42dd7ceca39477f45a225667080ce7c4'],
  ['3511M','5250588962676ec65abce5c820392670'],
  ['3531M','19b19128d6e8735923e3ff33b7d7bc6f'],
  ['3534M','7b558daa85869d18842cb1e21289e48c']
 ]){
  assert.ok(extra.includes("'"+number+"'"),number+' source');
  assert.ok(extra.includes("'"+sha+"'"),number+' station clocks');
 }
 assert.ok(extra.includes('published_jrwest_kyoto_kobe_2611_source_fleet'));
 assert.ok(extra.includes('published_jrwest_kyoto_kobe_2611_clock_evidence'));
 assert.ok(extra.includes('h.n=7 AND h.original_hash=e.expected_hash'));
 assert.ok(extra.includes('<>9'));
 const kyoto=edge.slice(edge.indexOf('// Nine JR-West Kyoto/Kobe'),
  edge.indexOf('// Sotetsu-JR 2611:'));
 assert.ok(kyoto.includes('const expected=selectedCalendar==="odpt.Calendar:Weekday"?6:3;'));
 assert.ok(kyoto.includes('run.published_train_number=p.official_train_number;'));
 assert.ok(kyoto.includes('run.timetable_date_verified=true;'));
});
test('two mismatched legacy calendars cannot create phantom Kyoto-Kobe trains',()=>{
 const sql=fs.readFileSync(
  'supabase/migrations/20261107132000_jrwest_kyoto_kobe_verified_nine_and_calendar_conflicts.sql','utf8');
 for(const [legacy,correct] of [
  ['500310-3536200-3450M','odpt.Calendar:Weekday'],
  ['500310-1866500-3506M','odpt.Calendar:SaturdayHoliday']
 ]){
  assert.ok(sql.includes("'"+legacy+"'"),legacy);
  assert.ok(sql.includes("'"+correct+"'"),correct);
 }
 assert.ok(sql.includes('official_calendar_conflict boolean NOT NULL DEFAULT false'));
 assert.ok(sql.includes('official_calendar_urn<>calendar_urn'));
 assert.ok(sql.includes('official_train_number IS NULL AND authorizes_png=false'));
 assert.ok(sql.includes('official_calendar_conflict)<>2'));
 const block=edge.slice(edge.indexOf('// JR-West Kyoto/Kobe through corridor'),
  edge.indexOf('// Nine JR-West Kyoto/Kobe'));
 for(const term of [
   'official_calendar_conflict,official_calendar_urn,official_calendar_source_url',
   'JRWEST_KYOTO_KOBE_2611_CALENDAR_SOURCE_CONFLICT',
   'pub.official_calendar_conflict===true',
   'result.splice(i,1)',
   'new Set((clocks||[]).map'
 ].slice(0,4))assert.ok(block.includes(term),term);
 assert.ok(block.includes('result.splice(i,1)'));
});
