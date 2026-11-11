'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {prepare,csvRows,COLUMNS}=require('../scripts/prepare-jr-central-sql-plan.cjs');

const source=Object.freeze({
  url:'https://example.org/independently-authored-timetable',
  authorization:'original_compilation',
  authorization_evidence_url:'https://example.org/own-source-rights',
  edition_date:'2026-11-01'
});
// Synthetic input ONLY: these train numbers and stop clocks are NOT proof
// that a real JR Central service ran on these days.
const lines=[
  COLUMNS.join(','),
  'fixture-A,801M,odpt.Calendar:Weekday,odpt.RailDirection:Outbound,Local,2026-11-11;2026-11-12,0,Nagoya,,06:00',
  'fixture-A,801M,odpt.Calendar:Weekday,odpt.RailDirection:Outbound,Local,2026-11-11;2026-11-12,1,JRC-ChuoCentral-003,06:06,06:07',
  'fixture-A,801M,odpt.Calendar:Weekday,odpt.RailDirection:Outbound,Local,2026-11-11;2026-11-12,2,JRC-ChuoCentral-020,07:25,',
].join('\n');
test('CSV staging creates one train with ordered stop clocks and date scope',()=>{
  const doc=prepare(source,lines);
  assert.equal(doc.trains.length,1);
  assert.equal(doc.trains[0].train_number,'801M');
  assert.deepEqual(doc.trains[0].operating_dates,['2026-11-11','2026-11-12']);
  assert.equal(doc.trains[0].stops.length,3);
  assert.deepEqual(doc.trains[0].stops[0],
    {station_id:'Nagoya',arrival:null,departure:'06:00'});
});
test('quoted and CRLF CSV records round-trip safely',()=>{
  const rows=csvRows('a,b\r\n"same,field","escaped ""quote"""\r\n');
  assert.deepEqual(rows,[['a','b'],['same,field','escaped "quote"']]);
});
test('unauthorized source cannot enter the SQL staging flow',()=>{
  assert.throws(()=>prepare({...source,authorization:'public_website'},lines),
    /SOURCE_RIGHTS_NOT_VERIFIED/);
  assert.throws(()=>prepare({...source,authorization_evidence_url:''},lines),
    /SOURCE_RIGHTS_NOT_VERIFIED/);
});
test('missing clock and inconsistent service key are rejected',()=>{
  assert.throws(()=>prepare(source,lines.replace('JRC-ChuoCentral-020,07:25,',
    'JRC-ChuoCentral-020,,')),/CSV_INVALID_STOP/);
  assert.throws(()=>prepare(source,lines.replace(',2,JRC-ChuoCentral-020,',
    ',7,JRC-ChuoCentral-020,')),/CSV_STOP_ORDER_GAP/);
  assert.throws(()=>prepare(source,lines.replace('2026-11-11;2026-11-12,1,',
    '2026-11-13,1,')),/CSV_TRAIN_METADATA_CONFLICT/);
});
test('CSV rejects a one-station service and train-number placeholders',()=>{
  const rows=lines.split('\n');
  assert.throws(()=>prepare(source,rows.slice(0,2).join('\n')),
    /CSV_NO_TRAIN_STOPS|CSV_INCOMPLETE_TRAIN/);
  assert.throws(()=>prepare(source,lines.replaceAll('801M','?')),
    /CSV_INVALID_STOP/);
});
