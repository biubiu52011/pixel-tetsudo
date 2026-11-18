'use strict';
// JR58 historical exact-number service references: source date is 2026-10-03,
// never a generic 2026-11 K754 formation assignment.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118224000_jr58_e501_sakigake_20261003_9621m_9725m_historical.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/JR東日本/JR東日本_E501系_E501_SAKIGAKE.png';
const alternate='images/列车/JR東日本/JR東日本_E501系_さきがけ.png';
const status='纯号段（2026年10月3日E501 SAKIGAKE K754历史运行：9621M・9725M，官网活动＋当日影像核实；不证明2026年11月实车）';
test('two Oct 3 historical train numbers create three route-specific exact islands',()=>{
 const target=csv.trimEnd().split('\n').filter(s=>s.startsWith('JR,JR東日本,'+png+','));
 assert.deepEqual(target,[
  'JR,JR東日本,'+png+',JobanMain,9621,9621,M,full,'+status,
  'JR,JR東日本,'+png+',JobanMain,9725,9725,M,full,'+status,
  'JR,JR東日本,'+png+',Mito,9621,9621,M,full,'+status
 ]);
 assert.match(sql,/20261003\/37\.html/);
 assert.match(sql,/20261003\/36\.html/);
 assert.match(sql,/media\.jreast\.co\.jp\/articles\/6720/);
 assert.equal([...sql.matchAll(/\('2611','(JobanMain|Mito)','png_band\/(?:JobanMain|Mito)\/\d+-\d+M'/g)].length,3);
 assert.ok(!triage.includes('"'+png+'"'));
 assert.ok(triage.includes('"'+alternate+'"'));
 assert.ok(csv.includes('JR,JR東日本,'+alternate+',,,,,,无号段'));
 assert.equal(new Set(csv.trimEnd().split('\n').slice(1).map(x=>x.split(',')[2])).size,601);
});
test('no November 2026 vehicle authorization and no competing artwork',()=>{
 assert.match(sql,/formation_id='K754'/);
 assert.match(sql,/asset_scope='theme'/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes('png_band/JobanMain/9621-9725'));
});
