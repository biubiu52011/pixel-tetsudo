'use strict';
// Private25: 2026-01-31 Keio 2000 series 2701F debut-only reference numbers.
// Never promote normal repeating timetable numbers to permanent vehicle IDs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118232000_private25_keio_2000_2701_6707_4708_debut_historical.sql');
const inventory=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/京王電鉄/京王電鉄_2000系.png';
const status='纯号段（2026年1月31日京王2000系2701F首日6707/4708历史参考；京王官方时刻＋当日实拍；非2026年11月固定运用）';
test('2026-01-31 Keio 2701F 6707/4708 each has exactly one KeioSagami band',()=>{
 const hits=inventory.split('\n').filter(x=>x.startsWith('私铁,京王電鉄,'+png+','));
 assert.deepEqual(hits,[
  '私铁,京王電鉄,'+png+',KeioSagami,4708,4708,,full,'+status,
  '私铁,京王電鉄,'+png+',KeioSagami,6707,6707,,full,'+status
 ]);
 assert.equal([...sql.matchAll(/\('2611','KeioSagami','png_band\/KeioSagami\/\d+-\d+'/g)].length,2);
 assert.match(sql,/20260131shingata2000\.pdf/);
 assert.match(sql,/519989838/);
 assert.match(sql,/2026-01-31/);
 assert.ok(!triage.includes('"'+png+'"'));
 assert.equal(new Set(inventory.trimEnd().split('\n').slice(1).map(x=>x.split(',')[2])).size,601);
});
test('no permanent live consist inference, no broad mapping or new schema',()=>{
 assert.match(sql,/asset_scope='generic' AND is_generic=TRUE/);
 assert.match(sql,/manual_timetable_templates/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.match(sql,/not authorize a 2026-11 vehicle identity/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes('png_band/KeioSagami/4708-6707'));
 assert.ok(!sql.includes("('2611','KeioMain','png_band/"));
});
