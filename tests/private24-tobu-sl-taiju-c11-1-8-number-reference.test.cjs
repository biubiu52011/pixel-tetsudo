'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118201300_private24_tobu_sl_taiju_c11_1_8_official_number_reference.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/東武鉄道/東武鉄道_C11形_SL大樹.png';
const status='纯号段（东武2026年3月官方SL大樹1-8番号与11月SL/DL轮换参考；实际机车及运行日不可由号码单独确定，PNG仅review）';
test('Private24 official 2026 SL Taiju numbers are a single Nikkoku reference band',()=>{
 assert.match(sql,/time-table_01_kudari\.pdf/);
 assert.match(sql,/time-table_01_nobori\.pdf/);
 assert.match(sql,/20261111160137/);
 assert.match(sql,/may be DL \(DE10\)/);
 assert.equal([...sql.matchAll(/\('2611','Nikkoku','png_band\/Nikkoku\/0001-0008',1,8,''/g)].length,1);
 assert.deepEqual(csv.trimEnd().split('\n').filter(x=>x.startsWith('私铁,東武鉄道,'+png+',')),[
  '私铁,東武鉄道,'+png+',Nikkoku,0001,0008,,full,'+status]);
 assert.ok(!triage.includes('"'+png+'"'));
 for(const c of ['images/列车/東武鉄道/東武鉄道_12系客車_SL大樹.png','images/列车/東武鉄道/東武鉄道_14系客車_SL大樹.png']){
  assert.ok(triage.includes('"'+c+'"'));
  assert.ok(csv.includes('私铁,東武鉄道,'+c+',,,,,,无号段'));
 }
 assert.equal(new Set(csv.trimEnd().split('\n').slice(1).map(x=>x.split(',')[2])).size,601);
});
test('review-only C11 artwork is not a verified stock or date roster',()=>{
 assert.match(sql,/asset_scope='review'/);
 assert.match(sql,/appearance_class='dedicated_vehicle_identity'/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.ok(!sql.includes('CREATE TABLE'));
});
