'use strict';
// Keisei: FULL operational code = numeric hour + "AE"+operation digits.
// These two historical source-backed references must NEVER be confused with
// commercial Skyliner 10/12, AE5/AE4 formation ids or a current-day roster.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const sql=read('supabase/migrations/20261118101000_private14_keisei_ae_9ae06_10ae04_exact_train_number_references.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const png='images/列车/京成電鉄/京成電鉄_AE形.png';
const records=csv.trimEnd().split('\n').slice(1)
 .filter(r=>r.startsWith('私铁,京成電鉄,'+png+',')).map(r=>r.split(','));

test('Keisei AE references exactly the full native 9AE06 and 10AE04 codes',()=>{
 assert.equal(records.length,2);
 assert.ok(records.every(r=>r.length===9&&r[3]==='NaritaSkyAccess'
     &&r[4]===r[5]&&r[7]==='full'));
 assert.deepEqual(records.map(r=>String(Number(r[4]))+r[6]).sort(),
  ['9AE06','10AE04'].sort(),'compare exact codes regardless of CSV display order');
 assert.deepEqual(records.map(r=>r[6]).sort(),['AE06','AE04'].sort());
 assert.ok(records.every(r=>r[8].includes('当期日期守卫保留')));
 assert.ok(!triage.includes('"'+png+'"'));
 assert.match(sql,/train_number IN \('9AE06','10AE04'\)/);
 assert.match(sql,/train_type_urn='odpt.TrainType:Keisei.Skyliner'/);
 assert.match(sql,/source_path='data\/timetables\/NaritaSkyAccess-manual.js'/);
});

test('exact historical evidence does not confer current-day or formation status',()=>{
 const asset=index.pngIndex.find(x=>x.path===png);
 assert.ok(asset,'gallery PNG missing');
 assert.equal(asset.quarantined,false);
 assert.ok(asset.lineScopes.includes('NaritaSkyAccess'));
 assert.ok(asset.canonicalModels.includes('京成AE形'));
 assert.equal(asset.directNumberRules.length,0);
 assert.match(sql,/asset_scope='generic'/);
 assert.match(sql,/is_generic=TRUE/);
 assert.match(sql,/Never unconditionally display from these/);
 assert.match(sql,/timetable revision/);
 assert.match(sql,/date, line and/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.ok(!sql.includes('CREATE TABLE'));
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
