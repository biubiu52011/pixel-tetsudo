'use strict';
// JR50 is a sourced train-number PNG illustration; it is NOT a verified
// formation or a daily operation proof. The underlying gallery/selector owns
// the actual source, line, calendar and identity guards.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const sql=fs.readFileSync(
 'supabase/migrations/20261118081000_jr50_tokaido_fujikawa_373_4001_4014_reference_2611.sql','utf8');
const csv=fs.readFileSync(
 'data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const triage=fs.readFileSync(
 'data/audits/png-unmapped-source-triage-20261118.csv','utf8');
const index=JSON.parse(fs.readFileSync(
 'data/audits/png-to-train-number-index-2611.json','utf8'));
const path='images/列车/JR東海/JR東海_373系.png';
const prefix='JR,JR東海,'+path+',TokaidoCentral,4001,4014,M,full,';

test('JR50 public Fujikawa number range and 373 model have explicit source links',()=>{
 assert.match(sql,/2026-11 "Fujikawa" 1-14 public train numbers 4001M\.\.4014M/);
 assert.match(sql,/timetables\.jreast\.co\.jp\/2611\/timetable-v\/109u1\.html/);
 assert.match(sql,/jr-group\.jp\/fujikawa-timetable/);
 assert.match(sql,/recommend\.jr-central\.co\.jp\/oshi-tabi\/contents025\.html/);
});

test('JR50 remains limited to the existing TokaidoCentral 373 PNG scope',()=>{
 const asset=index.pngIndex.find(x=>x.path===path);
 assert.ok(asset,'373 PNG not present in single original gallery index');
 assert.ok(asset.lineScopes.includes('TokaidoCentral'));
 assert.ok(!asset.lineScopes.includes('Minobu'), 'do not create a new Minobu ownership rule');
 assert.ok(asset.canonicalModels.includes('373系'));
 assert.equal(asset.quarantined,false);
 assert.match(sql,/'2611','TokaidoCentral','png_band\/TokaidoCentral\/4001-4014M',4001,4014,'M',NULL/);
 assert.doesNotMatch(sql,/'2611','Minobu','png_band/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.match(sql,/Preserve operator, direction, calendar, train class, source and identity guards/);
});

test('JR50 promotes exactly one numbered gallery CSV row without a second truth table',()=>{
 const rows=csv.trimEnd().split('\n');
 assert.equal(rows.filter(row=>row.startsWith(prefix)).length,1);
 assert.equal(rows.filter(row=>row.startsWith('JR,JR東海,'+path+',')).length,1);
 assert.ok(!triage.includes('"'+path+'"'),
   '373 already has a sourced reference and cannot remain in no-number triage');
 assert.equal(rows.filter(row=>row.endsWith(',无号段')).length,477);
 assert.ok(sql.includes('INSERT INTO public.published_train_png_number_ranges'));
 assert.ok(!sql.includes('CREATE TABLE'));
});
