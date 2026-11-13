'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20261113103000_gotemba_gtfs_plan_import.sql'),
  'utf8',
);
const edge = fs.readFileSync(path.join(root, 'supabase/functions/train-runs/index.ts'), 'utf8');

test('Gotemba promotion consumes the quarantined checksum-locked GTFS source', () => {
  assert.match(migration, /gtfs_stage\.trips/);
  assert.match(migration, /JR-Central\.Gotemba/);
  assert.match(migration, /v_trip_count<>179/);
  assert.match(migration, /v_stop_count<>2341/);
  assert.match(migration, /v_number_count<>94/);
  assert.match(migration, /source_path/);
  assert.match(migration, /operating_dates/);
});

test('Gotemba stays a planned SQL fallback without realtime or guessed vehicle data', () => {
  assert.match(migration, /'NO_REALTIME_SOURCE'/);
  assert.match(migration, /vehicle_type_label[\s\S]*?NULL/);
  assert.match(edge, /sql_planned_fallback_enabled/);
  assert.match(edge, /realtime_position_api_enabled/);
});

console.log('Gotemba GTFS planned-import contract passed');
