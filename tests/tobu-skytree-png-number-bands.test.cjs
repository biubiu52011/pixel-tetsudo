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
 ['2501','SectionExpress','ordinary','東武50050系','50050型.png']
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
test('SQL migration builds grouped exact-date bands, never actual vehicle proof',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261113203000_tobu_skytree_2611_png_number_bands.sql','utf8');
 assert.match(sql,/gtfs_stage\.trips/);
 assert.match(sql,/seen<>1738/);
 assert.match(sql,/<>14/);
 assert.match(sql,/array_agg\(DISTINCT number ORDER BY number\)/);
 assert.match(sql,/actual_vehicle_confirmed boolean NOT NULL DEFAULT false/);
 assert.match(sql,/REVOKE ALL ON public\.published_tobu_skytree_png_number_bands FROM anon, authenticated/);
});
