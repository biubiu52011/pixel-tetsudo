'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const png='images/列车/東急電鉄/東急電鉄_2020系.png';
const src=fs.readFileSync('supabase/migrations/20261117154000_seed_private_tokyu_2020_oshigage_K_bands_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const idx=JSON.parse(fs.readFileSync('data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
const bands=[{line:'Hanzomon',min:501,max:2333,count:478},
  {line:'TobuSkytree',min:503,max:4934,count:182}];
test('Tokyu 2020 November K bands keep exact roster guards',()=>{
 const regex=/^  \('2611','([^']+)','png_band\/[^']+',(\d+),(\d+),'K',NULL,'\.\.\/images\/列车\/東急電鉄\/東急電鉄_2020系\.png',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const list=[...src.matchAll(regex)];
 assert.equal(list.length,2);
 const entry=idx.find(x=>x.path===png);
 assert.ok(entry);assert.ok(fs.existsSync(png));
 for(const b of bands){
  const row=list.find(x=>x[1]===b.line);
  assert.ok(row);assert.equal(+row[2],b.min);assert.equal(+row[3],b.max);
  const rosters=entry.runtimeNumberRosters.filter(x=>x.lineId===b.line);
  assert.equal(rosters.length,2);
  assert.equal(rosters.reduce((n,r)=>n+r.explicitDocumentedNumberCount,0),b.count);
  const digits=rosters.flatMap(r=>r.exactContiguousBands.flatMap(y=>[y.from,y.to]))
   .map(x=>Number(x.match(/^[A-Z](\d+)K$/)?.[1]));
  assert.equal(Math.min(...digits),b.min);assert.equal(Math.max(...digits),b.max);
  for(const roster of rosters){
   assert.equal(roster.validFrom,'2026-11-02');
   assert.equal(roster.validTo,'2026-11-30');
   assert.equal(roster.numberFormat,'full_exact');
   assert.equal(roster.referenceOnly,true);
   assert.equal(roster.actualVehicleConfirmed,false);
   assert.ok(roster.guardDescription.includes('operator'));
  }
  const wanted=['私铁','東急電鉄',png,b.line,String(b.min).padStart(4,'0'),
    String(b.max).padStart(4,'0'),'K','metro-prefixed',
    '纯号段（东急2020原有精确名单与日期车型守卫保留）'].join(',');
  assert.ok(csv.split('\n').includes(wanted));
 }
 assert.equal(csv.split('\n').filter(x=>x.startsWith('私铁,東急電鉄,'+png+',')).length,2);
 assert.ok(src.includes("asset_scope='generic'"));
 assert.ok(src.includes('actual_vehicle_confirmed=FALSE'));
 assert.doesNotMatch(src,/UPDATE\s+public\.vehicle_image_assets/i);
 assert.doesNotMatch(src,/DO\s+UPDATE/i);
});
