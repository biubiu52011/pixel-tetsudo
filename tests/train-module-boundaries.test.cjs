'use strict';
// Code ownership tests: keep the classic-script APIs after splitting giant owners.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
const spec = JSON.parse(read('scripts/page-scripts.json'));
const expand = arr => arr.flatMap(x => x[0] === '@' ? expand(spec.groups[x.slice(1)]) : [x]);
test('track position and overlap layout live only in their lazy owner', () => {
  const render = read('js/trains-render.js');
  const layout = read('js/train-track-layout.js');
  const lazy = expand(spec.lazy.trains);
  assert.doesNotMatch(render, /window\.TrainTrackLayout\s*=/);
  assert.equal((layout.match(/window\.TrainTrackLayout\s*=/g) || []).length, 1);
  assert.match(render, /window\.TrainTrackLayout\.resolveAll/);
  assert.ok(lazy.indexOf('js/train-track-layout.js') < lazy.indexOf('js/trains-render.js'));
});
test('the through chip is one public module and geometry remains its consumer', () => {
  const data = read('js/trains-data.js');
  const chip = read('js/through-chip.js');
  const eager = expand(spec.pages.trains);
  assert.doesNotMatch(data, /window\.ThroughChip\s*=/);
  assert.equal((chip.match(/window\.ThroughChip\s*=/g) || []).length, 1);
  assert.match(data, /window\.ThroughChip\.height/);
  assert.ok(eager.indexOf('js/trains-data.js') < eager.indexOf('js/through-chip.js'));
  assert.ok(eager.indexOf('js/through-chip.js') < eager.indexOf('js/trains-detail-loader.js'));
});
test('realtime consumes DataState status vocabulary without a second table', () => {
  const view = read('js/realtime-view.js');
  const state = read('js/data-state.js');
  assert.equal((state.match(/var STATUS_META = \{/g) || []).length, 1);
  assert.match(view, /const STATUS_META = window\.DataState\.STATUS_META;/);
  assert.doesNotMatch(view, /const STATUS_META = window\.DataState \?/);
});

test('vehicle candidates are selected only by TrainVehicle and never SVG display', () => {
  const vehicle = read('js/train-vehicle.js');
  const render = read('js/trains-render.js');
  assert.match(vehicle, /function seibuCommuterCandidateModels\(/);
  assert.match(vehicle, /function shonanFleetCandidateModels\(/);
  assert.match(render, /window\.TrainVehicle\.seibuCommuterCandidateModels\(p, lineId\)/);
  assert.match(render, /window\.TrainVehicle\.shonanFleetCandidateModels\(p, lineId\)/);
  assert.doesNotMatch(render, /window\.JREastShonanMixedNumberIndex202611/);
  assert.doesNotMatch(render.slice(render.indexOf('  function _shonanFleetCandidatesLabel('),
    render.indexOf('  \/\/ Display the timetable fleet mapping')),
    /matchItoFleetCandidates|positionSource|vehicleIdentityStatus/);
});
