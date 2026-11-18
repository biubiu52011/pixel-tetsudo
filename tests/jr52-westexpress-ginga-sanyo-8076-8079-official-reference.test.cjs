'use strict';
// JR52: exact 2026 November Sanyo timetable train-number references
// for the dedicated WEST EXPRESS Ginga 117-series, NOT live PNG authorization.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118171000_jr52_sanyo_westexpress_ginga_8076_8079_official_reference.sql');
const inventory=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/JR西日本/JR西日本_117系_WEST_EXPRESS銀河.png';
const status='纯号段（JR西日本2026年11月官方山阳银河8076M与8079M；PNG尚待外观验收，不代表当日实车）';

test('two official source numbers, two exact non-contiguous Sanyo bands, one gallery PNG',()=>{
 const actual=inventory.trimEnd().split('\n').filter(line=>line.startsWith('JR,JR西日本,'+png+','));
 assert.deepEqual(actual,[8076,8079].map(n=>'JR,JR西日本,'+png+',SanyoMain,'+n+','+n+',M,full,'+status));
 for(const n of [8076,8079]){
  const key='png_band/SanyoMain/'+n+'-'+n+'M';
  assert.ok(sql.includes(key),'missing explicit number '+n);
  assert.ok(sql.includes("'SanyoMain','"+key+"',"+n+","+n+",'M',NULL"));
 }
 assert.equal([...sql.matchAll(/\('2611','SanyoMain','png_band\/SanyoMain\/807[69]-807[69]M'/g)].length,2);
 assert.ok(!sql.includes('8076-8079M'),'gaps must not become trains');
 assert.ok(!sql.includes('png_band/SanyoMain/8077-'));
 assert.ok(!sql.includes('png_band/SanyoMain/8078-'));
 assert.ok(!triage.includes('"'+png+'"'),'referenced PNG must leave no-number triage');
 const rows=inventory.trimEnd().split('\n').slice(1);
 assert.equal(new Set(rows.map(s=>s.split(',')[2])).size,601);
});

test('scope and image-review restrictions are not promoted by a timetable source',()=>{
 assert.match(sql,/train-timetable\/258771\?date=20261028/);
 assert.match(sql,/train-timetable\/275451\?date=20261103/);
 assert.match(sql,/media\.jrw-ip\.jp\/news\/9399/);
 assert.match(sql,/asset_status='review' AND asset_scope='review'/);
 assert.match(sql,/appearance_class='requires_review'/);
 assert.match(sql,/vehicle_model IS NULL AND source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes("'TokaidoKansai','png_band/"));
 assert.ok(!sql.includes("'KiseiWest','png_band/"));
 assert.ok(!sql.includes("'SaninMain','png_band/"));
});
