'use strict';
// Do not infer a through train at Kyobashi from a shared corridor.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const data = JSON.parse(read('data/core/railway_data.json'));
test('Gakkentoshi and Osaka Higashi meet only at real transfer stations, not Kyobashi',()=>{
  for(const [lineId,otherId] of [['Gakkentoshi','OsakaHigashi'],['OsakaHigashi','Gakkentoshi']]){
    const line=data.lines[lineId],other=data.lines[otherId];
    assert.equal(line.operator,'JR-West');
    assert.ok(!line.throughServices.includes(otherId),'no unverified direct through operation');
    assert.ok(!line.serviceBoundaries.some(x=>x.lineId===otherId),'no fabricated service handover');
    for(const station of ['Hanaten','Shigino']){
      assert.ok(line.stations.includes(station) && other.stations.includes(station));
      assert.equal(line.transferStations.filter(x=>x.station===station&&x.lineId===otherId&&x.type==='in').length,1);
    }
    assert.equal(line.transferStations.some(x=>x.station==='Kyobashi-Osaka'&&x.lineId===otherId),false);
  }
  assert.equal(data.lines.OsakaHigashi.stations.includes('Kyobashi-Osaka'),false);
});
test('generated data mirrors canonical railway source',()=>{
  const compact=JSON.stringify(data);
  assert.equal(read('data/core/railway_data.compact.json'),compact+'\n');
  assert.equal(compact.toLowerCase().includes('</script'),false);
  assert.equal(read('data/core/railway-data.file.js'),'window.RAILWAY_DATA = '+compact+';\n');
});
test('Gakkentoshi fleet remains only ambiguous route-level reference, never vehicle or PNG evidence',()=>{
  const context=vm.createContext({window:{}});
  vm.runInContext(read('data/core/major-vehicle-fleet-presets.js'),context);
  const p=context.window.MajorVehicleFleetPresets.lookup('Gakkentoshi','JR-West','odpt.TrainType:JR-West.Local');
  assert.deepEqual(Array.from(p.vehicleCandidates),['JR西日本207系','JR西日本321系']);
  assert.equal(p.evidenceRole,'route-fleet-reference');
  assert.equal(p._fleetReferenceOnly,true);
  assert.equal(p.planOverride,false);
  assert.equal(p.vehicleArtworkPath,undefined);
  vm.runInContext(read('data/timetables/vehicle-garage-png-map.js'),context);
  const garage=context.window.VehicleGaragePngMap;
  assert.equal(garage.findModel('JR西日本207系（NK）','Gakkentoshi').length,1);
  assert.equal(garage.findModel('JR西日本207系（Y2）','Gakkentoshi').length,1);
  assert.equal(garage.findModel('JR西日本321系','Gakkentoshi').length,1);
  assert.equal(garage.findModel('JR西日本207系','Gakkentoshi').length,0,'generic 207 cannot choose a formation image');
});


test('Nara→Kizu→Gakkentoshi has sourced through-service boundary, never a universal vehicle assignment',()=>{
  for(const [lineId,otherId] of [['Nara','Gakkentoshi'],['Gakkentoshi','Nara']]){
    const line=data.lines[lineId];
    assert.ok(line.throughServices.includes(otherId));
    assert.equal(line.serviceBoundaries.filter(b=>b.lineId===otherId).length,1);
    const boundary=line.serviceBoundaries.find(b=>b.lineId===otherId);
    assert.deepEqual(boundary.handoverStations,['Kizu']);
    assert.equal(boundary.evidence.confidence,'HIGH');
    assert.match(boundary.evidence.source,/timetable\.jr-odekake\.net\/train-timetable\/123201/);
    assert.ok(!line.serviceBoundaries.some(b=>b.lineId==='OsakaHigashi' && b.handoverStations.includes('Kyobashi-Osaka')));
  }
  const fleet=vm.createContext({window:{}});
  vm.runInContext(read('data/core/major-vehicle-fleet-presets.js'),fleet);
  const result=fleet.window.MajorVehicleFleetPresets.lookup('Gakkentoshi','JR-West','odpt.TrainType:JR-West.Rapid');
  assert.deepEqual(Array.from(result.vehicleCandidates),['JR西日本207系','JR西日本321系']);
  assert.equal(result._fleetReferenceOnly,true);
  assert.equal(result.vehicleArtworkPath,undefined);
});


