'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const png='images/列车/埼玉高速鉄道/埼玉高速鉄道_2000系.png';
const sql=fs.readFileSync('supabase/migrations/20261117093000_seed_png_first_saitama_2000_operator_M_tail_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
test('SaitamaRapid 2000 M suffix uses tail 80..98, never full numeric trains',()=>{
 const pattern=/^  \('2611','([^']+)','png_band\/[^']+',(\d+),(\d+),'M',NULL,'\.\.\/images\/列车\/埼玉高速鉄道\/埼玉高速鉄道_2000系\.png',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const refs=[...sql.matchAll(pattern)].map(x=>({line:x[1],from:+x[2],to:+x[3]}));
 assert.deepEqual(refs.sort((a,b)=>a.line.localeCompare(b.line)),[
  {line:'Namboku',from:80,to:98},{line:'SaitamaRapid',from:80,to:98}]);
 const rows=csv.trim().split('\n').filter(s=>s.startsWith('第三部门铁道,埼玉高速鉄道,'+png+','));
 assert.equal(rows.length,2);
 for(const r of refs)assert.ok(rows.includes([
  '第三部门铁道','埼玉高速鉄道',png,r.line,'0080','0098','M','tail',
  '纯号段（第三部门M后两位；来源条件保留）'].join(',')));
 assert.ok(fs.existsSync(png));
 assert.ok(sql.includes("asset_status='available'"));
 assert.ok(sql.includes('actual_vehicle_confirmed=FALSE'));
 assert.ok(sql.includes("The frontend/CSV numberFormat is 'tail'"));
 assert.ok(!/UPDATE\s+public\.vehicle_image_assets/i.test(sql));
});
