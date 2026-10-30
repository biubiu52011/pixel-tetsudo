'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const tourism = JSON.parse(fs.readFileSync('data/core/tourism_data.json', 'utf8'));
const exits = tourism.station_exits || {};
const entries = Object.values(exits).flat();

assert.equal(tourism.station_exits_meta.policy, 'verified-only');
assert.equal(tourism.station_exits_meta.namePolicy, 'explicit-exit-label');
assert.ok(entries.length > 0, 'verified station exits should remain available');
assert.ok(entries.every((entry) => entry.source === 'osm_overpass'));
assert.ok(entries.every((entry) => entry.kind === 'station_exit'));
assert.ok(entries.every((entry) => /(出口|出入口|入口|口$|改札口)$/i.test(entry.name)));
assert.ok(entries.every((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lng)));

const window = {
  STATION_EXITS: {
    Verified: [{ name: '1番出口', lat: 35.0, lng: 139.0, source: 'osm_overpass', kind: 'station_exit' }],
    Fabricated: [{ name: '站前', lat: 35.0, lng: 139.0, source: 'osm_overpass', kind: 'station_exit' }],
    Landmark: [{ name: 'Atré', lat: 35.0, lng: 139.0, source: 'osm_overpass', kind: 'station_exit' }],
  },
  addEventListener() {},
};
const context = { window, console, Date, Math, Number, isNaN };
vm.runInNewContext(fs.readFileSync('js/tourism-proximity.js', 'utf8'), context, {
  filename: 'js/tourism-proximity.js',
});

assert.equal(window.TourismProximity.getNearestExit('Verified', 35.0, 139.0).name, '1番出口');
assert.equal(window.TourismProximity.getNearestExit('Fabricated', 35.0, 139.0), null);
assert.equal(window.TourismProximity.getNearestExit('Landmark', 35.0, 139.0), null);
assert.equal(window.TourismProximity.getExitNameByCoords('Unknown', 10, 35.0, 139.0), null);

console.log(`tourism exit integrity: PASS (${entries.length} sourced exits)`);
