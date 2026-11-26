'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const png='images/列车/東武鉄道/東武鉄道_50050型.png';
const sql=fs.readFileSync('supabase/migrations/20261117164500_seed_private_tobu_50050_hanzomon_T_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const index=JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
test('Tobu 50050 Hanzomon number envelope preserves exact roster requirements',()=>{
 const m=sql.match(/^  \('2611','Hanzomon','png_band\/Hanzomon\/0452-2282T',452,2282,'T',NULL,'\.\.\/images\/列车\/東武鉄道\/東武鉄道_50050型\.png',NULL,FALSE,FALSE\)$/m);
 assert.ok(m);assert.ok(fs.existsSync(png));
 const row=['私铁','東武鉄道',png,'Hanzomon','0452','2282','T','metro-prefixed','纯号段（东武50050原精确车次和日期车型守卫保留）'].join(',');
 assert.equal(csv.trimEnd().split(/\r?\n/).filter(x=>x.startsWith('私铁,東武鉄道,'+png+',')).length,188);
 assert.ok(!csv.includes(row));
 const item=index.find(x=>x.path===png),ros=item.runtimeNumberRosters.filter(x=>x.lineId==='Hanzomon');
 assert.equal(ros.length,2);assert.equal(ros.reduce((n,r)=>n+r.explicitDocumentedNumberCount,0),253);
 const digits=ros.flatMap(r=>r.exactContiguousBands.flatMap(b=>[b.from,b.to]))
  .map(x=>Number(x.match(/^[A-Z](\d+)T$/)?.[1]));
 assert.ok(digits.every(Number.isFinite));
 assert.equal(Math.min(...digits),452);assert.equal(Math.max(...digits),2282);
 for(const r of ros){
  assert.equal(r.numberFormat,'full_exact');
  assert.equal(r.validFrom,'2026-11-02');assert.equal(r.validTo,'2026-11-30');
  assert.equal(r.referenceOnly,true);assert.equal(r.actualVehicleConfirmed,false);
  assert.ok(r.guardDescription.includes('operator'));
 }
 assert.ok(sql.includes("asset_scope='generic'"));
 assert.ok(sql.includes('actual_vehicle_confirmed=FALSE'));
 assert.doesNotMatch(sql,/UPDATE\s+public\.vehicle_image_assets/i);
});
