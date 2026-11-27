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

test('Through fleet candidates on Toei use actual owner and source railway without assigning a PNG',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 for(const [line,owner,number,operation,expected] of [
 ['Shinjuku','Keio','2078K','78K',['京王9000系（9030系）','京王5000系']],
 ['Asakusa','Hokuso','2121N','21N',['北総7300形','北総7500形','北総7800形','千葉ニュータウン9100形','千葉ニュータウン9200形','千葉ニュータウン9800形']]
 ]){
  const p={lineId:line,operator:'Toei',railway:'odpt.Railway:Toei.'+line,trainOwner:owner,trainNumber:number,operationCode:operation,positionSource:'realtime-api',vehicleEvidenceKind:'trip-id-only'};
  const r=w.TrainVehicle.resolveRealtime(p).vehicleResult;
  assert.equal(r.identityStatus,'NARROWED');
  assert.deepEqual(Array.from(r.candidates).sort(),expected.sort());assert.ok(!r.iconPath);
  const bad=w.TrainVehicle.resolveRealtime({...p,railway:'odpt.Railway:Toei.Mita'}).vehicleResult;
  assert.ok(!bad.candidates.some(c=>expected.includes(c)));
 }
});

test('Asakusa K/H through fleets preserve ambiguity and reject conflicting owner',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 for(const [owner,num,code,models] of [
 ['Keisei','2007K','07K',['京成3000形','京成3100形','京成3400形','京成3700形']],
 ['Keikyu','2081H','81H',['京急1000形','京急600形','京急1500形']]
 ]){
  const p={lineId:'Asakusa',operator:'Toei',railway:'odpt.Railway:Toei.Asakusa',trainOwner:owner,trainNumber:num,operationCode:code,positionSource:'realtime-api',vehicleEvidenceKind:'trip-id-only'};
  const r=w.TrainVehicle.resolveRealtime(p).vehicleResult;
  assert.equal(r.identityStatus,'NARROWED');assert.deepEqual(Array.from(r.candidates).sort(),models.sort());assert.ok(!r.iconPath);
  const bad=w.TrainVehicle.resolveRealtime({...p,operationCode:'21N'}).vehicleResult;
  assert.ok(!bad.candidates.some(c=>models.includes(c)));
  for(const model of models.filter(x=>x!=='京急1000形')){
   const exact=w.TrainVehicle.resolveRealtime({...p,realtimeVehicleType:model}).vehicleResult;
   assert.equal(exact.identityStatus,'EXACT');assert.equal(exact.name,model);assert.ok(exact.iconPath);
  }
 }
});
test('Metro mixed fleets require scoped independent owner, not a guessed PNG',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 for(const line of ['Yurakucho','Fukutoshin'])for(const [owner,number,models] of [
  ['TokyoMetro','A1749S',['東京メトロ10000系','東京メトロ17000系']],
  ['Seibu','A1806M',['西武6000系','西武40000系']]
 ]){
  const p={lineId:line,operator:'TokyoMetro',railway:'odpt.Railway:TokyoMetro.'+line,trainOwner:owner,trainNumber:number,positionSource:'realtime-api'};
  const r=w.TrainVehicle.resolveRealtime(p).vehicleResult;
  assert.equal(r.identityStatus,'NARROWED');assert.deepEqual(Array.from(r.candidates).sort(),models.sort());assert.ok(!r.iconPath);
  const bad=w.TrainVehicle.resolveRealtime({...p,trainOwner:''}).vehicleResult;
  assert.ok(!bad.iconPath);
 }
});

test('Keikyu 1000 family cannot select the 1200 subtype artwork by default',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 const p={lineId:'Asakusa',operator:'Toei',railway:'odpt.Railway:Toei.Asakusa',trainOwner:'Keikyu',trainNumber:'2021H',operationCode:'21H',positionSource:'realtime-api',vehicleEvidenceKind:'physical-vehicle-label'};
 const family=w.TrainVehicle.resolveRealtime({...p,realtimeVehicleType:'京急1000形'}).vehicleResult;
 assert.equal(family.name,'京急1000形');assert.ok(!family.iconPath);
 const batch=w.TrainVehicle.resolveRealtime({...p,realtimeVehicleType:'京急1000形1200番台'}).vehicleResult;
 assert.equal(batch.name,'京急1000形（1200番台）');
 const png='../images/列车/京浜急行電鉄/京浜急行電鉄_1000形_1200番台.png';
 assert.equal(batch.iconPath,png);
 assert.equal(w.VehicleGaragePngMap.findModel('京急1000形','Asakusa').length,0);
 assert.equal(w.VehicleGaragePngMap.findModel('京急1000形（1200番台）','Asakusa')[0].canonicalImage,false);
});
test('Metro through fleets separate Tokyu and Yokohama owners and exclude unverified Tojo 90000',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 for(const [line,owner,number,models] of [
 ['Yurakucho','Tobu','A1913T',['東武9000系','東武9050系','東武50070系']],
 ['Fukutoshin','Tobu','A1913T',['東武9000系','東武9050系','東武50070系']],
 ['Fukutoshin','Tokyu','A1003K',['東急5050系','東急5000系（8両）']],
 ['Fukutoshin','YokohamaMinatomiraiRailway','A1003K',['横浜高速Y500系']]
 ]){
  const p={lineId:line,operator:'TokyoMetro',railway:'odpt.Railway:TokyoMetro.'+line,trainOwner:owner,trainNumber:number,positionSource:'realtime-api'};
  const r=w.TrainVehicle.resolveRealtime(p).vehicleResult;
  assert.equal(r.identityStatus,'NARROWED');assert.deepEqual(Array.from(r.candidates).sort(),models.sort());assert.ok(!r.iconPath);
 }
});

