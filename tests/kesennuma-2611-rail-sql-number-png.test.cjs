'use strict';
/* JR East 2611 Kesennuma. Source SQL has both rail D numbers and
 * BRT K numbers, but TRAIN positions/PNG are authorized only by
 * dated official RAIL roster and maintenance-day checks.
 * Neither fleet family artwork nor station clocks establish actual carset.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:root,Date,console:quiet});
for(const file of ['data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
 vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const png='../images/列车/JR東日本/JR東日本_キハ110系.png';
const down=['921D','923D','925D','2927D','929D',
 '2931D','933D','935D','2937D'];
const up=['922D','924D','2926D','928D','2930D',
 '932D','934D','2936D','2938D'];
const rail=['Maeyachi','Wabuchi','Nonodake',
 'Rikuzen-Toyosato','Mitakedo','Yanagitsu'];
const maintenance=new Set(['2927D','2930D','928D','929D']);
function isHoliday(date) {
 const dow=new Date(date+'T12:00:00Z').getUTCDay();
 return dow===0||dow===6||date==='2026-11-03'||date==='2026-11-23';
}
function make(n,date='2026-11-07',extra={}){
 const direction=down.includes(n)?'Outbound':'Inbound',
  route=direction==='Outbound'?rail:rail.slice().reverse();
 const p={source:'sql-jreast-2611-number-roster',
   lineId:'Kesennuma',trainNumber:n,serviceDate:date,
   calendar:'odpt.Calendar:'+(isHoliday(date)?'SaturdayHoliday':'Weekday'),
   direction:'odpt.RailDirection:'+direction,
   trainType:'odpt.TrainType:JR-East.Local',
   model:'キハ110系',pngReference:png,
   segmentKey:'maeyachi_yanagitsu_rail',
   routeFrom:route[0],routeTo:route.at(-1),
   officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/267'+
     (direction==='Outbound'?'d':'u')+(isHoliday(date)?'2':'1')+'.html',
   vehicleSourceUrl:'https://www.jreast.co.jp/train/local/kiha110.html',
   transportMode:'rail',excludedTransportMode:'BRT',
   stopClockStatus:'official_2611_origin_departure_only',
   referenceOnly:true,actualVehicleConfirmed:false};
 return {trainNumber:n,positionLineId:'Kesennuma',
   displayLineId:'Kesennuma',
   sourceRailway:'odpt.Railway:JR-East.Kesennuma',
   trainOperator:'JR-East',
   trainType:'odpt.TrainType:JR-East.Local',
   railDirection:'odpt.RailDirection:'+direction,
   calendarType:isHoliday(date)?'holiday':'weekday',
   serviceDate:date,scheduledStopKeys:route,
   estimated:true,positionSource:'supabase-train-run',
   officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
   vehicleResolvedUpstream:false,plannedVehicleCandidates:['キハ110系'],
   vehiclePlan:{status:'PLANNED_MODEL',models:['キハ110系'],
      confirmed:false,referenceOnly:true},
   sqlPublishedNumberFleetReference:p,...extra};
}
const verify=x=>root.TrainNumberPngRanges.verifyKesennumaRailService(x);
const match=x=>root.TrainVehicle.lookupTrainNumberRangePng(x);
const art=x=>root.TrainVehicle.selectMarkerArtwork(x,false);
test('all 18 exact rail D numbers, both directions, match only KiHa110 family',()=>{
 for(const number of [...down,...up]){
   for(const day of ['2026-11-07','2026-11-09']){
     const p=make(number,day),plan=verify(p);
     assert.equal(plan?.number,number);
     assert.equal(plan?.trainType,'Local');
     assert.equal(plan?.actualVehicleConfirmed,false);
     assert.equal(match(p)?.pngPath,png,number);
     assert.equal(art(p).kind,'vehicle',number);
     assert.equal(art(p).iconSrc,png,number);
     assert.equal(art(p).planned,true,number);
     assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
   }
 }
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハ110系',png,'Kesennuma'),true);
});
test('official Nov 4-6 maintenance excludes precisely four rail segments, no bus replacement',()=>{
 for(const d of ['2026-11-04','2026-11-05','2026-11-06']){
   for(const n of maintenance){
     const p=make(n,d);
     assert.equal(verify(p),null,n+' '+d);
     assert.equal(match(p),null,n+' '+d);
     assert.equal(art(p).kind,'unresolved',n+' '+d);
   }
   for(const n of ['921D','922D','925D','924D','2931D','932D']){
     const p=make(n,d);
     assert.equal(verify(p)?.number,n,n+' '+d);
     assert.equal(match(p)?.pngPath,png,n);
   }
 }
});
test('BRT K numbers, wrong rail stations/source/month/model never receive KiHa PNG',()=>{
 const valid=make('929D','2026-11-07');
 for(const n of ['1901K','1902K','3904K','5919K','5923K',
  '5934K','7942K','7950K','9931D','922K']){
   const p=make(n,'2026-11-07');
   assert.equal(verify(p),null,n);
   assert.equal(match(p),null,n);
 }
 for(const patch of [
   {sourceRailway:'odpt.Railway:JR-East.Ishinomaki'},
   {trainOperator:'JR-West'},
   {displayLineId:'KesennumaBRT'},
   {calendarType:'weekday'},
   {railDirection:'odpt.RailDirection:Inbound'},
   {trainType:'odpt.TrainType:JR-East.Rapid'},
   {serviceDate:'2026-12-07'},
   {scheduledStopKeys:['Yanagitsu','Shizugawa','Kesennuma']},
   {scheduledStopKeys:['Maeyachi','Wabuchi','Yanagitsu']},
   {scheduledStopKeys:['Yanagitsu','Wabuchi','Nonodake',
       'Rikuzen-Toyosato','Mitakedo','Maeyachi']},
   {vehiclePlan:{models:['キハ100系']}},
   {plannedVehicleCandidates:['キハ100系']},
   {realtimeVehicleType:'キハ100系'},
   {officialNumberVerified:false},
   {sqlPublishedNumberFleetReference:null},
   {sqlPublishedNumberFleetReference:{
     ...valid.sqlPublishedNumberFleetReference,transportMode:'BRT'}},
   {sqlPublishedNumberFleetReference:{
     ...valid.sqlPublishedNumberFleetReference,referenceOnly:false}}
 ]){
   const p={...valid,...patch};
   if(!('vehiclePlan' in patch)&&!('plannedVehicleCandidates' in patch)
     &&!('realtimeVehicleType' in patch)&&!('officialNumberVerified' in patch))
      assert.equal(verify(p),null,JSON.stringify(patch));
   assert.equal(match(p),null,JSON.stringify(patch));
 }
});
test('migration and Edge keep BRT source separate; do not erase old K schedules',()=>{
 const names=fs.readdirSync('supabase/migrations')
    .filter(n=>n.includes('kesennuma_2611_'));
 assert.ok(names.length>=1);
 const sql=names.map(f=>fs.readFileSync('supabase/migrations/'+f,'utf8')).join('\n');
 for(const term of ['published_kesennuma_2611_rail_roster',
  'published_kesennuma_2611_rail_interruptions',
  'published_train_png_number_ranges','2927D','2930D','928D',
  '929D','2026-11-04','2026-11-05','2026-11-06','BRT','Yanagitsu'])
  assert.ok(sql.includes(term),term);
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 assert.ok(edge.includes('if(lineId==="Kesennuma"'));
 assert.ok(edge.includes('run.network_key!=="odpt.Railway:JR-East.Kesennuma"'));
 assert.ok(edge.includes('KESENNUMA_2611_OFFICIAL_RAIL_ROSTER_UNAVAILABLE'));
 assert.ok(edge.includes('lineId:"Kesennuma"'));
});
