'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const root = {};
const context = vm.createContext({
  window: root,
  console: { debug() {}, warn() {}, log() {}, error() {} }
});
for (const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'js/train-vehicle.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const gallery = root.VehicleGaragePngMap;
const expected = [
  ['富士急行6000系（標準色）', 'fujikyu-6000-standard'],
  ['富士急行6000系（赤色塗装）', 'fujikyu-6000-red'],
  ['富士急行1000系（青色）', 'fujikyu-1000-blue'],
  ['富士急行1000系（旧塗装・水色）', 'fujikyu-1000-revival-blue'],
  ['富士急行1000系（富士登山電車）', 'fujikyu-1000-tozan'],
  ['富士急行1000系（赤白塗装）', 'fujikyu-1000-red-white'],
  ['富士急行2000系（フジサン特急・顔A・パノラマ車）', 'fujikyu-2000-face-a-panorama'],
  ['富士急行2000系（フジサン特急・顔A・非パノラマ車）', 'fujikyu-2000-face-a-nonpanorama'],
  ['富士急行2000系（フジサン特急・顔B・パノラマ車）', 'fujikyu-2000-face-b-panorama'],
  ['富士急行2000系（フジサン特急・顔B・非パノラマ車）', 'fujikyu-2000-face-b-nonpanorama']
];

assert.equal(gallery.lineModels('Fujikyu').filter(name => name.startsWith('富士急行')).length, 10);
for (const [model, id] of expected) {
  const rows = gallery.findModel(model, 'Fujikyu');
  assert.equal(rows.length, 1, model);
  assert.equal(rows[0].id, id);
  assert.equal(rows[0].canonicalImage, true);
  assert.equal(gallery.matchModelPath(model, rows[0].path, 'Fujikyu'), true);
  assert.equal(gallery.matchModelPath(model, rows[0].path, 'ChuoMain'), false);
  const record = root.TrainVehicle.resolveCanonicalVehicle(model);
  assert.ok(record, model);
  assert.equal(record.asset, rows[0].path);
  assert.deepEqual(Array.from(record.lineIds), ['Fujikyu']);
  assert.equal(record.candidateOnly, undefined);
  assert.ok(fs.existsSync(rows[0].path.replace('../', '')));
}

assert.equal(root.TrainVehicle.resolveCanonicalVehicle('2001F'), null);
assert.equal(root.TrainVehicle.resolveCanonicalVehicle('2002F'), null);
console.log('Fujikyu vehicle artwork map: PASS (10 scoped references; no formation inference)');
