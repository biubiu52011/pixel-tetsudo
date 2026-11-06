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
 const kosei=edge.slice(edge.indexOf('// Date-verified Kosei source-only'),edge.indexOf('// JR-West Kyoto/Kobe through corridor'));
 for(const t of [
  'published_jrwest_kosei_2611_clock_evidence',
  'JRWEST_KOSEI_2611_VERIFIED_CLOCK_COVERAGE_CHANGED',
  'JRWEST_KOSEI_2611_VERIFIED_CLOCK_SOURCE_CONFLICT',
  'run.canonical_group_evidence!=="source_only"',
  'run.train_number!==p.source_train_number',
  '![4,5,18,21,22].includes(stops.length)',
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
 const kosei=edge.slice(edge.indexOf('// Date-verified Kosei source-only'),
   edge.indexOf('// JR-West Kyoto/Kobe through corridor'));
 assert.ok(kosei.includes('new Set((clocks||[]).map((p:any)=>Number(p.source_template_id))).size!==26'));
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
 const block=edge.slice(edge.indexOf('// Thirty-one JR-West Kyoto/Kobe'),
  edge.indexOf('// Sotetsu-JR 2611:',edge.indexOf('// Thirty-one JR-West Kyoto/Kobe')));
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
 const kyoto=edge.slice(edge.indexOf('// Thirty-one JR-West Kyoto/Kobe'),
  edge.indexOf('// Sotetsu-JR 2611:'));
 assert.ok(kyoto.includes('const expected=selectedCalendar==="odpt.Calendar:Weekday"?15:16;'));
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
  edge.indexOf('// Thirty-one JR-West Kyoto/Kobe'));
 for(const term of [
   'official_calendar_conflict,official_calendar_urn,official_calendar_source_url',
   'JRWEST_KYOTO_KOBE_2611_CALENDAR_SOURCE_CONFLICT',
   'pub.official_calendar_conflict===true',
   'result.splice(i,1)',
   'new Set((clocks||[]).map'
 ].slice(0,4))assert.ok(block.includes(term),term);
 assert.ok(block.includes('result.splice(i,1)'));
});

