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
  '![4,5,7,13,18,21,22].includes(stops.length)',
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
 assert.ok(kosei.includes('new Set((clocks||[]).map((p:any)=>Number(p.source_template_id))).size!==expectedCount'));
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
 const block=edge.slice(edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo'),
  edge.indexOf('// Sotetsu-JR 2611:',edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo')));
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
 assert.ok(position.includes('displayTrainNumber:osakaMahorobaDisplayNumber || osakaHigashiDisplayNumber || saganoDisplayNumber || (tt._positionSource==="supabase-train-run"&&'));
 assert.ok(position.includes('tt._timetableDateVerified===true&&'));
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
 const kyoto=edge.slice(edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo'),
  edge.indexOf('// Sotetsu-JR 2611:'));
 assert.ok(kyoto.includes('    :(selectedCalendar==="odpt.Calendar:Weekday"?15:16);'));
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
  edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo'));
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
 assert.ok(block.includes('size!==expectedCount'));
 assert.ok(block.includes('![4,5,7,13,18,21,22].includes(stops.length)'));
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
 const block=edge.slice(edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo'),
 edge.indexOf('// Sotetsu-JR 2611:'));
 for(const proof of [
   '    :(selectedCalendar==="odpt.Calendar:Weekday"?15:16);',
   'const certifiedType=p.train_type_urn==="odpt.TrainType:JR-West.Local"',
   '[5,11]:[16,19,25,32,33]).includes(p.official_stop_count)',
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
 const from=edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo');
 const to=edge.indexOf('// Sotetsu-JR 2611:',from);
 assert.ok(from>=0&&to>from);
 const block=edge.slice(from,to);
 for(const token of [
  '    :(selectedCalendar==="odpt.Calendar:Weekday"?15:16);',
  '/^[0-9]{3,4}T$/.test(p.official_train_number)',
  'p.official_stop_count===18)',
  '!/^(?:\\d{3,4}M|\\d{3,4}[CT])$/.test(p.official_train_number)',
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
 const begin=edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo');
 const end=edge.indexOf('// Sotetsu-JR 2611:',begin);
 assert.ok(begin>=0 && end>begin);
 const kyoto=edge.slice(begin,end);
 for(const token of [
   '    :(selectedCalendar==="odpt.Calendar:Weekday"?15:16);',
   '[5,11]:[16,19,25,32,33]).includes(p.official_stop_count)',
   'p.actual_vehicle_confirmed!==false||p.authorizes_png!==false',
   'stops.length!==p.official_stop_count',
   'run.published_train_number=p.official_train_number'
 ])assert.ok(kyoto.includes(token),token);
 assert.ok(!kyoto.includes('run.vehicle_artwork_path='));
 assert.ok(!kyoto.includes('run.vehicle_plan_confirmed=true'));
});

test('four JR Kobe Line western SanyoMain C source clocks use one evidence view',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261107144000_jrwest_kobe_sanyo_2611_four_verified_local_sources.sql','utf8');
 const verified=[
  ['710100-1096200-173C','173C','Weekday','ae9c0698577116c22cc407174b362d8e'],
  ['710100-194000-209C','209C','Weekday','c3170655bb21b99b1594c87f0dde4efd'],
  ['710100-198700-217C','217C','SaturdayHoliday','2d877ffb38d617c2547e164b90dc814c'],
  ['710100-236600-241C','241C','Weekday','b9c0191b644b8c6e02a5b26281066df8']
 ];
 for(const [source,number,calendar,checksum] of verified){
  assert.ok(sql.includes("'"+source+"'"),source);
  assert.ok(sql.includes("'"+number+"'"),number);
  assert.ok(sql.includes("'"+calendar+"'"),calendar);
  assert.ok(sql.includes("'"+checksum+"'"),checksum);
 }
 for(const evidence of [
  "source_line_key='SanyoMain'",
  "official_stop_count IN (5,11)",
  "m.line_key=f.source_line_key",
  "m.source_path='data/timetables/'||f.source_line_key||'-manual.js'",
  "WITH (security_invoker=true)",
  "p.original_hash=e.expected_hash AND p.stop_count=e.expected_count::integer",
  "source_line_key='SanyoMain')<>4",
  "source_line_key='SanyoMain' AND calendar_urn='odpt.Calendar:Weekday')<>3",
  "source_line_key='TokaidoKansai')<>31",
  "source_public_number_suffix='741T'",
  "official_train_number IS NOT NULL",
  "WHERE verified_source_match)<>35",
 ])assert.ok(sql.includes(evidence),evidence);
 const start=edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo');
 const end=edge.indexOf('// Sotetsu-JR 2611:',start);
 assert.ok(start>=0&&end>start);
 const b=edge.slice(start,end);
 for(const evidence of [
  '(lineId==="TokaidoKansai"||lineId==="SanyoMain")',
  '.eq("source_line_key",lineId)',
  'const expected=lineId==="SanyoMain"',
  'selectedCalendar==="odpt.Calendar:Weekday"?8:6',
  'selectedCalendar==="odpt.Calendar:Weekday"?15:16',
  '(lineId==="SanyoMain"?[5,11]:[16,19,25,32,33]).includes',
  'p.source_line_key!==lineId',
  'run.network_key!=="odpt.Railway:JR-West."+lineId',
  'p.actual_vehicle_confirmed!==false||p.authorizes_png!==false'
 ])assert.ok(b.includes(evidence),evidence);
 assert.ok(!b.includes('run.vehicle_artwork_path='));
 assert.ok(!b.includes('run.vehicle_plan_confirmed=true'));
});

test('six more Kobe-west source C trains remain calendar-specific, not assigned stock',()=>{
 const sql=fs.readFileSync(
  'supabase/migrations/20261107145000_jrwest_kobe_sanyo_2611_six_local_source_clocks.sql','utf8');
 const proofs=[
  ['153C','Weekday','80c8f3849686fd9d7bae2b2d8a588bf0'],
  ['189C','Weekday','333ff3c1a8e220566b3bb6ca10003d44'],
  ['191C','Weekday','ec682bdac64b4ee3d83e37a0df182e67'],
  ['4631C','SaturdayHoliday','e133d01aa1ae9b60ef49a0872fb45deb'],
  ['4693C','Weekday','a19292666edcfdb70843954de995c403'],
  ['4729C','SaturdayHoliday','9cf18d56cd53d42d9f6d7f1ed5f6cb8d']
 ];
 for(const [number,day,hash] of proofs){
   assert.ok(sql.includes("'"+number+"'"),number);
   assert.ok(sql.includes("'"+day+"'"),number+' calendar');
   assert.ok(sql.includes("'"+hash+"'"),number+' clock hash');
 }
 for(const token of [
   'official_stop_count IN (5,11)',
   "source_line_key='SanyoMain'",
   'm.source_revision_date IS NULL',
   'p.original_hash=e.expected_hash AND p.stop_count=e.expected_count::integer',
   'f.actual_vehicle_confirmed=false',
   'f.authorizes_png=false',
   'WHERE verified_source_match)<>41',
   "source_line_key='SanyoMain')<>10",
   "source_line_key='SanyoMain'\n AND calendar_urn='odpt.Calendar:Weekday')<>7",
   "source_line_key='SanyoMain'\n AND calendar_urn='odpt.Calendar:SaturdayHoliday')<>3"
 ])assert.ok(sql.includes(token),token);
 const start=edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo');
 const end=edge.indexOf('// Sotetsu-JR 2611:',start);
 assert.ok(start>=0&&end>start);
 const js=edge.slice(start,end);
 assert.ok(js.includes('selectedCalendar==="odpt.Calendar:Weekday"?8:6'));
 assert.ok(js.includes('.eq("source_line_key",lineId)'));
 assert.ok(js.includes('p.official_public_train_type!==certifiedType'));
 assert.ok(js.includes('p.authorizes_png!==false'));
 assert.ok(!js.includes('run.vehicle_artwork_path='));
});

test('Kobe west special-rapid M and rapid M/T use public type, NOT numeric suffix inference',()=>{
 const mig=fs.readFileSync(
  'supabase/migrations/20261107150000_jrwest_kobe_sanyo_2611_newrapid_rapid_source_clocks.sql','utf8');
 const verified=[
  ['3425M','SaturdayHoliday','SpecialRapid','6da66223748ed24c4040f4e3972d2ea0'],
  ['3469M','SaturdayHoliday','SpecialRapid','9cdab3bc6046275a84d1dd431a901e39'],
  ['717M','Weekday','Rapid','29dd3c384fafce9d4d098c178f4246f0'],
  ['815T','SaturdayHoliday','Rapid','591f810e65dfe14b3cbddf1dcbc8766c']
 ];
 for(const [number,calendar,type,hash] of verified){
  assert.ok(mig.includes("'"+number+"'"),number);
  assert.ok(mig.includes("'"+calendar+"'"),calendar);
  assert.ok(mig.includes("'"+type+"'"),type);
  assert.ok(mig.includes("'"+hash+"'"),hash);
 }
 for(const term of [
  "official_train_number IN ('3425M','3469M')",
  "official_train_number='717M'",
  "official_train_number='815T'",
  "official_stop_count=4",
  "official_stop_count=17",
  "m.source_revision_date IS NULL",
  "p.original_hash=e.expected_hash AND p.stop_count=e.expected_count::integer",
  "WHERE verified_source_match)<>45",
  "source_line_key='SanyoMain')<>14",
  "official_public_train_type='SpecialRapid')<>2",
  "official_public_train_type='Rapid')<>2",
  "WHERE actual_vehicle_confirmed OR authorizes_png"
 ])assert.ok(mig.includes(term),term);
 const i=edge.indexOf('// Forty-five JR-West Kyoto/Kobe/Sanyo');
 const end=edge.indexOf('// Sotetsu-JR 2611:',i);
 assert.ok(i>=0&&end>i);
 const edgeBlock=edge.slice(i,end);
 for(const term of [
  'selectedCalendar==="odpt.Calendar:Weekday"?8:6',
  'lineId==="SanyoMain"&&p.official_train_number==="717M"',
  '(["717M","815T"].includes(p.official_train_number)&&p.official_stop_count===17)',
  'p.official_stop_count===(lineId==="SanyoMain"?4:7)',
  'certifiedType==="Rapid"&&lineId==="SanyoMain"',
  'p.official_public_train_type!==certifiedType',
  'p.actual_vehicle_confirmed!==false||p.authorizes_png!==false'
 ])assert.ok(edgeBlock.includes(term),term);
 assert.ok(!edgeBlock.includes('run.vehicle_artwork_path='));
 assert.ok(!edgeBlock.includes('run.vehicle_plan_confirmed=true'));
});

test('4848M November source 4-stop Kosei clock is valid for BOTH calendars',()=>{
 const mig=fs.readFileSync(
  'supabase/migrations/20261107151000_jrwest_kosei_2611_4848m_official_source_clock.sql','utf8');
 for(const token of [
  "('4848M','odpt.Calendar:Weekday')",
  "('4848MH','odpt.Calendar:SaturdayHoliday')",
  "published_train_number IN('1831M','1839M','4838M','4840M','4842M'",
  "'4846M','4848M','4850M','4852M'",
  "c.source_md5='6ededc46e407290c7127e092f77dc717'",
  "https://timetable.jr-odekake.net/train-timetable/96861?date=20261026",
  "m.source_revision_date IS NULL AND m.source_occurrence=0",
  "c.stop_count=4",
  "WHERE verified_source_match)<>54",
  "calendar_urn='odpt.Calendar:Weekday')<>27",
  "calendar_urn='odpt.Calendar:SaturdayHoliday')<>27",
  "WHERE published_train_number='4848M')<>2"
 ])assert.ok(mig.includes(token),token);
 const kosei=edge.slice(edge.indexOf('// Date-verified Kosei source-only'),
  edge.indexOf('// JR-West Kyoto/Kobe through corridor'));
 assert.ok(kosei.includes('if((clocks||[]).length!==expectedCount||'));
 assert.ok(kosei.includes('new Set((clocks||[]).map((p:any)=>Number(p.source_template_id))).size!==expectedCount'));
 assert.ok(kosei.includes('run.timetable_date_verified=true;'));
 assert.ok(!kosei.includes('run.vehicle_artwork_path='));
});

test('Nov 2026 Kosei morning locals and overnight trains certify 15 separate original source clocks',()=>{
 const mig=fs.readFileSync(
 'supabase/migrations/20261107152000_jrwest_kosei_2611_early_local_and_overnight_clocks.sql','utf8');
 const sourceRows=[
 ['1838M','Weekday','fd4ea3f9351e8f8d0a38c399cd416513'],
 ['1838MH','SaturdayHoliday','fd4ea3f9351e8f8d0a38c399cd416513'],
 ['1840M','Weekday','e0e6dccfe35ec1a775aac6ce2685efff'],
 ['1840MH','SaturdayHoliday','e0e6dccfe35ec1a775aac6ce2685efff'],
 ['2800M','Weekday','2fcd2005fdeb59446ad6569933968741'],
 ['2800MH','SaturdayHoliday','2fcd2005fdeb59446ad6569933968741'],
 ['2802M','Weekday','2dafbe716ac7cd3fec19399d40d330ea'],
 ['2804M','Weekday','34faf5fe888d9a20d08520ae79f082c8'],
 ['2804MH','SaturdayHoliday','901dfc13e39b9604793dbe1f774d2d1c'],
 ['2806M','Weekday','d1dd898267e108f02b13e36fe7f76ae9'],
 ['2806MH','SaturdayHoliday','610ffa1144868d26aae6131ff29f9c67'],
 ['2808M','Weekday','cd7e4a39112c26f33e394d59099c9bd3'],
 ['2808MH','SaturdayHoliday','71bb38f99bddf57b42eadf42fb45fffe'],
 ['2812M','Weekday','251588c6d0bb5ff1a57c518ae6b38ca1'],
 ['2812MH','SaturdayHoliday','257e57e6e7af94353439d7b2e739d7d3']
 ];
 for(const [number,day,checksum] of sourceRows){
  assert.ok(mig.includes("('"+number+"','"+day+"'"),number+' calendar');
  assert.ok(mig.includes("'"+checksum+"'"),number+' exact-stop checksum');
 }
 assert.ok(!mig.includes("('2802MH'"),'2802M must remain weekday only');
 for(const token of [
  "published_train_number~",
  "1840|280[02468]|2812",
  "stop_count IN(7,13,18,21)",
  "o.source_hash=e.expected_hash",
  "o.source_count=e.expected_count::integer",
  "m.source_revision_date IS NULL AND m.source_occurrence=0",
  "AND f.actual_vehicle_confirmed=false AND f.authorizes_png=false",
  "WHERE verified_source_match)<>69",
  "calendar_urn='odpt.Calendar:Weekday')<>35",
  "calendar_urn='odpt.Calendar:SaturdayHoliday')<>34",
  "WHERE stop_count=7)<>2",
  "'140231'",
 ]) if(token!=="'140231'")assert.ok(mig.includes(token),token);
 const start=edge.indexOf('// Date-verified Kosei source-only');
 const end=edge.indexOf('// JR-West Kyoto/Kobe through corridor');
 assert.ok(start>=0&&end>start);
 const block=edge.slice(start,end);
 for(const token of [
  'const expectedCount=selectedCalendar==="odpt.Calendar:Weekday"?42:41;',
  'if((clocks||[]).length!==expectedCount||',
  'size!==expectedCount',
  '![4,5,7,13,18,21,22].includes(stops.length)',
  'p.actual_vehicle_confirmed!==false||p.authorizes_png!==false',
  'run.published_train_number=p.published_train_number;'
 ])assert.ok(block.includes(token),token);
 assert.ok(!block.includes('run.vehicle_artwork_path='));
 assert.ok(!block.includes('run.vehicle_plan_confirmed=true'));
});

test('two Omiimazu weekday/holiday numbering changes are references, never positions',()=>{
 const sql=fs.readFileSync(
 'supabase/migrations/20261107153000_jrwest_kosei_2611_omiimazu_through_number_boundaries.sql','utf8');
 const sourceChecks=[
  ['Kosei','3143M','weekday','Omi-Shiotsu','Oumiimazu'],
  ['Kosei','3443M','weekday','Oumiimazu','Yamashina'],
  ['TokaidoKansai','3443M','weekday','Kyoto','Kobe'],
  ['SanyoMain','3443M','weekday','Hyougo','Himeji'],
  ['Kosei','3145M','saturday_holiday','Omi-Shiotsu','Oumiimazu'],
  ['Kosei','3445M','saturday_holiday','Oumiimazu','Yamashina'],
  ['TokaidoKansai','3445M','saturday_holiday','Kyoto','Osaka']
 ];
 for(const r of sourceChecks){
  const first=r.slice(0,3).map(x=>"'"+x+"'").join(',');
  assert.ok(sql.includes("("+first+","),r.join(' '));
  assert.ok(sql.includes("'"+r[3]+"'"),r[3]);
  assert.ok(sql.includes("'"+r[4]+"'"),r[4]);
 }
 for(const token of [
  "calendar_scope IN ('daily','weekday','saturday_holiday')",
  "number_date_verified",
  "WHERE calendar_scope='weekday')<>4",
  "WHERE calendar_scope='saturday_holiday')<>8",
  "WHERE calendar_scope='daily')<>3",
  "WHERE stop_clocks_verified OR actual_vehicle_confirmed OR authorizes_position OR authorizes_png",
  "public.published_jrwest_2611_crossline_number_reference",
  "ON CONFLICT (line_key,published_train_number,calendar_scope) DO NOTHING"
 ].filter(x=>x!=='number_date_verified'))
  assert.ok(sql.includes(token),token);
 // The original joined 14-stop Kosei SpecialRapid source remains
 // source-only because its PUBLIC train number changes at Omiimazu.
 const block=edge.slice(edge.indexOf('// Date-verified Kosei source-only'),
 edge.indexOf('// JR-West Kyoto/Kobe through corridor'));
 assert.ok(block.includes('run.train_type!=="odpt.TrainType:JR-West.Local"'));
 const refBlock=edge.slice(edge.lastIndexOf('jrwestOfficialNumberReferences='),
   edge.indexOf('jrwest_official_number_references:'));
 assert.ok(refBlock.includes('["daily",dayScope]'));
 assert.ok(refBlock.includes('p.authorizes_position!==false'));
 assert.ok(refBlock.includes('stop_clocks_verified:false'));
});

test('fourteen Nov-2026 Kosei 2810-2826 local originals remain calendar and stop-count exact',()=>{
 const mig=fs.readFileSync(
  'supabase/migrations/20261107154000_jrwest_kosei_2611_midmorning_14_clock_sources.sql','utf8');
 const timetableRecords=[
 ['2810M','Weekday','b4d232d12d6ee3669aa9c1d577780a60'],
 ['2810MH','SaturdayHoliday','26abc7675bd159b7b09edb255f1d056f'],
 ['2814M','Weekday','5b3fe939a300839f4d04b78c9bcb99e6'],
 ['2814MH','SaturdayHoliday','29bb18c9a39ed017ec2274212eb60ac3'],
 ['2818M','Weekday','50d2c81f6e8b149b1e059cb7c9ae3e0c'],
 ['2818MH','SaturdayHoliday','50d2c81f6e8b149b1e059cb7c9ae3e0c'],
 ['2820M','Weekday','cfe4e02efcfba6e1bcb81558a3f330c3'],
 ['2820MH','SaturdayHoliday','cfe4e02efcfba6e1bcb81558a3f330c3'],
 ['2822M','Weekday','610b572ded39f621e5129c366d32dcb6'],
 ['2822MH','SaturdayHoliday','610b572ded39f621e5129c366d32dcb6'],
 ['2824M','Weekday','9ff9b531e4d6931c61cf75ee9e4d4ef8'],
 ['2824MH','SaturdayHoliday','9ff9b531e4d6931c61cf75ee9e4d4ef8'],
 ['2826M','Weekday','db3253c16619296287d7a804e363c75f'],
 ['2826MH','SaturdayHoliday','db3253c16619296287d7a804e363c75f']
 ];
 for(const [number,day,fingerprint] of timetableRecords){
  assert.ok(mig.includes("('"+number+"','"+day+"'"),number+" calendar");
  assert.ok(mig.includes("'"+fingerprint+"'"),number+" source hash");
 }
 for(const token of [
  "281[0248]|282[0246]",
  "m.source_path='data/timetables/Kosei-manual.js'",
  "m.source_occurrence=0 AND m.source_revision_date IS NULL",
  "m.train_type_urn='odpt.TrainType:JR-West.Local'",
  "AND f.actual_vehicle_confirmed=false AND f.authorizes_png=false",
  "o.n=e.stop_count::integer AND o.hash=e.source_hash",
  "WHERE verified_source_match)<>83",
  "calendar_urn='odpt.Calendar:Weekday')<>42",
  "calendar_urn='odpt.Calendar:SaturdayHoliday')<>41",
  "WHERE stop_count=7)<>4",
  "WHERE stop_count=13)<>21"
 ])assert.ok(mig.includes(token),token);
 const start=edge.indexOf('// Date-verified Kosei source-only');
 const end=edge.indexOf('// JR-West Kyoto/Kobe through corridor');
 assert.ok(start>=0&&end>start);
 const kosei=edge.slice(start,end);
 assert.ok(kosei.includes('const expectedCount=selectedCalendar==="odpt.Calendar:Weekday"?42:41;'));
 assert.ok(kosei.includes('![4,5,7,13,18,21,22].includes(stops.length)'));
 assert.ok(kosei.includes('run.timetable_date_verified=true'));
 assert.ok(!kosei.includes('run.vehicle_artwork_path='));
});

test('Kosei source evidence labels and API proof support each original station count',()=>{
 const sql=fs.readFileSync(
  'supabase/migrations/20261107155000_jrwest_kosei_generic_source_stop_proof_cleanup.sql','utf8');
 for(const needle of [
  "source_clock_verification='original_source_stops_compared_with_official'",
  "SET DEFAULT 'original_source_stops_compared_with_official'",
  "ALTER COLUMN stop_count DROP DEFAULT",
  "WITH (security_invoker=true)",
  "AND m.source_occurrence=0 AND m.source_revision_date IS NULL",
  "AND x.stop_count=p.stop_count AND x.source_hash=p.source_stops_md5",
  "p.stop_count",
  "WHERE verified_source_match)<>83",
  "WHERE stop_count NOT IN(4,5,7,13,18,21,22))<>0",
 ])assert.ok(sql.includes(needle),needle);
 const i=edge.indexOf('// Date-verified Kosei source-only');
 const j=edge.indexOf('// JR-West Kyoto/Kobe through corridor',i);
 assert.ok(i>=0&&j>i);
 const block=edge.slice(i,j);
 for(const needle of [
  'authorizes_png,verified_source_match,stop_count")',
  'Number(p.stop_count)!==stops.length',
  'proof.sourceStopKeys.length!==stops.length',
  'p.actual_vehicle_confirmed!==false||p.authorizes_png!==false'
 ])assert.ok(block.includes(needle),needle);
 assert.ok(!block.includes('run.vehicle_artwork_path='));
});

test('JR Nara 2026-11 original source clocks certify the right type, not an imported Local',()=>{
 const mig=fs.readFileSync(
 'supabase/migrations/20261107160000_jrwest_nara_2611_first_verified_source_clocks.sql','utf8');
 const odpt=fs.readFileSync('data/api/odpt-unified.js','utf8');
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 const proofRows=[
  ['601M','Weekday','Local','7db854f2c5c08e8445eddc9bd3585f64'],
  ['601MH','SaturdayHoliday','Local','d099033f51feddfa9e06976d3e647458'],
  ['602M','Weekday','Local','e884b6ae1a49c18a3ca4bd50b27088af'],
  ['602MH','SaturdayHoliday','Local','e884b6ae1a49c18a3ca4bd50b27088af'],
  ['621M','Weekday','Local','12122dadb9c23af33481eb925ebb0d33'],
  ['621MH','SaturdayHoliday','Local','a186987f1b9106df75f898dccc993627'],
  ['2636M','Weekday','MiyakojiRapid','7df8790db317a341f987b3d51b7358af'],
  ['2636MH','SaturdayHoliday','MiyakojiRapid','7df8790db317a341f987b3d51b7358af'],
  ['2646MH','SaturdayHoliday','MiyakojiRapid','27994a84b0f3e8d3330996ee7f86f959'],
  ['8061MH','SaturdayHoliday','LimitedExpress','48e5d106110131702c3aad8bc7d6a144'],
  ['8062MH','SaturdayHoliday','LimitedExpress','df659fc2b8d9fc63f43258e1e5aa5f42']
 ];
 for(const [number,calendar,type,hash] of proofRows){
   for(const token of ["'"+number+"'","'"+calendar+"'","'"+type+"'","'"+hash+"'"])
     assert.ok(mig.includes(token),number+" "+token);
 }
 for(const snippet of [
  "CREATE TABLE IF NOT EXISTS public.published_jrwest_nara_2611_verified_source_clocks",
  "ALTER TABLE public.published_jrwest_nara_2611_verified_source_clocks ENABLE ROW LEVEL SECURITY",
  "CREATE OR REPLACE VIEW public.published_jrwest_nara_2611_clock_evidence",
  "WITH (security_invoker=true)",
  "source_clock_verification='original_source_stops_compared_with_official'",
  "m.source_path='data/timetables/Nara-manual.js'",
  "m.source_occurrence=0 AND m.source_revision_date IS NULL",
  "AND o.stop_count=p.source_stop_count AND o.source_hash=p.source_stops_md5",
  "WHERE verified_source_match)<>11",
  "WHERE published_train_type='Local')<>6",
  "WHERE published_train_type='MiyakojiRapid')<>3",
  "WHERE published_train_type='LimitedExpress')<>2",
  "WHERE actual_vehicle_confirmed OR authorizes_png",
  "'8061MH','SaturdayHoliday','Outbound','LimitedExpress'",
  "'8062MH','SaturdayHoliday','Inbound','LimitedExpress'"
 ])assert.ok(mig.includes(snippet),snippet);
 assert.ok(!mig.includes("('2601MH'"),"unverified 2601M Nov source cannot be promoted");
 assert.ok(!mig.includes("('2646M'"),"weekday 2646M clocks differ");
 const start=edge.indexOf('// JR-West Nara Line:');
 const end=edge.indexOf('// Date-verified Kosei source-only',start);
 assert.ok(start>0 && end>start);
 const proof=edge.slice(start,end);
 for(const token of [
  '.from("published_jrwest_nara_2611_clock_evidence")',
  'selectedCalendar==="odpt.Calendar:Weekday"?9:12',
  'run.canonical_group_evidence!=="source_only"',
  'run.train_number!==p.source_train_number',
  'Number(p.source_stop_count)!==expectedCount',
  'sqlTime(o.arrival_clock)!==stops[i]?.arrival_time',
  'sqlTime(o.departure_clock)!==stops[i]?.departure_time',
  'p.published_train_type==="MiyakojiRapid"?"Rapid"',
  'p.published_train_type==="LimitedExpress"?"LimitedExpress"',
  'run.published_train_type_label=p.published_train_type_label',
  'run.train_number_verification="official-2611-nara-source-stop-clock"',
  'run.timetable_date_verified=true',
  'run.vehicle_plan_confirmed=false',
  'run.vehicle_artwork_path=null',
  'actualVehicleConfirmed:false,authorizesPng:false'
 ])assert.ok(proof.includes(token),token);
 assert.ok(odpt.includes('"_sqlPublishedTrainTypeLabel":run.timetable_date_verified===true'));
 assert.ok(odpt.includes('"_sqlPublishedTrainNumber":run.timetable_date_verified===true'));
 assert.ok(estimator.includes('lineId==="Nara"&&'));
 assert.ok(estimator.includes('official-2611-nara-source-stop-clock'));
 assert.ok(estimator.includes('String(publicTrainNumber||"").replace(/H$/,"")'));
});

test('Nara 2611 ten more daily source clocks recognize 604 Local and four Miyakoji Rapid service families',()=>{
 const m=fs.readFileSync(
 'supabase/migrations/20261107161000_jrwest_nara_2611_more_local_miyakoji_source_clocks.sql','utf8');
 const proofs=[
 ['604M','Weekday','a2165885cc4bffc637a56c0064c00939'],
 ['604MH','SaturdayHoliday','a2165885cc4bffc637a56c0064c00939'],
 ['2603M','Weekday','318ed2f75c9ab030b237f9a72d2a0acb'],
 ['2603MH','SaturdayHoliday','318ed2f75c9ab030b237f9a72d2a0acb'],
 ['2634M','Weekday','6b64623ddd10afd66fee884430cb2446'],
 ['2634MH','SaturdayHoliday','6b64623ddd10afd66fee884430cb2446'],
 ['2638M','Weekday','f2f4b62b4ed70d4b2038b9349ca5c40b'],
 ['2638MH','SaturdayHoliday','f2f4b62b4ed70d4b2038b9349ca5c40b'],
 ['2640M','Weekday','5427402e9ce604d2f0b3fdfb33194c6a'],
 ['2640MH','SaturdayHoliday','5427402e9ce604d2f0b3fdfb33194c6a']
 ];
 for(const [train,calendar,hash] of proofs){
  assert.ok(m.includes("'"+train+"'"),train);
  assert.ok(m.includes("'"+calendar+"'"),train+' calendar');
  assert.ok(m.includes("'"+hash+"'"),train+' hash');
 }
 for(const proof of [
  'DROP CONSTRAINT nara_2611_official_type_scope',
  "'604M','621M'",
  "'2603M','2634M','2636M','2638M','2640M','2646M'",
  "AND o.n=e.expected_count::integer AND o.hash=e.expected_hash",
  'WHERE verified_source_match)<>21',
  "calendar_urn='odpt.Calendar:Weekday')<>9",
  "calendar_urn='odpt.Calendar:SaturdayHoliday')<>12",
  "published_train_type='Local')<>8",
  "published_train_type='MiyakojiRapid')<>11",
  "published_train_type='LimitedExpress')<>2",
  'WHERE actual_vehicle_confirmed OR authorizes_png'
 ])assert.ok(m.includes(proof),proof);
 const from=edge.indexOf('// JR-West Nara Line:');
 const to=edge.indexOf('// Date-verified Kosei source-only',from);
 const block=edge.slice(from,to);
 assert.ok(block.includes('selectedCalendar==="odpt.Calendar:Weekday"?9:12'));
 assert.ok(block.includes('run.train_type="odpt.TrainType:JR-West."+officialType'));
 assert.ok(block.includes('run.timetable_date_verified=true'));
 assert.ok(block.includes('run.vehicle_artwork_path=null'));
});
