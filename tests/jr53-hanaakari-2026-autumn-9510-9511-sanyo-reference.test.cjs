'use strict';
// JR53 source-only illustration reference for 2026 autumn Sanyo Hanaakari.
// Two official timetable numbers do not certify today's consist or PNG.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118173000_jr53_sanyo_hanaakari_9510_9511_dated_reference.sql');
const inventory=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/JR西日本/JR西日本_キハ189系_はなあかり.png';
const status='纯号段（JR西日本2026年秋山阳本线はなあかり9510D・9511D；PNG仍需素材审计且不等于当日实车）';

test('one exact 9510D–9511D interval is sourced on SanyoMain only',()=>{
 const actual=inventory.trimEnd().split('\n').filter(s=>s.startsWith('JR,JR西日本,'+png+','));
 assert.deepEqual(actual,[
  'JR,JR西日本,'+png+',SanyoMain,9510,9511,D,full,'+status
 ]);
 assert.equal([...sql.matchAll(/\('2611','SanyoMain','png_band\/SanyoMain\/9510-9511D',9510,9511,'D',NULL/g)].length,1);
 assert.match(sql,/train-timetable\/385421\?date=20261031/);
 assert.match(sql,/train-timetable\/385431\?date=20261025/);
 assert.match(sql,/hanaakari\/operation_2610/);
 assert.match(sql,/2026-11-07\/08\/22\/23\/28\/29; not 11-18/);
 assert.ok(!sql.includes("'SaninMain','png_band/"));
 assert.ok(!sql.includes("'TokaidoKansai','png_band/"));
 assert.ok(!triage.includes('"'+png+'"'));
 assert.equal(new Set(inventory.trimEnd().split('\n').slice(1).map(s=>s.split(',')[2])).size,601);
});

test('review-only KiHa/KiRo body cannot be auto-promoted',()=>{
 assert.match(sql,/asset_status='review' AND asset_scope='review'/);
 assert.match(sql,/appearance_class='requires_review' AND file_format_status IS NULL/);
 assert.match(sql,/is_generic=FALSE AND formation_id IS NULL AND car_id IS NULL/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.match(sql,/NO runtime override/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes('9512-'));
});
