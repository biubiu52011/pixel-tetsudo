'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261117131000_seed_private_odakyu_4000_sotetsu_12000_source_bands_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const cat=JSON.parse(fs.readFileSync('data/audits/train-number-png-catalog-2611.json','utf8'));
const rules=[
 {line:'JobanLocal',min:400,max:2599,suffix:'E',format:'full',
  png:'images/列车/小田急電鉄/小田急電鉄_4000形_標準色.png',op:'小田急電鉄'},
 {line:'SaikyoKawagoe',min:72,max:79,suffix:'KFS',format:'tail',
  png:'images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png',op:'相模鉄道'}
];
test('2 private source-backed PNG bands mirror JS and cannot waive guards',()=>{
 const pattern=/^  \('2611','([^']+)','png_band\/[^']+',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const matches=[...sql.matchAll(pattern)];assert.equal(matches.length,2);
 for(const e of rules){
  const m=matches.find(x=>x[1]===e.line);
  assert.ok(m);assert.equal(+m[2],e.min);assert.equal(+m[3],e.max);
  assert.equal(m[4],e.suffix);assert.equal(m[5],e.png);
  const frontend=cat.rules.filter(x=>x.origin==='frontend_js'&&
    x.line_ids.includes(e.line)&&x.png===e.png&&x.min===e.min&&
    x.max===e.max&&x.suffix===e.suffix&&x.format===e.format);
  assert.equal(frontend.length,1);
  assert.ok(frontend[0].runtime_guards.allowedModelLabels.length>0);
  assert.ok(frontend[0].valid_from&&frontend[0].valid_to);
  const expected=['私铁',e.op,e.png,e.line,String(e.min).padStart(4,'0'),
    String(e.max).padStart(4,'0'),e.suffix,e.format,'纯号段（私铁原有JS条件保留）'].join(',');
  assert.ok(csv.includes(expected));
  assert.ok(fs.existsSync(e.png));
 }
 const odakyu=rules[0],sotetsu=rules[1];
 assert.equal(cat.rules.find(x=>x.png===odakyu.png&&x.line_ids.includes(odakyu.line)).train_type,'Local');
 assert.equal(cat.rules.find(x=>x.png===sotetsu.png&&x.line_ids.includes(sotetsu.line)).direction_number_parity,'inbound-even');
 assert.ok(sql.includes("asset_scope='review'"));
 assert.ok(sql.includes('actual_vehicle_confirmed=FALSE'));
 assert.doesNotMatch(sql,/UPDATE\s+public\.vehicle_image_assets/i);
});
