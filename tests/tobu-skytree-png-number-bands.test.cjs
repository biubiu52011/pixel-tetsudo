'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{}});
for(const file of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js'])
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:10000});
const ranges=context.window.TrainNumberPngRanges,garage=context.window.VehicleGaragePngMap;
function p(number,type='LimitedExpress',mods={}){
 return Object.assign({positionLineId:'TobuSkytree',displayLineId:'TobuSkytree',
  sourceRailway:'odpt.Railway:Tobu.TobuSkytree',trainOperator:'Tobu',
  trainNumber:number,trainType:'odpt.TrainType:Tobu.'+type,
  positionSource:'supabase-train-run',estimated:true,serviceDate:'2026-11-13',
  calendarType:'weekday',vehicleIdentityStatus:'UNKNOWN'},mods);
}
const examples=[
 ['1007','LimitedExpress','spacia_x','東武N100系','N100系_SPACIA_X.png'],
 ['1001','LimitedExpress','revaty','東武500系','500系_リバティ.png'],
 ['1012','LimitedExpress','spacia','東武100系','100系_原色.png'],
 ['1310','LimitedExpress','ryomo','東武200型','200型_りょうもう_赤.png'],
 ['1002','LimitedExpress','skytree_liner','東武500系','500系_リバティ.png'],
 ['A4643T','THLiner','th_liner','東武70090型','70090型.png'],
 ['2501','SectionExpress','ordinary','東武10030系','10030型_未更新車.png']
];
test('official service-family numbers use gallery-scoped representative PNG, never actual stock',()=>{
 for(const [number,type,family,model,ending] of examples){
  const x=p(number,type),m=ranges.match(x.trainNumber,'TobuSkytree',x);
  assert.ok(m,number);assert.equal(m.serviceFamily,family);
  assert.equal(m.model,model);assert.ok(m.pngPath.endsWith(ending));
  assert.equal(m.referenceOnly,true);assert.equal(m.illustrative,true);
  assert.equal(m.actualVehicleConfirmed,false);
  assert.equal(garage.matchModelPath(model,m.pngPath,'TobuSkytree'),true);
 }
});
test('ordinary Skytree corridor PNG is scoped to exact source train numbers',()=>{
 const cases=[
  ['2501','SectionExpress','asakusa','東武10030系','10030型_未更新車.png'],
  ['801','Local','asakusa','東武10030系','10030型_未更新車.png'],
  ['A1009T','Local','hibiya','東武70000系','70000系.png'],
  ['B1016S','Local','hibiya','東京メトロ13000系','13000系.png'],
  ['C1005K','Express','oshiage','東急2020系','2020系.png']
 ];
 for(const [num,type,corridor,model,file] of cases){
   const m=ranges.match(num,'TobuSkytree',p(num,type));
   assert.ok(m,num);assert.equal(m.referenceCorridor,corridor);
   assert.equal(m.model,model);assert.ok(m.pngPath.endsWith(file),num);
   assert.equal(m.illustrative,true);assert.equal(m.referenceOnly,true);
   assert.equal(m.actualVehicleConfirmed,false);
   assert.equal(garage.matchModelPath(model,m.pngPath,'TobuSkytree'),true);
   const icon=context.window.TrainVehicle&&context.window.TrainVehicle.selectMarkerArtwork;
   if(icon){const rendered=icon(p(num,type),false);assert.equal(rendered.kind,'vehicle',num);}
 }
 for(const [num,type] of [['2702','SectionExpress'],['950','Local'],['501','Local']])
   assert.equal(ranges.match(num,'TobuSkytree',p(num,type)),null,num+' unknown corridor');
});

