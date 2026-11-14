'use strict';
// Tobu Kameido: stable route IDs, published stations, and evidence-scoped PNGs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rail = JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const i18n = JSON.parse(fs.readFileSync('data/core/station_i18n.json','utf8'));
const line = rail.lines.Tobu_Kameido;

test('official Kameido stops, TS display identity and 8-minute journey', () => {
  assert.deepEqual(line.stations,
    ['Hikifune','Komurai','Higashi-Azuma','Kameido-Suijin','Kameido']);
  assert.equal(line.code,'TKM', 'retain stable internal code');
  assert.equal(line.presentation.code,'TS');
  assert.equal(line.color,'#0f6cc3');
  assert.equal(line.color,line.presentation.color);
  assert.deepEqual(line.durations,[3,1,2,2]);
  assert.equal(line.durations.length,line.stations.length-1);
  assert.equal(line.durations.reduce((a,b)=>a+b,0),line.durationTotalMin);
  assert.equal(line.durationTotalMin,8);
});

test('Komurai remains canonical while its public English name is Omurai', () => {
  assert.deepEqual(rail.stations.Komurai,{lat:35.71032,lng:139.82761});
  assert.equal(i18n.Komurai.ja,'小村井');
  assert.equal(i18n.Komurai.en,'Omurai');
  assert.equal(i18n.Komurai.ko,'오무라이');
  assert.equal(rail.name_map['小村井'],'Komurai');
  assert.deepEqual(rail.stationLines.Komurai,['Tobu_Kameido']);
  assert.equal(rail.lineStationOrder.Tobu_Kameido.Komurai,1);
  assert.equal(Object.hasOwn(rail.stations,'Omurai'),false,'remove duplicate coordinate ghost');
  assert.equal(Object.hasOwn(i18n,'Omurai'),false,'remove incorrect 小名井 entry');
});

test('Hikifune SkyTree transfer and Kameido JR transfer coexist', () => {
  assert.ok(rail.lines.TobuSkytree.stations.includes('Hikifune'));
  assert.equal(line.transferStations.filter(t=>
    t.station==='Hikifune'&&t.lineId==='TobuSkytree'&&t.type==='in').length,1);
  assert.equal(line.transferStations.filter(t=>
    t.station==='Kameido'&&t.lineId==='ChuoSobuLocal').length,1);
});

test('generated compact and file:// twins exactly match their canonical data', () => {
  for(const [stem,data,root] of [
    ['railway_data',rail,'window.RAILWAY_DATA'],
    ['station_i18n',i18n,'window.RAILWAY_I18N']]) {
    const compact=JSON.stringify(data);
    assert.equal(fs.readFileSync('data/core/'+stem+'.compact.json','utf8'),compact+'\n');
    const js=stem==='railway_data'?'railway-data.file.js':'station-i18n.file.js';
    assert.equal(fs.readFileSync('data/core/'+js,'utf8'),root+' = '+compact+';\n');
  }
});

test('2026 Kameido trains cannot inherit retired or unverified PNGs', () => {
  const window={};
  vm.runInNewContext(fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8'),{window});
  const gallery=window.VehicleGaragePngMap;
  for(const [model,name] of [
    ['東武10000型（亀戸・大師線・2両）','東武鉄道_10000型_更新車.png'],
    ['東武10030型50番台（亀戸・大師線・2両）','東武鉄道_10030型_50番台.png']]) {
    const file='images/列车/東武鉄道/'+name;
    const png='../'+file;
    assert.ok(fs.existsSync(file),file);
    assert.equal(gallery.matchModelPath(model,png,'Tobu_Kameido'),true,model);
    assert.ok(gallery.findPath(png).some(x=>x.canonicalImage),name);
  }
  const retired='images/列车/東武鉄道/東武鉄道_8000型_亀戸線.png';
  assert.ok(fs.existsSync(retired));
  assert.equal(gallery.findPath('../'+retired).some(x=>
    x.canonicalImage&&x.lineIds.includes('Tobu_Kameido')),false,
    '8500/8000 is historical, not present-day local stock');
  const variant='images/列车/東武鉄道/東武鉄道_10030型_50番台_更新車.png';
  assert.ok(fs.existsSync(variant));
  assert.equal(gallery.findPath('../'+variant).some(x=>
    x.canonicalImage&&x.lineIds.includes('Tobu_Kameido')),false,
    'an unverified appearance variant is not evidence of an individual train');
});
