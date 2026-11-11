'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const r=require('../data/core/railway_data.compact.json');
const original=require('../data/core/railway_data.json');
const i18n=require('../data/core/station_i18n.json');
const sql=fs.readFileSync('supabase/migrations/20261111130000_jr_central_mlit_2024_coordinates_and_station_identity.sql','utf8');
const ids=['TokaidoCentral','ChuoCentral','Gotemba','Iida','Minobu','Takayama','Taita',
'Taketoyo','KansaiCentral','KiseiCentral','Sangu','Meisho','MinoAkasaka'];
test('13 JR-Central conventional routes provide coordinates for 412 unique active stations',()=>{
 assert.deepEqual(r,original);
 const known=new Set();
 for(const line of ids)for(const id of r.lines[line].stations){
  known.add(id);
  assert.ok(i18n[id]?.ja,line+':'+id);
  assert.ok(Number.isFinite(r.stations[id]?.lat)&&Number.isFinite(r.stations[id]?.lng),id);
 }
 assert.equal(known.size,412);
 const values=[...sql.matchAll(/\('([^']+)','([^']+)',([0-9.]+),([0-9.]+)\)/g)];
 assert.equal(values.length,412);
 assert.equal(new Set(values.map(v=>v[1])).size,412);
 for(const match of values)assert.ok(known.has(match[1]));
 assert.match(sql,/N02-2024\.html/);
});
test('JR-Central Ashigara and Arao are physically distinct from Odakyu and Kumamoto',()=>{
 assert.equal(r.lines.Gotemba.stations[9],'JRC-Gotemba-010');
 assert.equal(r.lines.MinoAkasaka.stations[1],'JRC-MinoAkasaka-002');
 assert.equal(r.stations['Arao-Kumamoto'].lat,33.07861);
 assert.ok(r.stations['JRC-MinoAkasaka-002'].lat>35);
 assert.ok(r.stations['JRC-Gotemba-010'].lng<139.1);
 assert.ok(r.stationLines.Ashigara.includes('Odawara'));
 assert.ok(!r.stationLines.Ashigara.includes('Gotemba'));
 assert.ok(!r.stationLines['Arao-Kumamoto'].includes('MinoAkasaka'));
 assert.deepEqual(r.stationLines['JRC-Gotemba-010'],['Gotemba']);
 assert.deepEqual(r.stationLines['JRC-MinoAkasaka-002'],['MinoAkasaka']);
});
test('2020-retired Ikenoura-Seaside is not a current Sangu station',()=>{
 assert.equal(r.lines.Sangu.stations.length,10);
 assert.equal(r.lineStationOrder.Sangu.length,10);
 assert.ok(!r.lines.Sangu.stations.includes('JRC-Sangu-010'));
 assert.ok(!r.stationLines['JRC-Sangu-010']);
 assert.ok(!i18n['JRC-Sangu-010']);
 assert.equal(r.lines.Sangu.stations.at(-1),'JRC-Sangu-011');
 assert.match(sql,/000044331\.pdf/);
});
test('Takayama Inotani border requires evidence for stations after index 35',()=>{
 assert.equal(i18n[r.lines.Takayama.stations[35]].ja,'猪谷');
 assert.equal(i18n[r.lines.Takayama.stations[36]].ja,'楡原');
 assert.match(sql,/ls\.station_index>35/);
 assert.match(sql,/JRC_PLAN_TAKAYAMA_CROSS_BORDER_OPERATOR_UNVERIFIED/);
 assert.match(sql,/LANGUAGE plpgsql SECURITY INVOKER/);
});
