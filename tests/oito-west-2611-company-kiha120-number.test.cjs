'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
const stations=['Minami-Otari','Nakatsuchi','Kita-Otari',
 'Hiraiwa','Kotaki','Nechi','Kubiki-Ono','Himekawa','Itoigawa'];
const d1=['423D','425D','427D','429D','431D','433D','437D'];
const u1=['422D','426D','428D','430D','432D','434D','438D'];
const win={},ctx=vm.createContext({window:win,Date,console});
for(const p of ['data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js'])
 vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:p});
function weekday(date){const d=new Date(date+'T12:00:00Z').getUTCDay();return d!==0&&d!==6&&!['2026-11-03','2026-11-23'].includes(date);}
function position(num,date='2026-11-06',change={}){
 const inbound=Number(num.match(/^\d+/)[0])%2===0;
 const order=inbound?['Kita-Otari','Nakatsuchi','Minami-Otari']:
   ['Minami-Otari','Nakatsuchi','Kita-Otari'];
 const proof={source:'sql-jrwest-2611-number-roster',
  lineId:'OitoWest',scope:'jr_west_minami_otari_itoigawa_partial',
  sourceScope:'historical_three_station_partial',
  trainNumber:num,serviceDate:date,
  calendar:'odpt.Calendar:'+(weekday(date)?'Weekday':'SaturdayHoliday'),
  direction:'odpt.RailDirection:'+(inbound?'Inbound':'Outbound'),
  trainType:'odpt.TrainType:JR-West.Local',
  sourceTemplateId:9764,sourceStopKeys:order.slice(),
  model:'キハ120形300番台（大糸線・岡山色）',pngReference:null,
  officialSourceUrl:'https://timetable.jr-odekake.net/line-timetable/'+
   (inbound?'2846':'2845'),
  excludedDates:['429D','430D'].includes(num)?['2026-11-08']:[],
  stopClockStatus:'historical_partial_not_2611_verified',
  referenceOnly:true,actualVehicleConfirmed:false};
 return {trainNumber:num,positionLineId:'OitoWest',displayLineId:'OitoWest',
  sourceRailway:'odpt.Railway:JR-West.Oito',trainOperator:'JR-West',
  railDirection:proof.direction,trainType:proof.trainType,
  calendarType:weekday(date)?'weekday':'holiday',serviceDate:date,
  positionSource:'supabase-train-run',estimated:true,
  officialNumberVerified:true,scheduledStopKeys:order,
  sqlPublishedNumberFleetReference:proof,...change};
}
const verify=p=>win.TrainNumberPngRanges.verifyOitoWestService(p);
test('OitoWest new JR-West company line and all nine stations, East separate',()=>{
 assert.equal(data.lines.OitoWest.operator,'JR-West');
 assert.equal(data.lines.Oito.operator,'JR-East');
 assert.equal(data.lines.OitoWest.presentation.operatorGroup,'JR_WEST');
 assert.deepEqual(Array.from(data.lines.OitoWest.stations),stations);
 assert.equal(data.lines.Oito.stations.at(-1),'Minami-Otari');
 assert.equal(data.lines.Oito.stations.includes('Kita-Otari'),false);
 assert.equal(data.stationLines['Minami-Otari'].includes('OitoWest'),true);
 assert.equal(data.stationLines['Minami-Otari'].includes('Oito'),true);
 assert.equal(data.stationLines.Itoigawa.includes('OitoWest'),true);
 for(const key of stations)assert.ok(data.stations[key]?.lat&&data.stations[key]?.lng,key);
 const i18n=JSON.parse(fs.readFileSync('data/core/station_i18n.compact.json','utf8'));
 for(const key of stations)assert.ok(i18n[key]?.ja,key);
});
test('14 partial SQL source trains verify JR-West operator and source only',()=>{
 for(const n of [...d1,...u1])for(const day of ['2026-11-06','2026-11-07']){
  const p=position(n,day),v=verify(p);
  assert.equal(v?.number,n,n+' '+day);
  assert.equal(v?.model,'キハ120形300番台（大糸線・岡山色）');
  assert.equal(v?.pngPath,null);
  assert.equal(v?.actualVehicleConfirmed,false);
  assert.equal(win.TrainNumberPngRanges.match(n,'OitoWest',p),null);
 }
});
test('Nov 8 published 429D/430D cancelled, other 4xxD not affected',()=>{
 assert.equal(verify(position('429D','2026-11-08')),null);
 assert.equal(verify(position('430D','2026-11-08')),null);
 assert.equal(verify(position('427D','2026-11-08'))?.number,'427D');
 assert.equal(verify(position('428D','2026-11-08'))?.number,'428D');
});
test('missing source numbers and bus/foreign train never manufacture PNG',()=>{
 for(const n of ['420D','421D','424D','435D','436D','7901','7902','7903','7904','7905','7906']){
  assert.equal(verify(position(n)),null,n);
  assert.equal(win.TrainNumberPngRanges.match(n,'OitoWest',position(n)),null,n);
 }
 const p=position('423D'),proof=p.sqlPublishedNumberFleetReference;
 for(const change of [
  {positionLineId:'Oito'},{displayLineId:'Oito'},
  {sourceRailway:'odpt.Railway:JR-East.Oito'},{trainOperator:'JR-East'},
  {positionSource:'realtime-api'},{calendarType:'holiday'},
  {serviceDate:'2026-10-31'},
  {scheduledStopKeys:['Minami-Otari','Kita-Otari']},
  {sqlPublishedNumberFleetReference:{...proof,pngReference:
     '../images/列车/JR西日本/JR西日本_120系_中国地区_CHA.png'}},
  {sqlPublishedNumberFleetReference:{...proof,sourceScope:'full'}},
  {sqlPublishedNumberFleetReference:{...proof,actualVehicleConfirmed:true}}
 ])assert.equal(verify({...p,...change}),null,JSON.stringify(change));
});
test('do not mislabel unrelated 120 color as Oito orange/red',()=>{
 const pngs=[
 '../images/列车/JR西日本/JR西日本_120系_中国地区_CHA.png',
 '../images/列车/JR西日本/JR西日本_120系_関西地区_KAN.png'
 ];
 for(const path of pngs)assert.equal(
  win.VehicleGaragePngMap.matchModelPath(
   'キハ120形300番台（大糸線・岡山色）',path,'OitoWest'),false);
});
test('migration and edge preserve east and exclude Oct-only buses',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261106083000_oito_west_2611_company_split_kiha120_exact_roster.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 for(const term of ['OitoWest','JR-West','7901','429D','430D',
   '2026-11-08','railway_lines','published_oito_west_2611_number_roster'])
  assert.ok(sql.includes(term),term);
 assert.ok(edge.includes('OITO_WEST_2611_NUMBER_ROSTER_UNAVAILABLE'));
 assert.ok(edge.includes('if(lineId==="OitoWest"'));
 assert.ok(edge.includes('p.png_reference!==null'));
});
