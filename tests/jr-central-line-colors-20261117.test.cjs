'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const data = JSON.parse(fs.readFileSync('data/core/railway_data.json', 'utf8'));
const central = Object.entries(data.lines).filter(([,line]) => line.operator === 'JR-Central');
const numbered = {
  TokaidoCentral: ['CA', '#f6861f'],
  Gotemba: ['CB', '#477543'],
  Minobu: ['CC', '#773c97'],
  Iida: ['CD', '#6fa3d7'],
  Taketoyo: ['CE', '#8c5a38'],
  ChuoCentral: ['CF', '#327198'],
  Takayama: ['CG', '#9e1813'],
  Taita: ['CI', '#c8ba45'],
  KansaiCentral: ['CJ', '#16b68f']
};
const unnumbered = ['KiseiCentral', 'Sangu', 'Meisho', 'MinoAkasaka'];

test('nine officially numbered JR-Central routes agree with the existing SVG line colors', () => {
  assert.equal(central.length, 14);
  for (const [id,[code,color]] of Object.entries(numbered)) {
    const line = data.lines[id];
    assert.equal(line.operator, 'JR-Central', id);
    assert.equal(line.presentation.code, code, id);
    assert.equal(line.color.toLowerCase(), color, id);
    assert.equal(line.presentation.color.toLowerCase(), color, id);
    assert.ok(line.image.startsWith('../images/鉄道/JR東海/'), id);
    assert.ok(line.image.endsWith('.svg'), id);
    const svg = fs.readFileSync(line.image.slice(3), 'utf8');
    const match = svg.match(/<rect[^>]*fill="(#[0-9a-f]{6})"/i);
    assert.ok(match, id + ' SVG background');
    assert.equal(match[1].toLowerCase(), color, id + ' SVG/line palette');
  }
});

test('four JR-Central unnumbered routes expose no invented official passenger symbol', () => {
  for (const id of unnumbered) {
    const line = data.lines[id];
    assert.equal(line.operator, 'JR-Central', id);
    assert.equal(line.color, '#80868b', id);
    assert.equal(line.presentation.color, line.color, id);
    assert.equal(line.presentation.code, '', id);
    assert.ok(Array.isArray(line.stations) && line.stations.length > 2, id);
  }
});

test('CJ cross-operator displayed segment agrees with JR-Central without reassigning canonical owner', () => {
  const line = data.lines.KansaiMain;
  assert.equal(line.operator, 'JR-West');
  const rule = line.presentation.displayRules.segmentColors.ranges.find(
    r => r.from === 'Nagoya' && r.to === 'Kameyama' && r.code === 'CJ'
  );
  assert.ok(rule);
  assert.equal(rule.operator, 'JR-Central');
  assert.equal(rule.color, data.lines.KansaiCentral.color);
  assert.equal(line.presentation.code, 'Q');
});

test('Tokaido Shinkansen remains separate from conventional-line palette edits', () => {
  const line = data.lines.TokaidoShinkansen;
  assert.equal(line.operator, 'JR-Central');
  assert.equal(line.color, '#00a7e1');
  assert.equal(line.stations.length, 17);
  assert.equal(line.presentation, undefined);
});
