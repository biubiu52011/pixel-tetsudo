'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

test('东西线及中央总武直通的Metro混合车型只在明确型号时使用批次图',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const file of ['data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
   vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 function match(line,num,more={}){
  return w.TrainVehicle.lookupTrainNumberRangePng({
   trainNumber:num,positionLineId:line,displayLineId:line,
   sourceRailway:line==='Tozai'?'odpt.Railway:TokyoMetro.Tozai':'odpt.Railway:JR-East.ChuoSobuLocal',
   trainOperator:line==='Tozai'?'TokyoMetro':'JR-East',trainType:'Local',
   railDirection:'Westbound',calendarType:'weekday',serviceDate:'2026-11-04',
   positionSource:'realtime-api',estimated:false,...more
  });
 }
 for(const [line,num] of [['Tozai','B485S'],['ChuoSobuLocal','485Y']]){
  for(const [label,file] of [
   ['東京メトロ05系（4～7次車）','05系_4～7次車'],
   ['東京メトロ05系（8～13次車）','05系_8～13次車'],
   ['東京メトロ07系','07系'],['東京メトロ15000系','15000系']
  ]){
   const p={realtimeVehicleType:label},m=match(line,num,p);
   assert.ok(m?.pngPath.endsWith('/東京メトロ_'+file+'.png')&&m.referenceOnly===true,line+'/'+label);
   assert.equal(match(line,num,{vehiclePlan:{status:'PLANNED_MODEL',models:[label]}})?.model,label);
   assert.equal(match(line,num,{...p,realtimeDerivedVehicleType:'東京メトロ13000系'}),null);
   assert.equal(match(line,num,{...p,trainOwner:'JR-East'}),null);
  }
  for(const p of [{},{realtimeVehicleType:'東京メトロ05系'},
   {realtimeVehicleType:'東京メトロ05系(10両)'},{realtimeVehicleType:'東京メトロ05N系'},
   {vehiclePlan:{status:'PLANNED_CANDIDATES',models:['東京メトロ05系（8～13次車）']}},
   {realtimeDerivedVehicleType:'東京メトロ05系（8～13次車）'},
   {realtimeVehicleType:'東京メトロ05系（4～7次車）',serviceDate:'2026-12-01'},
   {realtimeVehicleType:'東京メトロ05系（4～7次車）',sourceRailway:'odpt.Railway:TokyoMetro.Chiyoda'}
  ])assert.equal(match(line,num,p),null,line+'/'+JSON.stringify(p));
 }
 assert.equal(match('ChuoSobuLocal','485Y',{realtimeVehicleType:'東京メトロ05系（8～13次車）',railDirection:'Eastbound'}),null);
 assert.equal(match('ChuoSobuLocal','711A',{realtimeVehicleType:'東京メトロ05系（8～13次車）'}),null);
 assert.equal(match('Tozai','B711KR',{realtimeVehicleType:'東京メトロ05系（8～13次車）'}),null);
 assert.equal(w.TrainIcons.resolveCanonicalVehicle('東京メトロ05系')?.plannedAsset,null);
 for(const label of ['東京メトロ05系（4～7次車）','東京メトロ05系（8～13次車）'])
   assert.ok(w.TrainIcons.resolveCanonicalVehicle(label)?.plannedAsset);
});
