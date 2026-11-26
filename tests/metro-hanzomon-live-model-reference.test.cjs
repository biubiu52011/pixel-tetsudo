'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('半藏门同番号有独立实时车型证据时选择正确PNG，跨月不猜测',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js'])
   vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
 const run=(num='A1093S',changes={})=>w.TrainNumberPngRanges.match(num,'Hanzomon',{
   trainNumber:num,positionLineId:'Hanzomon',displayLineId:'Hanzomon',
   sourceRailway:'odpt.Railway:TokyoMetro.Hanzomon',trainOperator:'TokyoMetro',
   trainOwner:'odpt.TrainOwner:TokyoMetro',trainType:'Local',calendarType:'weekday',
   serviceDate:'2026-12-01',positionSource:'realtime-api',estimated:false,
   realtimeVehicleType:'東京メトロ08系',...changes
 });
 for(const model of ['08','8000','18000']){
  const m=run('A1093S',{realtimeVehicleType:'東京メトロ'+model+'系'});
  assert.ok(m);
  assert.equal(m.pngPath,'../images/列车/東京メトロ/東京メトロ_'+model+'系.png');
  assert.equal(m.referenceOnly,true);assert.equal(m.actualVehicleConfirmed,false);
 }
 for(const c of [{trainOwner:''},{trainOwner:'Tobu'},{trainNumber:'B1093S'},
  {calendarType:'holiday'},{sourceRailway:'odpt.Railway:TokyoMetro.Hibiya'},
  {displayLineId:'Hibiya'},{positionSource:'supabase-train-run',estimated:true},
  {realtimeVehicleType:''},{realtimeVehicleType:'東京メトロ15000系'},
  {realtimeDerivedVehicleType:'東京メトロ18000系'},
  {vehiclePlan:{confirmed:true,models:['東京メトロ18000系']}},
  {plannedVehicleCandidates:['東京メトロ18000系']},
  {vehicleIdentityStatus:'EXACT'},{vehicleFormationConflict:true},
  {serviceDate:'2026-11-25'},{operationCode:'93T'}])assert.equal(run('A1093S',c),null,JSON.stringify(c));
 assert.equal(run('A9999S'),null);
 assert.equal(run('1093S'),null);
 assert.equal(run('A1093S',{trainOwner:'TokyoMetro',realtimeVehicleType:'',serviceDate:'2026-11-26'}).model,'東京メトロ18000系');
 const h=run('A1057S',{calendarType:'holiday',serviceDate:'2026-12-06'});
 assert.ok(h);assert.equal(h.model,'東京メトロ08系');
});
