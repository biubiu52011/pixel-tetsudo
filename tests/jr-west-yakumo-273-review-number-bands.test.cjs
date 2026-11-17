'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const mig=fs.readFileSync('supabase/migrations/20261117081500_seed_jr_west_273_yakumo_review_reference_bands_2611.sql','utf8');
const inventory=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const path='images/列车/JR西日本/JR西日本_273系.png';
const re=/^  \('2611','([^']+)','png_band\/[^']+',(\d+),(\d+),'M',NULL,'\.\.\/images\/列车\/JR西日本\/JR西日本_273系\.png',NULL,FALSE,FALSE\)(?:,)?$/gm;
test('Yakumo 273 bands are two line-scoped references, not a live image promotion',()=>{
 const rows=[...mig.matchAll(re)];
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(r=>r[1]).sort(),['SaninMain','SanyoMain']);
 for(const r of rows){assert.equal(r[2],'1001');assert.equal(r[3],'1030');}
 assert.ok(mig.includes("asset_status='review'"));
 assert.ok(mig.includes("asset_scope='review'"));
 assert.ok(mig.includes("appearance_class='requires_review'"));
 assert.ok(mig.includes("actual_vehicle_confirmed=FALSE"));
 assert.ok(!/UPDATE\s+public\.vehicle_image_assets/i.test(mig));
 assert.ok(fs.existsSync(path));
 const fromCsv=inventory.split('\n').filter(x=>x.startsWith('JR,JR西日本,'+path+','));
 assert.equal(fromCsv.length,2);
 for(const r of rows)assert.ok(fromCsv.includes(['JR','JR西日本',path,r[1],'1001','1030','M','full','纯号段（JR官方番号；资产review不可选图）'].join(',')));
});
