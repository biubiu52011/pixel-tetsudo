'use strict';
/* Regression: ordinary train markers stay on the painted track centreline.
 * The same SVG unit still owns the artwork and its destination caption.
 * Run: node --test tests/trains-track-marker-alignment.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/trains-render.js'), 'utf8');
const start = source.indexOf('/*\n * TrainTrackLayout');
assert.ok(start >= 0, 'TrainTrackLayout module must be present');
const window = {};
vm.runInNewContext(source.slice(start), {window, console}, {filename: 'trains-render-layout.js'});
const layout = window.TrainTrackLayout;
assert.ok(layout && typeof layout.resolveAll === 'function');

const coords = [{x: 150, y: 40, stationId: 'A'}, {x: 150, y: 100, stationId: 'B'}];
function position(from, to, progress, id) {
  return {
    trainId: id,
    stationIndex: from,
    segmentToIndex: to,
    segmentProgress: progress,
    railDirection: from < to ? 'odpt.RailDirection:Outbound' : 'odpt.RailDirection:Inbound'
  };
}
const opts = {laneGap: 0, stackGap: 8, getDisplayMoveDir: () => null};
function place(p, geometry = {isLoop: false}, override = opts) {
  return layout.resolveAll([p], coords, geometry, 'Example', override)[0];
}

test('ordinary map passes an explicit zero lane gap to the shared layout resolver', () => {
  assert.match(source, /laneGap:\s*isLoop\s*\?\s*9\s*:\s*0/);
  assert.match(source, /opts\.laneGap\s*==\s*null\s*\?\s*DEFAULTS\.laneGap\s*:\s*opts\.laneGap/);
});

test('both directions keep their icon anchors on the visible vertical track', () => {
  const down = place(position(0, 1, 0.5, 'down'));
  const up = place(position(1, 0, 0.5, 'up'));
  assert.equal(down.x, 150);
  assert.equal(up.x, 150);
  assert.equal(down.y, 70);
  assert.equal(up.y, 70);
  assert.notEqual(down.lane, up.lane, 'source directions are not rewritten');
});

test('station clearance remains longitudinal rather than an off-track horizontal shift', () => {
  const train = place(position(0, 1, 0, 'stopped'));
  assert.equal(train.x, 150);
  assert.equal(train.y, 58);
});

test('loop maps retain their existing 9-unit directional lanes', () => {
  const train = place(position(0, 1, 0.5, 'loop'), {isLoop: true},
    {...opts, laneGap: 9});
  assert.equal(train.x, 141);
  assert.equal(train.y, 70);
});

test('artwork and caption remain in a single moving SVG train unit', () => {
  assert.match(source, /unit\.setAttribute\('transform', 'translate\('/);
  assert.match(source, /unit\.appendChild\(marker\)/);
  assert.match(source, /if \(unit\) unit\.appendChild\(labelGroup\)/);
});
