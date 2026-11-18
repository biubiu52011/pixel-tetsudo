'use strict';
// Private21: Tobu 50090 TJ Liner: dated 2024 operating train numbers,
// cross-checked with operator's 2025 weekday TJ schedule and vehicle page.
// Only source-scope numbers; DO NOT assert today's actual formation identity.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118155500_private21_tobu_tojo_50090_tjliner_20_dated_reference_numbers.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/東武鉄道/東武鉄道_50090型.png';
const expected=[2,4,6,8,10,...Array.from({length:15},(_,i)=>2*i+1)]
  .sort((a,b)=>a-b);

test('historical train number 50090 crosswalk cites two evidence classes',()=>{
 assert.match(sql,/2024-03-16 weekday train working diagram/);
 assert.match(sql,/munexpress\.web\.fc2\.com\/tobu\/tita\/2024\/921-20240316\.pdf/);
 assert.match(sql,/www\.tobu\.co\.jp\/railway\/tj\/timetable/);
 assert.match(sql,/www\.tobu\.co\.jp\/corporation\/rail\/vehicles/);
 assert.match(sql,/2026-04-01 observation/);
 assert.match(sql,/third-party historical source, NOT a/);
 assert.match(sql,/asset_scope='generic'/);
 assert.match(sql,/is_generic=TRUE/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.match(sql,/source_url IS NULL/);
});
test('Tojo contains 20 distinct singleton rows (five up, fifteen down)',()=>{
 const all=csv.trimEnd().split('\n').slice(1);
 assert.equal(new Set(all.map(s=>s.split(',')[2])).size,601);
 const rows=all.filter(s=>s.startsWith('私铁,東武鉄道,'+png+',')).map(s=>s.split(','));
 assert.equal(rows.length,20);
 assert.deepEqual(rows.map(r=>Number(r[4])),expected);
 assert.ok(rows.every(r=>r.length===9 && r[3]==='Tojo'
  && r[4]===r[5] && r[6]==='' && r[7]==='full'
  && r[8].includes('2024年') && r[8].includes('历史参考')));
 const sqlNumbers=[...sql.matchAll(
  /\('2611','Tojo','png_band\/Tojo\/(\d{4})-\d{4}',(\d+),(\d+),'',NULL/g
 )].map(m=>({tag:m[1],number:Number(m[2]),end:Number(m[3])}));
 assert.equal(sqlNumbers.length,20);
 assert.deepEqual(sqlNumbers.map(x=>x.number),expected);
 assert.ok(sqlNumbers.every(r=>r.number===r.end
   && r.tag===String(r.number).padStart(4,'0')));
 const actual=new Set(rows.map(r=>Number(r[4])));
 for(const unsupported of [12,14,16,18,20,22,24,26,28,30,50,51,54,70,72,74,76])
  assert.ok(!actual.has(unsupported),'unsafe inferred train '+unsupported);
 assert.ok(!triage.includes('"'+png+'"'));
});
test('remaining no-number PNG set matches single triage source',()=>{
 const old=new Set(csv.trimEnd().split('\n').slice(1)
  .filter(s=>s.endsWith(',无号段')).map(s=>s.split(',')[2]));
 const pending=new Set(triage.trimEnd().split('\n').slice(1).map(s=>s.split('","')[2]));
 assert.deepEqual([...pending].sort(),[...old].sort());
 assert.equal(pending.size,471);
});
