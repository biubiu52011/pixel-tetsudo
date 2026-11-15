'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const d = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const names = JSON.parse(fs.readFileSync('data/core/station_i18n.json', 'utf8'));
const loc = d.lines.Ikebukuro;
const subset = ['Hanno','Higashi-Hanno','Koma-Seibu','Musashi-Yokote','Higashi-Agano','Agano'];
const w = { window:{} };
vm.runInNewContext(fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8'),w);
const presets = w.window.MajorVehicleFleetPresets;
const local = 'odpt.TrainType:Seibu.Local';
const lookup = (line,day,stationKeys=[]) => presets.lookup(line,'Seibu',local,{serviceDate:day,stationKeys});

test('Ikebukuro geographic track reaches Agano at the Chichibu boundary',()=>{
  assert.equal(loc.stations.length,31);
  assert.deepEqual(loc.stations.slice(-6),subset);
  assert.equal(loc.durations.length,30);
  assert.equal(new Set(loc.stations).size,31);
  for (let n=0;n<loc.stations.length;n++) {
    const k=loc.stations[n];
    assert.equal(d.lineStationOrder.Ikebukuro[k],n,k);
    assert.ok(d.stationLines[k].includes('Ikebukuro'),k);
    assert.ok(Number.isFinite(d.stations[k].lat),k+' lat');
    assert.ok(Number.isFinite(d.stations[k].lng),k+' lng');
  }
  assert.ok(loc.throughServices.includes('SeibuChichibu'));
  assert.ok(d.lines.SeibuChichibu.throughServices.includes('Ikebukuro'));
  assert.ok(loc.serviceBoundaries.some(x=>x.lineId==='SeibuChichibu'&&x.handoverStations.includes('Agano')));
  assert.ok(d.lines.SeibuChichibu.serviceBoundaries.some(x=>x.lineId==='Ikebukuro'&&x.handoverStations.includes('Agano')));
  assert.ok(d.stationLines.Agano.includes('SeibuChichibu'));
  assert.equal(d.name_map['高麗'],'Koma-Seibu');
  assert.equal(names['Koma-Seibu'].ja,'高麗');
  assert.equal(d.stations.Koma,undefined,'Koma is used by JR Hanawa: do not merge');
  assert.ok(Math.abs(d.stations.Hanno.lng-139.31906)<0.0001);
  assert.ok(d.stationLines['Higashi-Hanno'].includes('Hachiko'));
});

test('seibu 2026 active fleet is a reference, never train-level PNG or formation',()=>{
  for(const line of ['Ikebukuro','SeibuToshima','Seibu_Sayama']){
    const row=lookup(line,'2026-11-16');
    assert.ok(row&&row._fleetReferenceOnly,line);
    assert.equal(row.planOverride,false,line);
    assert.equal(row.illustrationPng,undefined,line);
    assert.ok(!row.vehicleCandidates.includes('西武2000系'),line);
  }
  assert.ok(!lookup('Ikebukuro','2026-11-16',['Ikebukuro','Nerima']).vehicleCandidates.includes('西武7000系'));
  const western=lookup('Ikebukuro','2026-11-16',subset);
  assert.equal(western.presetId,'seibu-ikebukuro-western-local');
  assert.ok(western.vehicleCandidates.includes('西武7000系'));
  assert.ok(western.vehicleCandidates.includes('西武4000系'));
  assert.ok(!lookup('Ikebukuro','2026-09-11',subset).vehicleCandidates.includes('西武7000系'));
  assert.ok(!lookup('SeibuChichibu','2026-09-11').vehicleCandidates.includes('西武7000系'));
  assert.ok(lookup('SeibuChichibu','2026-09-12').vehicleCandidates.includes('西武7000系'));
  assert.ok(!lookup('Seibu_Sayama','2026-06-26').vehicleCandidates.includes('西武7000系'));
  assert.ok(lookup('Seibu_Sayama','2026-06-27').vehicleCandidates.includes('西武7000系'));
  assert.equal(lookup('Ikebukuro','2026-11-16',subset).actualVehicleConfirmed,undefined);
});
test('no retired Seibu 2000 or 9000 Ikebukuro PNG alias survives',()=>{
 const vehicles=fs.readFileSync('js/train-vehicle.js','utf8');
 const gallery=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
 assert.match(vehicles,/"seibu-9000": \["SeibuTamako"\]/);
 assert.match(vehicles,/"remaining-fleet-extra-0": \["SeibuShinjuku"\]/);
 assert.doesNotMatch(gallery,/"seibu-9000","西武9000系"[^\]]*Ikebukuro/);
 assert.doesNotMatch(gallery,/"remaining-fleet-extra-0","西武2000系"[^\]]*Ikebukuro/);
 for (const suffix of ['001系_Laview','40000系_青帯','7000系_サステナ車両','20000系_標準塗装']){
   assert.ok(fs.existsSync('images/列车/西武鉄道/西武鉄道_'+suffix+'.png'),suffix);
 }
 const num=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
 assert.doesNotMatch(num,/lineId:\s*["']Ikebukuro["']/,'no invented train number -> PNG ranges');
});
