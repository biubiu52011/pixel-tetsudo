'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Official station order: https://www.tobu.co.jp/railway/guide/line/noda_line.html
// TD / Urban Park Line: https://nagareyamakankou.com/tourism-information/tobu-urban-parkline/
// 2026-11-04 station-time samples: https://www.tobu.co.jp/cms-pdf/news/20261103204035MJuKcsv6odNCVl1zTmYjrw.pdf
// Segment durations are generic estimates for non-timetabled fallback ONLY.
// Prefer dated SQL train-runs/ODPT observations and do not apply the 2026-11-21 revision early.
const canonical = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/core/railway_data.json'), 'utf8'));
const line = canonical.lines.Noda;

test('Noda canonical identity, route order and color agree with presentation', () => {
  assert.equal(line.code, 'TD');
  assert.equal(line.presentation.code, 'TD');
  assert.equal(line.color.toLowerCase(), line.presentation.color.toLowerCase());
  assert.equal(line.operator, 'Tobu');
  assert.equal(line.stations.length, 35);
  assert.equal(line.stations[0], 'Omiya');
  assert.equal(line.stations[9], 'Kasukabe');
  assert.equal(line.stations[23], 'Kashiwa');
  assert.equal(line.stations[34], 'Funabashi');
  assert.equal(new Set(line.stations).size, 35);
});

test('Noda duration fallback preserves station count and official sampled intervals', () => {
  assert.equal(line.durations.length, line.stations.length - 1);
  assert.ok(line.durations.every(value => Number.isInteger(value) && value >= 1 && value <= 6));
  assert.deepEqual(line.durations.slice(0, 5), [2, 2, 2, 3, 2],
    'official 2026-11-04 419A Omiya to Iwatsuki sample');
  assert.ok(new Set(line.durations).size > 1);
  const north = line.durations.slice(0, 23).reduce((sum, value) => sum + value, 0);
  const south = line.durations.slice(23).reduce((sum, value) => sum + value, 0);
  assert.ok(north >= 60 && north <= 72);
  assert.ok(south >= 25 && south <= 35);
});

test('Noda transfers use valid route IDs, stations and no duplicate declarations', () => {
  const seen = new Set();
  for (const transfer of line.transferStations) {
    assert.ok(line.stations.includes(transfer.station), transfer.station + ' not on Noda');
    assert.ok(canonical.lines[transfer.lineId], transfer.lineId + ' line absent');
    const target = transfer.toStation || transfer.station;
    assert.ok(canonical.lines[transfer.lineId].stations.includes(target),
      transfer.lineId + ':' + target + ' target station absent');
    const key = transfer.station + ':' + transfer.lineId;
    assert.ok(!seen.has(key), 'Duplicate transfer: ' + key);
    seen.add(key);
  }
  assert.ok(seen.has('Nagareyama-Otakanomori:TsukubaExpress'));
  assert.ok(seen.has('Funabashi:Keisei'));
  const keisei = line.transferStations.find(t => t.station === 'Funabashi' && t.lineId === 'Keisei');
  assert.equal(keisei.toStation, 'Keisei-Funabashi');
  assert.equal(keisei.type, 'out');
});
