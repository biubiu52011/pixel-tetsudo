const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261112085044_fujikyu_gtfs_rail_20261112.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

test('Fujikyu GTFS import is complete and remains plan-only', () => {
  assert.match(sql, /line_key='Fujikyu'/);
  assert.match(sql, /BB1BF605817E7A3A65CAFFBCD019843AA0FFD5CB3B2C9FBB0444C8B3072FF87F/);
  assert.match(sql, /IF template_count <> 152/);
  assert.match(sql, /IF stop_count <> 2304/);
  assert.match(sql, /IF line_station_count <> 18/);
  assert.equal((sql.match(/\('Fujikyu\.Fujikyu\./g) || []).length, 152);
  assert.match(sql, /sql_planned_fallback_enabled=true/);
  assert.match(sql, /timetable_api_enabled=false, realtime_position_api_enabled=false/);
  assert.match(sql, /vehicle_type_label/);
  assert.match(sql, /NULL, 'gtfs:tokyogtfs:rail\.zip/);
  assert.match(sql, /coverage_status='unverified'/);
  assert.match(sql, /NO_REALTIME_SOURCE/);
});

test('Fujikyu station collision aliases are persisted in canonical order', () => {
  for (const station of [
    'Otsuki',
    'Kami-Otsuki',
    'Akasaka-Fujikyu',
    'Tsuru-shi',
    'Tsurubunkadaigaku-mae',
    'Tokaichiba-Fujikyu',
    'Higashi-Katsura',
    'Fujisan',
    'Fujikyu-Highland',
    'Kawaguchiko',
  ]) {
    assert.match(sql, new RegExp(`station_name := '${station.replaceAll('-', '\\-')}'`));
  }
});
