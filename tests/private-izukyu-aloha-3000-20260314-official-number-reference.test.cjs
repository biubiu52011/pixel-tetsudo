'use strict';
// Private19: Izukyu 2026-03-14 Aloha 3000 historical numbered illustration.
// An official numbered timetable is NOT evidence of current physical stock,
// or permission to render a review-only PNG without independent guards.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118140000_private19_izukyu_aloha_3000_exact_timetable_references.sql');
const correction=read('supabase/migrations/20261118141000_private19_aloha_remove_unproven_5653_number.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/伊豆急行/伊豆急行_3000系.png';
const expected=[
 ['1653','1653'],['1658','1658'],['5644','5645'],
 ['5652','5652'],['5659','5659']
];
test('Izukyu operator timetable sources connect Aloha with published train numbers',()=>{
 assert.match(sql,/izukyu\.co\.jp\/train\/index\.php/);
 assert.match(sql,/kGg2JheW\.pdf/);
 assert.match(sql,/lvfxkchq\.pdf/);
 assert.match(sql,/izukyu\.co\.jp\/train\/train\.php/);
 for(const number of ['1653M','1658M','5644M','5645M','5652M','5659M'])
  assert.ok(sql.includes(number),'missing source number '+number);
 assert.match(correction,/5653M appears in a timetable but is not/);
 assert.match(correction,/SET segment_key='png_band\/Ito\/5652-5652M',max_number=5652/);
 assert.match(correction,/5653 BETWEEN min_number AND max_number/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.match(sql,/asset_status='review' AND asset_scope='review'/);
 assert.match(sql,/actual_vehicle_confirmed=FALSE/);
});
test('one 3000 PNG receives exactly five sourced, gap-free scoped rows',()=>{
 const all=csv.trimEnd().split('\n').slice(1);
 assert.equal(new Set(all.map(line=>line.split(',')[2])).size,601);
 const refs=all.filter(line=>line.startsWith('私铁,伊豆急行,'+png+',')).map(line=>line.split(','));
 assert.equal(refs.length,5);
 assert.deepEqual(refs.map(r=>[r[4],r[5]]),expected);
 assert.ok(refs.every(r=>r[3]==='Ito' && r[6]==='M' && r[7]==='full'));
 assert.ok(refs.every(r=>r[8].includes('review')));
 const named=new Set(refs.flatMap(r=>Array.from(
  {length:Number(r[5])-Number(r[4])+1},(_,j)=>(Number(r[4])+j)+'M')));
 assert.deepEqual([...named].sort(),['1653M','1658M','5644M','5645M','5652M','5659M'].sort());
 assert.ok(!named.has('5653M'),'adjacent unsupported train must remain unassigned');
 assert.ok(!triage.includes('"'+png+'"'));
 const missing=new Set(all.filter(line=>line.endsWith(',无号段')).map(line=>line.split(',')[2]));
 const pending=new Set(triage.trimEnd().split('\n').slice(1).map(line=>line.split('","')[2]));
 assert.deepEqual([...pending].sort(),[...missing].sort(),'triage equals single unmapped PNG list');
});
test('source-only SQL cannot auto-confirm 3000 paint, unit, or real-day service',()=>{
 assert.match(sql,/not proven|NOT proven|NOT vehicle IDs/);
 assert.match(sql,/asset_status='review'/);
 assert.match(sql,/is_generic=FALSE/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
});