test('JR-West JR Tōzai has nine H41–H49 stations separate from Tokyo Metro Tōzai',()=>{
  const line=data.lines.JRTozai,metro=data.lines.Tozai;
  const keys=['Kyobashi-Osaka','Osakajo-Kitazume','Osaka-Tenmangu','Kitashinchi','Shin-Fukushima','Ebie','Mitejima','Kashima-Osaka','Amagasaki'];
  assert.equal(line.operator,'JR-West');
  assert.equal(metro.operator,'TokyoMetro');
  assert.equal(line.presentation.code,'H');
  assert.deepEqual(line.stations,keys);
  assert.equal(line.durations.length,8);
  assert.equal(line.durationTotalMin,line.durations.reduce((a,b)=>a+b,0));
  const tr=JSON.parse(read('data/core/station_i18n.json'));
  keys.forEach(key=>{
    const geo=data.stations[key],n=tr[key];
    assert.ok(geo&&Number.isFinite(geo.lat)&&Number.isFinite(geo.lng),key);
    assert.ok(n&&n.ja&&n.zh&&n.en&&n.ko,key);
  });
  for(const [a,b,station] of [['Gakkentoshi','JRTozai','Kyobashi-Osaka'],['Fukuchiyama','JRTozai','Amagasaki']]){
    for(const [from,to] of [[a,b],[b,a]]){
      assert.ok(data.lines[from].throughServices.includes(to));
      const boundaries=data.lines[from].serviceBoundaries.filter(x=>x.lineId===to);
      assert.equal(boundaries.length,1);
      assert.deepEqual(boundaries[0].handoverStations,[station]);
      assert.match(boundaries[0].evidence.source,/jr-odekake/);
    }
  }
  assert.equal(data.lines.Gakkentoshi.throughServices.includes('Fukuchiyama'),false);
});
test('JR Tōzai route fleet is 207/321 only as an unconfirmed candidate; generic 207 has no selected artwork',()=>{
  const context=vm.createContext({window:{}});
  vm.runInContext(read('data/core/major-vehicle-fleet-presets.js'),context);
  const p=context.window.MajorVehicleFleetPresets.lookup('JRTozai','JR-West','odpt.TrainType:JR-West.Rapid');
  assert.deepEqual(Array.from(p.vehicleCandidates),['JR西日本207系','JR西日本321系']);
  assert.equal(p.evidenceRole,'route-fleet-reference');
  assert.equal(p._fleetReferenceOnly,true);
  assert.equal(p.planOverride,false);
  vm.runInContext(read('data/timetables/vehicle-garage-png-map.js'),context);
  const gallery=context.window.VehicleGaragePngMap;
  for(const model of ['JR西日本207系（NK）','JR西日本207系（Y2）','JR西日本321系'])
    assert.equal(gallery.findModel(model,'JRTozai').length,1);
  assert.equal(gallery.findModel('JR西日本207系','JRTozai').length,0);
});
test('JR Tōzai compact and file-protocol artifacts are generated from their canonical JSON',()=>{
  const dataCompact=JSON.stringify(data);
  const i18nCompact=JSON.stringify(JSON.parse(read('data/core/station_i18n.json')));
  assert.equal(read('data/core/railway_data.compact.json'),dataCompact+'\n');
  assert.equal(read('data/core/railway-data.file.js'),'window.RAILWAY_DATA = '+dataCompact+';\n');
  assert.equal(read('data/core/station_i18n.compact.json'),i18nCompact+'\n');
  assert.equal(read('data/core/station-i18n.file.js'),'window.RAILWAY_I18N = '+i18nCompact+';\n');
});
