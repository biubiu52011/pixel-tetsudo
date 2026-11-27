'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

test('东西线及中央总武直通的Metro混合车型只在明确型号时使用批次图',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}},
  _isTrainArtworkFailureActive(){return false;}};
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

test('东西线 SQL 计划按 K/T 列车番号显示计划图，S/SR 无车型证据时保持灰点',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}},
  _isTrainArtworkFailureActive(){return false;}};
 for(const file of ['data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
   vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});

 function plannedPosition(trainNumber,serviceDate='2026-11-27'){
  const run={
   trainNumber,calendar:'odpt.Calendar:Weekday',
   trainType:'odpt.TrainType:TokyoMetro.Local',
   railDirection:'odpt.RailDirection:TokyoMetro.NishiFunabashi',
   destinationStationUrn:'odpt.Station:TokyoMetro.Tozai.NishiFunabashi'
  };
  const tt={
   _positionSource:'supabase-train-run',_sqlVehicleMappingLevel:'unresolved',
   _serviceDate:serviceDate,'odpt:trainNumber':trainNumber,
   'odpt:trainType':'odpt.TrainType:TokyoMetro.Local',
   'odpt:railway':'odpt.Railway:TokyoMetro.Tozai',
   'odpt:operator':'odpt.Operator:TokyoMetro','odpt:trainTimetableObject':[]
  };
  const identity=w.TrainVehicle.resolveTimetableRun(
   run,tt,'Tozai',{operator:'TokyoMetro'},serviceDate).vehicleResult;
  return {
   trainNumber,trainId:'planned-trip:'+serviceDate+'|TokyoMetro|Tozai|'+trainNumber,
   serviceDate,calendarType:'weekday',sourceRailway:'odpt.Railway:TokyoMetro.Tozai',
   positionLineId:'Tozai',displayLineId:'Tozai',trainOperator:'TokyoMetro',
   trainType:'odpt.TrainType:TokyoMetro.Local',positionSource:'supabase-train-run',
   estimated:true,vehicleIdentityStatus:identity.identityStatus,
   vehicleResolvedUpstream:identity.identityStatus==='EXACT',
   vehicleResolution:identity,vehicleResolutionLineId:identity.lineId,
   vehiclePlan:identity.vehiclePlan
  };
 }

 const cases=[
  ['A1854T','../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png'],
  ['A1852T','../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png'],
  ['A1856TR','../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png'],
  ['B1860T','../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png'],
  ['A1868T','../images/列车/東葉高速鉄道/東葉高速鉄道_2000系.png'],
  ['B1705K','../images/列车/JR東日本/JR東日本_E231系_800番台.png'],
  ['A1803K','../images/列车/JR東日本/JR東日本_E231系_800番台.png'],
  ['B1809K','../images/列车/JR東日本/JR東日本_E231系_800番台.png'],
  ['A1807K','../images/列车/JR東日本/JR東日本_E231系_800番台.png'],
  ['B1811K','../images/列车/JR東日本/JR東日本_E231系_800番台.png']
 ];
 for(const [trainNumber,png] of cases){
  const p=plannedPosition(trainNumber);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN',trainNumber+' 不得伪装成实际编成');
  const artwork=w.TrainVehicle.selectMarkerArtwork(p,false);
  assert.equal(artwork.kind,'vehicle',trainNumber);
  assert.equal(artwork.iconSrc,png,trainNumber);
  assert.equal(artwork.planned,true,trainNumber);
 }
 for(const trainNumber of ['A1849SR','A1885S','B1823S']){
  const p=plannedPosition(trainNumber);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  assert.equal(w.TrainVehicle.selectMarkerArtwork(p,false).kind,'unresolved',trainNumber);
 }
 for(const trainNumber of ['A1854T','A1803K']){
  const p=plannedPosition(trainNumber,'2026-12-01');
  assert.equal(w.TrainVehicle.selectMarkerArtwork(p,false).kind,'unresolved',
   trainNumber+' 超出证据日期后不得继续映射');
 }
});
