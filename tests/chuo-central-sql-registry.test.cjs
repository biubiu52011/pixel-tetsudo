'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const d=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const tr=JSON.parse(fs.readFileSync('data/core/station_i18n.json','utf8'));
const sql=fs.readFileSync('supabase/migrations/20261111090000_chuo_central_canonical_40_stations.sql','utf8');
const line=d.lines.ChuoCentral;
test('JR Central ChuoCentral 40 stations have unique canonical order and exact SQL path',()=>{
 assert.equal(line.operator,'JR-Central');
 assert.equal(line.stations.length,40);
 assert.equal(new Set(line.stations).size,40);
 assert.deepEqual(d.lineStationOrder.ChuoCentral,line.stations);
 assert.equal(line.stations[0],'Nagoya');
 assert.equal(line.stations[26],'JRC-ChuoCentral-027');
 assert.equal(line.stations.at(-1),'Shiojiri');
 assert.ok(!line.stations.includes('Okuwa'));
 const stations=[...sql.matchAll(/^  \((\d+), '([^']+)', '([^']+)'\)[,\n]/gm)];
 assert.equal(stations.length,40);
 stations.forEach((m,i)=>{assert.equal(Number(m[1]),i);assert.equal(m[2],line.stations[i]);});
 assert.match(sql,/CHUOCENTRAL_CANONICAL_40_STATION_REGISTRY_MISMATCH/);
 assert.doesNotMatch(sql,/INSERT INTO public\.(manual_timetable_templates|train_runs|train_operation_mappings)/);
});
test('Nagano JR Okuwa is not the Tobu Okuwa, and shared Nagoya is correctly located',()=>{
 assert.deepEqual(d.stationLines.Okuwa,['Nikkoku']);
 assert.deepEqual(d.stationLines['JRC-ChuoCentral-027'],['ChuoCentral']);
 assert.ok(d.lines.Nikkoku.stations.includes('Okuwa'));
 assert.ok(!d.lines.Nikkoku.stations.includes('JRC-ChuoCentral-027'));
 assert.deepEqual(d.stations.Okuwa,{lat:36.76082,lng:139.71358});
 assert.deepEqual(d.stations['JRC-ChuoCentral-027'],{lat:35.6843755,lng:137.6643629});
 assert.deepEqual(d.stations.Nagoya,{lat:35.1706431,lng:136.8816945});
 assert.equal(tr['JRC-ChuoCentral-027'].ja,'大桑');
 assert.equal(tr['JRC-ChuoCentral-027'].en,'Okuwa');
 assert.equal(tr.Okuwa.ja,tr['JRC-ChuoCentral-027'].ja);
 assert.ok(line.transferStations.every(t=>line.stations.includes(t.station)),
  'No distant transfer station can be registered on the ChuoCentral route');
});
test('generated data bundles and browser-cache keys match canonical changes',()=>{
 for(const [key,variable] of [['railway_data','RAILWAY_DATA'],['station_i18n','RAILWAY_I18N']]){
  const raw=JSON.stringify(JSON.parse(fs.readFileSync('data/core/'+key+'.json','utf8')));
  const compact=raw+'\n';
  assert.equal(fs.readFileSync('data/core/'+key+'.compact.json','utf8'),compact);
  assert.equal(fs.readFileSync('data/core/'+(key==='railway_data'?'railway-data':'station-i18n')+'.file.js','utf8'),
    'window.'+variable+' = '+raw.replace(/<\/script/gi,'<\\/script')+';\n');
  const sha=crypto.createHash('sha1').update('blob '+Buffer.byteLength(compact)+'\0').update(compact).digest('hex').slice(0,12);
  const loader=fs.readFileSync('data/core/db-loader.js','utf8');
  assert.ok(loader.includes(key+'.compact.json?v='+sha),key+' stale data loader cache');
 }
});
