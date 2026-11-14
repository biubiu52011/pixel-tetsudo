'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {collectSiteFiles} = require('../scripts/build-pages-site.cjs');

test('Pages deploy contains actual site and manifest-declared lazy dependencies', () => {
  const assets = collectSiteFiles();
  for (const file of [
    'index.html','404.html','.nojekyll',
    'pages/home.html','pages/trains.html','pages/realtime.html',
    'data/core/railway_data.compact.json',
    'data/core/station_i18n.compact.json',
    'data/core/tourism_data.compact.json',
    'data/api/odpt-unified.js',
    'data/timetables/train-number-png-ranges.js',
    'data/core/major-vehicle-fleet-presets.js',
    'data/runinfo-web-snapshot.json',
    'js/leaflet/leaflet.min.js',
    'js/maplibre/maplibre-gl.js'
  ]) assert.ok(assets.has(file), file + ' must be published');
});

test('Pages deploy does not expose repositories, backups or offline-only artifacts', () => {
  const assets = collectSiteFiles();
  for (const excluded of [
    'PROGRESS.md','README.md',
    '.github/workflows/static.yml',
    'docs/audits/chuo-sobu-2026-legacy-operation-snapshots.txt',
    'supabase/functions/train-runs/index.ts',
    'scripts/page-scripts.json',
    'tests/page-scripts.test.cjs',
    'data/timetables/Oedo-manual.js',
    'data/core/railway_data.json',
    'data/core/station_i18n.json',
    'data/core/tourism_data.json',
    'data/core/railway-data.file.js',
    'data/core/station-i18n.file.js',
    'data/core/tourism-data.file.js'
  ]) assert.ok(!assets.has(excluded), excluded + ' must not be published');
  assert.ok([...assets].every(file => !/^(?:\.github|docs|supabase|tests|tools|scripts|data\/(?:audits|research))\//.test(file)));
});
