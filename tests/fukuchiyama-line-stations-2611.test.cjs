'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const root='data/core/';
const railway=JSON.parse(fs.readFileSync(root+'railway_data.json','utf8'));
const i18n=JSON.parse(fs.readFileSync(root+'station_i18n.json','utf8'));
const ids=['Tamba-Oyama','Shimotaki','Tanigawa','Kaibara-Hyogo',
  'Iso-Tamba','Kuroi-Tamba','Ichijima','Tamba-Takeda','Fukuchiyama'];
test('JR Fukuchiyama full line is contiguous, unique and geolocated',()=>{
  const l=railway.lines.Fukuchiyama;
  assert.equal(l.stations.length,31);
  assert.deepEqual(l.stations.slice(-10),['Shinoyamaguchi',...ids]);
  assert.equal(l.durations.length,30);
  assert.equal(l.durationTotalMin,l.durations.reduce((a,b)=>a+b,0));
  assert.deepEqual(l.durations.slice(-9),[3,16,5,10,3,9,7,8,8]);
  assert.equal(new Set(l.stations).size,l.stations.length);
  for(let p=0;p<l.stations.length;p++){
    const id=l.stations[p];
    assert.equal(railway.lineStationOrder.Fukuchiyama[id],p);
    assert.ok(railway.stationLines[id]?.includes('Fukuchiyama'),id);
    assert.ok(Number.isFinite(railway.stations[id]?.lat)&&Number.isFinite(railway.stations[id]?.lng),id);
    assert.ok(i18n[id]?.ja&&i18n[id]?.en&&i18n[id]?.zh&&i18n[id]?.ko,id);
  }
  assert.ok(l.transferStations.some(x=>x.station==='Tanigawa'&&x.lineId==='KakogawaLine'));
  assert.ok(l.transferStations.some(x=>x.station==='Fukuchiyama'&&x.lineId==='SaninMain'));
});
test('Hyogo station names do not steal unrelated railway IDs or global aliases',()=>{
  assert.equal(railway.name_map['柏原'],'Kashiwara');
  assert.equal(railway.name_map['黒井'],undefined);
  assert.equal(railway.name_map['柏原（福知山線）'],'Kaibara-Hyogo');
  assert.equal(railway.name_map['黒井（福知山線）'],'Kuroi-Tamba');
  assert.ok(railway.stationLines.Tanigawa.includes('KakogawaLine'));
  assert.ok(railway.stationLines.Fukuchiyama.includes('SaninMain'));
  assert.equal(i18n['Kaibara-Hyogo'].ja,'柏原');
  assert.equal(i18n['Kuroi-Tamba'].ja,'黒井');
});
test('core generated JSON and file-mode scripts remain deterministic',()=>{
  for(const [name,varName]of [['railway_data','RAILWAY_DATA'],['station_i18n','RAILWAY_I18N']]){
    const original=fs.readFileSync(root+name+'.json','utf8');
    const compact=JSON.stringify(JSON.parse(original)).replace(/<\\/script/gi,'<\\\\/script');
    assert.equal(fs.readFileSync(root+name+'.compact.json','utf8'),compact+'\n');
    const fileName=name==='railway_data'?'railway-data.file.js':'station-i18n.file.js';
    assert.equal(fs.readFileSync(root+fileName,'utf8'),'window.'+varName+' = '+compact+';\n');
  }
});
test('SQL extension keeps 383 historical runs unmapped and adds no invented trains',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261108190000_fukuchiyama_full_stations.sql','utf8');
  assert.match(sql,/INSERT INTO public\.stations/);
  assert.match(sql,/INSERT INTO public\.line_stations/);
  assert.match(sql,/<>31/);
  assert.doesNotMatch(sql,/(?:INSERT|UPDATE)\s+(?:INTO\s+)?public\.(?:manual_timetable_templates|train_timetables|train_runs)/);
});
