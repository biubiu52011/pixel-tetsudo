'use strict';
// Private13: Seibu Koedo public N-go != canonical trainNumber N.
// References must not authorize a 2026-11 service or real carset on their own.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=x=>fs.readFileSync(x,'utf8');
const sql=read('supabase/migrations/20261118092000_private13_seibu_shinjuku_nra_koedo_number_references.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const index=JSON.parse(read('data/audits/png-to-train-number-index-2611.json'));
const png='images/列车/西武鉄道/西武鉄道_10000系_ニューレッドアロー.png';
const refs=[111,118,125,132,165];
const publicToNumber={11:111,18:118,25:125,32:132,65:165};

test('Private13 precisely five SeibuShinjuku reference singletons, not 11=>11',()=>{
 const rows=csv.trimEnd().split('\n').slice(1)
  .filter(r=>r.startsWith('私铁,西武鉄道,'+png+',')).map(r=>r.split(','));
 assert.equal(rows.length,5);
 assert.deepEqual(rows.map(r=>Number(r[4])),refs);
 assert.ok(rows.every(r=>r.length===9&&r[3]==='SeibuShinjuku'
  &&r[4]===r[5]&&r[6]===''&&r[7]==='full'));
 for(const row of rows)assert.ok(row[8].includes('运行日待核'));
 assert.equal(rows.filter(r=>r[4]==='0011').length,0,
  'Koedo 11 public service name is NOT trainNumber 11');
 assert.ok(!triage.includes('"'+png+'"'));
 assert.match(sql,/11=>111, 18=>118/);
 assert.match(sql,/25=>125, 32=>132, 65=>165/);
 assert.deepEqual(Object.values(publicToNumber).sort((a,b)=>a-b),refs);
});

test('NRA review status, original scope and canonical 2025 source preflight remain',()=>{
 const gallery=index.pngIndex.find(x=>x.path===png);
 assert.ok(gallery);
 assert.deepEqual(gallery.lineScopes,['SeibuShinjuku']);
 assert.ok(gallery.canonicalModels.includes('西武10000系'));
 assert.equal(gallery.quarantined,false);
 assert.match(sql,/asset_scope='review'/);
 assert.match(sql,/is_generic=FALSE/);
 assert.match(sql,/source_revision_date=DATE '2025-03-15'/);
 assert.match(sql,/mini-tokyo-3d:seibu-shinjuku\.json@504d01f44b2e4c/);
 assert.match(sql,/20260407_NRABeer/);
 assert.match(sql,/20260805_NRAtanashi/);
 assert.match(sql,/Historical 2025 revision is NOT 2026-11 full train/);
 assert.match(sql,/source, serviceDate, operator, direction, train type and review guard/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(sql.includes('NULL,FALSE,FALSE)'));
});

test('full gallery remains 601 and 477 PNGs have no source number references',()=>{
 const rows=csv.trimEnd().split('\n').slice(1);
 assert.equal(new Set(rows.map(r=>r.split(',')[2])).size,601);
 assert.equal(rows.filter(r=>r.endsWith(',无号段')).length,477);
 assert.equal(triage.trimEnd().split('\n').length-1,477);
 assert.equal(rows.filter(r=>r.startsWith('私铁,')).length,600);
});
