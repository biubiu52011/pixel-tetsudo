'use strict';
// JR57: 283-family Ocean Arrow is explicit on each JR West official timetable.
// Three isolated numbers, four exact corridor rows, no physical consist claim.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261118201000_jr57_283_ocean_arrow_three_official_numbers_four_corridors.sql');
const csv=read('data/audits/png-first-number-band-inventory-20261117.csv');
const triage=read('data/audits/png-unmapped-source-triage-20261118.csv');
const png='images/列车/JR西日本/JR西日本_283系.png';
const variant='images/列车/JR西日本/JR西日本_283系_K.png';
const status='纯号段（2026年11月JR西日本官方283系オーシャンアロー：2052M・2085M・6055M；按阪和／纪势途经线路入库，PNG仍review，非当日实车）';
const expected=[['Hanwa',2052],['Hanwa',2085],['Hanwa',6055],['KiseiWest',6055]];

test('JR West explicit Ocean Arrow 283 proof has three disjoint service numbers on correct corridors',()=>{
 assert.match(sql,/train-timetable\/100511\?date=20261112/);
 assert.match(sql,/train-timetable\/198571\?date=20261103/);
 assert.match(sql,/train-timetable\/198561\?date=20261104/);
 assert.match(sql,/train-timetable\/144441\?date=20261016/);
 assert.match(sql,/www\.jr-odekake\.net\/railroad\/kuroshio/);
 const actual=csv.trimEnd().split('\n').filter(r=>r.startsWith('JR,JR西日本,'+png+','));
 assert.deepEqual(actual,expected.map(([line,n])=>'JR,JR西日本,'+png+','+line+','+n+','+n+',M,full,'+status));
 for(const [line,n] of expected){
  const mark="('2611','"+line+"','png_band/"+line+"/"+n+"-"+n+"M',"+n+","+n+",'M',NULL";
  assert.equal(sql.split(mark).length,2,'one and only one exact reference: '+mark);
 }
 assert.ok(!sql.includes('png_band/Hanwa/2052-2085M'));
 assert.ok(!sql.includes('png_band/Hanwa/2085-6055M'));
 assert.ok(!sql.includes("'KiseiWest','png_band/KiseiWest/2052-2052M'"));
 assert.ok(!sql.includes("'KiseiWest','png_band/KiseiWest/2085-2085M'"));
 assert.equal(new Set(csv.trimEnd().split('\n').slice(1).map(r=>r.split(',')[2])).size,601);
});

test('unreviewed variant stays unmapped and all numbers are source-only',()=>{
 assert.ok(!triage.includes('"'+png+'"'),'newly numbered generic 283 asset leaves triage');
 assert.ok(triage.includes('"'+variant+'"'),'K-style image keeps its review barrier');
 assert.ok(csv.includes('JR,JR西日本,'+variant+',,,,,,无号段'));
 assert.match(sql,/asset_scope='review' AND asset_status='review'/);
 assert.match(sql,/file_format_status IS NULL AND appearance_class='requires_review'/);
 assert.match(sql,/vehicle_model IS NULL AND r\.source_url IS NULL/);
 assert.match(sql,/requires_exact_roster=FALSE AND r\.actual_vehicle_confirmed=FALSE/);
 assert.ok(!sql.includes('CREATE TABLE'));
 assert.ok(!sql.includes("('2611','TokaidoKansai','png_band/"));
});
