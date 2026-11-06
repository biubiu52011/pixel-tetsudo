'use strict';
// Responsibilities: database facts and dependency selection must not live in UI.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = p => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

test('history pages skip the tourism catalog without disabling home tourism', () => {
  const loader = read('data/core/db-loader.js');
  assert.match(loader, /\(\?:realtime\|trains\|history\)/);
  assert.match(loader, /if \(!SKIP_TOURISM\) \{/);
  assert.match(loader, /if \(!SKIP_TOURISM\) setTimeout/);
});

test('DataState owns one status catalog; LineCard consumes it', () => {
  const state = read('js/data-state.js');
  assert.equal((state.match(/var STATUS_META = \{/g) || []).length, 1);
  assert.match(state, /var STATUS_META = window\.DataState\.STATUS_META/);
  assert.match(state, /window\.LineCard = \{/);
});

function selectTrainSources() {
  const source = read('js/trains-data.js');
  const start = source.indexOf('function _needsSqlTrainPlan(lineId) {');
  const end = source.indexOf('function _fusionBaseIdx(lineId, fusionLineId) {', start);
  assert.ok(start >= 0 && end > start, 'existing trains-data owns the dependency selector');
  const allLines = Object.fromEntries(
    ['Main', 'Companion', 'Through', 'Canonical', 'Ext', 'Branch', 'Shared']
      .map(id => [id, {stations:['A','B']}]));
  const window = {
    ODPTClient: {
      usesSqlTimetable(id) { return id !== 'Companion'; },
      hasRealtimePositionApi() { return true; }
    },
    RailwayDB: {getAllLines(){return allLines;}},
    RunningChainResolver: {
      getDirectThroughLines(){return ['Through','Missing'];},
      getVerifiedCanonicalPartners(){return ['Canonical','Through'];}
    },
    LinePresentationService:{getMapBranchIds(){return ['Branch'];}},
    SharedTrackPairs:{getSharedLines(){return ['Shared','Missing'];}}
  };
  const context = vm.createContext({
    window, getLinesData: () => allLines,
    _fusionExtensionLines: () => [{lid:'Ext'}]
  });
  vm.runInContext(source.slice(start, end), context, {timeout: 4000});
  return {select:window.TrainsDataDependencies.select, allLines};
}

test('dependency selector returns only existing line IDs and deduplicated timetable sources', () => {
  const {select,allLines} = selectTrainSources();
  const result = select('Main', ['Main','Companion'], allLines);
  assert.deepEqual(Array.from(result.realtimeLineIds),
    ['Main','Companion','Through','Canonical','Ext','Branch','Shared']);
  assert.deepEqual(Array.from(result.timetablePartnerIds),
    ['Through','Canonical','Ext','Branch','Shared']);
  assert.equal(Object.hasOwn(result,'html'), false);
});

test('train controller delegates source selection and remains the DOM lifecycle owner', () => {
  const page = read('js/trains-page.js');
  assert.match(page, /window\.TrainsDataDependencies\.select\(lineId, currentSystemLineIds, lines\)/);
  assert.doesNotMatch(page, /getDirectThroughLines\(/);
  assert.doesNotMatch(page, /_fusionExtensionLines\(/);
  assert.match(page, /window\.ODPTClient\.activateRealtimeLines\(_requestedLines\)/);
  assert.match(page, /window\.DataFusion\.ensureTimetable\(lineId\)/);
});
