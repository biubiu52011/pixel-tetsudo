'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('地下铁批次素材区分与相铁直通线路门禁',()=>{
 const w={};vm.runInNewContext(fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8'),{window:w});
 const g=w.VehicleGaragePngMap,p=(d,n)=>'../images/列车/'+d+'/'+n+'.png';
 const variants=[
 ['東京メトロ05系（4～7次車）','東京メトロ05系',p('東京メトロ','東京メトロ_05系_4～7次車'),'Tozai','Chiyoda'],
 ['東京メトロ05系（8～13次車）','東京メトロ05系',p('東京メトロ','東京メトロ_05系_8～13次車'),'Tozai','Chiyoda'],
 ['横浜市営10000形（1次車）','横浜市営10000形',p('横浜市交通局','横浜市交通局_10000形_1次車'),'YokohamaGreen','YokohamaBlue'],
 ['横浜市営10000形（2次車）','横浜市営10000形',p('横浜市交通局','横浜市交通局_10000形_2次車'),'YokohamaGreen','YokohamaBlue']
 ];
 for(const [model,family,path,line,other] of variants){
  assert.ok(g.matchModelPath(model,path,line));
  assert.ok(!g.matchModelPath(family,path,line));
  assert.ok(!g.matchModelPath(model,path,other));
  assert.ok(g.findPath(path).every(x=>!x.canonicalImage));
 }
 for(const line of ['Mita','Namboku','TokyuMeguro'])assert.equal(g.findModel('相鉄20000系',line).length,0);
 for(const [model,line,file] of [['相鉄20000系','Fukutoshin','相模鉄道_20000系_YOKOHAMA_NAVYBLUE'],['相鉄21000系','Namboku','相模鉄道_21000系']]){
  assert.ok(g.findModel(model,line).length);
  assert.ok(g.isQuarantinedPng(p('相模鉄道',file)));
  assert.ok(!g.matchModelPath(model,p('相模鉄道',file),line));
 }
});

test('Yokohama Green live identity retains official 10000 family without authorizing batch PNG',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 const input={operator:'YokohamaMunicipal',railway:'odpt.Railway:YokohamaMunicipal.Green',lineId:'YokohamaGreen',trainNumber:'2143b',positionSource:'realtime-api',vehicleEvidenceKind:'trip-id-only'};
 const r=w.TrainVehicle.resolveRealtime(input).vehicleResult;
 assert.ok(r.candidates.includes('横浜市営10000形'));
 assert.equal(r.identityStatus,'NARROWED');
 assert.ok(!r.iconPath);
 const bad=w.TrainVehicle.resolveRealtime({...input,railway:'odpt.Railway:YokohamaMunicipal.Blue'}).vehicleResult;
 assert.ok(!bad.candidates.includes('横浜市営10000形'));
});

test('Yokohama Blue family candidates remain neutral, explicit subtype selects only matching PNG',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 const input={operator:'YokohamaMunicipal',railway:'odpt.Railway:YokohamaMunicipal.Blue',lineId:'YokohamaBlue',trainNumber:'2113b',positionSource:'realtime-api',vehicleEvidenceKind:'trip-id-only'};
 const family=w.TrainVehicle.resolveRealtime(input).vehicleResult;
 assert.equal(family.identityStatus,'NARROWED');
 assert.ok(family.candidates.includes('横浜市営3000形'));
 assert.ok(family.candidates.includes('横浜市営4000形'));
 assert.ok(!family.iconPath);
 for(const model of ['3000N','3000R','3000S','3000V','4000']){
  const r=w.TrainVehicle.resolveRealtime({...input,realtimeVehicleType:'横浜市営地下鉄'+model+'形',vehicleEvidenceKind:'physical-vehicle-label'}).vehicleResult;
  assert.equal(r.identityStatus,'EXACT');
  assert.equal(r.iconPath,'../images/列车/横浜市交通局/横浜市交通局_'+model+'形.png');
 }
});
