'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync("supabase/migrations/20261119040000_jr60_e501_e655_kihae200_historical_numbers.sql",'utf8');
const rows=fs.readFileSync("data/audits/png-first-number-band-inventory-20261117.csv",'utf8').trimEnd().split('\n');
const triage=fs.readFileSync("data/audits/png-unmapped-source-triage-20261118.csv",'utf8');
const specs=[{"line":"JobanMain","n":562,"suffix":"M","png":"images/列车/JR東日本/JR東日本_E501系.png","model":"E501系","scope":"generic","generic":true,"appearance":"standard_or_fixed_livery","source":"https://raillab.jp/photo/587656","status":"纯号段（2026-10-11照片记录E501系K702担当562M；仅号码历史参考，不能推定其他日期车辆）","num":"0562","segment":"png_band/JobanMain/0562-0562M"},{"line":"UtsunomiyaJR","n":9022,"suffix":"M","png":"images/列车/JR東日本/JR東日本_E655系_なごみ_和.png","model":"E655系","scope":"theme","generic":false,"appearance":"dedicated_vehicle_identity","source":"https://raillab.jp/photo/584160","status":"纯号段（2026-11-01照片记录E655系なごみ担当9022M；仅编号历史参考，不能推定其他日期车辆）","num":"9022","segment":"png_band/UtsunomiyaJR/9022-9022M"},{"line":"Komii","n":136,"suffix":"D","png":"images/列车/JR東日本/JR東日本_キハE200系（小海線）.png","model":"キハE200系（小海線）","scope":"generic","generic":true,"appearance":null,"source":"https://raillab.jp/record/963048","status":"纯号段（2026-09-05乘车记录キハE200-1担当136D；仅历史参考，不能推定其他日期车辆）","num":"0136","segment":"png_band/Komii/0136-0136D"}];
test('JR60 three observed-number gallery references remain source-only and date-free',()=>{
 for(const s of specs){
  assert.ok(rows.includes(['JR','JR東日本',s.png,s.line,s.num,s.num,s.suffix,'full',s.status].join(',')),s.png);
  assert.equal(rows.filter(x=>x.startsWith('JR,JR東日本,'+s.png+',')).length,1);
  assert.ok(!triage.includes('"'+s.png+'"'));
  assert.ok(sql.includes(s.source));
  assert.ok(sql.includes("'2611','"+s.line+"','"+s.segment+"',"+s.n+","+s.n+",'"+s.suffix+"',NULL,'../"+s.png+"',NULL,FALSE,FALSE"));
  assert.ok(sql.includes("asset_scope='"+s.scope+"'"));
 }
 assert.ok(sql.includes('E501 562M is on JobanMain'));
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes('UPDATE public.vehicle_image_assets'));
 assert.equal(rows.filter(x=>x.endsWith('无号段')).length,443);
 assert.equal(new Set(rows.slice(1).map(x=>x.split(',')[2])).size,601);
});
