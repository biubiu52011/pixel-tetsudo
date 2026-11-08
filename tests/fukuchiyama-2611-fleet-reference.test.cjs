'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = p => fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');

test('Fukuchiyama ordinary train types have four JR-West fleet references, not a trainset assignment', () => {
  const context = vm.createContext({window:{}});
  vm.runInContext(read('data/core/major-vehicle-fleet-presets.js'),context);
  const lookup=context.window.MajorVehicleFleetPresets.lookup;
  for(const suffix of ['Local','Rapid','SectionRapid']){
    const v=lookup('Fukuchiyama','JR-West','odpt.TrainType:JR-West.'+suffix);
    assert.ok(v, suffix);
    assert.deepEqual(Array.from(v.vehicleCandidates),[
      'JR西日本207系','JR西日本321系','JR西日本223系','JR西日本225系']);
    assert.equal(v._fleetReferenceOnly,true);
    assert.equal(v.evidenceRole,'route-fleet-reference');
    assert.equal(v.planOverride,false);
    assert.equal(v.actualVehicleConfirmed,undefined);
    assert.equal(v.vehicleArtworkPath,undefined);
  }
  assert.equal(lookup('Fukuchiyama','JR-West','odpt.TrainType:JR-West.LimitedExpress'),null);
  assert.equal(lookup('Fukuchiyama','JR-West','odpt.TrainType:JR-West.Local',
    {trainOwner:'JR-East'}),null);
});

test('Fukuchiyama SQL source roster retains unknown trainset and PNG status', () => {
  const sql=read('supabase/migrations/20261108173500_jrwest_fukuchiyama_2611_historical_source_fleet_reference.sql');
  assert.match(sql,/published_jrwest_fukuchiyama_2611_source_fleet/);
  assert.match(sql,/source_timed_stop_count>=2/);
  assert.match(sql,/<>357/);
  assert.match(sql,/<>173/);
  assert.match(sql,/<>184/);
  assert.match(sql,/authorizes_png boolean NOT NULL DEFAULT false CHECK \(NOT authorizes_png\)/);
  assert.match(sql,/actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK \(NOT actual_vehicle_confirmed\)/);
  assert.match(sql,/timetable_validity='undated_not_current_verified'/);
});

test('train-runs only attaches source-level fleet candidates to matching JR-West historical stops', () => {
  const edge=read('supabase/functions/train-runs/index.ts');
  const start=edge.indexOf('// JR-West JR Takarazuka / Fukuchiyama, Osaka');
  const end=edge.indexOf('// Exact-date train NUMBER and 10-stop proof',start);
  assert.ok(start>=0&&end>start);
  const block=edge.slice(start,end);
  assert.match(block,/lineId==="Fukuchiyama"/);
  assert.match(block,/\.eq\("calendar_urn",selectedCalendar\)/);
  assert.match(block,/source_stop_keys\[i\]/);
  assert.match(block,/run\.vehicle_type_candidates=p\.candidate_models\.join/);
  assert.match(block,/run\.vehicle_plan_confirmed=false/);
  assert.match(block,/run\.vehicle_artwork_path=null/);
  assert.match(block,/numberDateVerified:false,referenceOnly:true/);
  assert.match(block,/actualVehicleConfirmed:false,authorizesPNG:false/);
  assert.doesNotMatch(block,/run\.vehicle_mapping_level\s*=/);
  assert.doesNotMatch(block,/run\.timetable_date_verified\s*=\s*true/);
});
