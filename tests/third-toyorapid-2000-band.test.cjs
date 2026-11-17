'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const cat=JSON.parse(fs.readFileSync('data/audits/train-number-png-catalog-2611.json','utf8'));
const sql=fs.readFileSync('supabase/migrations/20261117084000_seed_png_first_third_toyorapid_2000_tozai_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const png='images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png';
test('ToyoRapid number band is exactly the original scoped frontend rule',()=>{
 const owner=cat.rules.filter(r=>r.origin==='frontend_js'&&
  r.line_ids.includes('Tozai')&&r.png===png&&r.min===400&&r.max===2599&&
  r.suffix==='T'&&r.format==='metro-prefixed');
 assert.equal(owner.length,1);
 assert.equal(owner[0].runtime_guards.excludeTrainType,'LimitedExpress');
 assert.equal(owner[0].runtime_guards.sourceOperatorFallback,true);
 assert.equal(cat.rules.filter(r=>r.line_ids.includes('Tozai')&&r.png!==png&&
  String(r.suffix).includes('T')&&r.min<=2599&&r.max>=400).length,0);
 assert.ok(sql.includes('actual_vehicle_confirmed=FALSE'));
 assert.ok(fs.existsSync(png));
 const rows=csv.trim().split('\n').filter(x=>x.startsWith('第三部门铁道,東葉高速鉄道,'+png+','));
 assert.equal(rows.length,2);
 assert.ok(rows.includes(['第三部门铁道','東葉高速鉄道',png,'Tozai','0400','2599','T','metro-prefixed',
  '纯号段（第三部门铁道原有条件保留）'].join(',')));
});
