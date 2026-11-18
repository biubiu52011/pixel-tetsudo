'use strict';
// JR55 source-only JR West Super Oki 1/2; NO 2026-11 live trainset verification.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
const sql = read('supabase/migrations/20261118183000_jr55_sanin_kiha187_superoki_3001_3002_reference.sql');
const csv = read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage = read('data/audits/png-unmapped-source-triage-20261118.csv');
const png = 'images/列车/JR西日本/JR西日本_187系.png';
const status = '纯号段（JR西日本2026年10・11月官方スーパーおき3001D/3002D参考；PNG仍为review且实际车辆未经确认）';

test('both documented official 3001D and 3002D compress to one exact SaninMain reference',()=>{
 assert.match(sql,/train-timetable\/76221\?date=20261004/);
 assert.match(sql,/train-timetable\/76392\?date=20261107/);
 assert.match(sql,/press\/article\/2014\/08\/page_6041\.html/);
 const rows=csv.trimEnd().split('\n').filter(x=>x.startsWith('JR,JR西日本,'+png+','));
 assert.deepEqual(rows,['JR,JR西日本,'+png+',SaninMain,3001,3002,D,full,'+status]);
 assert.equal([...sql.matchAll(/\('2611','SaninMain','png_band\/SaninMain\/3001-3002D',3001,3002,'D'/g)].length,1);
 assert.ok(!sql.includes('png_band/SaninMain/3000-'));
 assert.ok(!sql.includes('png_band/SaninMain/3003-'));
 assert.ok(!triage.includes('"'+png+'"'));
 assert.equal(new Set(csv.trimEnd().split('\n').slice(1).map(x=>x.split(',')[2])).size,601);
});

test('review-only gallery and no real-day visual authorization remain unchanged',()=>{
 assert.match(sql,/asset_status='review' AND asset_scope='review'/);
 assert.match(sql,/appearance_class='requires_review'/);
 assert.match(sql,/file_format_status IS NULL/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes("'Yamaguchi','png_band/"));
 assert.ok(!sql.includes("'SaninSenzaki','png_band/"));
});