test('third Kosei batch covers 18 inbound partial segments without route fabrication',()=>{
 const m=fs.readFileSync(
 'supabase/migrations/20261107140000_jrwest_kosei_2611_inbound_source_clocks.sql','utf8');
 const trains=['1831','1839','4838','4840','4842','4844','4846','4850','4852'];
 for(const n of trains){
   assert.ok(m.includes("('"+n+"M','Weekday'"),n+' weekday');
   assert.ok(m.includes("('"+n+"MH','SaturdayHoliday'"),n+' holiday');
 }
 for(const proof of [
  '6798790f9d2879210df3dd3125992403',
  '93194ebf85bccc91f2070688802464b7',
  'da4ad4d1415f776de485cc0020cc2669',
  '26bd08a53988af33551e1d96f2a81677',
  '097600c0fd28a383fa2814e697389371',
  'f808419411092e57610d0f5f1c61fb3e',
  '24af1d0a4db3fa25b0df49cbb6c87f2f',
  '31b61cc21dc673189495224d4851541f',
  '9ff2a3b5f0f7a43adb954d0a7ad8689a',
  '058694683e8e4ff06cc34ab4637a3b5b'
 ])assert.ok(m.includes(proof),proof);
 for(const proof of [
  "published_train_number IN('1831M','1839M','4838M'",
  "direction_urn='odpt.RailDirection:Inbound'",
  "stop_count IN(4,5,21,22)",
  "m.original_hash=e.expected_hash AND m.n=e.expected_count::integer",
  "<>52","<>26","<>18"
 ])assert.ok(m.includes(proof),proof);
 const block=edge.slice(edge.indexOf('// Date-verified Kosei'),
 edge.indexOf('// JR-West Kyoto/Kobe through corridor'));
 assert.ok(block.includes('size!==26'));
 assert.ok(block.includes('![4,5,18,21,22].includes(stops.length)'));
 assert.ok(!block.includes('run.vehicle_plan_confirmed=true'));
});
test('Kyoto/Kobe 8 additional local C sources retain dated clock and candidate boundaries',()=>{
 const m=fs.readFileSync(
 'supabase/migrations/20261107141000_jrwest_kyoto_kobe_2611_local_source_clocks.sql','utf8');
 for(const [num,hash] of [
  ['107C','93303216a8a3b9552e77c9919ec06ee9'],
  ['107C','502f60a48136c467675c2601318361c1'],
  ['150C','a4462fbc40fbd24b0fce2bbcba472f6d'],
  ['515C','7575e86816d8cbf88332fc98cabe6c6c'],
  ['221C','c284ad7a6fa6f9a896657e1ae47ce27a'],
  ['542C','c523722106e9f524dfc2dab94f3aa210']
 ])assert.ok(m.includes("'"+num+"'")&&m.includes("'"+hash+"'"),num);
 for(const proof of [
   "official_train_number~'^[0-9]{3,4}C$'",
   "official_stop_count IN(16,19,25,33)",
   "official_public_train_type='Local'",
   "m.source_path='data/timetables/TokaidoKansai-manual.js'",
   "AND f.authorizes_png=false",
   "<>17","<>8","<>10","<>7"
 ])assert.ok(m.includes(proof),proof);
 const block=edge.slice(edge.indexOf('// Thirty-one JR-West Kyoto/Kobe'),
 edge.indexOf('// Sotetsu-JR 2611:'));
 for(const proof of [
   'const expected=selectedCalendar==="odpt.Calendar:Weekday"?15:16;',
   'const certifiedType=p.train_type_urn==="odpt.TrainType:JR-West.Local"',
   '[16,19,25,32,33].includes(p.official_stop_count)',
   'stops.length!==p.official_stop_count',
   'run.published_train_type="odpt.TrainType:JR-West."+certifiedType',
   'p.actual_vehicle_confirmed!==false||p.authorizes_png!==false'
 ])assert.ok(block.includes(proof),proof);
 assert.ok(!block.includes('run.vehicle_plan_confirmed=true'));
 assert.ok(!block.includes('run.vehicle_artwork_path='));
});

