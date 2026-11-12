'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {makeBatches}=require('../scripts/build-jr-central-full-roster-sql.cjs');
const {COLUMNS}=require('../scripts/prepare-jr-central-sql-plan.cjs');
const SOURCE={
 url:'https://licensed.example.org/november-2026',
 authorization:'licensed_for_republication',
 authorization_evidence_url:'https://licensed.example.org/grants/db-publication',
 edition_date:'2026-11-01'
};
const GRANT={
 confirmed:true,permission:'scheduled_train_times_database_republication',
 grant_url:SOURCE.authorization_evidence_url
};
const WK='odpt.Calendar:Weekday',HO='odpt.Calendar:SaturdayHoliday';
const IN='odpt.RailDirection:Inbound',OUT='odpt.RailDirection:Outbound';
const ROSTER={
 line_key:'TokaidoCentral',complete_scope:true,
 expected:{
  [WK]:{[IN]:1,[OUT]:0},
  [HO]:{[IN]:1,[OUT]:0}
 }
};
const csv=[
 COLUMNS.join(','),
 'wd-1,920M,'+WK+','+IN+',SectionRapid,2026-11-12,0,Maibara,,05:00',
 'wd-1,920M,'+WK+','+IN+',SectionRapid,2026-11-12,1,Nagoya,05:56,',
 'we-1,922M,'+HO+','+IN+',Local,2026-11-14,0,Maibara,,06:00',
 'we-1,922M,'+HO+','+IN+',Local,2026-11-14,1,Nagoya,06:56,'
].join('\n');

test('valid licensed full roster produces existing-SQL-only batches',()=>{
 const r=makeBatches(SOURCE,csv,ROSTER,GRANT,1);
 assert.equal(r.report.source_template_count,2);
 assert.equal(r.report.source_stop_count,4);
 assert.equal(r.report.sql_batches.length,2);
 assert.equal(r.report.full_day_accepted,false);
 assert.ok(r.batches.every(b=>b.sql.includes(
  'public.import_jr_central_authorized_plan')));
 assert.ok(r.batches.every(b=>!b.sql.includes('DROP TABLE')));
});
test('source not licensed for DB republication is rejected',()=>{
 assert.throws(()=>makeBatches(
  {...SOURCE,authorization:'original_compilation'},csv,ROSTER,GRANT),
  /FULL_TABLE_REQUIRES_EXPLICIT_REPUBLICATION_LICENSE/);
 assert.throws(()=>makeBatches(SOURCE,csv,ROSTER,
  {...GRANT,grant_url:SOURCE.url}),/BULK_LICENSE_GRANT_NOT_DOCUMENTED/);
});
test('missing weekday/full column roster blocks all-day import',()=>{
 const expected={...ROSTER,expected:{
  ...ROSTER.expected,[HO]:{[IN]:2,[OUT]:0}
 }};
 assert.throws(()=>makeBatches(SOURCE,csv,expected,GRANT),
  /FULL_ROSTER_COUNT_MISMATCH/);
});
test('repeat train-number occurrence on overlapping date is not merged',()=>{
 const duplicate=csv+'\n'+
  'we-2,922M,'+HO+','+IN+',Local,2026-11-14,0,Maibara,,07:00\n'+
  'we-2,922M,'+HO+','+IN+',Local,2026-11-14,1,Nagoya,07:54,';
 assert.throws(()=>makeBatches(SOURCE,duplicate,ROSTER,GRANT),
  /DUPLICATE_NUMBER_OCCURRENCE_NEEDS_MANUAL_MERGE/);
});
test('overnight times need unambiguous 24:xx notation, not inferred',()=>{
 const bad=csv.replace('Nagoya,06:56,','Nagoya,00:56,');
 assert.throws(()=>makeBatches(SOURCE,bad,ROSTER,GRANT),
  /SCHEDULE_CLOCK_REVERSAL_OR_UNNORMALIZED_MIDNIGHT/);
});
