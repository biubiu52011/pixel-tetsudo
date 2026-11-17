'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261117143000_seed_private_tobu_koizumi_thliner_png_bands_2611.sql','utf8');
const csv=fs.readFileSync('data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const png1='images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png';
const png2='images/列车/東武鉄道/東武鉄道_70090型.png';
test('Koizumi and TH LINER source envelopes are reference-only and do not promote artwork',()=>{
 const rx=/^  \('2611','([^']+)','(png_band\/[^']+)',(\d+),(\d+),'([A-Z]+)',NULL,'\.\.\/(images\/列车\/[^']+\.png)',NULL,FALSE,FALSE\)(?:,)?$/gm;
 const rows=[...sql.matchAll(rx)].map(x=>[x[1],+x[3],+x[4],x[5],x[6]]);
 assert.deepEqual(rows,[
  ['Koizumi',701,764,'E',png1],
  ['TobuSkytree',4041,4945,'T',png2],
  ['TobuSkytree',4045,4947,'T',png2]
 ]);
 assert.ok(sql.includes("source_scope='historical-undated'"));
 assert.ok(sql.includes("service_family='th_liner'"));
 assert.ok(sql.includes("asset_scope='review'"));
 assert.ok(sql.includes("asset_scope='generic'"));
 assert.ok(sql.includes('requires_exact_roster,actual_vehicle_confirmed'));
 assert.ok(sql.includes("TH-only service gate"));
 assert.doesNotMatch(sql,/UPDATE\s+public\.vehicle_image_assets/i);
 assert.ok(fs.existsSync(png1)); assert.ok(fs.existsSync(png2));
 const output=csv.trim().split('\n');
 const t1=output.filter(x=>x.startsWith('私铁,東武鉄道,'+png1+','));
 const t2=output.filter(x=>x.startsWith('私铁,東武鉄道,'+png2+','));
 assert.deepEqual(t1,['私铁,東武鉄道,'+png1+',Koizumi,0701,0764,E,full,纯号段（东武小泉线历史参考；日期车型条件保留）']);
 assert.deepEqual(t2,['私铁,東武鉄道,'+png2+',TobuSkytree,4041,4947,T,metro-prefixed,纯号段（东武TH LINER；服务类型条件保留）']);
});
