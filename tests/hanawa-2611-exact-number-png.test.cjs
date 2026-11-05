'use strict';
// Hanawa (app Kounan) 2026-11: date-scoped JR train numbers and illustration PNG.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},ctx=vm.createContext({window:win,Date,console});
vm.runInContext(fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8'),ctx);
const api=win.TrainNumberPngRanges;
const generic='../images/列车/JR東日本/JR東日本_キハ110系.png';
const hinabi='../images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png';
const outbound=['921D','1923D','1925D','929D','9921D','1927D','1931D',
  '933D','1935D','1937D','1939D'];
const inbound=['1922D','1924D','1926D','928D','1930D','1932D','1934D',
  '9922D','9934D','936D','1938D','1940D','942D'];
const maintenance=['928D','929D','1927D','1930D','1931D','1932D','1934D'];
function calendar(d){
 const day=new Date(d+'T12:00:00Z').getUTCDay();
 return day===0||day===6||['2026-11-03','2026-11-23'].includes(d)
   ?'holiday':'weekday';
}
function pos(n,date='2026-11-06',change={}){
 const down=outbound.includes(n),dir=down?'Outbound':'Inbound';
 const special=n==='9921D'||n==='9922D',extra=n==='9934D';
 const family=special?'HB-E300系（ひなび）':'キハ110系',
  png=special?hinabi:generic,cal=calendar(date);
 const source='https://timetables.jreast.co.jp/2611/timetable-v/274'+
   (down?'d':'u')+(cal==='weekday'?'1':'2')+'.html';
 return {trainNumber:n,positionLineId:'Kounan',
  sourceRailway:'odpt.Railway:JR-East.Kounan',
  trainOperator:'JR-East',railDirection:'odpt.RailDirection:'+dir,
  trainType:'odpt.TrainType:JR-East.'+(special?'Rapid':'Local'),
  calendarType:cal,serviceDate:date,positionSource:'supabase-train-run',
  estimated:true,officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
  vehiclePlan:{models:[family],status:'PLANNED_MODEL',confirmed:false},
  plannedVehicleCandidates:[family],
  scheduledStopKeys:down?['Higashi-Obuke','Odate']:['Odate','Higashi-Obuke'],
  sqlPublishedNumberFleetReference:{
   source:'sql-jreast-2611-number-roster',lineId:'Kounan',
   trainNumber:n,serviceDate:date,
   direction:'odpt.RailDirection:'+dir,
   calendar:'odpt.Calendar:'+(cal==='holiday'?'SaturdayHoliday':'Weekday'),
   trainType:'odpt.TrainType:JR-East.'+(special?'Rapid':'Local'),
   segmentKey:special?'hinabi':extra?'maintenance':'regular',
   model:family,pngReference:png,officialSourceUrl:source,
   stopClockStatus:'historical_source_clocks_not_2611_verified',
   referenceOnly:true,actualVehicleConfirmed:false
  },...change};
}
const match=p=>api.match(p.trainNumber,'Kounan',p);
test('21 exact published locals across holiday and weekday use KiHa110 reference',()=>{
 const numbers=[...outbound,...inbound]
   .filter(n=>!['9921D','9922D','9934D'].includes(n));
 assert.equal(numbers.length,21);
 for(const date of ['2026-11-06','2026-11-08']){
  for(const n of numbers){
   const p=pos(n,date);
   assert.equal(api.verifyHanawaService(p)?.model,'キハ110系',n+' '+date);
   assert.equal(match(p)?.pngPath,generic,n+' '+date);
   assert.equal(match(p)?.representative,true);
   assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
 }
});
test('9921D and 9922D belong only to Hinabi Hachimantai on Nov 27-30',()=>{
 for(const n of ['9921D','9922D']){
  for(const day of ['2026-11-27','2026-11-28','2026-11-29','2026-11-30']){
   const p=pos(n,day);
   assert.equal(api.verifyHanawaService(p)?.kind,'hinabi');
   assert.equal(match(p)?.pngPath,hinabi,n+' '+day);
  }
  for(const day of ['2026-11-05','2026-11-26','2026-11-07']){
   const p=pos(n,day);
   assert.equal(api.verifyHanawaService(p),null,n+' '+day);
   assert.equal(match(p),null,n+' '+day);
  }
 }
});
test('maintenance Nov 4/5: seven locals absent, 9934D replacement only',()=>{
 for(const date of ['2026-11-04','2026-11-05']){
  for(const n of maintenance){
   const p=pos(n,date);
   assert.equal(api.verifyHanawaService(p),null,n+' '+date);
   assert.equal(match(p),null,n+' '+date);
  }
  const special=pos('9934D',date);
  assert.equal(match(special)?.pngPath,generic,date);
  assert.equal(api.verifyHanawaService(special)?.kind,'maintenance');
  assert.equal(match(pos('936D',date))?.pngPath,generic);
 }
 for(const d of ['2026-11-03','2026-11-06','2026-11-07','2026-11-30'])
  assert.equal(match(pos('9934D',d)),null,d);
});
test('wrong route, calendar, source proof or identity cannot authorize artwork',()=>{
 const good=pos('1923D','2026-11-06');
 const bad=[
  {sourceRailway:'odpt.Railway:JR-East.Kitakami'},
  {positionLineId:'Hanawa'},
  {trainOperator:'JR-West'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {trainType:'odpt.TrainType:JR-East.Rapid'},
  {calendarType:'holiday'},
  {serviceDate:'2026-12-06'},
  {scheduledStopKeys:['Odate','Yokote']},
  {vehicleIdentityStatus:'EXACT'},
  {officialNumberVerified:false},
  {positionSource:'odpt-realtime'},
  {vehiclePlan:{models:['キハE130系']}},
  {realtimeVehicleType:'キハE130系'},
  {sqlPublishedNumberFleetReference:null},
  {sqlPublishedNumberFleetReference:{
    ...good.sqlPublishedNumberFleetReference,actualVehicleConfirmed:true}}
 ];
 for(const x of bad)assert.equal(match({...good,...x}),null,JSON.stringify(x));
});
test('migration, runtime and artwork assets all exist in the established path',()=>{
 const sql=fs.readFileSync('supabase/migrations/'+
   '20261105173000_hanawa_2611_exact_number_hinabi_vehicle_schedule.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 for(const term of ['published_hanawa_2611_number_roster','published_train_png_number_ranges',
  'published_train_number_evidence','9921D','9922D','9934D',
  '2026-11-27','2026-11-30','2026-11-04','2026-11-05'])
  assert.ok(sql.includes(term),'missing SQL '+term);
 assert.ok(edge.includes('HANAWA_2611_OFFICIAL_NUMBER_ROSTER_UNAVAILABLE'));
 assert.ok(edge.includes('run.network_key!=="odpt.Railway:JR-East.Kounan"'));
 assert.ok(estimator.includes('officialHanawaPlan'));
 assert.ok(fs.existsSync('images/列车/JR東日本/JR東日本_キハ110系.png'));
 assert.ok(fs.existsSync('images/列车/JR東日本/JR東日本_HB-E300系_ひなび_陽旅.png'));
});
