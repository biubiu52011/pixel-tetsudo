'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const railway = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const line = railway.lines.TokaidoCentral;

test('JR Central CA is its own 84-station Atami–Maibara route, not an East/West/Shinkansen alias', () => {
  assert.equal(line.operator, 'JR-Central');
  assert.equal(line.stations.length, 84);
  assert.equal(line.stations[0], 'Atami');
  assert.equal(line.stations.at(-1), 'Maibara');
  for (const other of ['Tokaido', 'TokaidoMain', 'TokaidoKansai', 'TokaidoShinkansen']) {
    assert.notEqual(railway.lines[other], line, other);
  }
  // No rolling-stock or train-running time can be derived from station order.
  assert.ok(!Array.isArray(line.durations) || line.durations.length === 0);
  assert.ok(!Number.isFinite(line.durationTotalMin) || line.durationTotalMin <= 0);
});

test('topology routing does not imply a published train plan or verified travel time', () => {
  const window = {
    RailwayDB: {
      getAllLines: () => ({TokaidoCentral: line}),
      getData: () => ({stations: railway.stations, line_types: railway.line_types}),
      getLine: id => id === 'TokaidoCentral' ? line : null,
    },
    RuntimeConfig: {TRUNK_MAIN_LINE_IDS: []},
    LINE_STATION_ORDER: {TokaidoCentral: railway.lineStationOrder.TokaidoCentral}
  };
  vm.runInNewContext(fs.readFileSync('js/route-search.js', 'utf8'),
    {window, console, Map, Set, Date, Math});
  const route = window.RouteSearch.findRoute('Atami', 'JRC-TokaidoCentral-002');
  assert.ok(route, 'Atami–Kannami should remain connected in topology');
  assert.equal(route.routeSegments[0].lineId, 'TokaidoCentral');
  // Two-minute-per-hop fallback is only a graph weight. A user-facing timetable
  // requires a published, same-date source, not this static route duration.
  const ui = fs.readFileSync('js/search-ui.js', 'utf8');
  assert.match(ui, /search\.duration_unconfirmed/);
  assert.match(ui, /res\.arrivalClockConfirmed===true/);
  assert.match(ui, /search\.schedule_missing/);
});

test('JR-Central timetable source must not create a map disclaimer card', () => {
  const page = fs.readFileSync('js/trains-page.js', 'utf8');
  const html = fs.readFileSync('pages/trains.html', 'utf8');
  for (const marker of ['trainsOfficialRuninfo','updateOfficialRuninfoSource',
    'trainsCorridorEvidence','TrainCorridorEvidence']) {
    assert.ok(!page.includes(marker));
    assert.ok(!html.includes(marker));
  }
  assert.match(page, /ensureTimetable\(lineId\)/);
});

test('existing train-runs endpoint reads exact line key, not the ambiguous Tokaido alias', () => {
  const edge = fs.readFileSync('supabase/functions/train-runs/index.ts', 'utf8');
  assert.match(edge, /\.eq\("line_key", lineId\)\.eq\("calendar_urn", calendar\)/);
  assert.match(edge, /"NO_API_NO_DATA"/);
  // Guard future importers against confusing the JR-Central corridor with the
  // 692 JR-East templates already under Tokaido / TokaidoMain.
});
