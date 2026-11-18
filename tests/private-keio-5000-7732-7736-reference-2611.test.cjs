'use strict';
// Private16: historical 2026 Keio Liner operating numbers are advisory,
// not service-date/formation proof or an automatic train PNG selector.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const migration=read('supabase/migrations/20261118112500_private16_keio_5000_7732_7736_number_references.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const png='images/列车/京王電鉄/京王電鉄_5000系.png';
const rows=csv.trimEnd().split('\n').slice(1)
  .filter(row=>row.startsWith('私铁,京王電鉄,'+png+','))
  .map(row=>row.split(','));

test('Keio 5000 includes only the two documented full KeioSagami numbers',()=>{
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(row=>Number(row[4])),[7732,7736]);
 for(const row of rows){
  assert.equal(row.length,9);
  assert.equal(row[3],'KeioSagami');
  assert.equal(row[4],row[5]);
  assert.equal(row[6],'');
  assert.equal(row[7],'full');
  assert.match(row[8],/历史完整番号参考/);
  assert.match(row[8],/当期日期及实车待核/);
 }
 assert.match(migration,/train_number IN \('7732','7736'\)/);
 assert.match(migration,/train_type_urn='odpt.TrainType:Keio.KeioLiner'/);
 assert.match(migration,/source_path='data\/timetables\/KeioSagami-manual.js'/);
 assert.match(migration,/7732,7732/);
 assert.match(migration,/7736,7736/);
 assert.ok(!migration.includes('7732,7736,'));
 assert.ok(!triage.includes('"'+png+'"'));
});

test('unverified daily service and vehicle identities never unlock automatic 5000 PNG',()=>{
 const asset=index.pngIndex.find(row=>row.path===png);
 assert.ok(asset);
 assert.equal(asset.quarantined,false);
 assert.ok(asset.lineScopes.includes('KeioSagami'));
 assert.ok(asset.canonicalModels.includes('京王5000系'));
 assert.equal(asset.directNumberRules.length,0);
 assert.match(migration,/source_revision_date=NULL/);
 assert.match(migration,/NOT a 2026-11-18 service or formation proof/);
 assert.match(migration,/NO auto-show permissions|Never infer between 7732 and 7736/);
 assert.match(migration,/asset_scope='generic'/);
 assert.match(migration,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(migration,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.ok(!migration.includes('CREATE TABLE'));
 assert.ok(!migration.includes('KeioMain\',\'png_band/'));
});

test('single gallery and unresolved triage stay synchronized',()=>{
 const rowsAll=csv.trimEnd().split('\n').slice(1);
 assert.equal(rowsAll.length,5558);
 assert.equal(new Set(rowsAll.map(row=>row.split(',')[2])).size,601);
 assert.equal(rowsAll.filter(row=>row.endsWith(',无号段')).length,476);
 assert.equal(triage.trimEnd().split('\n').length-1,476);
 assert.equal(rowsAll.filter(row=>row.startsWith('私铁,')).length,600);
});
