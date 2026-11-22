'use strict';
// Pure PNG->train NUMBER audit; does not assert actual vehicle/formation.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261118013000_seed_jr_saikyo_e233_gotemba_315_number_bands_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8').split('\n');
const rules=JSON.parse(fs.readFileSync('data/audits/train-number-png-catalog-2611.json','utf8')).rules;
const e233='images/列车/JR東日本/JR東日本_E233系_7000番台.png';
const g315='images/列车/JR東海/JR東海_315系.png';
const expected=[
 {line:'SaikyoKawagoe',png:e233,operator:'JR東日本',min:0,max:71,suffix:'KFS',format:'tail'},
 {line:'Rinkai',png:e233,operator:'JR東日本',min:0,max:71,suffix:'KFS',format:'tail'},
 {line:'Gotemba',png:g315,operator:'JR東海',min:2226,max:5550,suffix:'MG',format:'full'}
];
const re=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
const saved=[...sql.matchAll(re)].map(m=>({
 line:m[1],segment:m[2],min:+m[3],max:+m[4],suffix:m[5],png:m[6]
}));
test('three formal JR pure bands duplicate only the original scoped JS rules',()=>{
 assert.equal(saved.length,3);
 for(const x of expected){
  assert.ok(fs.existsSync(x.png),x.png);
  const rule=rules.filter(r=>r.origin==='frontend_js'&&
   r.line_ids.includes(x.line)&&r.png===x.png&&
   r.min===x.min&&r.max===x.max&&r.suffix===x.suffix&&r.format===x.format);
  assert.equal(rule.length,1,x.line+' original owner rule');
  assert.equal(rule[0].actual_vehicle_confirmed,false);
  if(x.line==='Gotemba') {
    assert.equal(rule[0].valid_from,'2026-11-01');
    assert.equal(rule[0].valid_to,'2026-11-30');
  } else {
    // JR through-service K/F/S is not an invented dated formation: its
    // all-date range still needs a compatible model and railway provenance.
    assert.equal(rule[0].valid_from,null);
    assert.equal(rule[0].valid_to,null);
    assert.equal(rule[0].runtime_guards.dateScope,'all-dates');
    assert.ok(rule[0].runtime_guards.allowedModelLabels.length>0);
    assert.ok(rule[0].source_railways_if_present.includes('odpt.Railway:TWR.Rinkai'));
  }
  const source=saved.filter(r=>r.line===x.line&&r.png===x.png);
  assert.equal(source.length,1);
  assert.equal(source[0].segment,
   'png_band/'+x.line+'/'+String(x.min).padStart(4,'0')+'-'+String(x.max).padStart(4,'0')+x.suffix);
  assert.equal(source[0].min,x.min);
  assert.equal(source[0].max,x.max);
  assert.equal(source[0].suffix,x.suffix);
  const row=['JR',x.operator,x.png,x.line,
   String(x.min).padStart(4,'0'),String(x.max).padStart(4,'0'),
   x.suffix,x.format,'纯号段（JR原有号码条件保留；不代表编组）'].join(',');
  assert.equal(csv.filter(s=>s===row).length,1,x.line+' audit CSV');
  const foreign=rules.filter(r=>r.origin==='frontend_js'&&r.png!==x.png&&
   r.line_ids.includes(x.line)&&r.suffix===x.suffix&&
   r.min<=x.max&&r.max>=x.min);
  assert.equal(foreign.length,0,x.line+' distinct PNG overlaps');
 }
 assert.ok(sql.includes("a.asset_status='available'"));
 assert.ok(sql.includes("a.asset_scope=ref.asset_scope"));
 assert.ok(sql.includes("r.suffix IN ('K','F','S')"));
 assert.ok(sql.includes("r.suffix IN ('M','G')"));
 assert.doesNotMatch(sql,/UPDATE\s+public\.vehicle_image_assets/i);
 assert.doesNotMatch(sql,/DO\s+UPDATE/i);
});
test('00..71 KFS is a last-two-digit family, not a whole train-number or carset',()=>{
 const rule=rules.find(x=>x.origin==='frontend_js'&&x.png===e233&&
  x.line_ids.includes('SaikyoKawagoe'));
 assert.deepEqual(rule.line_ids,['SaikyoKawagoe','Rinkai']);
 assert.equal(rule.direction_number_parity,'inbound-even');
 assert.equal(rule.format,'tail');
 assert.deepEqual(rule.runtime_guards.allowedModelLabels,['E233系7000番台']);
 assert.ok(rule.source_railways_if_present.includes('odpt.Railway:TWR.Rinkai'));
 assert.equal(rule.requires_compatible_plan,false);
 assert.equal(rule.runtime_guards.dateScope,'all-dates');
});
test('Gotemba 315 envelope matches precisely the 88 pre-existing November public numbers',()=>{
 const rule=rules.find(x=>x.origin==='frontend_js'&&x.png===g315);
 assert.ok(rule&&rule.published_numbers.length===88);
 assert.equal(rule.train_type,'Local');
 assert.equal(rule.operator,'JR-Central');
 assert.deepEqual(rule.source_railways,['odpt.Railway:JR-Central.Gotemba']);
 assert.ok(rule.published_numbers.every(n=>/^\d{4}[MG]$/.test(n)));
 assert.deepEqual([...new Set(rule.published_numbers.map(s=>s.slice(-1)))].sort(),['G','M']);
 const nums=rule.published_numbers.map(s=>+s.slice(0,-1));
 assert.equal(Math.min(...nums),2226);
 assert.equal(Math.max(...nums),5550);
 assert.equal(new Set(rule.published_numbers).size,88);
 assert.equal(rule.runtime_guards.referenceOnly,true);
 assert.equal(rule.runtime_guards.illustrative,true);
});
