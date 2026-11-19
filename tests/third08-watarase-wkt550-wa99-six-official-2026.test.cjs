'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const inventory=read('data/audits/png-first-number-band-inventory-20261117.csv').trimEnd().split('\n').slice(1);
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const specs=[{"name":"20261119002000_third08_watarase_wassi_wkt550_four_2026_official","png":"images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_WKT-550形_わっしー.png","nums":[8715,8718,8721,8724],"suffix":"D","status":"纯号段（渡良瀬2026年4至11月官方わっしー四个D番号；仅运行日有效，WKT-550素材review）","url":"https://watetsu.com/train/torowasshi.php","scope":"review"},{"name":"20261119002100_third08_watarase_wa99_two_re_2026_official","png":"images/列车/わたらせ渓谷鉄道/わたらせ渓谷鉄道_わ99形.png","nums":[8717,8722],"suffix":"レ","status":"纯号段（渡良瀬2026年3至11月官方渓谷号8717レ及8722レ；DE10两种机车不得推定）","url":"https://watetsu.com/train/torokei.php","scope":"generic"}];
test('only the six official 2026 tourist train numbers are numbered',()=>{
 let count=0;
 for(const spec of specs){
  const sql=read('supabase/migrations/'+spec.name+'.sql');
  const rows=inventory.filter(x=>x.startsWith('第三部门铁道,わたらせ渓谷鉄道,'+spec.png+','));
  assert.deepEqual(rows,spec.nums.map(n=>{
   const k=String(n).padStart(4,'0');
   return '第三部门铁道,わたらせ渓谷鉄道,'+spec.png+',WataraseKeikoku,'+k+','+k+','+spec.suffix+',full,'+spec.status;
  }));
  assert.ok(sql.includes(spec.url));
  assert.ok(sql.includes("asset_scope='"+spec.scope+"'"));
  assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
  assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
  assert.match(sql,/DATA-ONLY line WataraseKeikoku/);
  assert.ok(!triage.includes('"'+spec.png+'"'));
  assert.ok(!sql.includes('CREATE TABLE'));
  assert.equal([...sql.matchAll(/\('2611','WataraseKeikoku','png_band\/WataraseKeikoku\/\d+-\d+[^']*',\d+,\d+,'[^']*',NULL/g)].length,spec.nums.length);
  count+=rows.length;
 }
 assert.equal(count,6);
 assert.equal(new Set(inventory.map(x=>x.split(',')[2])).size,601);
 assert.equal(inventory.filter(x=>x.endsWith('无号段')).length,447);
});
test('Wassi D and Keikoku レ refer to different PNGs; other rolling-stock art remains blank',()=>{
 assert.deepEqual(specs.flatMap(s=>s.nums.map(n=>n+s.suffix)),
  ['8715D','8718D','8721D','8724D','8717レ','8722レ']);
 const other=[
  'わたらせ渓谷鉄道_WKT-500形.png',
  'わたらせ渓谷鉄道_WKT-510形.png',
  'わたらせ渓谷鉄道_WKT-520形.png',
  'わたらせ渓谷鉄道_DE10形_1537号機_あかがね色.png',
  'わたらせ渓谷鉄道_DE10形_1678号機_一般色.png'
 ];
 for(const x of other){
  const path='images/列车/わたらせ渓谷鉄道/'+x;
  assert.ok(inventory.includes('第三部门铁道,わたらせ渓谷鉄道,'+path+',,,,,,无号段'));
  assert.ok(triage.includes('"'+path+'"'));
 }
});
