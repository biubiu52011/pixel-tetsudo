'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const data = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const gaps = JSON.parse(fs.readFileSync('data/audits/railway-metadata-known-gaps-20261117.json', 'utf8'));

test('Minatomirai railway uses MM identity and one canonical deep-blue site color', () => {
  const line = data.lines.MinatoMirai;
  assert.equal(line.operator, 'MinatoMirai');
  assert.equal(line.code, 'MM');
  assert.equal(line.presentation.code, 'MM');
  assert.equal(line.presentation.operatorGroup, 'MINATO_MIRAI');
  assert.deepEqual(line.presentation.lineIds, ['MinatoMirai']);
  assert.equal(line.color, '#003399');
  assert.equal(line.presentation.color, '#003399');
  assert.equal(line.stations.length, 6);
  assert.equal(gaps.palette_differences.MinatoMirai, undefined);
});

test('Tokyu Toyoko and Tokyu-operated Kodomonokuni remain independently scoped', () => {
  const toyoko = data.lines.TokyuToyoko;
  assert.equal(toyoko.operator, 'Tokyu');
  assert.equal(toyoko.presentation.code, 'TY');
  assert.equal(toyoko.color, '#da0442');
  assert.equal(toyoko.presentation.color, '#da0442');
  const kodomo = data.lines.TokyuKodomonokuni;
  assert.equal(kodomo.operator, 'Tokyu');
  assert.equal(kodomo.presentation.operatorGroup, 'TOKYU');
  assert.equal(kodomo.code, 'KD');
  assert.equal(kodomo.presentation.code, 'KD');
  assert.equal(kodomo.color, '#0068b7');
  assert.equal(kodomo.presentation.color, '#0068b7');
});
