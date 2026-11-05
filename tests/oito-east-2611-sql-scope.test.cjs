'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},ctx=vm.createContext({window:win,Date,console});
for(const f of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js'])
 vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const map=win.TrainNumberPngRanges;
function position(n,model,date,kind,days){
 const inbound=Number(n.match(/^\d+/)[0])%2===0;
 const d=inbound?'Inbound':'Outbound';
 const dow=new Date(date+'T12:00:00Z').getUTCDay();
 const holiday=dow===0||dow===6||['2026-11-03','2026-11-23'].includes(date);
 const path=model==='E353系'?'../images/列车/JR東日本/JR東日本_E353系.png':
  model==='HB-E300系（リゾートビューふるさと）'?
  '../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png':
  model==='E127系100番台'?
  '../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png':
  '../images/列车/JR東日本/JR東日本_211系_長野色.png';
 const keys=inbound?['Hakuba','Shinano-Omachi','Hotaka','Matsumoto']:
   ['Matsumoto','Hotaka','Shinano-Omachi','Hakuba'];
 const type=kind==='resort_furusato'?'Rapid':
  kind==='hakuba_limited'||n==='38M'?'LimitedExpress':'Local';
 const proof={source:'sql-jreast-2611-number-roster',lineId:'Oito',
  scope:'jr_east_matsumoto_minami_otari',serviceKind:kind,
  trainNumber:n,serviceDate:date,direction:'odpt.RailDirection:'+d,
  calendar:'odpt.Calendar:'+(holiday?'SaturdayHoliday':'Weekday'),
  trainType:'odpt.TrainType:JR-East.'+type,sourceTemplateId:9740,
  sourceStopKeys:keys,railwayFrom:keys[0],railwayTo:keys.at(-1),
  model,pngReference:path,
  officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/230'+
  (inbound?'u':'d')+(holiday?'2':'1')+'.html',operatingDates:days,
  stopClockStatus:'historical_not_2611_verified',
  referenceOnly:true,actualVehicleConfirmed:false};
 return {trainNumber:n,positionLineId:'Oito',
  sourceRailway:'odpt.Railway:JR-East.Oito',trainOperator:'JR-East',
  railDirection:proof.direction,trainType:proof.trainType,
  calendarType:holiday?'holiday':'weekday',serviceDate:date,
  positionSource:'supabase-train-run',scheduledStopKeys:keys,
  sqlPublishedNumberFleetReference:proof};
}
const verify=p=>map.verifyOitoEastService(p);
test('JR East only source proof and dedicated family gallery',()=>{
 for(const model of ['211系（長野地区）','E127系100番台','E353系',
 'HB-E300系（リゾートビューふるさと）'])
  assert.ok(win.VehicleGaragePngMap.lineModels('Oito').includes(model));
 assert.equal(verify(position('422D','211系（長野地区）',
  '2026-11-06','regular',[])),null);
 const p=position('5234M','E127系100番台','2026-11-06','regular',[]);
 assert.equal(verify(p)?.model,'E127系100番台');
 assert.equal(verify({...p,sourceRailway:'odpt.Railway:JR-West.Oito'}),null);
});
test('Hakuba date and future-only 9095M',()=>{
 const dates=['2026-11-01','2026-11-21','2026-11-22','2026-11-23'];
 assert.equal(verify(position('8042M','E353系','2026-11-22',
  'hakuba_limited',dates))?.model,'E353系');
 assert.equal(verify(position('8042M','E353系','2026-11-07',
  'hakuba_limited',dates)),null);
 assert.equal(verify(position('9095M','E353系','2026-11-06',
  'december_only',[])),null);
});
