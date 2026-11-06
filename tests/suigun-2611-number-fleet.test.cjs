'use strict';
/* JR-East Suigun/Hitachi-Ota source scoped 2611 KiHa E130 artwork. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const root={},ctx=vm.createContext({window:root,Date,console:{
 log(){},debug(){},warn(){},error(){}
},_isTrainArtworkFailureActive(){return false}});
for(const path of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'data/timetables/jreast-senzan-2611-number-index.js',
 'data/timetables/jreast-shinonoi-2611-number-index.js',
 'data/timetables/jreast-suigun-2611-number-index.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const png='../images/列车/JR東日本/JR東日本_キハE130系0番台.png';
function p(number,line='Suigun',calendar='weekday',dir='Inbound',date='2026-11-06'){
 return {trainNumber:number,positionLineId:line,displayLineId:line,
  sourceRailway:'odpt.Railway:JR-East.'+line,
  positionSource:'supabase-train-run',estimated:true,serviceDate:date,
  calendarType:calendar,railDirection:'odpt.RailDirection:'+dir,
  trainType:'odpt.TrainType:JR-East.Local',
  vehicleIdentityStatus:'UNKNOWN'};
}
const resolve=x=>root.JREastSuigunNumberIndex202611.resolve(x);
const icon=x=>root.TrainVehicle.selectMarkerArtwork(x,false);
test('both separately scoped railways use planned KiHa E130 0 without claimed carset',()=>{
 for(const x of [p('820D'),p('920D','SuigunBranch'),p('920D','Suigun')]){
  const res=resolve(x),img=icon(x);
  assert.equal(res.illustrationModel,'キハE130系0番台');
  assert.equal(res.authorizesPNG,false);
  assert.equal(res.actualVehicleConfirmed,false);
  assert.equal(img.iconSrc,png);
  assert.equal(img.illustrative,true);
  assert.equal(img.representativeOnly,true);
  assert.equal(img.actualVehicleConfirmed,false);
 }
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハE130系0番台',png,'Suigun'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハE130系0番台',png,'SuigunBranch'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハE130系0番台',png,'Hachinohe'),false);
});
test('14/15 November Kazekko 9821D/9822D never borrow KiHa E130 gallery PNG',()=>{
 for(const number of ['9821D','9822D']){
  const dir=number==='9821D'?'Outbound':'Inbound';
  const pos=p(number,'Suigun','holiday',dir,'2026-11-14');
  assert.equal(resolve(pos),null);
  assert.equal(icon(pos).kind,'unresolved');
 }
 assert.equal(resolve(p('9821D','SuigunBranch','holiday','Outbound','2026-11-14')),null);
});
test('maintenance specials and weekend extensions match published service dates',()=>{
 assert.equal(resolve(p('9329D','Suigun','weekday','Outbound','2026-11-12')).illustrationModel,'キハE130系0番台');
 assert.equal(resolve(p('9329D','Suigun','weekday','Outbound','2026-11-18')).illustrationModel,'キハE130系0番台');
 assert.equal(resolve(p('9329D','Suigun','weekday','Outbound','2026-11-06')),null);
 assert.equal(resolve(p('9324D','Suigun','weekday','Inbound','2026-11-17')).illustrationModel,'キハE130系0番台');
 assert.equal(resolve(p('9324D','Suigun','weekday','Inbound','2026-11-12')),null);
 assert.equal(resolve(p('8325D','Suigun','weekday','Outbound','2026-11-06')),null);
 assert.equal(resolve(p('8325D','Suigun','holiday','Outbound','2026-11-07')).illustrationModel,'キハE130系0番台');
 assert.equal(resolve(p('9841D','Suigun','holiday','Outbound','2026-11-21')).illustrationModel,'キハE130系0番台');
 assert.equal(resolve(p('9841D','Suigun','holiday','Outbound','2026-11-22')),null);
 assert.equal(resolve(p('341D','Suigun','holiday','Outbound','2026-11-22')),null);
 assert.ok(resolve(p('341D','Suigun','weekday','Outbound','2026-11-06')));
});
test('no cross-railway or cross-fleet guess based on shared 920D numbers',()=>{
 const src=p('920D','SuigunBranch');
 for(const patch of [
  {sourceRailway:'odpt.Railway:JR-East.Suigun'},
  {positionLineId:'Suigun'}, {displayLineId:'Suigun'},
  {calendarType:'NoCalendar'}, {serviceDate:'2026-12-01'},
  {trainType:'odpt.TrainType:JR-East.Rapid'},
  {vehicleIdentityStatus:'EXACT'},{vehicleFormationId:'SET-1'},
  {realtimeVehicleType:'キハE130系0番台'},
  {vehicleResolvedFromRealtime:true},{trainOperator:'JR-West'},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['キハ110系']}},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['キハE130形100番台']}}
 ])assert.equal(resolve({...src,...patch}),null,JSON.stringify(patch));
 const wrong=p('820D','SuigunBranch');assert.equal(resolve(wrong),null);
 assert.equal(root.TrainVehicle.selectMarkerArtwork(src,true).kind,'unresolved');
});
test('Suigun parent map shows ONLY certified SuigunBranch projected KiHa E130 art',()=>{
 const sourced=p('934D','SuigunBranch','weekday','Inbound');
 const overlay={...sourced,displayLineId:'Suigun',fusionRole:'branch',
  fusionLineId:'SuigunBranch'};
 // The direct number index must remain source-display strict.
 assert.equal(resolve(overlay),null);
 const mapped=root.TrainNumberPngRanges.match(overlay.trainNumber,'SuigunBranch',overlay);
 assert.equal(mapped.model,'キハE130系0番台');
 assert.equal(mapped.pngPath,png);
 const shown=icon(overlay);
 assert.equal(shown.kind,'vehicle');
 assert.equal(shown.iconSrc,png);
 assert.equal(shown.illustrative,true);
 assert.equal(shown.representativeOnly,true);
 assert.equal(shown.actualVehicleConfirmed,false);
 // The parent main-line roster must not be silently used as the source.
 assert.equal(root.TrainNumberPngRanges.match(overlay.trainNumber,'Suigun',overlay),null);
 for(const patch of [
  {fusionRole:'extension'},
  {fusionLineId:'Suigun'},
  {positionLineId:'Suigun'},
  {sourceRailway:'odpt.Railway:JR-East.Suigun'},
  {displayLineId:'Ome'},
  {estimated:false},
  {positionSource:'realtime-api'},
  {trainOperator:'JR-West'},
  {calendarType:'NoCalendar'},
  {vehicleIdentityStatus:'EXACT'}
 ]){
   const invalid={...overlay,...patch};
   assert.equal(icon(invalid).kind,'unresolved',JSON.stringify(patch));
 }
 assert.equal(icon({...overlay,trainNumber:'820D'}).kind,'unresolved');
 assert.equal(root.TrainVehicle.selectMarkerArtwork(overlay,true).kind,'unresolved');
});
test('2611 branch has 30 Weekday and 30 Holiday numbers, with 4 restored',()=>{
 for(const cal of ['weekday','holiday']){
  for(const dir of ['Outbound','Inbound']){
   let count=0;
   for(let n=920;n<=949;n++){
    if(resolve(p(n+'D','SuigunBranch',cal,dir)))count++;
   }
   assert.equal(count,15,cal+' '+dir);
  }
 }
 for(const [num,dir] of [['929D','Outbound'],['930D','Inbound'],
  ['931D','Outbound'],['932D','Inbound']]){
  const pos=p(num,'SuigunBranch','weekday',dir);
  assert.equal(resolve(pos).illustrationModel,'キハE130系0番台');
  assert.equal(icon(pos).planned,true);
  assert.equal(icon(pos).actualVehicleConfirmed,false);
 }
});
test('existing Senzan/Shinonoi match adapters survive the new nested adapter',()=>{
 const x={
  trainNumber:'1829M',positionLineId:'Senzan',displayLineId:'Senzan',
  sourceRailway:'odpt.Railway:JR-East.Senzan',positionSource:'supabase-train-run',
  estimated:true,serviceDate:'2026-11-06',calendarType:'weekday',
  railDirection:'odpt.RailDirection:Outbound',trainType:'odpt.TrainType:JR-East.Local'
 };
 assert.equal(root.TrainNumberPngRanges.match(x.trainNumber,'Senzan',x).model,'E721系');
 const s={...x,trainNumber:'1001M',positionLineId:'Shinonoi',
  displayLineId:'Shinonoi',sourceRailway:'odpt.Railway:JR-East.Shinonoi',
  trainType:'odpt.TrainType:JR-East.LimitedExpress'};
 assert.equal(root.TrainNumberPngRanges.match(s.trainNumber,'Shinonoi',s).model,'383系');
});
test('canonical manifest, relative page script, SHA-12 and migration safety',()=>{
 const m=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
 const path='data/timetables/jreast-suigun-2611-number-index.js';
 assert.equal(m.lazy.trains.filter(x=>x===path).length,1);
 assert.equal(m.lazyScopes.trains[path].join('|'),'Suigun|SuigunBranch');
 assert.equal(m.lazy.trains.indexOf(path),
  m.lazy.trains.indexOf('data/timetables/jreast-shinonoi-2611-number-index.js')+1);
 const html=fs.readFileSync('pages/trains.html','utf8');
 for(const file of [path,'js/train-vehicle.js','data/timetables/vehicle-garage-png-map.js']){
  const b=fs.readFileSync(file),hash=crypto.createHash('sha1')
   .update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+file+'?v='+hash),'stale '+file);
 }
 const sql=fs.readFileSync('supabase/migrations/20261106223000_suigun_2611_fleet_dates_scope.sql','utf8');
 for(const part of ['published_suigun_2611_fleet_scope','9821D','9822D',
  'source_occurrence=1','215','218','kazekko_excursion_no_png',
  'actual_vehicle_confirmed'])assert.ok(sql.includes(part),part);
});
