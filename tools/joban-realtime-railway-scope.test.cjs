'use strict';

// The ODPT source may switch JR-East.Joban <-> JR-East.JobanRapid
// for one physical service. Real-time admission is still scoped to the
// JR-East corridor; never admit JobanLocal or another operator by name.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('data/api/odpt-unified.js', 'utf8');
const start = source.indexOf('    function _matchesActiveRealtimeRailway(');
const end = source.indexOf('    // ========== 公共 API ==========', start);
assert.ok(start >= 0 && end > start, 'realtime railway-scoped filter exists');

function parseRailwayIdentity(raw) {
  const m = String(raw || '').match(/^odpt\.Railway:([^.]+)\.(.+)$/);
  return m ? { operator: m[1], railwayCode: m[2], key: m[1] + '::' + m[2] } : null;
}
function getLineRailwayIdentity(lineId) {
  const codes = { Joban: 'JobanRapid', JobanMain: 'Joban', JobanLocal: 'JobanLocal',
    Yamanote: 'Yamanote' };
  return codes[lineId] ? { key: 'JR-East::' + codes[lineId] } : null;
}
const window = { ODPT_TRAIN_POSITIONS: {
  'JR-East': [
    { id: 'rapid', 'odpt:railway': 'odpt.Railway:JR-East.JobanRapid' },
    { id: 'main', 'odpt:railway': 'odpt.Railway:JR-East.Joban' },
    { id: 'local', 'odpt:railway': 'odpt.Railway:JR-East.JobanLocal' },
    { id: 'yamanote', 'odpt:railway': 'odpt.Railway:JR-East.Yamanote' },
  ],
} };
const active = { 'JR-East': ['Joban'] };
const context = { window, _activeRealtimeLineIds: active,
  parseRailwayIdentity, getLineRailwayIdentity };
vm.createContext(context);
vm.runInContext(source.slice(start, end), context, { timeout: 10000 });

const rebuild = context._rebuildRealtimePositionViews;
assert.equal(typeof rebuild, 'function');
function admitted(lineId) {
  active['JR-East'] = [lineId];
  return Array.from(rebuild()['JR-East'], x => x.id);
}

assert.deepEqual(admitted('Joban'), ['rapid', 'main'],
  'Joban rapid admits both live source names of the same JR East corridor');
assert.deepEqual(admitted('JobanMain'), ['rapid', 'main'],
  'Joban main can receive the adjacent rapid feeder');
assert.deepEqual(admitted('JobanLocal'), ['local'],
  'Chiyoda-through local line is a separate service and must stay separate');
assert.deepEqual(admitted('Yamanote'), ['yamanote'],
  'other JR East services retain exact matching');

const match = context._matchesActiveRealtimeRailway;
assert.equal(match('JR-East', 'odpt.Railway:TokyoMetro.Joban', ['Joban']), false,
  'the same railway suffix from another operator is not a through train');
assert.equal(match('JR-East', 'odpt.Railway:JR-East.JobanLocal', ['Joban']), false,
  'similar English name is not proof of the Joban rapid service');
assert.equal(match('Toei', null, ['Joban']), false,
  'Toei unknown railway continues to fail closed');

const config = fs.readFileSync('data/core/runtime-config.js', 'utf8');
assert.match(config, /"JobanMain": true/,
  'JobanMain activates partial realtime under HYBRID, never FULL');

console.log('Joban realtime source scope: PASS');
