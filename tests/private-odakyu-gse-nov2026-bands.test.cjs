'use strict';
// Confirm official source-derived November 2026 GSE number bands remain exact.
// These PNG references do NOT convey daily permission to display artwork.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const migration=fs.readFileSync(
 'supabase/migrations/20261118082500_private11_odakyu_gse_2611_exact_november_number_bands.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const triage=fs.readFileSync('data/audits/png-unmapped-source-triage-20261118.csv','utf8');
const gallery=JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json','utf8'));
const asset='images/列车/小田急電鉄/小田急電鉄_70000形_GSE.png';
const exact={
 Odawara:[2,3,6,10,18,22,25,104,120,128,315,318,321,601,611,621,709,727,729,736,790,791,906,992],
 OdakyuEnoshima:[504,683,687,689]
};
const data=csv.trimEnd().split('\n').slice(1)
 .filter(r=>r.startsWith('私铁,小田急電鉄,'+asset+','))
 .map(r=>r.split(','));

test('Private11 26 minimal no-gap bands equal exactly 28 2026-Nov official GSE train numbers',()=>{
 assert.equal(data.length,26);
 const actual={Odawara:[],OdakyuEnoshima:[]};
 for(const row of data){
  assert.equal(row.length,9);
  const line=row[3],start=Number(row[4]),end=Number(row[5]);
  assert.ok(Object.prototype.hasOwnProperty.call(actual,line),'out-of-gallery route '+line);
  assert.ok(Number.isInteger(start)&&Number.isInteger(end)&&start<=end);
  assert.equal(row[6],'');
  assert.equal(row[7],'full');
  assert.ok(row[8].includes('日期条件另核'));
  for(let n=start;n<=end;n++)actual[line].push(n);
 }
 for(const line of Object.keys(exact)){
  assert.deepEqual(actual[line].sort((a,b)=>a-b),exact[line]);
 }
 const entire=[...actual.Odawara,...actual.OdakyuEnoshima];
 assert.equal(entire.length,28);
 assert.equal(new Set(entire).size,28);
 assert.ok(migration.includes('28 distinct four-digit service train numbers'));
 assert.ok(migration.includes('26 NO-GAP intervals'));
});

test('Source PDF, gallery ownership and review-only guard cannot silently change',()=>{
 const record=gallery.pngIndex.find(x=>x.path===asset);
 assert.ok(record);
 assert.deepEqual(record.lineScopes.slice().sort(),['OdakyuEnoshima','Odawara'].sort());
 assert.ok(record.canonicalModels.some(s=>s.includes('70000')));
 assert.equal(record.quarantined,false);
 assert.match(migration,/www\.odakyu\.jp\/romancecar\/news\/makhce00000028sx-att\/makhce00000028t4\.pdf/);
 assert.match(migration,/asset_scope='review'/);
 assert.match(migration,/Never authorize a PNG by this band alone/);
 assert.match(migration,/Preserve source calendar/);
 assert.match(migration,/source_url,requires_exact_roster,actual_vehicle_confirmed/);
 assert.ok(migration.includes('NULL,FALSE,FALSE'));
 assert.ok(!migration.includes('CREATE TABLE'));
 assert.ok(!triage.includes('"'+asset+'"'));
});

test('Gallery remains 601 PNG files and unresolved gaps count is 478',()=>{
 const all=csv.trimEnd().split('\n').slice(1);
 assert.equal(new Set(all.map(line=>line.split(',')[2])).size,601);
 assert.equal(all.filter(line=>line.endsWith(',无号段')).length,478);
 assert.equal(triage.trimEnd().split('\n').length-1,478);
});
