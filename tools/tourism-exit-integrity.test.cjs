'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const tourism = JSON.parse(fs.readFileSync('data/core/tourism_data.json', 'utf8'));
const exits = tourism.station_exits || {};
const entries = Object.values(exits).flat();
const allowedSources = new Set(['official_station_page', 'official_station_map']);
const allowedOfficialHosts = new Set([
  'www.jreast.co.jp',
  'www.keisei.co.jp',
  'www.mir.co.jp',
  'www.tobu.co.jp',
  'www.tokyometro.jp',
]);

assert.equal(tourism.station_exits_meta.schemaVersion, 2);
assert.equal(tourism.station_exits_meta.policy, 'official-name-and-station-ownership');
assert.ok(entries.length > 0, 'reviewed station exits should remain available');

for (const [stationId, stationEntries] of Object.entries(exits)) {
  const names = new Set();
  for (const entry of stationEntries) {
    assert.equal(entry.stationId, stationId, `${stationId}: cross-station record`);
    assert.equal(entry.kind, 'station_exit', `${stationId}: wrong record kind`);
    assert.equal(entry.reviewStatus, 'verified', `${stationId}: unreviewed record`);
    assert.ok(allowedSources.has(entry.source), `${stationId}: non-official source`);
    assert.equal(entry.coordinateSource, 'openstreetmap', `${stationId}: unknown coordinate source`);
    assert.ok(entry.operator, `${stationId}: missing operator ownership`);
    assert.ok(Number.isFinite(entry.lat) && Number.isFinite(entry.lng), `${stationId}: invalid coordinates`);
    assert.ok(!names.has(entry.name), `${stationId}: duplicate exit name ${entry.name}`);
    names.add(entry.name);

    const officialUrl = new URL(entry.officialSource);
    assert.equal(officialUrl.protocol, 'https:', `${stationId}: non-HTTPS official source`);
    assert.ok(allowedOfficialHosts.has(officialUrl.hostname), `${stationId}: unapproved evidence host`);
  }
}

assert.deepEqual(exits['Tokyo-Skytree'].map((entry) => entry.name), ['西口', '東口']);
assert.ok(exits['Tokyo-Skytree'].every((entry) => !entry.name.includes('押上')));
assert.deepEqual(exits['Keisei-Ueno'].map((entry) => entry.name), ['正面口', '池の端口']);
assert.deepEqual(exits.Ayase.map((entry) => entry.name), ['西口', '東口']);
assert.ok(exits.Nippori.every((entry) => !entry.name.includes('改札')));
assert.ok(exits['Minami-Senju'].every((entry) => entry.name !== 'TXの駅入口'));
assert.ok(exits.Ueno.every((entry) => !/^東京メトロ [45]番出口$/.test(entry.name)));

const verifiedFixture = {
  stationId: 'Verified',
  name: '1番出口',
  lat: 35.0,
  lng: 139.0,
  operator: 'Test Railway',
  source: 'official_station_page',
  officialSource: 'https://example.test/station',
  coordinateSource: 'openstreetmap',
  reviewStatus: 'verified',
  kind: 'station_exit',
};
const window = {
  STATION_EXITS: {
    Verified: [verifiedFixture],
    NearbyOther: [{ ...verifiedFixture, stationId: 'NearbyOther', lat: 35.1 }],
    CrossStation: [{ ...verifiedFixture, stationId: 'Elsewhere' }],
    OsmOnly: [{ ...verifiedFixture, stationId: 'OsmOnly', source: 'osm_overpass' }],
    Unreviewed: [{ ...verifiedFixture, stationId: 'Unreviewed', reviewStatus: 'pending' }],
  },
  addEventListener() {},
};
const context = { window, console, Date, Math, Number, isNaN };
vm.runInNewContext(fs.readFileSync('js/tourism-proximity.js', 'utf8'), context, {
  filename: 'js/tourism-proximity.js',
});

assert.equal(window.TourismProximity.getNearestExit('Verified', 35.0, 139.0).name, '1番出口');
assert.equal(window.TourismProximity.getNearestExit('CrossStation', 35.0, 139.0), null);
assert.equal(window.TourismProximity.getNearestExit('OsmOnly', 35.0, 139.0), null);
assert.equal(window.TourismProximity.getNearestExit('Unreviewed', 35.0, 139.0), null);
assert.equal(window.TourismProximity.getExitNameByCoords('Unknown', 10, 35.0, 139.0), null);

const currentStationOnly = window.TourismProximity.recommendExitStation(35.1, 139.0, 'Verified', 20000);
assert.equal(currentStationOnly.best.stationId, 'Verified');
assert.equal(currentStationOnly.fromExit.stationId, 'Verified');
assert.equal(currentStationOnly.list.length, 1);

const smallStationWithoutReviewedExits = window.TourismProximity.recommendExitStation(
  35.1,
  139.0,
  'SmallStationWithoutReviewedExits',
  20000
);
assert.equal(smallStationWithoutReviewedExits.best, null);
assert.equal(smallStationWithoutReviewedExits.fromExit, null);
assert.equal(smallStationWithoutReviewedExits.list.length, 0);

console.log(`tourism exit integrity: PASS (${entries.length} officially reviewed exits)`);
