'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

const asset = 'data/timetables/tobu-tojo-through-fleet-202611.js';
const source = fs.readFileSync(asset, 'utf8');
function load() {
  const context = {window: {VEHICLE_FAMILY_RULES: []}};
  vm.runInNewContext(source, context, {filename: asset});
  return context.window.VEHICLE_FAMILY_RULES;
}

test('Tojo candidate families are scoped, installed before the existing resolver, and idempotent', () => {
  const manifest = require('../scripts/page-scripts.json');
  const index = manifest.lazy.trains.indexOf(asset);
  assert.ok(index >= 0 && index < manifest.lazy.trains.indexOf('js/train-vehicle.js'));
  assert.deepEqual(manifest.lazyScopes.trains[asset], ['Tojo','Ogose']);
  const buf = Buffer.from(source.replace(/\r\n/g, '\n'),'utf8');
  const sha = crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex').slice(0,12);
  const html = fs.readFileSync('pages/trains.html','utf8');
  assert.ok(html.includes('../' + asset + '?v=' + sha));
  assert.ok(html.includes('data-line-scope="Tojo,Ogose"'));
  const context={window: {VEHICLE_FAMILY_RULES: []}};
  vm.runInNewContext(source,context,{filename: asset});
  vm.runInNewContext(source,context,{filename: asset});
  assert.equal(context.window.VEHICLE_FAMILY_RULES.length,8);
});

test('Wakoshi through-working owners are not mistaken for a confirmed actual carset', () => {
  const r = load();
  const t = r.filter(x => x.networkKey==='Tojo' && x.codePattern.startsWith('PLAN:TOJO-WAKOSHI-'));
  assert.equal(t.length,5);
  assert.deepEqual(t.map(x=>x.operator).sort(), ['Tobu','TokyoMetro','TokyoMetro','Tokyu','Tokyu'].sort());
  for (const row of t) {
    assert.equal(row.exactVehicleType,'');
    assert.equal(row.allowCandidateArtwork,false);
    assert.equal(row.planScope.planOnly,true);
    assert.equal(row.planScope.overridePlan,true);
    assert.deepEqual(Array.from(row.planScope.anyStationNames),['Wakoshi']);
    assert.deepEqual(Array.from(row.planScope.lineIds),['Tojo']);
    assert.match(row.planScope.operationPatterns[0],/ odd$/);
    assert.ok(row.vehicleCandidates.length > 0);
  }
  const tobu = t.find(x=>x.operator==='Tobu');
  assert.ok(tobu.vehicleCandidates.includes('東武50070型'));
  assert.ok(!tobu.vehicleCandidates.includes('東武90000系'),
    '2026-09 ground-route 90000 must not be promoted to subway-through evidence');
});

test('Local fleet families are segment-scoped and do not allocate carsets or authorize PNGs', () => {
  const rules=load();
  const ground=rules.find(x=>x.codePattern==='PLAN:TOJO-GROUND-10CAR');
  const west=rules.find(x=>x.codePattern==='PLAN:TOJO-WEST-4CAR');
  const ogose=rules.find(x=>x.codePattern==='PLAN:OGOSE-4CAR');
  assert.ok(ground && west && ogose);
  assert.ok(ground.vehicleCandidates.includes('東武90000系'));
  assert.ok(ground.vehicleCandidates.includes('東武50090型'));
  assert.ok(!west.vehicleCandidates.includes('東武90000系'));
  assert.deepEqual(Array.from(west.vehicleCandidates),['東武8000型']);
  assert.deepEqual(Array.from(ogose.vehicleCandidates),['東武8000型']);
  assert.deepEqual(Array.from(ogose.planScope.lineIds),['Ogose']);
  for(const rule of [ground,west,ogose]){
    assert.equal(rule.allowCandidateArtwork,false);
    assert.equal(rule.exactVehicleType,'');
    assert.equal(rule.planScope.planOnly,true);
  }
});

test('through-number normalization feeds the shared evidence resolver without minting a PNG', () => {
  const context={
    window: {
      VEHICLE_FAMILY_RULES: [], TRAIN_OPERATION_EVIDENCE_PROVIDERS: [],
      RuntimeConfig: {}, ODPTClient: {LINE_TO_OPERATOR:{Tojo:'Tobu'}}
    },
    console: {log(){},warn(){},debug(){},error(){}}
  };
  vm.runInNewContext(source,context,{filename:asset});
  vm.runInNewContext(fs.readFileSync('js/train-vehicle.js','utf8'),context,
    {filename:'js/train-vehicle.js'});
  const operation=context.window.TrainOperationEvidence;
  assert.ok(operation && operation.normalizeOperationCode);
  assert.equal(operation.normalizeOperationCode('1101T',{lineId:'Tojo'}),'01T');
  assert.equal(operation.normalizeOperationCode('1121S',{lineId:'Tojo'}),'21S');
  assert.equal(operation.normalizeOperationCode('1151K',{lineId:'Tojo'}),'51K');
  assert.equal(operation.normalizeOperationCode('1101T',{lineId:'Yamanote'}),'1101T',
    'the Tojo-only normalization must not rewrite unrelated railways');
  const ctx={
    lineId:'Tojo', railway:'odpt.Railway:Tobu.Tojo',
    serviceDate:'2026-11-14',
    itineraryStations:['odpt.Station:Tobu.Tojo.Wakoshi']
  };
  const hit=operation.resolveEvidence('1101T',ctx,'planned');
  assert.ok(hit,'must return a scoped working-family candidate');
  assert.equal(hit.operator,'Tobu');
  assert.equal(hit.vehicleType,'');
  assert.equal(hit.allowCandidateArtwork,false);
  assert.ok(Array.from(hit.vehicleCandidates).includes('東武50070型'));
  assert.ok(!Array.from(hit.vehicleCandidates).includes('東武90000系'));
  assert.equal(operation.resolveEvidence('1101T',
    Object.assign({},ctx,{itineraryStations:['odpt.Station:Tobu.Tojo.Ikebukuro']}),
    'planned')?.operator,'Tobu');
});