test('four calendar-scoped and two weekday Kyoto-Kobe T rapid sources are fingerprint-gated',()=>{
 const mig=fs.readFileSync(
   'supabase/migrations/20261107142000_jrwest_kyoto_kobe_2611_rapid_t_source_clocks.sql','utf8');
 for(const [source,number,hash] of [
  ['500310-1385400-714T','714T','04eb3f4839da78231a2aefbe304b12e1'],
  ['500310-4345200-714T','714T','fc242a15daacee38ad6188cc5404e510'],
  ['500310-4345500-726T','726T','9bf30529c270016c4b63b0243e38b64c'],
  ['500300-1583900-733T','733T','2a801130cce5cddfb87140667f031276'],
  ['500300-1578700-767T','767T','d08c21bbc3939931f51c9a58bc5d7fb3'],
  ['500300-1090400-791T','791T','32606f1e87534d796a323a0d9475a06a']
 ]){
   assert.ok(mig.includes("'"+source+"'"),source+' source');
   assert.ok(mig.includes("'"+number+"'"),number+' published number');
   assert.ok(mig.includes("'"+hash+"'"),number+' exact clock fingerprint');
 }
 for(const token of [
  "official_train_number~'^[0-9]{3,4}T$'",
  "official_stop_count=18",
  "official_public_train_type='Rapid'",
  "AND f.authorizes_png=false",
  "verified_source_match)<>23",
  "official_public_train_type='Rapid')<>6"
 ])assert.ok(mig.includes(token),token);
 const from=edge.indexOf('// Thirty-one JR-West Kyoto/Kobe');
 const to=edge.indexOf('// Sotetsu-JR 2611:',from);
 assert.ok(from>=0&&to>from);
 const block=edge.slice(from,to);
 for(const token of [
  'const expected=selectedCalendar==="odpt.Calendar:Weekday"?15:16;',
  '?(/^[0-9]{3,4}T$/.test(p.official_train_number)?"Rapid":"SpecialRapid")',
  'certifiedType==="Rapid"?p.official_stop_count===18',
  '!/^(?:\\d{4}M|\\d{3,4}[CT])$/.test(p.official_train_number)',
  'stops.filter((st:any)=>st.arrival_time||st.departure_time).length!==p.official_stop_count',
  'p.authorizes_png!==false'
 ])assert.ok(block.includes(token),token);
 assert.ok(!block.includes('run.vehicle_plan_confirmed=true'));
 assert.ok(!block.includes('run.vehicle_artwork_path='));
});
test('Kyoto/Kobe Nov 2026 next 8 C/T verified sources retain original source identity',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261107143000_jrwest_kyoto_kobe_2611_more_local_rapid_verified.sql','utf8');
 const sourceChecks=[
  ['500310-1389200-172C','172C','SaturdayHoliday','247388c0a9ad74b5392f26cda63cf5a0'],
  ['500310-1389400-176C','176C','Weekday','778911d60d391e11923f083c5a1c3a4d'],
  ['500310-1390300-194C','194C','SaturdayHoliday','8047e472e8c0f7c4e8c7377dd1fa3ae1'],
  ['500310-920400-202C','202C','Weekday','d45cec4d0905ee63d2f0092ccb1e3bc8'],
  ['500310-217400-228C','228C','Weekday','68a315b65d00ee4e33a9910984d5fb82'],
  ['500310-4346500-810T','810T','SaturdayHoliday','940ffc5e81b927f1e9d02ffe6e070633'],
  ['500300-1385300-823T','823T','SaturdayHoliday','deab107fb7beadf6dbe65c20ca35aed5'],
  ['500300-4344000-835T','835T','SaturdayHoliday','a9ee44f9b5d4e1a0ba2b1485548004ca']
 ];
 for(const [source,number,calendar,hash] of sourceChecks){
  assert.ok(sql.includes("'"+source+"'"),source+' source');
  assert.ok(sql.includes("'"+number+"'"),number+' number');
  assert.ok(sql.includes("'"+calendar+"'"),number+' calendar');
  assert.ok(sql.includes("'"+hash+"'"),number+' stop hash');
 }
 for(const token of [
   "official_stop_count IN (16,19,25,32,33)",
   "official_train_number~'^[0-9]{3,4}T$'",
   "official_public_train_type='Rapid'",
   "p.source_md5=e.source_md5 AND p.stop_count=e.stop_count::integer",
   "f.official_train_number IS NULL AND NOT f.official_calendar_conflict",
   "verified_source_match)<>31",
   "official_public_train_type='Local')<>13",
   "official_public_train_type='Rapid')<>9",
   "official_public_train_type='SpecialRapid')<>9",
   "calendar_urn='odpt.Calendar:Weekday')<>15",
   "calendar_urn='odpt.Calendar:SaturdayHoliday')<>16",
   "official_calendar_conflict)<>2"
 ])assert.ok(sql.includes(token),token);
 const begin=edge.indexOf('// Thirty-one JR-West Kyoto/Kobe');
 const end=edge.indexOf('// Sotetsu-JR 2611:',begin);
 assert.ok(begin>=0 && end>begin);
 const kyoto=edge.slice(begin,end);
 for(const token of [
   'const expected=selectedCalendar==="odpt.Calendar:Weekday"?15:16;',
   '[16,19,25,32,33].includes(p.official_stop_count)',
   'p.actual_vehicle_confirmed!==false||p.authorizes_png!==false',
   'stops.length!==p.official_stop_count',
   'run.published_train_number=p.official_train_number'
 ])assert.ok(kyoto.includes(token),token);
 assert.ok(!kyoto.includes('run.vehicle_artwork_path='));
 assert.ok(!kyoto.includes('run.vehicle_plan_confirmed=true'));
});
