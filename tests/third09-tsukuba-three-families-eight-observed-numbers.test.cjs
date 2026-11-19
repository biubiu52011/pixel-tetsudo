'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const currentPendingPngCount=fs.readFileSync('data/audits/png-unmapped-source-triage-20261118.csv','utf8').trimEnd().split('\n').length-1;
const sql=fs.readFileSync("supabase/migrations/20261119050000_third09_tsukuba_8_observed_photo_numbers.sql",'utf8');
const rows=fs.readFileSync("data/audits/png-first-number-band-inventory-20261117.csv",'utf8').trimEnd().split('\n');
const triage=fs.readFileSync("data/audits/png-unmapped-source-triage-20261118.csv",'utf8');
const grouped=[{"model":"TX-1000系","status":"纯号段（TX-1000系2025年实拍3个客运番号；仅历史参考，不推定每日实车）","numbers":[{"n":5305,"date":"2025-08-07","url":"https://raillab.jp/photo/470346"},{"n":5316,"date":"2025-04-22","url":"https://raillab.jp/photo/441064"},{"n":5319,"date":"2025-04-22","url":"https://raillab.jp/photo/441277"}],"png":"images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-1000系.png"},{"model":"TX-2000系","status":"纯号段（TX-2000系2025年实拍3个客运番号；仅历史参考，不推定每日实车）","numbers":[{"n":3021,"date":"2025-04-22","url":"https://raillab.jp/photo/441001"},{"n":3027,"date":"2025-01-11","url":"https://raillab.jp/photo/413069"},{"n":5036,"date":"2025-01-11","url":"https://raillab.jp/photo/413095"}],"png":"images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-2000系.png"},{"model":"TX-3000系","status":"纯号段（TX-3000系2025年实拍2个客运番号；仅历史参考，不推定每日实车）","numbers":[{"n":5031,"date":"2025-08-07","url":"https://raillab.jp/photo/470340"},{"n":5044,"date":"2025-08-08","url":"https://raillab.jp/photo/480738"}],"png":"images/列车/首都圏新都市鉄道/首都圏新都市鉄道_TX-3000系.png"}];
test('Third09 stores eight exact historically observed passenger-number intervals for three distinct TX PNGs',()=>{
 assert.equal(grouped.length,3);
 assert.equal(grouped.reduce((sum,g)=>sum+g.numbers.length,0),8);
 for(const g of grouped){
  const csv=rows.filter(s=>s.startsWith('第三部门铁道,首都圏新都市鉄道,'+g.png+','));
  assert.equal(csv.length,g.numbers.length,g.model);
  assert.ok(!triage.includes('"'+g.png+'"'));
  for(const n of g.numbers){
   const code=String(n.n).padStart(4,'0');
   const expected=['第三部门铁道','首都圏新都市鉄道',g.png,'TsukubaExpress',code,code,'','full',g.status].join(',');
   assert.ok(csv.includes(expected),expected);
   assert.ok(sql.includes(n.url));
   assert.ok(sql.includes("'2611','TsukubaExpress','png_band/TsukubaExpress/"+code+'-'+code+"',"+n.n+','+n.n+",'',NULL,'../"+g.png+"',NULL,FALSE,FALSE"));
  }
 }
 assert.equal(rows.filter(s=>s.endsWith('无号段')).length,currentPendingPngCount);
 assert.equal(new Set(rows.slice(1).map(x=>x.split(',')[2])).size,601);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes('UPDATE public.vehicle_image_assets'));
 assert.ok(sql.includes('NOT an operator-certified daily roster'));
});
