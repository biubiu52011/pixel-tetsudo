'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261117071000_seed_jr_253_nikko_kinugawa_png_bands_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const pattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z])',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
const ranges=[...sql.matchAll(pattern)].map(m=>({line:m[1],low:+m[3],high:+m[4],suffix:m[5],png:m[6]}));
const png='images/列车/JR東日本/JR東日本_253系_1000番台.png';
const rows=csv.trim().split('\n').filter(l=>l.startsWith('JR,JR東日本,'+png+','));
test('JR 253 first-number bands preserve 2026/11 numbered JR-through service scopes',()=>{
 assert.equal(ranges.length,10);
 assert.equal(rows.length,10);
 const expectedByLine={
  UtsunomiyaJR:[[1082,1083],[5021,5022],[5026,5026],[5113,5113]],
  TobuNikko:[[1082,1083],[5021,5022],[5026,5026],[5113,5113]],
  Nikkoku:[[1082,1083],[5113,5113]]
 };
 for(const [line,expected] of Object.entries(expectedByLine)){
  const actual=ranges.filter(x=>x.line===line).map(x=>[x.low,x.high]);
  assert.deepEqual(actual,expected,line);
 }
 assert.ok(fs.existsSync(png));
 for(const r of ranges){
  assert.ok(r.low<=r.high);
  assert.equal(r.suffix,'M');
  assert.equal(r.png,png);
  assert.ok(rows.includes(['JR','JR東日本',png,r.line,
   String(r.low).padStart(4,'0'),String(r.high).padStart(4,'0'),
   'M','full','纯号段（JR专用原始条件保留）'].join(',')),r.line);
 }
 assert.ok(!sql.includes('actual_vehicle_confirmed,TRUE'));
 assert.ok(!sql.includes('require_exact_roster,TRUE'));
});
