'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const d=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const l=d.lines.ToyoRapid;
test('ToyoRapid official route identity, green and nine stations',()=>{
  assert.equal(l.color,'#3fb036');
  assert.equal(l.presentation.color,'#3fb036');
  assert.equal(l.code,'TR');
  assert.deepEqual(l.stations,['Nishi-Funabashi','Higashi-Kaijin','Hasama','Kita-Narashino','Funabashi-Nichidaimae','Yachiyo-Midorigaoka','Yachiyo-Chuo','Murakami-Chiba','Toyo-Katsutadai']);
});
test('canonical index covers all nine stations',()=>{
  l.stations.forEach((station,i)=>{
    assert.equal(d.lineStationOrder.ToyoRapid[station],i);
    assert.ok(d.stationLines[station].includes('ToyoRapid'));
  });
});
test('Keisei main transfer and verified Tozai through boundary remain separate',()=>{
  const k=l.transferStations.find(x=>x.station==='Toyo-Katsutadai'&&x.lineId==='Keisei');
  assert.equal(k.toStation,'Katsutadai');
  assert.equal(k.type,'in');
  assert.ok(d.lines.Keisei.stations.includes('Katsutadai'));
  assert.deepEqual(l.throughServices,['Tozai']);
  assert.deepEqual(l.serviceBoundaries.find(x=>x.lineId==='Tozai').handoverStations,['Nishi-Funabashi']);
});
test('Keiyo and Keisei Matsudo are passenger-only presentation hints',()=>{
  const hints=l.presentation.mapPassengerConnections;
  assert.deepEqual(hints.map(x=>[x.station,x.lineId]),[['Nishi-Funabashi','Keiyo'],['Kita-Narashino','KeiseiMatsudo']]);
  assert.ok(d.lines.Keiyo);
  assert.equal(d.lines.KeiseiMatsudo,undefined);
  assert.equal(l.transferStations.some(x=>x.lineId==='Keiyo'||x.lineId==='KeiseiMatsudo'),false);
  for(const h of hints)assert.ok(h.evidence.startsWith('https://'));
  const source=fs.readFileSync('js/trains-data.js','utf8');
  assert.match(source,/mapPassengerConnections/);
  assert.match(source,/passengerOnly:true/);
});
test('generated railway formats are in sync',()=>{
  const compact=JSON.stringify(d);
  assert.equal(fs.readFileSync('data/core/railway_data.compact.json','utf8'),compact+'\n');
  assert.equal(fs.readFileSync('data/core/railway-data.file.js','utf8'),'window.RAILWAY_DATA = '+compact+';\n');
});
