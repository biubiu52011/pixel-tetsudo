'use strict';
// Verified 2026-11 source-number islands, not actual formation assignment.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const migration=fs.readFileSync('supabase/migrations/20261118014500_seed_jr_hachiko_e231_3000_de10_banetsu_exact_png_bands_2611.sql','utf8');
const inventory=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8').trim().split('\n');
const c=JSON.parse(fs.readFileSync('data/audits/train-number-png-catalog-2611.json','utf8')).rules;
const source={
  'js-0073':{png:'images/列车/JR東日本/JR東日本_E231系_3000番台.png',
    line:'Hachiko',count:148,bandCount:90,suffix:'E',format:'full'},
  'js-0033':{png:'images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png',
    line:'BanetsuWest',count:2,bandCount:2,suffix:'',format:'bare'}
};
const sqlRows=[...migration.matchAll(/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]*)',NULL,'\.\.\/(images\/列车\/JR東日本\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm)]
 .map(m=>({line:m[1],segment:m[2],from:+m[3],to:+m[4],suffix:m[5],png:m[6]}));
test('SQL and gallery CSV contain only 148+2 existing numbered services in 90+2 no-gap islands',()=>{
 assert.equal(sqlRows.length,92);
 const actualKeys=new Set(sqlRows.map(r=>[r.line,r.segment,r.png].join('|')));
 assert.equal(actualKeys.size,92);
 const expected=[];
 for(const [id,sp] of Object.entries(source)){
  const rule=c.find(r=>r.id===id);
  assert.ok(rule);
  assert.equal(rule.origin,'frontend_js');
  assert.equal(rule.png,sp.png);
  assert.deepEqual(rule.line_ids,[sp.line]);
  assert.equal(rule.operator,'JR-East');
  assert.equal(rule.evidence_kind,'exact-list');
  assert.equal(rule.valid_from,'2026-11-01');
  assert.equal(rule.valid_to,'2026-11-30');
  assert.equal(rule.actual_vehicle_confirmed,false);
  assert.equal(rule.published_numbers.length,sp.count);
  assert.equal(new Set(rule.published_numbers).size,sp.count);
  assert.equal(rule.suffix,sp.suffix);
  assert.equal(rule.format,sp.format);
  assert.ok(fs.existsSync(sp.png));
  const numbers=rule.published_numbers.map(str=>{
   const p=/^(\d{2,5})([A-Z]?)$/.exec(str);
   assert.ok(p,str);
   assert.equal(p[2],sp.suffix);
   return Number(p[1]);
  }).sort((a,b)=>a-b);
  const bands=[];
  for(const n of numbers){
   const last=bands.at(-1);
   if(last&&last.to+1===n)last.to=n;
   else bands.push({from:n,to:n});
  }
  assert.equal(bands.length,sp.bandCount);
  for(const band of bands){
   const start=String(band.from).padStart(4,'0');
   const end=String(band.to).padStart(4,'0');
   const segment='png_band/'+sp.line+'/'+start+'-'+end+sp.suffix;
   const row=sqlRows.filter(r=>r.segment===segment&&r.line===sp.line&&
     r.png===sp.png&&r.from===band.from&&r.to===band.to&&r.suffix===sp.suffix);
   assert.equal(row.length,1,segment);
   const csv=['JR','JR東日本',sp.png,sp.line,start,end,sp.suffix,sp.format,
     '纯号段（JR明示番号；车型及资产仍待复核）'].join(',');
   assert.equal(inventory.filter(s=>s===csv).length,1,segment);
   expected.push(row[0]);
  }
  // These are number-source references; the gallery assets remain review-only.
  assert.match(migration,/\ba\.asset_status='review'/);
  assert.match(migration,/\ba\.asset_scope='review'/);
  assert.match(migration,/\ba\.appearance_class='requires_review'/);
  assert.doesNotMatch(migration,/\bUPDATE\s+public\.vehicle_image_assets\b/i);
 }
 assert.equal(expected.length,92);
 assert.equal(new Set(expected.map(x=>x.line+'|'+x.segment)).size,92);
});
test('Hachiko E231 needs explicit E231 model evidence; ranges cannot identify 209 vehicles',()=>{
 const r=c.find(x=>x.id==='js-0073');
 assert.equal(r.train_type,'Local');
 assert.equal(r.runtime_guards.requireExplicitModelEvidence,true);
 assert.equal(r.runtime_guards.rejectAmbiguousPlan,true);
 assert.deepEqual(r.runtime_guards.allowedModelLabels,['E231系3000番台']);
 assert.deepEqual(r.source_railways,['odpt.Railway:JR-East.Hachiko']);
 const rows=sqlRows.filter(x=>x.line==='Hachiko');
 assert.equal(rows.length,90);
 assert.equal(rows.reduce((n,x)=>n+(x.to-x.from+1),0),148);
 assert.ok(rows.some(x=>x.from===461&&x.to===461));
 assert.ok(!rows.some(x=>x.from<=462&&x.to>=462),
   'do not invent 462E between confirmed 461E and 563E');
 assert.ok(!rows.some(x=>x.from<=999&&x.to>=999),
   'do not fill undocumented interior gap');
});
test('DL Banetsu only includes official 9226/9233 dated Nov 1/8/15',()=>{
 const r=c.find(x=>x.id==='js-0033');
 assert.deepEqual(r.published_numbers,['9226','9233']);
 assert.deepEqual(r.operating_dates,['2026-11-01','2026-11-08','2026-11-15']);
 assert.deepEqual(r.train_types,['Rapid','SLRapid']);
 assert.equal(r.direction_number_parity,'inbound-even');
 assert.deepEqual(r.runtime_guards.allowedModelLabels,['DE10形（DLばんえつ物語）']);
 assert.deepEqual(r.source_railways,['odpt.Railway:JR-East.BanetsuWest']);
 const a=sqlRows.filter(x=>x.line==='BanetsuWest');
 assert.deepEqual(a.map(x=>[x.from,x.to,x.suffix]),[[9226,9226,''],[9233,9233,'']]);
 assert.ok(!a.some(x=>x.from<=9227&&x.to>=9227));
 assert.match(migration,/timetables\.jreast\.co\.jp\/2611\/train\/185\/187871\.html/);
 assert.match(migration,/timetables\.jreast\.co\.jp\/2611\/train\/185\/187881\.html/);
});
