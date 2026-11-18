'use strict';
// Chichibu C58-363: operator 2025 timetable 5001/5002 + 2026 operations;
// NOT Chichibu 5000-series cars 5001/5002 or 2026-11-18 locomotive roster.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118194500_private23_chichibu_c58_paleo_5001_5002_official_historical_reference.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/秩父鉄道/秩父鉄道_C58形_363号機.png';
const carriage='images/列车/秩父鉄道/秩父鉄道_12系_SLパレオエクスプレス.png';
const status='纯号段（秩父铁道2025年官方SL番号5001/5002与2026年C58运营交叉参考；不得混淆5000系编组号或确认今日实车）';
test('source-only 5001/5002 are one C58 ChichibuMain band, without a suffix',()=>{
 assert.match(sql,/A3_202503_all\.pdf/);
 assert.match(sql,/slpaleo\/calendar\.html/);
 assert.match(sql,/blog\/news\/sl2026/);
 const rows=csv.trimEnd().split('\n').filter(x=>x.startsWith('私铁,秩父鉄道,'+png+','));
 assert.deepEqual(rows,['私铁,秩父鉄道,'+png+',ChichibuMain,5001,5002,,full,'+status]);
 assert.equal([...sql.matchAll(/\('2611','ChichibuMain','png_band\/ChichibuMain\/5001-5002',5001,5002,''/g)].length,1);
 assert.ok(!sql.includes('png_band/ChichibuMain/5000-'));
 assert.ok(!sql.includes('png_band/ChichibuMain/5003-'));
 assert.ok(!triage.includes('"'+png+'"'));
 assert.ok(triage.includes('"'+carriage+'"'),'carriage PNG must stay unnumbered');
 assert.ok(csv.includes('私铁,秩父鉄道,'+carriage+',,,,,,无号段'));
 assert.equal(new Set(csv.trimEnd().split('\n').slice(1).map(x=>x.split(',')[2])).size,601);
});
test('specific locomotive remains review scope and cannot grant a live roster',()=>{
 assert.match(sql,/asset_scope='review' AND appearance_class='dedicated_vehicle_identity'/);
 assert.match(sql,/asset_status='available' AND file_format_status='native_png'/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.match(sql,/NOT Chichibu 5000-series/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes("'SeibuChichibu','png_band/"));
});
