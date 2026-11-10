'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const window={};
const context=vm.createContext({window,Date,console});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const png=window.TrainNumberPngRanges;
const base={
  positionSource:'supabase-train-run',estimated:true,
  officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
  serviceDate:'2026-11-11',sourceRailway:'odpt.Railway:JR-Central.Tokaido',
  trainOperator:'JR-Central',trainType:'odpt.TrainType:JR-Central.Local',
  vehiclePlan:{status:'PLANNED_MODEL',models:['315系'],
    sourceUrl:'https://example.org/independent-train-fleet-evidence'}
};
const match=(number,extra={})=>png.match(number,'TokaidoCentral',{...base,...extra});
test('JR Central SQL numbers select only a separately evidenced series',()=>{
  assert.equal(match('1234M')?.pngPath,'../images/列车/JR東海/c315.png');
  assert.equal(match('1234M',{vehiclePlan:{...base.vehiclePlan,models:['313系']}})?.pngPath,
    '../images/列车/JR東海/c313.png');
  assert.equal(match('1234M',{vehiclePlan:{...base.vehiclePlan,models:['373系']}})?.pngPath,
    '../images/列车/JR東海/c373_inj.png');
  assert.equal(match('1234M')?.representative,true);
  assert.equal(match('1234M')?.actualVehicleConfirmed,undefined);
});
test('no unverified number-to-stock inference, foreign routes or mixed fleets',()=>{
  for(const extra of [
    {positionSource:'realtime-api'}, {estimated:false},
    {officialNumberVerified:false}, {sourceRailway:'odpt.Railway:JR-East.Tokaido'},
    {trainOperator:'JR-East'}, {serviceDate:''},
    {vehicleIdentityStatus:'EXACT'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['313系','315系'],sourceUrl:base.vehiclePlan.sourceUrl}},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['315系']}},
    {vehiclePlan:{status:'UNKNOWN',models:['315系'],sourceUrl:base.vehiclePlan.sourceUrl}},
    {plannedVehicleCandidates:['313系']}, {realtimeVehicleType:'313系'}
  ])assert.equal(match('1234M',extra),null,JSON.stringify(extra));
  for(const bad of ['1234D','0M','100000M','', 'foo'])assert.equal(match(bad),null,bad);
  assert.equal(png.match('1234M','Tokaido',{...base}),null);
  assert.equal(png.match('1234M','TokaidoShinkansen',{...base}),null);
});
test('JR Central artwork is gallery scoped and does not confer confirmation',()=>{
  const gallery=window.VehicleGaragePngMap;
  assert.equal(gallery.matchModelPath('315系','../images/列车/JR東海/c315.png','TokaidoCentral'),true);
  assert.equal(gallery.matchModelPath('315系','../images/列车/JR東海/c315.png','Tokaido'),false);
  assert.equal(gallery.findModel('315系','TokaidoCentral')[0].canonicalImage,false);
});
