'use strict';
// JR source-only number/Png catalog contract. The interval never overrides
// existing date, train type, model or physical-identity checks.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const cat=JSON.parse(fs.readFileSync('data/audits/train-number-png-catalog-2611.json','utf8'));
const migration=fs.readFileSync(
 'supabase/migrations/20261118010600_seed_jr_boso_209_banetsu_c57_exact_png_number_bands_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8')
 .trimEnd().split('\n');
const images=[
 'images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png',
 'images/列车/JR東日本/JR東日本_209系_2000・2100番台_房総地区.png'
];
const sourceRules=cat.rules.filter(r=>r.origin==='frontend_js'&&images.includes(r.png));
const sqlPattern=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]*)',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
const sqlRows=[...migration.matchAll(sqlPattern)].map(r=>({
 line:r[1],segment:r[2],from:+r[3],to:+r[4],suffix:r[5],png:r[6]
}));
test('26 exact service numbers keep C57 dated and 209 local train guards',()=>{
 assert.equal(sourceRules.length,3);
 const expected=new Map();
 for(const rule of sourceRules){
  assert.ok(fs.existsSync(rule.png));
  assert.equal(rule.actual_vehicle_confirmed,false);
  assert.equal(rule.operator,'JR-East');
  assert.equal(rule.valid_from,'2026-11-01');
  assert.equal(rule.valid_to,'2026-11-30');
  assert.equal(rule.evidence_kind,'exact-list');
  assert.equal(rule.line_ids.length,1);
  const line=rule.line_ids[0];
  if(line==='BanetsuWest'){
   assert.equal(rule.png,images[0]);
   assert.deepEqual(rule.published_numbers,['8226','8233']);
   assert.equal(rule.format,'bare');
   assert.equal(rule.operating_dates.length,4);
   assert.ok(rule.train_types.includes('SLRapid'));
   assert.equal(rule.direction_number_parity,'inbound-even');
  }else{
   assert.ok(['Uchibo','Sotobo'].includes(line));
   assert.equal(rule.png,images[1]);
   assert.equal(rule.train_type,'Local');
   assert.equal(rule.format,'full');
   assert.equal(rule.published_numbers.length,12);
   assert.equal(rule.runtime_guards.rejectAmbiguousPlan,true);
  }
  for(const number of rule.published_numbers){
   const m=/^(\d+)([A-Z]*)$/.exec(number);
   assert.ok(m,'published train number valid '+number);
   assert.equal(m[2],line==='BanetsuWest'?'':'M');
   const num=+m[1];
   const key=[line,num,m[2]].join('|');
   assert.ok(!expected.has(key),'single PNG per original service number '+key);
   expected.set(key,{png:rule.png,format:rule.format,number:num,suffix:m[2],line});
  }
 }
 assert.equal(expected.size,26);
 assert.equal(sqlRows.length,26);
 for(const row of sqlRows){
  const key=[row.line,row.from,row.suffix].join('|');
  const value=expected.get(key);
  assert.ok(value,key);
  assert.equal(row.from,row.to,'no invented gaps');
  assert.equal(row.png,value.png);
  assert.equal(row.segment,'png_band/'+row.line+'/'+String(row.from).padStart(4,'0')+
   '-'+String(row.to).padStart(4,'0')+row.suffix);
  const lineCsv=['JR','JR東日本',row.png,row.line,
   String(row.from).padStart(4,'0'),String(row.to).padStart(4,'0'),
   row.suffix,value.format,'纯号段（JR既有确切车次／日期车型守卫保留）'].join(',');
  assert.ok(csv.includes(lineCsv),'missing JS-backed PNG inventory row '+key);
 }
 const newRows=csv.filter(line=>images.some(p=>line.startsWith('JR,JR東日本,'+p+','))&&
   line.includes('纯号段（JR既有确切车次／日期车型守卫保留）'));
 assert.equal(newRows.length,26);
 const e257=cat.rules.find(r=>r.origin==='frontend_js'&&
  r.png.endsWith('JR東日本_E257系_500番台.png')&&
  r.line_ids.includes('Uchibo'));
 assert.ok(e257,'existing E257 multi-corridor rule exists');
 assert.equal(e257.train_type,'LimitedExpress','Boso 209 requires Local, no type conflict');
 assert.ok(migration.includes('ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING'));
 assert.ok(migration.includes('r.png_reference<>p.png_reference'));
 assert.doesNotMatch(migration,/UPDATE\s+public\.vehicle_image_assets/i);
 assert.doesNotMatch(migration,/DO\s+UPDATE/i);
});
