'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
test('Hokkaido 733 Hakodate Liner source-only number intervals are in one CSV',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261117073000_seed_jr_hokkaido_733_hakodate_liner_png_bands_2611.sql','utf8');
 const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
 const p='images/列车/JR北海道/JR北海道_733系_1000代_はこだてライナー.png';
 const rows=csv.trim().split('\n').filter(x=>x.startsWith('JR,JR北海道,'+p+','));
 assert.equal(rows.length,2);
 const expected=[
  ['HakodateMain','1321','1368','M','full','纯号段（JR专用原始条件保留）'],
  ['HakodateMain','3323','3362','M','full','纯号段（JR专用原始条件保留）']
 ];
 assert.deepEqual(rows.map(x=>x.split(',').slice(3)),expected);
 assert.ok(fs.existsSync(p));
 const matches=[...sql.matchAll(/^  \('2611','HakodateMain','png_band\/[^']+',(\d+),(\d+),'M',NULL,'\.\.\/images\/列车\/JR北海道\/JR北海道_733系_1000代_はこだてライナー\.png',NULL,FALSE,FALSE\)(?:,)?$/gm)];
 assert.deepEqual(matches.map(x=>[+x[1],+x[2]]),[[1321,1368],[3323,3362]]);
 assert.ok(sql.includes('actual_vehicle_confirmed=FALSE'));
});
