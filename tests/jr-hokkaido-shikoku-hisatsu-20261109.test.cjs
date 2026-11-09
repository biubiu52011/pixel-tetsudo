'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const data = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const i18n = JSON.parse(fs.readFileSync('data/core/station_i18n.json', 'utf8'));
const audit = JSON.parse(fs.readFileSync('data/audits/jr-missing-lines-20261109.json', 'utf8'));

const hokkaido = ['HakodateMain', 'NemuroMain', 'Chitose', 'MuroranMain', 'Sekisho', 'Furano', 'SoyaMain', 'SenmoMain', 'SekihokuMain', 'Sassho', 'HidakaMain'];
const shikoku = ['Yosan', 'Dosan', 'Kotoku', 'Tokushima', 'Naruto', 'Mugi', 'Yodo', 'Uchiko'];
const all = ['Hisatsu', ...hokkaido, ...shikoku];

test('JR Hokkaido, Shikoku and Hisatsu topology is registered without fabricated service', () => {
  for (const id of all) {
    const line = data.lines[id];
    assert.ok(line, id);
    assert.ok(line.stations.length >= 2, id);
    assert.equal(line.durations.length, line.stations.length - 1, id);
    assert.equal(line.timetableDataStatus, 'station_topology_only', id);
    assert.equal(line.presentation.color, line.color, id);
    assert.equal(line.presentation.lineIds[0], id, id);
    for (const [index, station] of line.stations.entries()) {
      assert.ok(i18n[station], `${id}:${station} i18n`);
      assert.equal(data.lineStationOrder[id][station], index, `${id}:${station} order`);
      assert.ok(data.stationLines[station].includes(id), `${id}:${station} reverse index`);
    }
  }
  assert.deepEqual(audit.missingFrontend, []);
  assert.deepEqual(audit.implementedHokkaidoTopology, hokkaido);
  assert.deepEqual(audit.implementedShikokuTopology, shikoku);
});

test('Hisatsu keeps the current partial-service boundary explicit', () => {
  const line = data.lines.Hisatsu;
  assert.equal(line.serviceStatus, 'partial');
  assert.deepEqual(line.operatingSegments.map((segment) => [segment.from, segment.to, segment.status]), [
    ['Yatsushiro', 'Yoshimatsu', 'suspended'],
    ['Yoshimatsu', 'Hayato', 'active']
  ]);
  assert.equal(line.operatingSegments[1].effectiveFrom, '2026-06-28');
});

test('regional railway IDs stay topology-only in the ODPT resolver', () => {
  const source = fs.readFileSync('data/api/odpt-unified.js', 'utf8');
  for (const id of all) {
    assert.match(source, new RegExp(`"${id}": "JR-(?:Hokkaido|Shikoku|Kyushu)"`), id);
    assert.match(source, new RegExp(`"${id}": "[A-Za-z]+"`), `${id} railway alias`);
  }
});
