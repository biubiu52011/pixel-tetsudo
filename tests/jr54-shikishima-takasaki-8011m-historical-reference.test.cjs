'use strict';
// JR54: one 2026-09 historical eyewitness number, never a present-day
// operator timetable roster or observed vehicle authorization.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118180500_jr54_takasaki_shikishima_e001_8011m_historical_reference.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/JR東日本/JR東日本_E001形_TRAIN_SUITE四季島.png';
const status='纯号段（2026年9月5日・26日四季島8011M高崎线历史目击参考；并非运营方公布的正式号表，非当日编组）';
test('precise dated Takasaki E001 reference contains only 8011M',()=>{
 const rows=csv.trimEnd().split('\n').filter(line=>line.startsWith('JR,JR東日本,'+png+','));
 assert.deepEqual(rows,['JR,JR東日本,'+png+',Takasaki,8011,8011,M,full,'+status]);
 assert.equal([...sql.matchAll(/\('2611','Takasaki','png_band\/Takasaki\/8011-8011M',8011,8011,'M',NULL/g)].length,1);
 assert.ok(!sql.includes('png_band/Takasaki/8012-'));
 assert.ok(!sql.includes('png_band/Takasaki/8013-'));
 assert.ok(!triage.includes('"'+png+'"'));
 assert.equal(new Set(csv.trimEnd().split('\n').slice(1).map(line=>line.split(',')[2])).size,601);
});
test('an eyewitness number does not authorize live stock or other corridors',()=>{
 assert.match(sql,/2026-09-05 and 2026-09-26/);
 assert.match(sql,/official JR East identifies the train\/courses/);
 assert.match(sql,/does NOT independently publish the precise 8011M number/);
 assert.match(sql,/asset_scope='theme'/);
 assert.match(sql,/asset_status='available'/);
 assert.match(sql,/appearance_class='dedicated_vehicle_identity'/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes("'Joetsu','png_band/"));
 assert.ok(!sql.includes("'TohokuMain','png_band/"));
});
