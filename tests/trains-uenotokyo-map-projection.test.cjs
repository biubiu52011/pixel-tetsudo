'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/trains-render.js'), 'utf8');
const all = JSON.parse(fs.readFileSync(path.join(root, 'data/core/railway_data.compact.json'), 'utf8')).lines;
const line = all.UenoTokyo;
function slice(begin, end) {
  const a = source.indexOf(begin), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'missing source anchors: ' + begin);
  return source.slice(a, b);
}
const section = slice('  function _displayLineForMap(line, lineId) {', '  var _trainRenderSamples = []');
const direction = slice('  function _trainMoveDir(p, lineId) {', '  // Keep direction (');
const context = {window:{UNIFIED_LINES:all}, console};
const stubs = [
  'function _getLineOverride() { return null; }',
  'function _isOedoTailTrain() { return false; }',
  'function _stationKey(x) { return String(x).replace(/[-_]/g, "").toLowerCase(); }'
].join('\n');
vm.runInNewContext(stubs + '\n' + section + '\n' + direction +
  '\nthis.displayLine=_displayLineForMap;this.project=_projectPositionsForMap;this.dir=_trainMoveDir;', context);
const displayed=context.displayLine(line,'UenoTokyo');
const index = name => line.stations.indexOf(name);
function train(from,to,progress,dest) {
  return {trainId:from+':'+to, stationIndex:index(from), segmentToIndex:index(to),
    segmentProgress:progress, destinationStation:dest || 'Ueno',
    railDirection:'odpt.RailDirection:Inbound'};
}
const project = p => context.project([p], line, displayed);

test('passenger map covers exactly Ueno, Tokyo, Shimbashi and Shinagawa', () => {
  assert.deepEqual(Array.from(displayed.stations), ['Ueno','Tokyo','Shimbashi','Shinagawa']);
});

test('a northbound Shimbashi train uses four-stop source-consistent direction', () => {
  const p=project(train('Shimbashi','Tokyo',0.5,'Ueno'))[0];
  assert.ok(p);
  assert.equal(p.stationIndex,2);
  assert.equal(p.segmentToIndex,1);
  assert.equal(context.dir(p,'UenoTokyo'),'up');
});

test('destination-only direction comparisons use the displayed four-stop order', () => {
  const p=project(train('Shimbashi','Tokyo',0,'Ueno'))[0];
  p.segmentToIndex=null;
  assert.equal(context.dir(p,'UenoTokyo'),'up');
  const q=project(train('Tokyo','Shimbashi',0.3,'Shinagawa'))[0];
  assert.equal(context.dir(q,'UenoTokyo'),'down');
});

test('trains outside the displayed corridor are not pinned to its endpoints', () => {
  assert.equal(project(train('Oku','Ueno',0.5)).length,0);
  assert.equal(project(train('Shinagawa','Kawasaki',0.5,'Ofuna')).length,0);
  assert.equal(project(train('Ueno','Tokyo',0.5)).length,1);
});
