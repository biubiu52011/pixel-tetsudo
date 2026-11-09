'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

const indexSource = fs.readFileSync(
  'data/timetables/jreast-tadami-2611-number-index.js', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20261109133000_jreast_tadami_2611_official_number_evidence.sql',
  'utf8');

const window = {};
vm.runInNewContext(indexSource, { window });
const regular = window.JREastTadamiNumberIndex202611.regular;

const specs = [
  ['Weekday', 'Outbound', '262d1'],
  ['Weekday', 'Inbound', '262u1'],
  ['SaturdayHoliday', 'Outbound', '262d2'],
  ['SaturdayHoliday', 'Inbound', '262u2'],
];

test('Tadami migration covers every official 2611 local-number column', () => {
  for (const [calendar, direction, page] of specs) {
    const numbers = regular[calendar][direction];
    const digest = crypto.createHash('md5')
      .update([...numbers].sort().join(','))
      .digest('hex');
    assert.match(migration, new RegExp(`'${page}',${numbers.length},'${digest}'`));
  }
  assert.match(migration, /line_key='Tadami'/);
  assert.match(migration, /train_number_only/);
});

test('Tadami migration preserves the three unverified legacy rapid rows', () => {
  assert.match(migration, /expected exactly 34 official local templates/);
  assert.match(migration, /'9423D','9425D','9430D'/);
  assert.match(migration, /legacy rapid exclusion set drifted/);
  assert.match(migration, /official local stop-event completeness check failed/);
  assert.match(migration, /missing_clock/);
  assert.match(migration, /missing_station/);
});

test('Tadami batch only publishes number evidence', () => {
  assert.match(migration, /INSERT INTO public\.published_train_number_evidence/);
  assert.match(migration, /INSERT INTO public\.timetable_number_verifications/);
  assert.doesNotMatch(migration, /INSERT INTO public\.manual_timetable_templates/i);
  assert.doesNotMatch(migration, /INSERT INTO public\.train_timetable_vehicle_mappings/i);
  assert.doesNotMatch(migration, /published_train_png_number_ranges/i);
});
