'use strict';
// Private20, source-first: operator-issued 2026-03-14 Odakyu Romancecar
// weekday timetable explicitly pairs 列車番号 with 車型 M = MSE 60000.
// This is NOT an actual-run claim, a vehicle roster, or a PNG release.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118152000_private20_odakyu_mse_official_20260314_7_exact_numbers.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/小田急電鉄/小田急電鉄_60000形_MSE.png';
const expected=[
 ['0009','0009',''],['0012','0012',''],
 ['0403','0404','M'],['0420','0421',''],['0732','0732','']
];
test('operator source contains literal numbered train + MSE model concordance',()=>{
 assert.match(sql,/weekday_down2026\.pdf/);
 assert.match(sql,/weekday_up2026\.pdf/);
 assert.match(sql,/M = MSE 60000/);
 assert.match(sql,/2026-03-14/);
 for(const number of ['0009','0012','0403M','0404M','0420','0421','0732'])
   assert.ok(sql.includes(number),'source reference omitted '+number);
 assert.match(sql,/0403M and 0404M explicitly include suffix M/);
 assert.match(sql,/other five train numbers have no suffix/);
 assert.match(sql,/vehicle_type='60000形'/);
 assert.match(sql,/asset_status='available' AND file_format_status='native_png'/);
 assert.match(sql,/asset_scope='review' AND is_generic=FALSE/);
 assert.match(sql,/formation_id IS NULL AND car_id IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
});
test('one source-scoped Odawara PNG has 5 bands for exactly 7 published services',()=>{
 const rows=csv.trimEnd().split('\n').slice(1);
 assert.equal(new Set(rows.map(s=>s.split(',')[2])).size,601);
 const matches=rows.filter(s=>s.startsWith('私铁,小田急電鉄,'+png+','));
 assert.equal(matches.length,5);
 const f=matches.map(s=>s.split(','));
 assert.deepEqual(f.map(r=>[r[4],r[5],r[6]]),expected);
 assert.ok(f.every(r=>r.length===9 && r[3]==='Odawara' && r[7]==='full'));
 assert.ok(f.every(r=>r[8].includes('review') && r[8].includes('官方')));
 const actual=new Set(f.flatMap(r=>Array.from(
   {length:Number(r[5])-Number(r[4])+1},
   (_,i)=>String(Number(r[4])+i).padStart(4,'0')+r[6])));
 assert.deepEqual([...actual].sort(),
  ['0009','0012','0403M','0404M','0420','0421','0732'].sort());
 for(const unsupported of ['0008','0010','0402M','0405M','0419','0422','0731','0733'])
   assert.ok(!actual.has(unsupported),'unexpected invented adjacent service '+unsupported);
 assert.ok(!triage.includes('"'+png+'"'),'verified number PNG remains in unmapped list');
});
test('derived triage contains exactly all remaining unnumbered gallery PNGs',()=>{
 const missing=new Set(csv.trimEnd().split('\n').slice(1)
   .filter(line=>line.endsWith(',无号段')).map(line=>line.split(',')[2]));
 const remaining=new Set(triage.trimEnd().split('\n').slice(1)
   .map(line=>line.split('","')[2]));
 assert.equal(missing.size,472);
 assert.deepEqual([...remaining].sort(),[...missing].sort());
});
