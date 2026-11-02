'use strict';
// Major rolling-stock line presets are *reference fleet candidates only*.
// They must never be treated as a train-level assignment, real carset or PNG.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const browser = {};
const ctx = {window:browser, console:{debug(){},warn(){},error(){},log(){}},
  Date, Map, Set, WeakSet, WeakMap, Promise, Object, Array, Number, String, Math};
const presetFile = fs.readFileSync(path.join(root,'data/core/major-vehicle-fleet-presets.js'),'utf8');
vm.runInNewContext(presetFile,ctx,{timeout:10000});
const presets=browser.MajorVehicleFleetPresets;
assert.ok(presets && typeof presets.lookup==='function');
const entries=presets.list();
assert.ok(entries.length>=30);
const seen=new Set();
entries.forEach(row=>{
  assert.ok(/^https:\/\//.test(row.sourceUrl),row.id+': source');
  assert.ok(row.models.length>0,row.id+': models');
  row.lineIds.forEach(line=>{
    const key=row.operator+'|'+line;
    assert.ok(!seen.has(key),'duplicate operator/line preset: '+key);
    seen.add(key);
    const evidence=presets.lookup(line,row.operator,'odpt.TrainType:'+row.operator+'.Local');
    assert.equal(evidence.evidenceRole,'route-fleet-reference');
    assert.equal(evidence._fleetReferenceOnly,true);
    assert.equal(evidence.planOverride,false);
    assert.deepEqual(Array.from(evidence.vehicleCandidates),Array.from(row.models));
    assert.ok(!evidence.iconPath && !evidence.vehicleType,
      'fleet reference cannot assign actual vehicle or PNG');
  });
});
for (const [line,op,type] of [
  ['Yamanote','TokyoMetro','Local'],
  ['Ginza','JR-East','Local'],
  ['Yamanote','JR-East','LimitedExpress'],
  ['TokyuToyoko','Tokyu','CommuterLimitedExpress'],
  ['Keiyo','JR-East','MorningLiner'],
  ['Yamanote','JR-East',''],
  ['TohokuShinkansen','JR-East','Local'],
  ['','JR-East','Local']
]) {
  const found=presets.lookup(line,op,type && 'odpt.TrainType:'+op+'.'+type);
  assert.equal(found,null,'must not use out-of-scope fleet: '+line+'/'+op+'/'+type);
}
const scripts=fs.readFileSync(path.join(root,'pages/trains.html'),'utf8');
assert.ok(scripts.indexOf('major-vehicle-fleet-presets.js')>0);
assert.ok(scripts.indexOf('major-vehicle-fleet-presets.js') <
  scripts.indexOf('train-vehicle.js'),'load fleet library before consumer');

vm.runInNewContext(fs.readFileSync(path.join(root,'js/train-vehicle.js'),'utf8'),
  ctx,{filename:'train-vehicle.js',timeout:15000});
function run(lineId,op,type,level,candidate){
  const r={trainNumber:'UNKNOWN_123',calendar:'odpt.Calendar:Weekday',
    trainType:'odpt.TrainType:'+op+'.'+type};
  const tt={_positionSource:'supabase-train-run',
    _sqlVehicleMappingLevel:level||'unresolved',
    _sqlVehicleCandidateLabel:candidate||'',
    'odpt:trainType':r.trainType,_serviceDate:'2026-11-02'};
  return browser.TrainVehicle.resolveTimetableRun(r,tt,lineId,{operator:op},'2026-11-02').vehicleResult;
}
for (const [line,op] of [
  ['Yamanote','JR-East'],['Ginza','TokyoMetro'],['Mita','Toei'],
  ['TokyuToyoko','Tokyu'],['Yokosuka','JR-East']
]) {
  const v=run(line,op,'Local');
  assert.equal(v.identityStatus,'UNKNOWN',line+': reference is not actual identity');
  assert.equal(v.iconPath,'',line+': reference cannot emit actual PNG');
  assert.equal(v.vehiclePlan?.status,'FLEET_REFERENCE',line+': missing route reference');
  assert.equal(v.vehiclePlan?.iconPath,'',line+': no fleet PNG');
}
const limited=run('Yokosuka','JR-East','LimitedExpress');
assert.ok(!limited.vehiclePlan?.models?.length,
  'LimitedExpress must not borrow conventional commuter fleet');
// An imported single historical candidate must take priority over this fallback,
// without being promoted to verified identity.
const historical=run('Yamanote','JR-East','Local','source_single_type_candidate','E235系0番台');
assert.equal(historical.identityStatus,'UNKNOWN');
assert.equal(historical.vehiclePlan?.status,'PLANNED_CANDIDATES');
assert.equal(historical.vehiclePlan?.iconPath,'');
console.log('major fleet presets: PASS ('+entries.length+' operator-owned groups, '+seen.size+' line scopes)');
