'use strict';
// JR56: 2026-11 JR-West official Hamakaze train numbers / reviewed KiHa189 PNG.
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118190000_jr56_bantan_kiha189_hamakaze_1_2_official_reference.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/JR西日本/JR西日本_キハ189系.png';
const status='纯号段（JR西日本2026年11月官方はまかぜ1D・2D播但线参考；PNG仍review、非当日实车确认）';

test('both official 1D and 2D are scoped to exactly one Bantan interval',()=>{
 assert.match(sql,/train-timetable\/238642\?date=20261114/);
 assert.match(sql,/train-timetable\/238671\?date=20261104/);
 assert.match(sql,/line-timetable\/2442\?/);
 assert.match(sql,/data2025_15\.pdf/);
 const rows=csv.trimEnd().split('\n').filter(x=>x.startsWith('JR,JR西日本,'+png+','));
 assert.deepEqual(rows,['JR,JR西日本,'+png+',Bantan,0001,0002,D,full,'+status]);
 assert.equal([...sql.matchAll(/\('2611','Bantan','png_band\/Bantan\/0001-0002D',1,2,'D'/g)].length,1);
 assert.ok(!sql.includes('png_band/Bantan/0000-'));
 assert.ok(!sql.includes('png_band/Bantan/0003-'));
 assert.ok(!triage.includes('"'+png+'"'));
 assert.equal(new Set(csv.trimEnd().split('\n').slice(1).map(x=>x.split(',')[2])).size,601);
});

test('original image review and real-day roster restrictions stay in place',()=>{
 assert.match(sql,/asset_scope='review' AND asset_status='review'/);
 assert.match(sql,/appearance_class='requires_review'/);
 assert.match(sql,/file_format_status IS NULL/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes("'SaninMain','png_band/"));
 assert.ok(!sql.includes("'SanyoMain','png_band/"));
 assert.ok(!sql.includes("'TokaidoKansai','png_band/"));
});
