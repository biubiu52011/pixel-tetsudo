'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

const indexSource = fs.readFileSync(
  'data/timetables/jreast-yamanote-2611-number-index.js', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20261109113000_jreast_yamanote_2611_official_number_evidence.sql',
  'utf8');

const window = {};
vm.runInNewContext(indexSource, { window });
const lists = window.JREastYamanote202611NumberIndex.lists;

const specs = [
  ['Weekday', 'InnerLoop', '630u1'],
  ['Weekday', 'OuterLoop', '630d1'],
  ['SaturdayHoliday', 'InnerLoop', '630u2'],
  ['SaturdayHoliday', 'OuterLoop', '630d2'],
];

test('Yamanote migration covers every official 2611 four-way column', () => {
  for (const [calendar, direction, page] of specs) {
    const numbers = lists[`${calendar}|${direction}`];
    const digest = crypto.createHash('md5')
      .update([...numbers].sort().join(','))
      .digest('hex');
    assert.match(migration, new RegExp(`'${page}',${numbers.length},'${digest}'`));
    assert.match(migration, new RegExp(`'${page}'`));
  }
  assert.match(migration, /line_key='Yamanote'/);
  assert.match(migration, /train_number_only/);
});

test('Yamanote migration gates SQL timetable stop completeness', () => {
  assert.match(migration, /expected exactly 1037 SQL source templates/);
  assert.match(migration, /stop_count<4/);
  assert.match(migration, /first_sequence<>0/);
  assert.match(migration, /duplicate_sequences/);
  assert.match(migration, /missing_clock/);
  assert.match(migration, /missing_station/);
  assert.match(migration, /count\(DISTINCT t\.train_number\)<>spec\.expected_count/);
});

test('Yamanote batch only publishes number evidence', () => {
  assert.match(migration, /INSERT INTO public\.published_train_number_evidence/);
  assert.match(migration, /INSERT INTO public\.timetable_number_verifications/);
  assert.doesNotMatch(migration, /INSERT INTO public\.manual_timetable_templates/i);
  assert.doesNotMatch(migration, /INSERT INTO public\.train_timetable_vehicle_mappings/i);
  assert.doesNotMatch(migration, /published_train_png_number_ranges/i);
});
