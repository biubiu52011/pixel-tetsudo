'use strict';
// Private12: public "Chichibu N-go" service labels are NOT evidence of
// physical carset or a valid backend SII*/SBC* train-number conversion.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118085000_private12_seibu_laview_2026_official_chichibu_number_references.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const png='images/列车/西武鉄道/西武鉄道_001系_Laview.png';
const expected=[5,7,9,11,32,34,36,40];

test('Private12 keeps exactly eight official public Seibu Chichibu numbered services',()=>{
 const rows=csv.trimEnd().split('\n').slice(1)
  .filter(r=>r.startsWith('私铁,西武鉄道,'+png+',')).map(r=>r.split(','));
 assert.equal(rows.length,8);
 assert.deepEqual(rows.map(row=>Number(row[4])),expected);
 for(const row of rows){
  assert.equal(row.length,9);
  assert.equal(row[3],'SeibuChichibu');
  assert.equal(row[4],row[5],'no inferred number interval');
  assert.equal(row[6],'','public labels have no operational suffix');
  assert.equal(row[7],'full');
  assert.match(row[8],/实际车次及运行日待核/);
 }
 assert.match(sql,/20250315_tokkyuujikoku__ikebukurosen_1\.pdf/);
 assert.match(sql,/20260617_ashigakuboyokoze\.pdf/);
 assert.match(sql,/\(5,5\), \(7,7\), \(9,9\), \(11,11\), \(32,32\), \(34,34\), \(36,36\), \(40,40\)/);
});

test('Seibu 001 image remains review-only and pure PNG records have no authority to auto-select',()=>{
 const asset=index.pngIndex.find(x=>x.path===png);
 assert.ok(asset);
 assert.ok(asset.lineScopes.includes('SeibuChichibu'));
 assert.equal(asset.quarantined,false);
 assert.ok(asset.canonicalModels.includes('西武001系'));
 assert.match(sql,/asset_scope='review'/);
 assert.match(sql,/is_generic=FALSE/);
 assert.match(sql,/NOT a certified operator operational train number or carset identity/);
 assert.match(sql,/source-owned trainNumber & serviceDate matching remains final/);
 assert.match(sql,/NULL,FALSE,FALSE\)/);
 assert.ok(!triage.includes('"'+png+'"'));
 assert.ok(!sql.includes('CREATE TABLE'));
});

test('gallery snapshot remains 601 unique physical images with 478 no-number gaps',()=>{
 const rows=csv.trimEnd().split('\n').slice(1);
 assert.equal(new Set(rows.map(row=>row.split(',')[2])).size,601);
 assert.equal(rows.filter(r=>r.endsWith(',无号段')).length,478);
 assert.equal(triage.trimEnd().split('\n').length-1,478);
 assert.equal(rows.filter(r=>r.startsWith('私铁,')).length,599);
});
