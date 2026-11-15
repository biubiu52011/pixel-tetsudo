'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {inspect} = require('../tools/railway-metadata-audit.cjs');
const report = inspect();
const snapshot = JSON.parse(fs.readFileSync(
  'data/audits/supabase-railway-audit-snapshot-20261116.json','utf8'));
const known = JSON.parse(fs.readFileSync(
  'data/audits/railway-metadata-known-gaps-20261116.json','utf8'));

test('all configured railway base/display colors, icons, stations and vehicle PNGs obey current audited contracts', () => {
  assert.deepEqual(report.errors, [], JSON.stringify(report, null, 2));
});
test('the known unresolved routes and presentation colors are tracked as pending review, not asserted as verified', () => {
  assert.equal(report.summary.sql_unregistered_lines, known.pending_sql_registration.length);
  assert.equal(report.summary.line_color_differences, Object.keys(known.palette_differences).length);
  assert.ok(report.summary.canonical_lines > report.summary.snapshot_sql_lines);
  assert.ok(report.summary.sql_train_number_png_rules > 0);
  assert.ok(report.summary.source_png_files > 0);
});
test('review-locked artwork stays quarantined from automatic SQL model-artwork selection', () => {
  for (const p of known.review_required_asset_paths) {
    const row = snapshot.vehicle_image_assets.find(x => x.image_path === p);
    assert.ok(row, p);
    assert.equal(row.appearance_class, 'requires_review', p);
  }
});
test('verified static routes have a full SQL station list without fake timetable API coverage', () => {
  for (const [lineId, count] of [['Enoshima',15],['UtsunomiyaLRT',19],['ChichibuMain',37]]) {
    const row = snapshot.railway_lines.find(x => x.id === lineId);
    assert.ok(row, lineId);
    assert.equal(row.timetable_api_enabled, false, lineId);
    assert.equal(row.realtime_position_api_enabled, false, lineId);
    assert.equal(row.sql_planned_fallback_enabled, false, lineId);
    assert.equal(snapshot.line_stations[lineId].length, count, lineId);
  }
});
test('known repaired Marunouchi branch and Ogose station orders survive SQL-export regeneration', () => {
  assert.deepEqual(snapshot.line_stations.MarunouchiBranch,
    ['Nakano-Sakaue','Nakano-Shimbashi','Nakano-fujimicho','Honancho']);
  assert.deepEqual(snapshot.line_stations.Ogose,
    ['Sakado','Ippommatsu','Nishi-Oya','Kawa_kaku',
     'Bushu-Nagase','Higashi_Moro','Bushu-Karasawa','Ogose']);
});
