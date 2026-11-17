'use strict';
// Read-only JR49 contract: official public Shirayuki numbers are PNG candidates,
// never physical consist, 7/4-car substitution or actual operating-day proof.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync(
  'supabase/migrations/20261118080000_jr49_shinetsu_shirayuki_e653_51_58_reference_2611.sql',
  'utf8');
const inventory = fs.readFileSync(
  'data/audits/png-first-number-band-inventory-20261117.csv','utf8');
const triage = fs.readFileSync(
  'data/audits/png-unmapped-source-triage-20261118.csv','utf8');
const index = JSON.parse(fs.readFileSync(
  'data/audits/png-to-train-number-index-2611.json','utf8'));
const asset = 'images/列车/JR東日本/JR東日本_E653系.png';
const csvRow = 'JR,JR東日本,'+asset+',Shinetsu,0051,0058,M,full,';

test('JR49 source numbers 51M-58M are all individually cited to 2611 official JR East timetable', () => {
  const linked = [...migration.matchAll(/^-- (5[1-8])M (https:\/\/timetables\.jreast\.co\.jp\/2611\/train\/\d+\/\d+\.html)/gm)];
  assert.deepEqual(linked.map(m => m[1]), ['51','52','53','54','55','56','57','58']);
  assert.equal(new Set(linked.map(m => m[2])).size, 8);
  assert.match(migration, /www\.jreast\.co\.jp\/train\/express\/inaho_shirayuki\.html/);
  assert.match(migration, /service calendar must be checked/);
});

test('JR49 single reference band is not a fleet, livery or current-day assignment', () => {
  const record = index.pngIndex.find(x => x.path === asset);
  assert.ok(record, 'original gallery asset missing');
  assert.ok(record.lineScopes.includes('Shinetsu'));
  assert.equal(record.quarantined,false);
  assert.ok(record.canonicalModels.includes('E653系（しらゆき）'));
  assert.match(migration, /'2611','Shinetsu','png_band\/Shinetsu\/0051-0058M',51,58,'M',NULL/);
  assert.match(migration, /NULL,FALSE,FALSE\);/);
  assert.match(migration, /requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE/);
  assert.match(migration, /Preserve separate date, line, source, train type, operator and fleet-identity guards/);
  assert.equal(inventory.split('\n').filter(x => x.startsWith(csvRow)).length, 1);
  assert.equal(triage.includes('"'+asset+'"'),false,
    'already-numbered E653 must not be an unmapped triage item');
});
