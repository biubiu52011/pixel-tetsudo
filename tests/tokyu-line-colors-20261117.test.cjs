'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const lines = JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8')).lines;
const expected = {
  "TokyuToyoko": {
    "code": "TY",
    "color": "#da0442"
  },
  "TokyuMeguro": {
    "code": "MG",
    "color": "#009cd2"
  },
  "TokyuShinYokohama": {
    "code": "SH",
    "color": "#6F2C91"
  },
  "TokyuDenEn": {
    "code": "DT",
    "color": "#00a850"
  },
  "TokyuOimachi": {
    "code": "OM",
    "color": "#f18c43"
  },
  "TokyuIkegami": {
    "code": "IK",
    "color": "#ee86a7"
  },
  "TokyuTamagawa": {
    "code": "TM",
    "color": "#ae0378"
  },
  "TokyuSetagaya": {
    "code": "SG",
    "color": "#fcc70d"
  },
  "TokyuKodomonokuni": {
    "code": "KD",
    "color": "#0068b7"
  }
};

test('Tokyu nine canonical route colors and public symbols match their presentation', () => {
  const actual = Object.keys(lines).filter(id => lines[id].operator === 'Tokyu').sort();
  assert.deepEqual(actual, Object.keys(expected).sort());
  for (const [id, spec] of Object.entries(expected)) {
    const line = lines[id];
    assert.equal(line.color, spec.color, id + ' color');
    assert.equal(line.presentation.color, spec.color, id + ' presentation.color');
    assert.equal(line.code, spec.code, id + ' code');
    assert.equal(line.presentation.code, spec.code, id + ' presentation.code');
    assert.deepEqual(line.presentation.lineIds, [id], id + ' identity');
  }
});
test('Minatomirai remains separate from Tokyu route colors', () => {
  assert.equal(lines.MinatoMirai.operator,'MinatoMirai');
  assert.equal(lines.MinatoMirai.code,'MM');
  assert.equal(lines.MinatoMirai.presentation.code,'MM');
});
