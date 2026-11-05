'use strict';
/* 男鹿線 2026-11: 29 official M numbers, 52 SQL sources,
 * six absent weekday templates, Nov 5 cancellations and Nov 20 clock.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},ctx=vm.createContext({window:win,Date,console:{
 debug(){},log(){},warn(){},error(){}
},_isTrainArtworkFailureActive(){return false}});
for(const file of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/jreast-oga-2611-number-index.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js',
 'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind('),
  end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start);
vm.runInContext(render.slice(start,end),ctx,{filename:'js/trains-render.js:marker'});
const src='odpt.Railway:JR-East.Oga',
 png='../images/列车/JR東日本/JR東日本_EV-E801系.png',
 out=['Oiwake','Detohama','Kamifutada','Futada','Tenno',
  'Funakoshi','Wakimoto','Hadachi','Oga'];
const unavailable=new Set(['1130M','1132M','1134M','1131M','1133M','1135M']);
const index=win.JREastOgaNumberIndex202611;
function holiday(date){
 const dow=new Date(date+'T12:00:00Z').getUTCDay();
 return dow===0||dow===6||date==='2026-11-03'||date==='2026-11-23';
}
function pos(number,direction,date='2026-11-07',cal=holiday(date)?'holiday':'weekday',extra={}){
 const original=direction==='Inbound'?[...out].reverse():[...out],
  missing=cal==='weekday'&&unavailable.has(number),
  proof=missing?null:{
    source:'sql-jreast-2611-number-roster',lineId:'Oga',
    trainNumber:number,serviceDate:date,
    direction:'odpt.RailDirection:'+direction,
    calendar:'odpt.Calendar:'+(cal==='holiday'?'SaturdayHoliday':'Weekday'),
    trainType:'odpt.TrainType:JR-East.Local',
    segmentKey:'oiwake_oga_regular_rail',calendarScope:'sql_rail_service',
    sourceTemplateId:420,sourceStopKeys:original.slice(),
    railwayFrom:original[0],railwayTo:original.at(-1),
    plannedCandidates:['EV-E801系'],model:'EV-E801系',
    pngReference:png,
    officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/259'+
      (direction==='Inbound'?'u':'d')+(cal==='holiday'?'2':'1')+'.html',
    excludedDates:unavailable.has(number)?['2026-11-05']:[],
    clockChangeDates:number==='1145M'?['2026-11-20']:[],
    stopClockStatus:'historical_not_2611_verified',
    referenceOnly:true,actualVehicleConfirmed:false
  };
 return {trainNumber:number,positionLineId:'Oga',displayLineId:'Oga',
  trainOperator:'JR-East',sourceRailway:src,
  railDirection:'odpt.RailDirection:'+direction,
  trainType:'odpt.TrainType:JR-East.Local',serviceDate:date,
  calendarType:cal,positionSource:'supabase-train-run',
  scheduledStopKeys:original,
  estimated:true,officialNumberVerified:true,
  plannedVehicleCandidates:['EV-E801系'],
  vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
  sqlPublishedNumberFleetReference:proof,...extra};
}
const permit=p=>win.TrainNumberPngRanges.verifyOgaService(p);
const image=p=>win.TrainVehicle.lookupTrainNumberRangePng(p);
test('29 published EV-E801 number references on BOTH weekdays and holidays',()=>{
 assert.equal(index.inbound.length,15);
 assert.equal(index.outbound.length,14);
 assert.equal(new Set([...index.inbound,...index.outbound]).size,29);
 assert.equal(win.VehicleGaragePngMap.matchModelPath('EV-E801系',png,'Oga'),true);
 assert.equal(fs.existsSync('images/列车/JR東日本/JR東日本_EV-E801系.png'),true);
 for(const [numbers,direction] of [[index.inbound,'Inbound'],[index.outbound,'Outbound']]){
  for(const number of numbers)for(const [day,cal] of
    [['2026-11-07','holiday'],['2026-11-06','weekday']]){
   const p=pos(number,direction,day,cal);
   assert.equal(index.verify(number,src,p.railDirection,p.trainType,cal,day).number,
     number);
   const missing=cal==='weekday'&&unavailable.has(number);
   if(missing){
    assert.equal(permit(p),null,'no weekday SQL '+number);
    assert.equal(image(p),null,'no phantom weekday SQL '+number);
   }else{
    assert.equal(permit(p)?.number,number,number+' '+day);
    assert.equal(image(p)?.model,'EV-E801系');
    assert.equal(image(p)?.pngPath,png);
    assert.equal(image(p)?.planned,true);
    assert.equal(ctx._trainMarkerSpec(p,'planned:'+number,'Oga').kind,'vehicle');
   }
   assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
 }
});
test('six Nov 5 cancellations and missing weekday SQL cannot mint icons',()=>{
 for(const [number,direction] of [
  ...['1130M','1132M','1134M'].map(n=>[n,'Inbound']),
  ...['1131M','1133M','1135M'].map(n=>[n,'Outbound'])
 ]){
  assert.equal(index.verify(number,src,direction,'Local','weekday','2026-11-05'),false);
  const p=pos(number,direction,'2026-11-05','weekday');
  assert.equal(image(p),null);
  assert.equal(ctx._trainMarkerSpec(p,'planned:'+number,'Oga').kind,'unresolved');
  assert.ok(index.verify(number,src,direction,'Local','holiday','2026-11-07'));
  assert.equal(image(pos(number,direction,'2026-11-07','holiday'))?.pngPath,png);
 }
 assert.equal(image(pos('1120M','Inbound','2026-11-05','weekday'))?.pngPath,png);
 assert.equal(image(pos('1123M','Outbound','2026-11-05','weekday'))?.pngPath,png);
});
test('1145M November 20 is a published number with modified clock, not legacy SQL position',()=>{
 const special=pos('1145M','Outbound','2026-11-20','weekday');
 assert.ok(index.verify('1145M',src,'Outbound','Local','weekday','2026-11-20'));
 assert.equal(permit(special),null);
 assert.equal(image(special),null);
 assert.equal(ctx._trainMarkerSpec(special,'planned:1145M','Oga').kind,'unresolved');
 assert.equal(image(pos('1145M','Outbound','2026-11-19','weekday'))?.pngPath,png);
 assert.equal(image(pos('1145M','Outbound','2026-11-21','holiday'))?.pngPath,png);
});
test('wrong weekdays, dates, station order, identity and source are rejected',()=>{
 const good=pos('1120M','Inbound','2026-11-06','weekday'),
  proof=good.sqlPublishedNumberFleetReference;
 for(const bad of [
  {trainNumber:'9135D'},{trainNumber:'9146D'},{trainNumber:'9134D'},
  {trainNumber:'9129D'},{trainNumber:'1121M'},
  {railDirection:'odpt.RailDirection:Outbound'},
  {sourceRailway:'odpt.Railway:JR-East.OuMain'},
  {positionLineId:'OuMain'},{displayLineId:'BanetsuEast'},
  {trainOperator:'JR-West'},{trainType:'odpt.TrainType:JR-East.Rapid'},
  {serviceDate:'2026-12-05'},{calendarType:'holiday'},
  {plannedVehicleCandidates:['701系']},{realtimeVehicleType:'701系'},
  {positionSource:'realtime-api'},{estimated:false},
  {officialNumberVerified:false},{vehicleIdentityStatus:'EXACT'},
  {scheduledStopKeys:out.slice()},
  {scheduledStopKeys:['Oga','Oiwake']},
  {sqlPublishedNumberFleetReference:null},
  {sqlPublishedNumberFleetReference:{...proof,calendarScope:'published_number_no_sql_source'}},
  {sqlPublishedNumberFleetReference:{...proof,model:'701系'}},
  {sqlPublishedNumberFleetReference:{...proof,sourceTemplateId:0}},
  {sqlPublishedNumberFleetReference:{...proof,sourceStopKeys:out.slice()}},
  {sqlPublishedNumberFleetReference:{...proof,referenceOnly:false}},
  {sqlPublishedNumberFleetReference:{...proof,pngReference:
     '../images/列车/JR東日本/JR東日本_EV-E301系.png'}}
 ]){
  assert.equal(image({...good,...bad}),null,'wrong Oga PNG '+JSON.stringify(bad));
 }
 assert.equal(index.verify('1120M',src,'Inbound','Local','holiday','2026-11-06'),false);
 assert.equal(index.verify('1120M',src,'Inbound','Local','weekday','2026-11-23'),false);
});
test('SQL source registry, server admission and diagram use one proof',()=>{
 const sql=fs.readFileSync('supabase/migrations/'+
  '20261106053000_oga_2611_exact_e801_sql_number_calendar_roster.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const est=fs.readFileSync('js/train-position-estimator.js','utf8');
 for(const k of ['published_oga_2611_number_roster',
  'published_number_no_sql_source','2026-11-05','2026-11-20',
  '1130M','1132M','1134M','1131M','1133M','1135M','1145M',
  'source_template_id','EV-E801系'])
  assert.ok(sql.includes(k),k);
 assert.ok(edge.includes('OGA_2611_NUMBER_SQL_ROSTER_UNAVAILABLE'));
 assert.ok(edge.includes('proof.calendar_scope!=="sql_rail_service"'));
 assert.ok(edge.includes('run.network_key!=="odpt.Railway:JR-East.Oga"'));
 assert.ok(est.includes('verifyOgaService'));
 assert.ok(est.includes('officialOgaPlan'));
 assert.ok(est.includes('var _ogaFleet='));
 assert.ok(est.includes('officialOfunatoPlan||officialOgaPlan'));
});
