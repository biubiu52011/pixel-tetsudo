'use strict';
// Private17: Keikyu 2100 numbered reference from company holiday 322 and
// weekday 323 2025-12 diagrams, current before the late November 2026
// timetable change. An exact train number is NOT real-day stock proof.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118125500_private17_keikyu_2100_10_exact_A_C_numbers_two_corridors.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const png='images/列车/京浜急行電鉄/京浜急行電鉄_2100形.png';
const codes=['603C','702C','901A','903A','1000A','1002A','1101A','1200A','1203A','1302A'];
const weekdays=['901A','1000A','1101A','1200A'];
const holidays=['603C','702C','903A','1002A','1203A','1302A'];
const lineKeys=['Keikyu','KeikyuKurihama'];
const all=csv.trimEnd().split('\n').slice(1);
const rows=all.filter(s=>s.startsWith('私铁,京浜急行電鉄,'+png+',')).map(s=>s.split(','));
test('10 unique official complete train numbers on each of two traversed Keikyu corridors',()=>{
 assert.equal(rows.length,20);
 for(const line of lineKeys){
  const scoped=rows.filter(r=>r[3]===line);
  assert.equal(scoped.length,10);
  assert.deepEqual(scoped.map(r=>Number(r[4])+r[6]),codes);
  for(const row of scoped){
   assert.equal(row.length,9);
   assert.equal(row[4],row[5],'exact source number only');
   assert.equal(row[7],'full');
   assert.match(row[8],/京急官方322・323行路/);
   assert.match(row[8],/实际运转日期和编组待核/);
   const number=+row[4],suffix=row[6];
   const segment='png_band/'+line+'/'+String(number).padStart(4,'0')+'-'+String(number).padStart(4,'0')+suffix;
   assert.ok(sql.includes(segment),'migration must have identical distinct singleton '+segment);
  }
 }
 assert.equal(new Set(rows.map(r=>r[3])).size,2);
 for(const otherLine of ['KeikyuAirport','KeikyuZushi','Asakusa','KeiseiMain'])
  assert.ok(!rows.some(r=>r[3]===otherLine));
});
test('official operator sources anchor 322/323 rosters but do NOT verify a live stock unit',()=>{
 assert.equal(weekdays.length,4);
 assert.equal(holidays.length,6);
 for(const code of [...weekdays,...holidays])assert.ok(sql.includes(code));
 assert.match(sql,/train_holyday_pdf\/6\/20251213holiday\.pdf/);
 assert.match(sql,/train_workday_pdf\/5\/20251215weekday\.pdf/);
 assert.match(sql,/knowledge899\.html/);
 assert.match(sql,/knowledge779\.html/);
 assert.match(sql,/valid through 2026-11-20/);
 assert.match(sql,/2026-11-21/);
 assert.match(sql,/2026-11-24/);
 assert.match(sql,/reference-only from the old 322\/323 diagram, NOT a\s*\n-- 2026-11-18 actually observed carset/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 const inserted=[...sql.matchAll(/\('2611','Keikyu(?:Kurihama)?','png_band\/Keikyu[^']+',\d+,\d+,'[AC]',NULL,'\.\.\/images\/列车\/京浜急行電鉄\/京浜急行電鉄_2100形\.png',NULL,FALSE,FALSE\)/g)];
 assert.equal(inserted.length,20);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes('KeikyuAirport\',\'png_band/'));
 assert.ok(!sql.includes('京浜急行電鉄_600形.png'));
 assert.ok(!sql.includes('formation_id='));
});
test('existing gallery artwork has no new runtime auto-image authority',()=>{
 const item=index.pngIndex.find(x=>x.path===png);
 assert.ok(item,'physical 2100 gallery missing');
 assert.ok(item.canonicalModels.includes('京急2100形'));
 assert.ok(item.lineScopes.includes('Keikyu'));
 assert.ok(item.lineScopes.includes('KeikyuKurihama'));
 assert.equal(item.quarantined,false);
 assert.equal(item.directNumberRules.length,0);
 assert.equal(item.runtimeNumberRosters.length,0);
 assert.equal(item.historicalNumberedSources.length,0);
});
test('single 601-PNG inventory and source triage stay exactly synchronized',()=>{
 const gallery=new Set(all.map(s=>s.split(',')[2]));
 assert.equal(gallery.size,601);
 assert.ok(all.filter(s=>s.startsWith('私铁,')).length>=rows.length,
  'all Keikyu source rows belong to the existing private fleet inventory');
 const unmapped=new Set(all.filter(s=>s.endsWith(',无号段'))
   .map(s=>s.split(',')[2]));
 const triagePaths=triage.trimEnd().split('\n').slice(1)
   .map(s=>s.match(/"(images\/列车\/[^"]+)"/)?.[1]);
 assert.ok(triagePaths.every(Boolean));
 assert.equal(new Set(triagePaths).size,triagePaths.length);
 assert.deepEqual([...triagePaths].sort(),[...unmapped].sort(),
  'pending investigations must match actual unnumbered gallery assets');
 assert.ok(!triage.includes('"'+png+'"'));
});
