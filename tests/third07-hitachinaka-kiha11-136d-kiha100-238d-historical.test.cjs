'use strict';
// Third07: 2025-11-26 photographed 136D KiHa11-6 and 238D KiHa100-39.
// Historical data-only references; NEVER 2026-11 live vehicle assignments.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const inventory=read('data/audits/png-first-number-band-inventory-20261117.csv').trimEnd().split('\n').slice(1);
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const specs=[{"file":"20261118235500_third07_hitachinaka_kiha11_136d_20251126","number":136,"png":"images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ11形.png","status":"纯号段（2025-11-26现场记录キハ11-6担当136D；仅该日湊线历史参考，非每日固定车辆）"},{"file":"20261118235600_third07_hitachinaka_kiha100_238d_20251126","number":238,"png":"images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ100形.png","status":"纯号段（2025-11-26现场记录キハ100-39担当238D，运营方确认2025-11营业开始；非每日固定车辆）"}];
test('two 2025-11-26 historical vehicle/number pairs survive on one DATA-ONLY Minato key',()=>{
 const actual=[];
 for(const s of specs){
  const n=String(s.number).padStart(4,'0');
  const hits=inventory.filter(line=>line.startsWith('第三部门铁道,ひたちなか海浜鉄道,'+s.png+','));
  assert.deepEqual(hits,['第三部门铁道,ひたちなか海浜鉄道,'+s.png+',HitachinakaMinato,'+n+','+n+',D,full,'+s.status]);
  const sql=read('supabase/migrations/'+s.file+'.sql');
  assert.match(sql,/entry-12948456585\.html/);
  assert.match(sql,/2025-11-26/);
  assert.match(sql,/DATA-ONLY key HitachinakaMinato/);
  assert.match(sql,/asset_scope='generic' AND is_generic=TRUE/);
  assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
  assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
  assert.ok(!sql.includes('CREATE TABLE'));
  assert.ok(!triage.includes('"'+s.png+'"'));
  assert.equal([...sql.matchAll(/\('2611','HitachinakaMinato','png_band\/HitachinakaMinato\/\d+-\d+D',\d+,\d+,'D',NULL/g)].length,1);
  actual.push(s.number);
 }
 assert.deepEqual(actual,[136,238]);
 assert.equal(new Set(inventory.map(s=>s.split(',')[2])).size,601);
 assert.equal(inventory.filter(s=>s.endsWith('无号段')).length,443);
});
test('unique roster identity is not claimed, and Hoshiimo 100-40 artwork remains unnumbered',()=>{
 const alt='images/列车/ひたちなか海浜鉄道/ひたちなか海浜鉄道_キハ100形_キハ100-40_ほしいも列車.png';
 assert.ok(inventory.includes('第三部门铁道,ひたちなか海浜鉄道,'+alt+',,,,,,无号段'));
 assert.ok(triage.includes('"'+alt+'"'));
 for(const s of specs){
  const sql=read('supabase/migrations/'+s.file+'.sql');
  assert.ok(!sql.includes('png_band/HitachinakaMinato/0136-0238D'));
 }
});
