'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const data = JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const line = data.lines.Yurakucho_Seibu;
const ctx = {window:{}};
vm.runInNewContext(fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8'),ctx);
const fleet = ctx.window.MajorVehicleFleetPresets;
const lookup = (type,owner,route='Yurakucho_Seibu') =>
  fleet.lookup(route,'Seibu','odpt.TrainType:Seibu.'+type,owner?{trainOwner:owner}:{});

test('Seibu Yurakucho has exactly two schematic edges and separate junctions',()=>{
  assert.deepEqual(line.stations,['Nerima','Shin-Sakuradai','Kotake-Mukaihara']);
  assert.deepEqual(line.durations,[2,2]);
  assert.equal(line.durationTotalMin,4);
  assert.equal(line.durationBasis,'schematic_not_official_timetable');
  assert.equal(line.routeLengthKm,2.6);
  assert.equal(line.code,'SI');
  assert.ok(line.serviceBoundaries.some(x=>x.lineId==='Ikebukuro'&&x.handoverStations.includes('Nerima')));
  for(const id of ['Yurakucho','Fukutoshin'])
    assert.ok(line.serviceBoundaries.some(x=>x.lineId===id&&x.handoverStations.includes('Kotake-Mukaihara')));
});

test('ordinary/F-Liner fleet is a non-decisive line reference, not assigned artwork',()=>{
  for(const type of ['Local','Rapid','F-Liner']){
    const row=lookup(type);
    assert.ok(row,type);
    assert.deepEqual(Array.from(row.vehicleCandidates),['西武6000系','西武40000系']);
    assert.equal(row._fleetReferenceOnly,true);
    assert.equal(row.planOverride,false);
    assert.equal(row.illustrationPng,undefined);
    assert.equal(row.vehicleType,undefined);
  }
  assert.equal(lookup('S-TRAIN'),null,'premium service must not inherit ordinary stock');
  assert.equal(lookup('LimitedExpress'),null);
});

test('through fleet requires explicit operator trainOwner and never borrows Tobu stock',()=>{
  const rows={
    TokyoMetro:['東京メトロ10000系','東京メトロ17000系'],
    Tokyu:['東急5050系','東急5050系4000番台'],
    MinatoMirai:['横浜高速鉄道Y500系']
  };
  for(const [owner,models] of Object.entries(rows)){
    for(const route of ['Yurakucho_Seibu','Ikebukuro']){
      const row=lookup('Local',owner,route);
      assert.ok(row,owner+'/'+route);
      assert.deepEqual(Array.from(row.vehicleCandidates),models,owner+'/'+route);
      assert.equal(row._fleetReferenceOnly,true);
      assert.equal(row.planOverride,false);
      assert.equal(row.illustrationPng,undefined);
      assert.equal(row.vehicleType,undefined);
    }
  }
  for(const type of ['Local','F-Liner']){
    assert.equal(lookup(type,'Tobu'),null,type);
    assert.equal(lookup(type,'odpt.Operator:Tobu'),null,type);
  }
  assert.equal(lookup('Local','Tokyu','Yurakucho'),null,'do not reclassify the Metro line as Seibu');
});

test('verified through ownership may show catalog artwork but cannot map internal train numbers',()=>{
  const code=fs.readFileSync('js/train-vehicle.js','utf8');
  for(const key of ['metro-10000','metro-17000','tokyu-5050','yokohama-y500']){
    const at=code.indexOf('"'+key+'":');
    assert.ok(at>=0,key+' missing');
    assert.ok(code.slice(at,at+1600).includes('Yurakucho_Seibu'),key+' lacks through scope');
  }
  assert.doesNotMatch(fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8'),/Yurakucho_Seibu/);
  for(const f of ['東京メトロ/東京メトロ_10000系.png','東京メトロ/東京メトロ_17000系.png','東急電鉄/東急電鉄_5050系.png','横浜高速鉄道/横浜高速鉄道_Y500系.png'])
    assert.ok(fs.existsSync('images/列车/'+f),f);
});
