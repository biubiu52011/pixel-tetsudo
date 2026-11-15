'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const l=data.lines.Rinkai;
const ids=['Shin-Kiba','Shinonome','KokusaiTenjijo','Tokyo-Teleport','Tennozu Isle','Shinagawa-Sea-Side','Oimachi','Osaki'];
function link(station,peer){return l.transferStations.filter(x=>x.station===station&&x.lineId===peer);}
test('Rinkai has eight R01-R08 stations in official order, with one blue color',()=>{
  assert.deepEqual(l.stations,ids);
  assert.equal(l.presentation.code,'R');
  assert.equal(l.code,'RL','internal ID must not be conflated with published station symbol');
  assert.equal(l.color,'#00418E');
  assert.equal(l.presentation.color,l.color);
  for(const [i,id] of ids.entries()){
    assert.equal(data.lineStationOrder.Rinkai[id],i);
    assert.ok(data.stationLines[id]?.includes('Rinkai'),id);
  }
  assert.ok(!l.durations,'unverified 8-entry duration approximation is not a seven-segment timetable');
  assert.equal(l.durationTotalMin,undefined);
});
test('Yurikamome connects to the correct neighboring stations, not Tokyo Big Sight',()=>{
  const ariake=link('KokusaiTenjijo','Yurikamome');
  assert.equal(ariake.length,1);
  assert.equal(ariake[0].toStation,'Ariake');
  assert.equal(ariake[0].type,'out');
  const odaiba=link('Tokyo-Teleport','Yurikamome');
  assert.equal(odaiba.length,1);
  assert.equal(odaiba[0].toStation,'Odaiba-kaihinkoen');
  assert.equal(odaiba[0].type,'out');
  assert.ok(data.lines.Yurikamome.stations.includes('Ariake'));
  assert.ok(data.lines.Yurikamome.stations.includes('Odaiba-kaihinkoen'));
});
test('Tennozu Isle and Oimachi have verified transfers',()=>{
  const mono=link('Tennozu Isle','TokyoMonorail');
  assert.equal(mono.length,1);
  assert.equal(mono[0].type,'out');
  assert.match(mono[0].note,/徒歩約5分/);
  for(const peer of ['KeihinTohoku','TokyuOimachi']){
    const t=link('Oimachi',peer);
    assert.equal(t.length,1,peer);
    assert.equal(t[0].type,'in');
  }
});
test('Saikyo through-running stays scoped to Osaki, no fabricated new lines',()=>{
  assert.deepEqual(l.throughServices,['SaikyoKawagoe']);
  const b=l.serviceBoundaries.filter(x=>x.lineId==='SaikyoKawagoe');
  assert.equal(b.length,1);
  assert.deepEqual(b[0].handoverStations,['Osaki']);
  for(const t of l.transferStations){
    assert.ok(ids.includes(t.station),t.station);
    assert.ok(data.lines[t.lineId],t.lineId);
    assert.ok(data.lines[t.lineId].stations.includes(t.toStation || t.station),t.lineId);
  }
});
test('canonical and generated railway bundles remain byte-equivalent',()=>{
  const compact=JSON.stringify(data);
  assert.equal(fs.readFileSync('data/core/railway_data.compact.json','utf8'),compact+'\n');
  assert.equal(fs.readFileSync('data/core/railway-data.file.js','utf8'),'window.RAILWAY_DATA = '+compact+';\n');
});