test('through service owner suffix is a reference, never observed physical carset',()=>{
 const samples=[
  ['B1016S','Local','TokyoMetro','東京メトロ13000系','13000系.png'],
  ['A1009T','Local','Tobu','東武70000系','70000系.png'],
  ['C1005K','Express','Tokyu','東急2020系','2020系.png']
 ];
 for(const [num,type,owner,model,file] of samples){
   const ref=ranges.match(num,'TobuSkytree',p(num,type));
   assert.ok(ref,num);
   assert.equal(ref.referenceOwner,owner);
   assert.equal(ref.model,model);
   assert.ok(ref.pngPath.endsWith(file),num);
   assert.equal(ref.referenceOnly,true);
   assert.equal(ref.actualVehicleConfirmed,false);
   assert.equal(garage.matchModelPath(model,ref.pngPath,'TobuSkytree'),true);
 }
 function metro(line,trainNumber,type='Local'){
   return {...p(trainNumber,type),positionLineId:line,displayLineId:line,
     sourceRailway:'odpt.Railway:TokyoMetro.'+line,trainOperator:'TokyoMetro'};
 }
 const cases=[
  ['Hibiya','B1016S','TokyoMetro','13000系.png'],
  ['Hibiya','A1009T','Tobu','70000系.png'],
  ['Hanzomon','A1004K','Tokyu','2020系.png'],
  ['Hanzomon','A1093S','TokyoMetro','18000系.png'],
  ['Hanzomon','A1050T','Tobu','50050型.png']
 ];
 for(const [line,num,owner,file] of cases){
   const ref=ranges.match(num,line,metro(line,num));
   assert.ok(ref,line+num);
   assert.equal(ref.referenceOwner,owner);
   assert.ok(ref.pngPath.endsWith(file));
   assert.equal(ref.referenceOnly,true);
   assert.equal(ref.actualVehicleConfirmed,false);
   assert.equal(ref.candidateModels.length>0,true);
   assert.equal(garage.matchModelPath(ref.model,ref.pngPath,line),true);
 }
 assert.equal(ranges.match('C1005K','Hanzomon',metro('Hanzomon','C1005K')),null,
   'different-company number may not be guessed into Metro source roster');
 assert.equal(ranges.match('B1016S','Hibiya',{...metro('Hibiya','B1016S'),trainOwner:'odpt.Operator:Tobu'}),null);
 assert.equal(ranges.match('B1016S','Hibiya',{...metro('Hibiya','B1016S'),operationCode:'16T'}),null);
 assert.equal(ranges.match('B1016S','Hibiya',{...metro('Hibiya','B1016S'),vehicleIdentityStatus:'EXACT'}),null);
 assert.equal(ranges.match('B1016S','Hibiya',{...metro('Hibiya','B1016S'),serviceDate:'2026-12-01'}),null);
});
test('wrong number, date, fleet, line, source and train type fail closed',()=>{
 const bad=[
  p('1099'),p('1007','Local'),p('1007','LimitedExpress',{sourceRailway:'odpt.Railway:Tobu.TobuUrbanPark'}),
  p('1007','LimitedExpress',{displayLineId:'TobuNikko'}),
  p('1007','LimitedExpress',{serviceDate:'2026-11-01'}),
  p('1007','LimitedExpress',{serviceDate:'2026-12-01'}),
  p('A4643T','THLiner',{calendarType:'holiday',serviceDate:'2026-11-14'}),
  p('2501','SectionExpress',{vehicleIdentityStatus:'EXACT'}),
  p('1007','LimitedExpress',{actualVehicleConfirmed:true}),
  p('1007','LimitedExpress',{positionSource:'station-timetable'}),
  p('1007','LimitedExpress',{positionLineId:'Noda'}),
  p('1007','LimitedExpress',{trainOperator:'JR-East'})
 ];
 bad.forEach((x,i)=>assert.equal(ranges.match(x.trainNumber,'TobuSkytree',x),null,'bad '+i));
});
test('TrainVehicle renders each service-family reference as an illustrative PNG',()=>{
 vm.runInContext(fs.readFileSync('js/train-vehicle.js','utf8'),context,{filename:'js/train-vehicle.js',timeout:10000});
 const select=context.window.TrainVehicle.selectMarkerArtwork;
 assert.equal(typeof select,'function');
 for(const [number,type,family,model,file] of examples){
  const image=select(p(number,type),false);
  assert.equal(image.kind,'vehicle',number);
  assert.ok(String(image.iconSrc||'').endsWith(file),number);
  assert.equal(image.illustrative,true);
  assert.equal(image.representativeOnly,true);
  assert.equal(image.actualVehicleConfirmed,false);
 }
 const weekend=select(p('A4845T','THLiner',{serviceDate:'2026-11-14',calendarType:'holiday'}),false);
 assert.equal(weekend.kind,'vehicle');
 assert.ok(weekend.iconSrc.endsWith('70090型.png'));
});
test('SQL migration builds grouped exact-date bands, never actual vehicle proof',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261113203000_tobu_skytree_2611_png_number_bands.sql','utf8');
 assert.match(sql,/gtfs_stage\.trips/);
 assert.match(sql,/seen<>1738/);
 assert.match(sql,/<>14/);
 assert.match(sql,/array_agg\(DISTINCT number ORDER BY number\)/);
 assert.match(sql,/actual_vehicle_confirmed boolean NOT NULL DEFAULT false/);
 assert.match(sql,/REVOKE ALL ON public\.published_tobu_skytree_png_number_bands FROM anon, authenticated/);
});

test('follow-up SQL migration refuses blanket 50050 and locks GTFS corridor counts',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261113215000_tobu_skytree_ordinary_corridor_png_references.sql','utf8');
 assert.match(sql,/ordinary_corridor_references jsonb NOT NULL DEFAULT/);
 assert.match(sql,/MIXED_ORDINARY_CORRIDOR_GATED/);
 assert.match(sql,/png_reference = ''/);
 assert.match(sql,/THEN 'asakusa'/);
 assert.match(sql,/THEN 'oshiage'/);
 assert.match(sql,/THEN 'hibiya'/);
 assert.match(sql,/ELSE 'unresolved'/);
 assert.match(sql,/train_numbers/);
 assert.match(sql,/jsonb_array_length\(b\.ordinary_corridor_references->'asakusa'->'train_numbers'\)<>223/);
 assert.match(sql,/jsonb_array_length\(b\.ordinary_corridor_references->'hibiya'->'train_numbers'\)<>340/);
 assert.match(sql,/jsonb_array_length\(b\.ordinary_corridor_references->'oshiage'->'train_numbers'\)<>222/);
 assert.match(sql,/jsonb_array_length\(b\.ordinary_corridor_references->'unresolved'->'train_numbers'\)<>8/);
});
