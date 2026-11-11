'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('data/research/tokaido-central-202603-segment-candidates.json','utf8'));
const stationData=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
const line=stationData.lines.TokaidoCentral;
const time=x=>{const v=/^([0-2]\d):([0-5]\d)$/.exec(x);return v?Number(v[1])*60+Number(v[2]):NaN;};
test('historical 2026 segment observations are not November operating dates or authorized SQL',()=>{
 assert.equal(data.lineId,'TokaidoCentral');
 assert.equal(data.evidenceEdition,'2026-03-14');
 assert.equal(data.serviceDateStatus,'2026-11_NOT_VERIFIED');
 assert.equal(data.rightsStatus,'REPUBLICATION_NOT_VERIFIED');
 assert.equal(data.publicationStatus,'REVIEW_ONLY_NOT_AUTHORIZED_FOR_RUNTIME_OR_SQL');
 assert.equal(data.rows.length,8);
 assert.equal(data.rows.every(r=>r.review==='source_date_and_republication_pending'),true);
 assert.equal(data.rows.some(r=>r.operating_dates||r.timetableDateVerified||r.authorization),false);
});
test('both timetable calendars preserve source-backed, directionally correct segment anchors',()=>{
 const index=name=>line.stations.indexOf(name);
 assert.ok(index('Hamamatsu')>=0 && index('Toyohashi')>index('Hamamatsu'));
 const sources=new Map(data.sources.map(s=>[s.id,s]));
 const seen=new Set(),counts={Weekday:0,SaturdayHoliday:0};
 for(const row of data.rows){
  const key=row.calendar+'|'+row.number+'|'+row.direction;
  assert.ok(!seen.has(key),'duplicate '+key);seen.add(key);
  assert.match(row.number,/^[0-9]{1,5}[FM]$/);
  assert.ok(row.calendar in counts);
  counts[row.calendar]++;
  assert.equal(row.trainType,'Local');
  assert.ok(['313系','315系','373系'].includes(row.candidateModel));
  assert.ok(time(row.arrival)>time(row.departure));
  assert.ok(time(row.arrival)-time(row.departure)<90);
  assert.equal(row.direction==='Outbound',index(row.departureStation)<index(row.arrivalStation));
  assert.equal(row.direction==='Inbound',index(row.departureStation)>index(row.arrivalStation));
  assert.ok(row.sources.length>=1);
  for(const id of row.sources){
   assert.ok(sources.has(id),'missing provenance '+id);
   assert.match(sources.get(id).url,/^https:\/\//);
  }
 }
 assert.equal(counts.Weekday,4);assert.equal(counts.SaturdayHoliday,4);
});
test('review candidates cannot be loaded as a published or full-day schedule',()=>{
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const api=fs.readFileSync('data/api/odpt-unified.js','utf8');
 const importer=fs.readFileSync('supabase/migrations/20261111100000_jr_central_shared_authorized_plan_import.sql','utf8');
 assert.doesNotMatch(api,/data\/research\/tokaido-central-202603-segment-candidates/);
 assert.doesNotMatch(edge,/data\/research\/tokaido-central-202603-segment-candidates/);
 assert.match(importer,/JRC_PLAN_SOURCE_RIGHTS_UNVERIFIED/);
 assert.match(importer,/authorization_evidence_url/);
 assert.match(importer,/coverage_status='sampled'/);
});
