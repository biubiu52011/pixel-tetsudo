'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const window={},ctx=vm.createContext({window,Date,console});
for(const f of ['data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js'])
 vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const base={positionSource:'supabase-train-run',estimated:true,
 timetableDateVerified:true,timetableValidity:'date_verified',
 officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
 sourceRailway:'odpt.Railway:JR-Central.Tokaido',trainOperator:'JR-Central',
 serviceDate:'2026-11-11',calendarType:'weekday',
 railDirection:'odpt.RailDirection:Outbound',
 trainType:'odpt.TrainType:JR-Central.Local',
 scheduledStopKeys:['Hamamatsu','Toyohashi'],vehiclePlan:null};
const match=(n,extra={})=>window.TrainNumberPngRanges.match(n,'TokaidoCentral',{...base,...extra});
const png=model=>'../images/列车/JR東海/JR東海_'+model+'.png';
test('M train numbers match indicative Hamamatsu-Toyohashi family only',()=>{
 for(const [num,model] of [['921M','315系'],['923M','315系'],['925M','373系'],
  ['927M','313系'],['929M','313系'],['931M','315系'],['937M','373系']]){
  const found=match(num);assert.equal(found?.pngPath,png(model),num);
  assert.equal(found?.referenceOnly,true);
  assert.equal(found?.actualVehicleConfirmed,false);
 }
 for(const [num,model] of [['920M','315系'],['922M','373系'],['932M','373系'],
  ['934M','313系'],['936M','313系']])
  assert.equal(match(num,{railDirection:'odpt.RailDirection:Inbound'})?.pngPath,png(model));
 assert.equal(match('925M',{serviceDate:'2026-11-15',calendarType:'holiday'})?.model,'373系');
});
test('F numbers respect Maibara holiday ranges, 313 exclusions and directions',()=>{
 const h={serviceDate:'2026-11-15',calendarType:'holiday',
  scheduledStopKeys:['Ogaki','Maibara']};
 for(const n of [3207,3209,3211,3213,3215,3217,3219,3221,3223,3303])
  assert.equal(match(n+'F',h)?.model,'315系',n+'F');
 for(const n of [3200,3208,3210,3212,3214,3216,3218,3220,3222,3224])
  assert.equal(match(n+'F',{...h,railDirection:'odpt.RailDirection:Inbound'})?.model,'315系',n+'F');
 for(const n of [3201,3203,3205])
  assert.equal(match(n+'F',h)?.model,'313系',n+'F');
 for(const n of [3202,3204,3206,3226])
  assert.equal(match(n+'F',{...h,railDirection:'odpt.RailDirection:Inbound'})?.model,'313系',n+'F');
 assert.equal(match('5101F',{...h,trainType:'odpt.TrainType:JR-Central.SpecialRapid'})?.model,'313系');
 for(const d of ['2026-11-03','2026-11-23'])
  assert.equal(match('3208F',{...h,serviceDate:d,railDirection:'odpt.RailDirection:Inbound'})?.model,'315系');
});
test('reject incorrect SQL, calendars, lines, trains, candidates and types',()=>{
 for(const p of [
  {timetableDateVerified:false},{timetableValidity:'undated_not_current_verified'},
  {officialNumberVerified:false},{positionSource:'realtime-api'},{estimated:false},
  {sourceRailway:'odpt.Railway:JR-East.Tokaido'},{trainOperator:'JR-East'},
  {vehicleIdentityStatus:'EXACT'},{calendarType:'holiday'},
  {scheduledStopKeys:['Toyohashi']},{railDirection:'odpt.RailDirection:Inbound'},
  {trainType:'odpt.TrainType:JR-Central.LimitedExpress'},
  {plannedVehicleCandidates:['313系']},{realtimeVehicleType:'313系'},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['313系'],sourceUrl:'https://example.org/proof'}}
 ])assert.equal(match('921M',p),null,JSON.stringify(p));
 for(const no of ['0M','100000M','923D','9999M','x'])
  assert.equal(match(no),null,no);
 const h={serviceDate:'2026-11-15',calendarType:'holiday',scheduledStopKeys:['Ogaki','Maibara']};
 assert.equal(match('3207F',{...h,calendarType:'weekday'}),null);
 assert.equal(match('3225F',h),null);
 assert.equal(window.TrainNumberPngRanges.match('921M','Tokaido',base),null);
});
test('independently sourced single model SQL plans remain valid on M and F',()=>{
 const p={status:'PLANNED_MODEL',models:['315系'],sourceUrl:'https://example.org/proof'};
 assert.equal(match('1235M',{vehiclePlan:p})?.model,'315系');
 assert.equal(match('1235F',{vehiclePlan:p})?.model,'315系');
 assert.equal(match('1235M',{vehiclePlan:{...p,models:['313系','315系']}}),null);
});
test('renamed assets are scoped representative gallery refs, not actual formations',()=>{
 const g=window.VehicleGaragePngMap;
 for(const m of ['313系','315系','373系']){
  assert.equal(g.matchModelPath(m,png(m),'TokaidoCentral'),true);
  assert.equal(g.matchModelPath(m,png(m),'Tokaido'),false);
  assert.equal(g.findModel(m,'TokaidoCentral')[0].canonicalImage,false);
 }
 assert.match(fs.readFileSync('js/train-position-estimator.js','utf8'),/lineId==="TokaidoCentral"/);
});
