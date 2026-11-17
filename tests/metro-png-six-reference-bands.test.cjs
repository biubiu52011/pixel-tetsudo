'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs');
const cat=JSON.parse(fs.readFileSync('data/audits/train-number-png-catalog-2611.json','utf8'));
const sql=fs.readFileSync('supabase/migrations/20261117061000_seed_png_first_metro_unique_reference_bands_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const re=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]*)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
const rows=[...sql.matchAll(re)].map(m=>({line:m[1],min:+m[3],max:+m[4],suffix:m[5],png:m[6]}));
const fmt={Ginza:'metro-bare',Marunouchi:'metro-bare',MarunouchiBranch:'metro-bare',Chiyoda:'metro-prefixed',Namboku:'metro-prefixed',JobanLocal:'full'};
test('six guarded metro bands are an exact copy of one JS source, not guesswork',()=>{
 assert.equal(rows.length,6);
 assert.equal(new Set(rows.map(x=>x.line)).size,6);
 assert.equal(new Set(rows.map(x=>x.png)).size,4);
 for(const r of rows){
  assert.ok(r.min<=r.max&&Object.hasOwn(fmt,r.line));
  const old=cat.rules.filter(x=>x.origin==='frontend_js'&&x.line_ids.includes(r.line)&&x.png===r.png&&x.min===r.min&&x.max===r.max&&x.suffix===r.suffix&&x.format===fmt[r.line]);
  assert.equal(old.length,1,r.line+' exact owner source');
  assert.equal(old[0].valid_from,'2026-11-01');
  assert.equal(old[0].valid_to,'2026-11-30');
  assert.equal(old[0].actual_vehicle_confirmed,false);
  assert.equal(cat.rules.filter(x=>x.line_ids.includes(r.line)&&x.png!==r.png&&x.suffix===r.suffix&&x.min<=r.max&&x.max>=r.min).length,0,r.line+' conflicting PNG');
  assert.ok(fs.existsSync(r.png));
  const csvRow=['地铁','東京メトロ',r.png,r.line,String(r.min).padStart(4,'0'),String(r.max).padStart(4,'0'),r.suffix,fmt[r.line],'纯号段（地铁原有条件保留）'].join(',');
  assert.ok(csv.split('\n').includes(csvRow),r.line+' missing inventory row');
 }
});
test('ambiguous metro lines and unverified Asakusa remain unpromoted',()=>{
 for(const line of ['Tozai','Yurakucho','Fukutoshin','Mita','Shinjuku','Oedo','ChiyodaBranch','Asakusa'].filter(x=>x!=='ChiyodaBranch')){
  assert.ok(!rows.some(x=>x.line===line),line);
 }
});
