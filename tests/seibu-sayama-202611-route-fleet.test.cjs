'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const route=data.lines.Seibu_Sayama;
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8'),ctx);
vm.runInNewContext(fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8'),ctx);
const major=ctx.window.MajorVehicleFleetPresets;
const gallery=ctx.window.VehicleGaragePngMap;
function fleet(serviceDate='',carCount=null,type='Local'){
  return major.lookup('Seibu_Sayama','Seibu','odpt.TrainType:Seibu.'+type,
    {serviceDate,carCount});
}
function models(d,c,t){const r=fleet(d,c,t);return r&&Array.from(r.vehicleCandidates);}

test('Sayama has 3 physical stations and exactly 2 schematic route edges',()=>{
  assert.deepEqual(route.stations,['Nishi-Tokorozawa','Shimoyamakuchi','Seibu-Kyujou-Mae']);
  assert.deepEqual(route.durations,[2,2]);
  assert.equal(route.durationTotalMin,4);
  assert.equal(route.durationBasis,'schematic_not_official_timetable');
  assert.equal(route.routeLengthKm,4.2);
  assert.equal(route.code,'SI');
  assert.equal(route.color,'#EF7A00');
  assert.equal(route.presentation.color,'#EF7A00');
  assert.deepEqual(route.throughServices,['Ikebukuro']);
  assert.ok(data.lines.Ikebukuro.throughServices.includes('Seibu_Sayama'));
  for(const [from,to] of [[route,'Ikebukuro'],[data.lines.Ikebukuro,'Seibu_Sayama']]){
    assert.ok(from.serviceBoundaries.some(x=>x.lineId===to &&
      x.handoverStations.includes('Nishi-Tokorozawa') &&
      x.serviceScope==='source-correlated-through-services'));
  }
  assert.ok(route.transferStations.some(x=>x.station==='Seibu-Kyujou-Mae' &&
    x.lineId==='SeibuYamaguchi'));
});

test('101 is retained on Sayama, 7000 begins 2026-06-27, no undated promotion',()=>{
  assert.deepEqual(models('2026-06-26',4),['西武101系']);
  assert.deepEqual(models('2026-06-27',4),['西武101系','西武7000系']);
  assert.deepEqual(models('2026-11-16',4),['西武101系','西武7000系']);
  assert.ok(models('',null).includes('西武101系'));
  assert.ok(!models('',null).includes('西武7000系'));
  assert.ok(!models('2026-06-26',null).includes('西武7000系'));
  assert.ok(models('2026-11-16',null).includes('西武7000系'));
  assert.ok(!models('2026-11-16',null).includes('西武2000系'));
});

test('only sourced 4/8/10 car facts narrow candidates; all are fleet-only',()=>{
  assert.deepEqual(models('2026-11-16',8),['西武20000系','西武30000系','西武40000系50番台']);
  assert.deepEqual(models('2026-11-16',10),['西武20000系','西武30000系']);
  assert.ok(models('2026-11-16',null).includes('西武101系'));
  assert.ok(models('2026-11-16',null).includes('西武30000系'));
  for(const [date,cars] of [['2026-06-26',4],['2026-11-16',4],
      ['2026-11-16',8],['2026-11-16',10],['',null]]){
    const r=fleet(date,cars);
    assert.ok(r&&r._fleetReferenceOnly);
    assert.equal(r.evidenceRole,'route-fleet-reference');
    assert.equal(r.planOverride,false);
    assert.equal(r.vehicleType,undefined);
    assert.equal(r.iconPath,undefined);
    assert.equal(r.illustrationPng,undefined);
  }
  assert.equal(fleet('2026-11-28',null,'LimitedExpress'),null,
    'special Dome92 must not inherit local commuter family');
});

test('duplicate branch fleet bypass removed; SQL historical dates cannot authorize 7000',()=>{
  const source=fs.readFileSync('js/train-vehicle.js','utf8');
  assert.ok(!source.includes('Seibu_Sayama: {'));
  assert.ok(source.includes("tt.timetableDateVerified !== true ? ''"));
  assert.ok(source.includes('MajorVehicleFleetPresets.lookup'));
  assert.doesNotMatch(fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8'),
    /Seibu_Sayama/,'legacy SAI/SAO codes are not official train-number PNG mappings');
});

test('101 PNG remains unapproved; 7000/event stock has scoped model art, not automatic train assignments',()=>{
  const expected={
    '西武101系':false,
    '西武7000系':true,
    '西武20000系':true,
    '西武30000系':true,
    '西武001系':true
  };
  for(const [model,approved] of Object.entries(expected)){
    const records=Array.from(gallery.findModel(model,'Seibu_Sayama'));
    assert.ok(records.length>0,model+' scoped model missing');
    assert.equal(records.some(x=>x.canonicalImage && !x.quarantined),approved,model);
  }
  const pending=Array.from(gallery.findPath(
    '../images/列车/西武鉄道/西武鉄道_40050系_緑帯.png'));
  assert.ok(pending.length);
  assert.ok(pending.every(x=>!x.canonicalImage),
    'pending 40050 artwork cannot be promoted automatically');
});
