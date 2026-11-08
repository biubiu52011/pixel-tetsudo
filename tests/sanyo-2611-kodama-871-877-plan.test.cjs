'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const migrationPath = 'supabase/migrations/20261108050000_sanyo_2611_kodama_871_872_873_877_vehicle_plans.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

const expected = [
  ['871A', 'N700系', '315411', false],
  ['872A', 'N700系', '315481', false],
  ['873A', '700系', '315381', true],
  ['877A', '700系', '315401', true],
];

test('four November 2026 Kodama plans use exact JR West sources', () => {
  for (const [number, model, pageId] of expected) {
    assert.match(sql, new RegExp(`'${number}','${model}'`));
    assert.match(sql, new RegExp(`train-timetable/${pageId}\\?date=20261104`));
  }
  assert.match(sql, /actual_events IS DISTINCT FROM rec\.expected_events/);
  assert.match(sql, /mapping_level='official_service_vehicle_plan'/);
  assert.match(sql, /actual_vehicle_confirmed=false/);
});

test('only the two verified JR West 700-series trains receive exact PNGs', () => {
  const rows = [...sql.matchAll(/'jrwest-2611-kodama-(\d+a)-[^']+',\s*(true|false)/g)]
    .map((match) => [match[1].toUpperCase(), match[2] === 'true']);
  assert.deepEqual(rows, expected.map(([number, , , withPng]) => [number, withPng]));
  assert.match(sql, /JR西日本_700系\.png/);
  assert.match(sql, /min_number=code_num AND p\.max_number=code_num/);
  assert.match(sql, /N700 plan % must remain without an operator-specific PNG/);
});

test('migration keeps publication plans distinct from actual formations', () => {
  assert.match(sql, /This does not confirm the actual physical formation/);
  assert.match(sql, /source_path,actual_vehicle_confirmed\)\s*\n\s*VALUES[\s\S]*?'official-2611:'\|\|rec\.official_url,false\)/);
  assert.doesNotMatch(sql, /'official-2611:'\|\|rec\.official_url,true\)/);
  assert.doesNotMatch(sql, /970A/);
});

