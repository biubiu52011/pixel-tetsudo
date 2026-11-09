'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const railway=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const compact=fs.readFileSync('data/core/railway_data.compact.json','utf8');
const bundled=fs.readFileSync('data/core/railway-data.file.js','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const first=edge.indexOf('  // JR-West 2026-11-28: both 2779M and 2783M');
const last=edge.indexOf('  // Incomplete source rows are preserved in SQL for auditing',first);
assert.ok(first>=0&&last>first,'scoped disruption block exists');
const snippet=edge.slice(first,last).replaceAll('(r:any)','(r)')
  .replaceAll('(st:any,i:number)','(st,i)');
const apply=vm.runInNewContext(
  '(function(result,selectedCalendar,serviceDate,lineId){'+snippet+'})');
const stops=['Osaka','Amagasaki','Itami','Kawanishi-Ikeda',
 'Nakayama-Tera','Takarazuka','Nishinomiya-Najio',
 'Sanda-Hyogo','Shinmita','Hirono-Hyogo','Sou-No','Ranpon',
 'Kusano-Hyogo','Furuichi','Minami-Yashiro','Shinoyamaguchi'];
const cases=[
 {id:68185,num:'2779MH',start:'22:33',at:'23:16',depart:'23:17',last:'23:41'},
 {id:68195,num:'2783MH',start:'23:31',at:'00:15',depart:'00:15',last:'00:40'}
];
const SAT='odpt.Calendar:SaturdayHoliday';
function run(spec){
 const chain=stops.map((name,i)=>({
   station_key:name,station_urn:'odpt.Station:JR-West.Fukuchiyama.'+name,
   arrival_time:i===8?spec.at:i===15?spec.last:'12:00',
   departure_time:i===0?spec.start:i===8?spec.depart:'12:01'
 }));
 return {source_template_id:spec.id,train_number:spec.num,
   network_key:'odpt.Railway:JR-West.Fukuchiyama',
   rail_direction:'odpt.RailDirection:Outbound',
   train_type:'odpt.TrainType:JR-West.Rapid',
   destination_station:chain.at(-1).station_urn,
   timetable_date_verified:false,vehicle_plan_confirmed:false,
   vehicle_artwork_path:null,stops:chain};
}
test('Fukuchiyama G line yellow agrees in source, UI and generated bundles',()=>{
 const g=railway.lines.Fukuchiyama;
 assert.equal(g.color,'#fcc800');
 assert.equal(g.presentation.color,'#fcc800');
 assert.equal(g.presentation.code,'G');
 assert.equal(g.stations.length,31);
 const generated=JSON.stringify(railway);
 assert.equal(compact,generated+'\n');
 assert.equal(bundled,'window.RAILWAY_DATA = '+
   generated.replace(/<\/script/gi,'<\\/script')+';\n');
});
test('Nov 28 2779M and overnight 2783M end at Shinmita, never continue into bus leg',()=>{
 const result=cases.map(run);
 apply(result,SAT,'2026-11-28','Fukuchiyama');
 for(const r of result){
   assert.equal(r.stops.length,9);
   assert.equal(r.stops.at(-1).station_key,'Shinmita');
   assert.equal(r.stops.at(-1).departure_time,null);
   assert.equal(r.destination_station,r.stops.at(-1).station_urn);
   assert.equal(r.timetable_validity,'partial_service_disruption');
   assert.match(r.train_number_source_url,/timetable\.jr-odekake\.net/);
   assert.equal(r.vehicle_plan_confirmed,false);
   assert.equal(r.timetable_date_verified,false);
 }
 assert.equal(result[1].stops.at(-1).arrival_time,'00:15');
});
test('other service dates and other lines leave historical schedules unaltered',()=>{
 for(const date of ['2026-11-27','2026-11-29','2026-12-05']){
   const result=cases.map(run);
   apply(result,SAT,date,'Fukuchiyama');
   result.forEach(r=>{
     assert.equal(r.stops.length,16);
     assert.equal(r.destination_station,r.stops[15].station_urn);
   });
 }
 const result=cases.map(run);
 apply(result,SAT,'2026-11-28','JRTozai');
 assert.equal(result[0].stops.length,16);
});
test('Nov 28 requires correct source, service calendar and departure clock',()=>{
 const wrongCalendar=cases.map(run);
 assert.throws(()=>apply(wrongCalendar,'odpt.Calendar:Weekday',
   '2026-11-28','Fukuchiyama'),/PARTIAL_OPERATION_CONFLICT/);
 const wrongSource=cases.map(run);
 wrongSource[1].source_template_id=42;
 assert.throws(()=>apply(wrongSource,SAT,'2026-11-28','Fukuchiyama'),
   /2783M_1128_PARTIAL_OPERATION_CONFLICT/);
 const wrongClock=cases.map(run);
 wrongClock[1].stops[8].arrival_time='00:16';
 assert.throws(()=>apply(wrongClock,SAT,'2026-11-28','Fukuchiyama'),
   /2783M_1128_PARTIAL_OPERATION_CONFLICT/);
});


test('Fukuchiyama official status URL is labeled as external and does not fabricate a live state',()=>{
 const page=fs.readFileSync('pages/trains.html','utf8');
 const controller=fs.readFileSync('js/trains-page.js','utf8');
 assert.match(page,/id="trainsOfficialRuninfo"/);
 assert.match(controller,/lineId !== "Fukuchiyama"/);
 assert.match(controller,/https:\/\/trafficinfo\.westjr\.co\.jp\/kinki\.html/);
 assert.match(controller,/updateOfficialRuninfoSource\(lineId\)/);
 assert.match(controller,/updateOfficialRuninfoSource\(null\)/);
 assert.match(controller,/本站尚未取得可验证的本线路实时运行状况/);
});
