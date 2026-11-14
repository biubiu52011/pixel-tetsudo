'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const d = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const names = JSON.parse(fs.readFileSync('data/core/station_i18n.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('scripts/page-scripts.json', 'utf8'));

test('Tobu Tojo and Ogose station order and duration counts', () => {
  assert.equal(d.lines.Tojo.stations.length, 39);
  assert.equal(d.lines.Tojo.durations.length, d.lines.Tojo.stations.length - 1);
  assert.deepEqual(d.lines.Ogose.stations, [
    'Sakado','Ippommatsu','Nishi-Oya','Kawa_kaku',
    'Bushu-Nagase','Higashi_Moro','Bushu-Karasawa','Ogose'
  ]);
  assert.equal(d.lines.Ogose.durations.length, d.lines.Ogose.stations.length - 1);
  for (const [lineId, line] of Object.entries({Tojo:d.lines.Tojo,Ogose:d.lines.Ogose})) {
    for (let i=0;i<line.stations.length;i++)
      assert.equal(d.lineStationOrder[lineId][line.stations[i]],i);
  }
});
test('Tobu Sakado and JR Kyushu Sakado are separate physical stations', () => {
  const id='Sakado-Fukuoka';
  assert.equal(d.lines.KashiiLine.stations[11], id);
  assert.ok(!d.lines.KashiiLine.stations.includes('Sakado'));
  assert.deepEqual(d.stationLines.Sakado, ['Tojo','Ogose']);
  assert.deepEqual(d.stationLines[id], ['KashiiLine']);
  assert.equal(d.lineStationOrder.KashiiLine[id], 11);
  assert.equal(d.name_map['坂戸'], 'Sakado');
  assert.equal(d.name_map['酒殿'], id);
  assert.equal(names[id].ja, '酒殿');
  for (const lang of ['ja','zh','ko','en']) assert.ok(names[id][lang]);
  assert.ok(d.stations[id].lat > 33 && d.stations[id].lat < 34);
  assert.ok(d.stations[id].lng > 130 && d.stations[id].lng < 131);
  for (const file of ['data/core/runtime-config.js','data/core/data-config-bundle.js']) {
    assert.match(fs.readFileSync(file,'utf8'), /"KashiiLine": \{ "Sakado": "Sakado-Fukuoka" \}/);
  }
});
test('Tobu transfers describe both Metro corridors and Ogose line', () => {
  const transfers=d.lines.Tojo.transferStations;
  const find=(station,lineId)=>transfers.find(t=>t.station===station&&t.lineId===lineId);
  assert.equal(find('Sakado','Ogose').type,'in');
  for (const [station,metro] of [['Shimo-Akatsuka','Chikatetsu-Akatsuka'],['Narimasu','Chikatetsu-Narimasu']]) {
    for (const lineId of ['Yurakucho','Fukutoshin']) {
      const t=find(station,lineId);
      assert.equal(t.type,'out',station+':'+lineId);
      assert.equal(t.toStation,metro);
    }
  }
  assert.equal(find('Asakadai','Musashino').type,'out');
});
test('Tojo skips irrelevant dated JR and number mapping assets without altering other lines', () => {
  const excluded=manifest.lazyExcludeScopes.trains;
  for (const path of Object.keys(excluded)) {
    assert.ok(manifest.lazy.trains.includes(path));
    assert.deepEqual(excluded[path],['Tojo','Ogose']);
    assert.ok(!manifest.lazyScopes.trains[path]);
  }
  const src=fs.readFileSync('js/trains-detail-loader.js','utf8');
  assert.match(src,/data-line-exclude-scope/);
  const html=fs.readFileSync('pages/trains.html','utf8');
  for (const path of Object.keys(excluded)) {
    const row=html.split('\n').find(s=>s.includes('../'+path+'?v='));
    assert.ok(row,path);
    assert.match(row,/data-line-exclude-scope="Tojo,Ogose"/);
  }
});
