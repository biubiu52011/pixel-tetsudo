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
