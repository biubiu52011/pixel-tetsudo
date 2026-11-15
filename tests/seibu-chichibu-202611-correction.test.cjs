'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
test('SeibuChichibu route and static five-interval time',()=>{
 const l=source.lines.SeibuChichibu;
 assert.deepEqual(l.stations,['Agano','Nishi-Agano','Shomaru','Ashikubo','Yokose','Seibu-Chichibu']);
 assert.equal(l.code,'SI');assert.equal(l.presentation.code,'SI');assert.equal(l.routeLengthKm,19);
 assert.equal(l.branchOf,'Ikebukuro');assert.ok(l.throughServices.includes('Ikebukuro'));
 assert.deepEqual(l.durations,[5,4,6,4,5]);assert.equal(l.durationTotalMin,24);
 assert.equal(l.durations.length,l.stations.length-1);
 assert.deepEqual(l.serviceBoundaries.find(x=>x.lineId==='Ikebukuro').handoverStations,['Agano']);
 assert.ok(source.lines.Ikebukuro.throughServices.includes('SeibuChichibu'));
});
test('source and both generated blobs synchronized',()=>{
 const compact=JSON.stringify(source);
 assert.equal(fs.readFileSync('data/core/railway_data.compact.json','utf8'),compact+'\n');
 assert.equal(fs.readFileSync('data/core/railway-data.file.js','utf8'),'window.RAILWAY_DATA = '+compact+';\n');
});
test('4000 family standard illustration and special 4017F PNG are separate',()=>{
 const vehicles=fs.readFileSync('js/train-vehicle.js','utf8');
 const a=vehicles.match(/"remaining-fleet-extra-2": \{[^\n]+/);
 assert.ok(a);assert.ok(a[0].includes('4000系_白塗装.png'));assert.ok(!a[0].includes('4000系_赤白塗装.png'));
 const b=vehicles.match(/\{ id: "artwork-inventory-224"[^\n]+\}/);
 assert.ok(b);for(const v of ['4017編成','4000系_赤白塗装.png','asset: null','candidateOnly: true','plannedOnly: true','promotePlannedAsset: false'])assert.ok(b[0].includes(v),v);
 const g=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
 assert.ok(g.includes('["remaining-fleet-extra-2","西武4000系","西武鉄道/西武鉄道_4000系_白塗装.png","SeibuChichibu",1]'));
 assert.ok(g.includes('["artwork-inventory-224","西武4000系（4017編成・E851復刻塗装）","西武鉄道/西武鉄道_4000系_赤白塗装.png","SeibuChichibu",0]'));
});
test('7000 local candidate remains date-scoped and no fake number ranges',()=>{
 const w={window:{}};vm.runInNewContext(fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8'),w);
 const lookup=day=>w.window.MajorVehicleFleetPresets.lookup('SeibuChichibu','Seibu','odpt.TrainType:Seibu.Local',{serviceDate:day});
 assert.ok(!lookup('2026-09-11').vehicleCandidates.includes('西武7000系'));
 const p=lookup('2026-09-12');assert.ok(p.vehicleCandidates.includes('西武7000系'));
 assert.equal(p._fleetReferenceOnly,true);assert.equal(p.planOverride,false);assert.equal(p.vehicleType,undefined);
 assert.doesNotMatch(fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8'),/SeibuChichibu/);
});