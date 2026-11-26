'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('千代田K/E/区间变体保持原番号，车型与实时车主证据一致才绘图',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const file of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
   vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 const run=(line,num,owner,model,type='Local',more={})=>w.TrainVehicle.lookupTrainNumberRangePng({
   trainNumber:num,positionLineId:line,displayLineId:line,trainOperator:'TokyoMetro',
   trainOwner:'odpt.TrainOwner:'+owner,sourceRailway:'odpt.Railway:TokyoMetro.'+line,
   trainType:type,calendarType:'weekday',serviceDate:'2026-11-26',
   realtimeVehicleType:model,positionSource:'realtime-api',estimated:false,...more
 });
 const cases=[
  ['Chiyoda','A1009K','JR-East','E233系2000番台','Local','JR東日本_E233系_2000番台.png'],
  ['Chiyoda','A1051E','Odakyu','小田急4000形','Local','小田急電鉄_4000形_標準色.png'],
  ['Chiyoda','A1711E','Odakyu','小田急60000形 MSE','LimitedExpress','小田急電鉄_60000形_MSE.png'],
  ['Chiyoda','A1096S1','TokyoMetro','東京メトロ05系（千代田支線）','Local','東京メトロ_05系_区間列車車両.png'],
  ['ChiyodaBranch','B1096S1','TokyoMetro','東京メトロ16000系','Local','東京メトロ_16000系.png'],
  ['ChiyodaBranch','B1096S1','TokyoMetro','東京メトロ05系（千代田支線）','Local','東京メトロ_05系_区間列車車両.png']
 ];
 for(const [line,num,owner,model,type,png] of cases){
  const m=run(line,num,owner,model,type);
  assert.ok(m?.pngPath.endsWith('/'+png),line+'/'+num+'/'+model);
  assert.equal(m.trainNumber,num);assert.equal(m.referenceOnly,true);
  for(const more of [{trainOwner:''},{trainOwner:'Tobu'},{realtimeVehicleType:''},
   {realtimeDerivedVehicleType:'東京メトロ13000系'},
   {vehiclePlan:{confirmed:true,models:['東京メトロ13000系']}},
   {plannedVehicleCandidates:['東京メトロ13000系']},
   {trainNumber:'A9999K'},{sourceRailway:'odpt.Railway:TokyoMetro.Tozai'},
   {displayLineId:'Tozai'},{positionSource:'supabase-train-run',estimated:true},
   {vehicleFormationConflict:true},{serviceDate:'2026-11-25'}]){
   assert.equal(run(line,num,owner,model,type,more),null,JSON.stringify(more));
  }
 }
 assert.equal(run('Chiyoda','A1711E','Odakyu','小田急4000形','LimitedExpress'),null);
 assert.equal(run('Chiyoda','A1051E','Odakyu','小田急60000形','Local'),null);
 assert.equal(run('ChiyodaBranch','B1096S9','TokyoMetro','東京メトロ05系（千代田支線）'),null);
 assert.equal(run('ChiyodaBranch','B1096S1','TokyoMetro','東京メトロ05系（千代田支線）','Local',{stationId:'odpt.Station:TokyoMetro.Chiyoda.Otemachi'}),null);
 assert.equal(run('Chiyoda','A1001S','TokyoMetro','東京メトロ16000系','Local',{trainOwner:'JR-East'}),null);
 const jr={trainNumber:'550S',positionLineId:'JobanLocal',displayLineId:'JobanLocal',
   sourceRailway:'odpt.Railway:JR-East.JobanLocal',trainOperator:'JR-East',
   trainType:'Local',positionSource:'realtime-api',estimated:false,serviceDate:'2026-11-26',
   calendarType:'weekday',trainOwner:'odpt.TrainOwner:TokyoMetro'};
 assert.equal(w.TrainVehicle.lookupTrainNumberRangePng(jr)?.model,'東京メトロ16000系');
 assert.equal(w.TrainVehicle.lookupTrainNumberRangePng({...jr,trainOwner:'JR-East'}),null);
 assert.equal(w.TrainVehicle.lookupTrainNumberRangePng({...jr,realtimeVehicleType:'東京メトロ16000系',realtimeDerivedVehicleType:'E233系2000番台'}),null);
});
