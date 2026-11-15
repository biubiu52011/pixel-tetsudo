'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const compact = fs.readFileSync('data/core/railway_data.compact.json','utf8').trim();
const bundle = fs.readFileSync('data/core/railway-data.file.js','utf8').trim();
assert.equal(compact,JSON.stringify(source),'compact data must match readable source');
assert.equal(bundle,'window.RAILWAY_DATA = '+compact+';','JS data file must match compact data');

const toshima = source.lines.SeibuToshima;
const ikebukuro = source.lines.Ikebukuro;
assert.deepEqual(toshima.stations,['Nerima','Toshimaen']);
assert.equal(toshima.branchOf,'Ikebukuro');
assert.equal(toshima.color,toshima.presentation.color);
for (const [line,peer] of [[toshima,'Ikebukuro'],[ikebukuro,'SeibuToshima']]) {
  assert.ok(line.throughServices.includes(peer),'through service missing: '+peer);
  const boundary=line.serviceBoundaries.find(row=>row.lineId===peer);
  assert.ok(boundary,'service boundary missing: '+peer);
  assert.deepEqual(boundary.handoverStations,['Nerima']);
  assert.equal(boundary.serviceScope,'selected-local');
}
const veh=fs.readFileSync('js/train-vehicle.js','utf8');
const fleet=fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8');
assert.match(fleet,/id:'seibu-toshima'[\s\S]*?models:\['西武20000系','西武30000系','西武40000系50番台'\]/);
assert.match(veh,/SeibuToshima:\s*\{\s*models: \['西武20000系','西武30000系','西武40000系50番台'\]/);
// The green-livery reference has not passed image/source review.
const inventory=veh.match(/\{ id: "artwork-inventory-225"[^\n]+\}/);
assert.ok(inventory,'missing 40000-50 reference');
for(const rule of [/asset: null/,/plannedAsset: "[^"]*40050系_緑帯\.png"/,/candidateOnly: true/,/promotePlannedAsset: false/,/plannedOnly: true/,/artworkStatus: "pending-source-review"/]) assert.match(inventory[0],rule);
assert.doesNotMatch(fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8'),/SeibuToshima/,'no invented public train-number bands');
console.log('Seibu Toshima source topology, fleet boundaries and PNG quarantine: OK');
