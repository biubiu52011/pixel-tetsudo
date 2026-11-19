'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync("supabase/migrations/20261119062000_jr61_h5_e5_313_321_twelve_observed_numbers.sql",'utf8');
const inventory=fs.readFileSync("data/audits/png-first-number-band-inventory-20261117.csv",'utf8').trimEnd().split('\n');
const triage=fs.readFileSync("data/audits/png-unmapped-source-triage-20261118.csv",'utf8');
const groups=[{"operator":"JR北海道","owner":"JR-Hokkaido","model":"H5系","line":"TohokuShinkansen","scope":"generic","appearance":"standard_or_fixed_livery","status":"纯号段（JR北海道H5系2026年9月3日3023B乘车观察；车型历史参考，非现时列车编组）","obs":[[3023,"B","2026-09-03","https://raillab.jp/record/963856"]],"name":"JR北海道_H5系.png","png":"images/列车/JR北海道/JR北海道_H5系.png"},{"operator":"JR東日本","owner":"JR-East","model":"E5系","line":"TohokuShinkansen","scope":"generic","appearance":"standard_or_fixed_livery","status":"纯号段（JR東日本E5系2026年实拍或乘车4个B番号；不推定其他日期和编组）","obs":[[17,"B","2026-07-23","https://raillab.jp/photo/557203"],[154,"B","2026-08-11","https://raillab.jp/record/948388"],[203,"B","2026-02-13","https://raillab.jp/record/865222"],[6129,"B","2026-04-18","https://raillab.jp/record/894548"]],"name":"JR東日本_E5系.png","png":"images/列车/JR東日本/JR東日本_E5系.png"},{"operator":"JR東海","owner":"JR-Central","model":"313系","line":"TokaidoCentral","scope":"formation","appearance":null,"status":"纯号段（JR東海313系2026年实拍或乘车6个普通列车番号；多编组车型参考、不推定固定实车）","obs":[[437,"M","2026-10-31","https://raillab.jp/record/991500"],[490,"M","2026-09-21","https://raillab.jp/photo/576119"],[1424,"M","2026-07-09","https://raillab.jp/record/930431"],[2311,"F","2026-07-31","https://raillab.jp/record/940538"],[5512,"F","2026-09-20","https://raillab.jp/photo/573765"],[5517,"F","2026-10-24","https://raillab.jp/photo/585864"]],"name":"JR東海_313系.png","png":"images/列车/JR東海/JR東海_313系.png"},{"operator":"JR西日本","owner":"JR-West","model":"321系","line":"SanyoMain","scope":"generic","appearance":"standard_or_fixed_livery","status":"纯号段（JR西日本321系2026年10月16日神户线531C乘车观察；仅历史参考、不推定每日实车）","obs":[[531,"C","2026-10-16","https://raillab.jp/record/984796"]],"name":"JR西日本_321系.png","png":"images/列车/JR西日本/JR西日本_321系.png"}];
test('JR61 12 source-observed singletons across four images are strictly reference-only',()=>{
 assert.equal(groups.length,4); assert.equal(groups.reduce((n,g)=>n+g.obs.length,0),12);
 for(const g of groups){
  const imgRows=inventory.filter(row=>row.startsWith('JR,'+g.operator+','+g.png+','));
  assert.equal(imgRows.length,g.obs.length,g.name); assert.ok(!triage.includes('"'+g.png+'"'));
  for(const [n,s,date,url] of g.obs){
   const padded=String(n).padStart(4,'0'),seg='png_band/'+g.line+'/'+padded+'-'+padded+s;
   assert.ok(imgRows.includes(['JR',g.operator,g.png,g.line,padded,padded,s,'full',g.status].join(',')));
   assert.ok(sql.includes(url));
   assert.ok(sql.includes("'2611','"+g.line+"','"+seg+"',"+n+","+n+",'"+s+"',NULL,'../"+g.png+"',NULL,FALSE,FALSE"));
  }
 }
 assert.equal(inventory.filter(row=>row.endsWith('无号段')).length,triage.trimEnd().split('\n').length-1,
  'unmapped CSV and source-triage must have the same count after later batches');
 assert.equal(new Set(inventory.slice(1).map(x=>x.split(',')[2])).size,601);
 assert.ok(sql.includes('historical')); assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes('UPDATE public.vehicle_image_assets'));
});
