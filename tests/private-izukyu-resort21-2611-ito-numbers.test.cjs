'use strict';
// Nov 2026 Resort21 A/B is a published train-number + PLANNED fleet calendar.
// The proof of 2100-series on each day must remain separate. Never infer
// exact carset, original black/red livery, or automatic PNG eligibility.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const migration=read('supabase/migrations/20261118104000_private15_izukyu_resort21_ito_official_2611_number_refs.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const png='images/列车/伊豆急行/伊豆急行_2100系.png';
const rows=csv.trimEnd().split('\n').slice(1)
 .filter(line=>line.startsWith('私铁,伊豆急行,'+png+','))
 .map(line=>line.split(','));
const numbers=[5630,5631,5636,5637,5642,5643,5648,5649,5656,5657];
const expected=[[5630,5631],[5636,5637],[5642,5643],[5648,5649],[5656,5657]];

test('private15 exactly five no-gap November official Resort21 Ito/M ranges',()=>{
 assert.equal(rows.length,5);
 assert.deepEqual(rows.map(row=>[Number(row[4]),Number(row[5])]),expected);
 const expanded=[];
 for(const row of rows){
  assert.equal(row.length,9);
  assert.equal(row[3],'Ito','only original gallery line');
  assert.equal(row[6],'M');
  assert.equal(row[7],'full');
  assert.match(row[8],/8000系代行日须排除/);
  for(let n=Number(row[4]);n<=Number(row[5]);n++)expanded.push(n);
 }
 assert.deepEqual(expanded,numbers);
 assert.match(migration,/5630-5631M, 5636-5637M, 5642-5643M, 5648-5649M, 5656-5657M/);
 assert.match(migration,/2026-11-11/);
 assert.match(migration,/camel3\.com\/cms\/files\/izukyu\/MASTER\/1310\/YtTDpBwA\.pdf/);
});

test('do not imply 2100-series ran during substitute 8000 dates or on Izukyu-only numbers',()=>{
 const original=index.pngIndex.find(entry=>entry.path===png);
 assert.ok(original);
 assert.deepEqual(original.lineScopes,['Ito']);
 assert.equal(original.quarantined,false);
 assert.ok(original.canonicalModels.includes('伊豆急行2100系'));
 assert.equal(original.directNumberRules.length,0);
 assert.match(migration,/asset_scope='generic'/);
 assert.match(migration,/vehicle_type='2100系'/);
 assert.match(migration,/The PDF ALSO identifies substitute 8000-series days/);
 assert.match(migration,/661 and 704 within the Izukyu-only section/);
 assert.match(migration,/DO NOT create an unrelated Izukyu line mapping/);
 assert.match(migration,/Preserve original service-date, direction, class, operator, source and/);
 assert.match(migration,/source_url,requires_exact_roster,actual_vehicle_confirmed/);
 assert.match(migration,/NULL,FALSE,FALSE\)/);
 assert.ok(!migration.includes('CREATE TABLE'));
 assert.ok(!triage.includes('"'+png+'"'));
});

test('601 physical gallery PNGs and pending triage have identical path sets',()=>{
 const rows=csv.trimEnd().split('\n').slice(1);
 const gallery=new Set(rows.map(line=>line.split(',')[2]));
 assert.equal(gallery.size,601,'keep one single physical gallery');
 assert.ok(rows.some(line=>line.startsWith('私铁,')));
 const missing=new Set(rows.filter(line=>line.endsWith(',无号段'))
   .map(line=>line.split(',')[2]));
 const triagePaths=triage.trimEnd().split('\n').slice(1)
   .map(line=>line.match(/"(images\/列车\/[^"]+)"/)?.[1]);
 assert.ok(triagePaths.every(Boolean),'every triage row refers to a PNG');
 assert.equal(new Set(triagePaths).size,triagePaths.length,'no duplicated PNG');
 assert.deepEqual([...triagePaths].sort(),[...missing].sort(),
   'pending source investigations must equal unnumbered gallery PNG set');
});
