'use strict';
// JR-East 2611 弥彦線 (internal Miyo) dated train number + source-route PNG.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={},quiet={log(){},debug(){},warn(){},error(){}};
const ctx=vm.createContext({window:root,console:quiet,Date,
  _isTrainArtworkFailureActive(){return false}});
for(const f of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const path='../images/列车/JR東日本/JR東日本_E129系.png',
 sea='../images/列车/JR東日本/JR東日本_HB-E300系_海里.png';
const u=['220M','262M','222M','224M','264M','226M','228M',
 '232M','234M','238M','272M','240M','242M','274M','244M',
 '276M','246M','278M','248M','250M'];
const d=['221M','223M','261M','225M','263M','227M','265M',
 '229M','231M','235M','237M','241M','273M','243M','275M',
 '245M','277M','247M','249M','251M'];
const kikuDays=new Set(['2026-11-01','2026-11-03','2026-11-07',
 '2026-11-08','2026-11-14','2026-11-15','2026-11-21',
 '2026-11-22','2026-11-23']);
const east=['Higashi-Sanjo','Kita-Sanjo','Tsubame-Sanjo',
 'Tsubame','Nishi-Tsubame','Yoshida'];
const west=['Yoshida','Yahagi','Yahiko'],whole=[...east,...west.slice(1)];
const specials=[
 ['8231M','Outbound','seasonal_holiday',west],
 ['8271M','Outbound','seasonal_holiday',west],
 ['8232M','Inbound','seasonal_holiday',west],
 ['8266M','Inbound','seasonal_holiday',west],
 ['9235M','Outbound','kiku',[...west].reverse()],
 ['9241M','Outbound','kiku',[...west].reverse()],
 ['9228M','Inbound','kiku',east],
 ['9234M','Inbound','kiku',east],
 ['9281M','Outbound','kiku',[...whole].reverse()],
 ['9282M','Inbound','kiku',whole],
 ['9284M','Inbound','kiku',whole]
];
function holiday(day){
 const w=new Date(day+'T12:00:00Z').getUTCDay();
 return w===0||w===6||day==='2026-11-03'||day==='2026-11-23';
}
function make(n,date='2026-11-06',extra={}){
 const inbound=Number(n.replace(/M$/,''))%2===0,
   dir=inbound?'Inbound':'Outbound',
   cal=holiday(date)?'holiday':'weekday',
   event=kikuDays.has(date),
   special=specials.find(x=>x[0]===n);
 let original=special?special[3].slice():
   inbound?whole.slice():whole.slice().reverse();
 // d trains travel from Yahiko -> Higashi-Sanjo; u opposite.
 // 228M on Kiku event uses only Yoshida->Yahiko SQL occurrence1.
 if(n==='228M'&&event)original=west.slice();
 let effective=original.slice(),scope='full';
 if(event&&n==='234M'){effective=original.slice(-3);scope='yoshida_yahiko_only';}
 if(event&&(n==='235M'||n==='241M')){effective=original.slice(2);
   scope='yoshida_higashisanjo_only';}
 if(event&&n==='228M')scope='yoshida_yahiko_only';
 const segment=special?special[2]:'regular';
 const id=n==='228M'&&event?960:900;
 return {
  trainNumber:n,trainId:'sql:Miyo:'+n,positionLineId:'Miyo',
  displayLineId:'Miyo',sourceRailway:'odpt.Railway:JR-East.Miyo',
  trainOperator:'JR-East',railDirection:'odpt.RailDirection:'+dir,
  trainType:'odpt.TrainType:JR-East.Local',positionSource:'supabase-train-run',
  estimated:true,officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
  calendarType:cal,serviceDate:date,plannedVehicleCandidates:['E129系'],
  scheduledStopKeys:effective,
  sqlPublishedNumberFleetReference:{
    source:'sql-jreast-2611-number-roster',lineId:'Miyo',
    trainNumber:n,serviceDate:date,
    direction:'odpt.RailDirection:'+dir,
    calendar:'odpt.Calendar:'+(cal==='holiday'?'SaturdayHoliday':'Weekday'),
    trainType:'odpt.TrainType:JR-East.Local',
    segmentKey:segment,railScope:scope,sourceTemplateId:id,
    sourceStopKeys:original,plannedCandidates:['E129系'],
    model:'E129系',pngReference:path,
    officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/233'+
      (inbound?'u':'d')+(cal==='holiday'?'2':'1')+'.html',
    stopClockStatus:'historical_not_2611_verified',
    referenceOnly:true,actualVehicleConfirmed:false
  },...extra};
}
const verify=p=>root.TrainNumberPngRanges.verifyMiyoService(p);
const mapped=p=>root.TrainVehicle.lookupTrainNumberRangePng(p);
test('all 40 weekday and holiday 2611 ordinary M numbers select E129 PNG',()=>{
 assert.equal(u.length,20);assert.equal(d.length,20);
 assert.equal(new Set([...u,...d]).size,40);
 assert.ok(root.VehicleGaragePngMap.matchModelPath('E129系',path,'Miyo'));
 assert.ok(root.VehicleGaragePngMap.matchModelPath('HB-E300系（海里）',sea,'Miyo'));
 assert.ok(!root.VehicleGaragePngMap.matchModelPath('HB-E300系（海里）',sea,'ChuoMain'));
 for(const n of [...u,...d])for(const day of ['2026-11-06','2026-11-07']){
  const p=make(n,day);
  assert.equal(verify(p)?.number,n,n+' '+day);
  assert.equal(mapped(p)?.pngPath,path,n+' '+day);
  assert.equal(mapped(p)?.planned,true);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
 }
});
test('nine Kiku dates add 7 E129 event numbers with appropriate dates',()=>{
 const kiku=specials.filter(x=>x[2]==='kiku');
 assert.equal(kiku.length,7);
 for(const [number] of kiku)for(const day of kikuDays){
  const p=make(number,day);
  assert.equal(verify(p)?.model,'E129系',number+' '+day);
  assert.equal(mapped(p)?.pngPath,path);
 }
 for(const [number] of kiku)for(const day of ['2026-11-06','2026-11-24','2026-11-28']){
  assert.equal(verify(make(number,day)),null,number+' '+day);
 }
});
test('four seasonal 8xxxM trains run only on holiday calendar and regular class',()=>{
 for(const [n] of specials.filter(x=>x[2]==='seasonal_holiday')){
  assert.equal(mapped(make(n,'2026-11-07'))?.pngPath,path,n);
  assert.equal(verify(make(n,'2026-11-09')),null,n+' weekday');
 }
});
test('228M,234M,235M,241M never project old through-rail route on Kiku days',()=>{
 for(const n of ['228M','234M','235M','241M']){
  const base=make(n,'2026-11-07');
  assert.ok(verify(base),n+' valid shortened');
  assert.ok(base.sqlPublishedNumberFleetReference.railScope!=='full');
  if(n==='228M')assert.equal(base.sqlPublishedNumberFleetReference.sourceTemplateId,960);
  const bad={...base,scheduledStopKeys:base.sqlPublishedNumberFleetReference.sourceStopKeys};
  if(n!=='228M')assert.equal(verify(bad),null,n+' cancelled segment');
  assert.equal(verify({...base,sqlPublishedNumberFleetReference:{
    ...base.sqlPublishedNumberFleetReference,railScope:'full'}}),null);
 }
 assert.equal(verify(make('228M','2026-11-06'))?.railScope,'full');
});
test('Oct24-only Shu*Kura and Momiji lack an authentic Nov SQL run; do not paint by D number',()=>{
 for(const n of ['9222D','9225D','9278D','9279D','9179D']){
  const p=make('221M');
  const fake={...p,trainNumber:n,sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,trainNumber:n}};
  assert.equal(mapped(fake),null,n);
 }
 const sql=fs.readFileSync('supabase/migrations/'+
  '20261106033000_miyo_2611_yahiko_exact_number_fleet_calendar.sql','utf8');
 for(const n of ['9278D','9279D','9179D','9222D','9225D'])
  assert.ok(sql.includes(n),'evidence '+n);
 assert.ok(sql.includes('momiji_no_sql_source'));
 assert.ok(sql.includes('2026-10-24'));
 assert.ok(sql.includes('2026-11-23'));
});
test('wrong identity, calendar, operator, source stops or image fails closed',()=>{
 const p=make('220M','2026-11-06');
 for(const bad of [
  {positionLineId:'Yahiko'},{displayLineId:'Echigo'},
  {sourceRailway:'odpt.Railway:JR-East.Echigo'},
  {trainOperator:'JR-West'},{railDirection:'odpt.RailDirection:Outbound'},
  {calendarType:'holiday'},{trainType:'odpt.TrainType:JR-East.Rapid'},
  {positionSource:'realtime-api'},{officialNumberVerified:false},
  {estimated:false},{vehicleIdentityStatus:'EXACT'},
  {plannedVehicleCandidates:['E127系']},
  {realtimeVehicleType:'E127系'},
  {scheduledStopKeys:[]},{scheduledStopKeys:['Yahiko','Yoshida']},
  {sqlPublishedNumberFleetReference:null},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,model:'E127系'}},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,referenceOnly:false}}
 ])assert.equal(mapped({...p,...bad}),null,JSON.stringify(bad));
});
test('source contract and estimator are SQL-only; no bogus special trip creation',()=>{
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 for(const word of ['MIYO_2611_NUMBER_DATE_ROSTER_UNAVAILABLE',
  'published_miyo_2611_number_roster','kikuDays','source_template_id',
  'run.stops.slice(-3)','run.stops.slice(2)',
  'segment_key==="october_only"'])
  assert.ok(edge.includes(word),word);
 assert.ok(estimator.includes('officialMiyoPlan'));
 assert.ok(estimator.includes('verifyMiyoService'));
 assert.ok(estimator.includes('officialMitoPlan || officialMiyoPlan'));
});