test('Hanzomon dated fleet evidence distinguishes Tokyu and Tobu and rejects cross-line/date leakage',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 vm.runInNewContext(fs.readFileSync('js/train-vehicle.js','utf8'),ctx);
 const p=w.TrainOperationEvidence.providers.find(x=>x.id==='denentoshi-dated-formations');
 const input={lineId:'Hanzomon',railway:'odpt.Railway:TokyoMetro.Hanzomon',serviceDate:'2026-04-18'};
 assert.equal(p.resolveEvidence('50T',input).operator,'Tobu');
 assert.equal(p.resolveEvidence('66T',input).vehicleType,'東武50000系(10両)');
 assert.equal(p.resolveEvidence('01K',input).operator,'Tokyu');
 assert.equal(p.resolveEvidence('50T',{...input,lineId:'Tojo',railway:'odpt.Railway:Tobu.Tojo'}),null);
 assert.equal(p.resolveEvidence('50T',{...input,railway:'odpt.Railway:Tobu.Tojo'}),null);
 assert.equal(p.resolveEvidence('50T',{...input,serviceDate:'2026-11-27'}),null);
 assert.ok(w.TrainVehicle.resolveCanonicalVehicle('東急2020系').lineIds.includes('Hanzomon'));
 assert.ok(!w.TrainVehicle.resolveCanonicalVehicle('東急5000系（8両）').lineIds.includes('Hanzomon'));
});

test('Tozai dated 05 formation selects only its front-design reference',()=>{
 const w={},ctx={window:w,console:{log(){},warn(){},debug(){},error(){}}};
 for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 function lookup(number,date,railway='odpt.Railway:TokyoMetro.Tozai'){
   const r=w.TrainVehicle.resolveTimetableRun({trainNumber:number,calendar:'odpt.Calendar:SaturdayHoliday',trainType:'odpt.TrainType:TokyoMetro.Local'},{'odpt:railway':railway,'odpt:operator':'odpt.Operator:TokyoMetro',_positionSource:'supabase-train-run'},'Tozai',{operator:'TokyoMetro'},date);
   const x=r.vehicleResult;
   return {x,marker:w.TrainVehicle.selectMarkerArtwork({lineId:'Tozai',positionLineId:'Tozai',displayLineId:'Tozai',trainNumber:number,serviceDate:date,calendarType:'holiday',positionSource:'supabase-train-run',sourceRailway:railway,trainOperator:'TokyoMetro',estimated:true,vehicleIdentityStatus:x.identityStatus,vehicleResolvedUpstream:x.identityStatus==='EXACT',vehicleResolution:x,vehiclePlan:x.vehiclePlan,vehicleType:x.name,vehicleFormationId:r.assignmentFormations.length===1?r.assignmentFormations[0]:'',vehicleFormationCandidates:r.assignmentFormations},false)};
 }
 for(const [n,batch] of [['A1315S','8～13'],['A1325S','4～7']]){
   const r=lookup(n,'2026-10-24');
   assert.equal(r.x.name,'東京メトロ05系');
   assert.equal(r.marker.iconSrc,'../images/列车/東京メトロ/東京メトロ_05系_'+batch+'次車.png');
   assert.equal(r.marker.planned,true);
   assert.equal(r.x.vehiclePlan.actualVehicleConfirmed,false);
 }
 assert.equal(lookup('A1315S','2026-11-28').marker.kind,'unresolved');
 assert.equal(lookup('A1315S','2026-10-24','odpt.Railway:TokyoMetro.Chiyoda').marker.kind,'unresolved');
});
