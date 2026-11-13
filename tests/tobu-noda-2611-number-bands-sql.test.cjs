'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const migrationFile='supabase/migrations/20261113170000_tobu_noda_2611_fivecar_png_candidate_bands.sql';
const migration=fs.readFileSync(migrationFile,'utf8');
const match=/\$noda_bands\$\s*(\[[\s\S]*?\])\s*\$noda_bands\$::jsonb/.exec(migration);
assert.ok(match,'SQL migration must preserve machine-readable, exact source whitelist');
const bands=JSON.parse(match[1]);
const sourceRailway='odpt.Railway:Tobu.TobuUrbanPark';
const window={};
const context=vm.createContext({window});
for (const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js'
]) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const existing=window.TrainNumberPngRanges;
const candidates=[
  '東武60000系','東武80000系'
];
const pngPaths=[
  '../images/列车/東武鉄道/東武鉄道_60000系.png',
  '../images/列车/東武鉄道/東武鉄道_80000系.png'
];
const localFile=(rel)=>rel.replace(/^\.\.\//,'');
const makeCtx=(n,d)=>({
  serviceDate:'2026-11-04',sourceRailway,trainNumber:n,
  positionSource:'supabase-train-run',trainOperator:'Tobu',
  positionLineId:'Noda',displayLineId:'Noda',
  calendarType:'weekday',railDirection:d,
  trainType:'odpt.TrainType:Tobu.Local'
});
test('all ten Noda SQL number bands are dated, finite, and exactly whitelisted',()=>{
  assert.equal(bands.length,10);
  const unique=new Set();
  const counts=new Map();
  for (const band of bands) {
    assert.equal(band.service_date,'2026-11-04');
    assert.ok(['odpt.RailDirection:Outbound','odpt.RailDirection:Inbound'].includes(band.direction_urn));
    assert.ok(Number.isInteger(band.min_number)&&band.min_number>=100);
    assert.equal(band.max_number,band.min_number+99);
    assert.equal(band.min_number%100,0);
    assert.ok(band.exact_train_numbers.length>0);
    assert.deepEqual(band.candidate_models,candidates);
    assert.deepEqual(band.candidate_png_paths,pngPaths);
    for (const path of band.candidate_png_paths)assert.ok(fs.existsSync(localFile(path)),path);
    for (const n of band.exact_train_numbers) {
      assert.match(n,/^\d{3,4}A$/);
      const value=Number(n.slice(0,-1));
      assert.ok(value>=band.min_number&&value<=band.max_number);
      assert.ok(!unique.has(n),'same train number recorded in two bands: '+n);
      unique.add(n);
      const proof=existing.verifyNodaFiveCar20261104(n,makeCtx(n,band.direction_urn));
      assert.ok(proof,'existing official roster must agree with SQL: '+n);
      assert.equal(proof.authorizesPNG,false);
      counts.set(band.direction_urn,(counts.get(band.direction_urn)||0)+1);
      assert.equal(existing.match(n,'Noda',makeCtx(n,band.direction_urn)),null,
        'two candidate PNGs must not be mistaken for one actual train');
    }
  }
  assert.equal(unique.size,76);
  assert.equal(counts.get('odpt.RailDirection:Outbound'),38);
  assert.equal(counts.get('odpt.RailDirection:Inbound'),38);
});
test('bounds never validate missing numbers, new dates, or unrelated railways',()=>{
  for(const b of bands){
    let counterexample='';
    for(let x=b.min_number;x<=b.max_number;x++){
      const n=x+'A';
      if(!b.exact_train_numbers.includes(n)){counterexample=n;break;}
    }
    assert.ok(counterexample,'each range must have gaps');
    assert.equal(existing.verifyNodaFiveCar20261104(
      counterexample,makeCtx(counterexample,b.direction_urn)),null);
    const n=b.exact_train_numbers[0];
    assert.equal(existing.verifyNodaFiveCar20261104(n,{
      ...makeCtx(n,b.direction_urn),serviceDate:'2026-11-13'}),null);
    assert.equal(existing.verifyNodaFiveCar20261104(n,{
      ...makeCtx(n,b.direction_urn),sourceRailway:'odpt.Railway:Tobu.Tojo'}),null);
  }
});
test('Noda SQL stores candidates under RLS, not an invented hard-number-to-PNG rule',()=>{
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
  assert.match(migration,/REVOKE ALL[\s\S]+FROM anon, authenticated/);
  assert.match(migration,/CHECK \(NOT authorizes_png\)/);
  assert.match(migration,/CHECK \(NOT actual_vehicle_confirmed\)/);
  assert.match(migration,/requires_exact_roster/);
  assert.match(migration,/ON CONFLICT[\s\S]+DO NOTHING/);
});
