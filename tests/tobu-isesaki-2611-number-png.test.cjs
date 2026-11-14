'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{}});
for(const file of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/tobu-isesaki-2611-number-png.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js'])
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:10000});
const window=context.window;
function p(num,type='Local',changes={}) {
 return Object.assign({positionLineId:'TobuIsesaki',displayLineId:'TobuIsesaki',
  sourceRailway:'odpt.Railway:Tobu.Isesaki',trainOperator:'Tobu',
  trainNumber:num,trainType:'odpt.TrainType:Tobu.'+type,
  positionSource:'supabase-train-run',estimated:true,
  calendarType:'weekday',serviceDate:'2026-11-13',
  vehicleIdentityStatus:'UNKNOWN'},changes);
}
test('TI and TS have distinct official station-number presentation colors',()=>{
 const d=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
 for(const line of ['TobuIsesaki','Sano','Kiryu','Koizumi']){
  assert.equal(d.lines[line].code,'TI');
  assert.equal(d.lines[line].color.toLowerCase(),'#ff0000');
  assert.equal(d.lines[line].presentation.color.toLowerCase(),'#ff0000');
 }
 assert.equal(d.lines.TobuSkytree.color.toLowerCase(),'#0f6cc3');
 assert.equal(d.lines.TobuSkytree.presentation.color.toLowerCase(),'#0f6cc3');
});
test('2026 official roster indexes 95 local trains and 50 Ryomo expresses',()=>{
 assert.equal(window.TobuIsesaki2611Png.localNumbers,95);
 assert.equal(window.TobuIsesaki2611Png.limitedNumbers,50);
});
test('2/3-car numbers are exact, image selection is only family illustration',()=>{
 for(const [num,cars,file,model] of [
 ['305E',2,'10030型_未更新車.png','東武10030系'],
 ['303E',3,'8000型.png','東武8000系'],
 ['402E',2,'10030型_未更新車.png','東武10030系'],
 ['302E',3,'8000型.png','東武8000系'],
 ['419E',2,'10030型_未更新車.png','東武10030系']]){
   const row=window.TrainNumberPngRanges.match(num,'TobuIsesaki',p(num));
   assert.ok(row,num);assert.equal(row.scheduledCars,cars);
   assert.equal(row.model,model);assert.ok(row.pngPath.endsWith(file),num);
   assert.equal(row.referenceOnly,true);assert.equal(row.illustrative,true);
   assert.equal(row.actualVehicleConfirmed,false);
   assert.equal(window.VehicleGaragePngMap.matchModelPath(model,row.pngPath,'TobuIsesaki'),true);
   const mark=window.TrainVehicle.selectMarkerArtwork(p(num),false);
   assert.equal(mark.kind,'vehicle',num);
   assert.equal(mark.actualVehicleConfirmed,false,num);
 }
});
test('verified Ryomo number, not loose 1000/1800 range, chooses 200/500 series',()=>{
 for(const [num,file] of [
 ['1801','500系_リバティ.png'],['1803','200型_りょうもう_赤.png'],
 ['1502','500系_リバティ.png'],['1404','200型_りょうもう_赤.png'],
 ['1850','500系_リバティ.png']]){
   const row=window.TrainNumberPngRanges.match(num,'TobuIsesaki',p(num,'LimitedExpress'));
   assert.ok(row,num);assert.ok(row.pngPath.endsWith(file),num);
   assert.equal(row.actualVehicleConfirmed,false);
 }
});
test('TobuSkytree, day, source, known formation, type and unknown numbers fail closed',()=>{
 const bad=[
 p('305E','LimitedExpress'),p('1803','Local'),p('999E'),
 p('303E','Local',{positionLineId:'TobuSkytree'}),
 p('303E','Local',{sourceRailway:'odpt.Railway:Tobu.TobuSkytree'}),
 p('303E','Local',{displayLineId:'Sano'}),
 p('303E','Local',{serviceDate:'2026-12-01'}),
 p('303E','Local',{serviceDate:'2026-10-31'}),
 p('303E','Local',{positionSource:'station-timetable'}),
 p('303E','Local',{estimated:false}),
 p('303E','Local',{vehicleIdentityStatus:'EXACT'}),
 p('303E','Local',{actualVehicleConfirmed:true}),
 p('303E','Local',{vehicleFormationId:'850-1'}),
 p('303E','Local',{realtimeVehicleType:'東武10000系'})
 ];
 bad.forEach((v,i)=>assert.equal(window.TrainNumberPngRanges.match(v.trainNumber,'TobuIsesaki',v),null,'case '+i));
 assert.equal(window.TrainNumberPngRanges.match('303E','TobuSkytree',p('303E')),null);
});
test('November holiday service uses same official local car-count list',()=>{
 const r=window.TrainNumberPngRanges.match('305E','TobuIsesaki',
  p('305E','Local',{calendarType:'holiday',serviceDate:'2026-11-14'}));
 assert.ok(r);assert.equal(r.scheduledCars,2);
});
