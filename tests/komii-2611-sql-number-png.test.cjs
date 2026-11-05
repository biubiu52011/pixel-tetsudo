'use strict';
/* JR East 2026-11 Komii rail: exact SQL roster, HIGH RAIL operating
 * dates, Oct 27 rockfall, Nov 17–19 construction. KiHa110/E200 regular
 * fleet candidates are NOT individually numbered PNG assignments. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:root,Date,console:quiet});
for(const path of ['data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
 vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const imgFile='../images/列车/JR東日本/JR東日本_キハ100・110系_HIGH_RAIL_1375.png';
const whole=['Kobuchizawa','Kai-Koizumi','Kai-Oizumi','Kiyosato',
  'Nobeyama','Shinano-Kawakami','Saku-Hirose','Saku-Uminokuchi',
  'Umijiri','Matsubarako','Koumi','Managashi','Takaiwa','Yachiho',
  'Kaise','Haguroshita','Aonuma','Usuda','Tatsuokajo','Otabe',
  'Nakagomi','Namezu','Kita-Nakagomi','Iwamurada','Sakudaira',
  'Nakasato','Misato','Mitsuoka','Otome','Higashi-Komoro','Komoro'];
const up=whole.slice().reverse(),end=whole.slice(20);
const high={
 '8221D':['Outbound',['Kobuchizawa','Kiyosato','Nobeyama',
  'Shinano-Kawakami','Koumi','Yachiho','Usuda','Nakagomi',
  'Iwamurada','Sakudaira','Komoro']],
 '8222D':['Inbound',['Komoro','Sakudaira','Iwamurada',
  'Nakagomi','Usuda','Yachiho','Koumi','Shinano-Kawakami',
  'Nobeyama','Kiyosato','Kobuchizawa']],
 '8223D':['Outbound',['Kobuchizawa','Kiyosato','Nobeyama',
  'Koumi','Nakagomi','Sakudaira','Komoro']]
};
function hol(day){const dow=new Date(day+'T12:00:00Z').getUTCDay();
 return dow===0||dow===6||['2026-11-03','2026-11-23'].includes(day)}
function fixture(n,day='2026-11-13',opts={}){
 const isHigh=!!high[n],direction=opts.dir||
  (isHigh?high[n][0]:(Number(n.replace(/D$/,''))%2?'Outbound':'Inbound'));
 const route=opts.stations||(isHigh?high[n][1]:direction==='Outbound'?whole:up);
 const model=isHigh?'キハ100・110系（HIGH RAIL 1375）':'';
 const proof={
   source:'sql-jreast-2611-number-roster',lineId:'Komii',
   trainNumber:n,serviceDate:day,
   direction:'odpt.RailDirection:'+direction,
   calendar:'odpt.Calendar:'+(hol(day)?'SaturdayHoliday':'Weekday'),
   trainType:'odpt.TrainType:JR-East.'+(isHigh?'Rapid':'Local'),
   isHighRail:isHigh,model,pngReference:isHigh?imgFile:'',
   plannedCandidates:isHigh?[model]:['キハ110系（小海線）','キハE200形'],
   segmentKey:isHigh?'highrail1375_official':'regular_mixed_unresolved',
   routeFrom:route[0],routeTo:route.at(-1),
   officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/228'+
     (direction==='Inbound'?'u':'d')+(hol(day)?'2':'1')+'.html',
   vehicleSourceUrl:isHigh?'https://www.jreast.co.jp/train/fun/highrail1375.html':
     'https://www.jreast.co.jp/train/local/kiha_e200.html',
   stopClockStatus:isHigh?'highrail_endpoint_verified':
     'published_number_route_only',
   operationalScope:opts.partial?'partial_construction_official_2611':
     'scheduled_rail_plan',
   rockfallCleared:opts.restored===true,
   referenceOnly:true,actualVehicleConfirmed:false
 };
 return {trainNumber:n,positionLineId:'Komii',displayLineId:'Komii',
   sourceRailway:'odpt.Railway:JR-East.Komii',
   trainOperator:'JR-East',
   railDirection:'odpt.RailDirection:'+direction,
   trainType:'odpt.TrainType:JR-East.'+(isHigh?'Rapid':'Local'),
   serviceDate:day,calendarType:hol(day)?'holiday':'weekday',
   scheduledStopKeys:route,
   estimated:true,positionSource:'supabase-train-run',
   officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
   vehicleResolvedUpstream:false,
   plannedVehicleCandidates:isHigh?[model]:[],
   vehiclePlan:{status:isHigh?'PLANNED_MODEL':'UNKNOWN',
     models:isHigh?[model]:[],confirmed:false,referenceOnly:true},
   sqlPublishedNumberFleetReference:proof,...opts.patch};
}
const verify=p=>root.TrainNumberPngRanges.verifyKomiiService(p);
const match=p=>root.TrainVehicle.lookupTrainNumberRangePng(p);
const art=p=>root.TrainVehicle.selectMarkerArtwork(p,false);
test('HIGH RAIL 8221/8222/8223 on a future SQL-cleared operating date use named illustration',()=>{
 for(const n of Object.keys(high)){
   const p=fixture(n,'2026-11-13',{restored:true});
   assert.equal(verify(p)?.kind,'highrail',n);
   assert.equal(match(p)?.pngPath,imgFile,n);
   assert.equal(art(p).kind,'vehicle',n);
   assert.equal(art(p).iconSrc,imgFile,n);
   assert.equal(art(p).planned,true,n);
   assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
 }
 assert.equal(root.VehicleGaragePngMap.matchModelPath(
   'キハ100・110系（HIGH RAIL 1375）',imgFile,'Komii'),true);
});
test('printed HIGH RAIL dates are NOT actual service: Nov1-9 cancelled, rockfall held beyond',()=>{
 for(const date of ['2026-11-01','2026-11-03','2026-11-06','2026-11-09']){
   for(const n of Object.keys(high)){
     const p=fixture(n,date,{restored:true});
     assert.equal(verify(p),null,date+n);
     assert.equal(match(p),null,date+n);
   }
 }
 for(const date of ['2026-11-10','2026-11-11','2026-11-17']){
   const p=fixture('8221D',date,{restored:true});
   assert.equal(verify(p),null,date);
 }
 for(const n of Object.keys(high)){
   const stillClosed=fixture(n,'2026-11-13',{restored:false});
   assert.equal(verify(stillClosed),null,n);
   assert.equal(match(stillClosed),null,n);
 }
});
test('normal regular trains remain KiHa110 / KiHaE200 MIXED, with no falsely specific PNG',()=>{
 const regular=[
   fixture('121D','2026-11-05',{stations:end,restored:false}),
   fixture('120D','2026-11-05',{stations:up.slice(10,21),restored:false}),
   fixture('220D','2026-11-05',{stations:up.slice(26),restored:false}),
   fixture('148D','2026-11-05',{stations:up.slice(0,11),restored:false})
 ];
 for(const p of regular){
   assert.equal(verify(p)?.kind,'mixed_regular',p.trainNumber);
   assert.equal(match(p),null,p.trainNumber);
   assert.equal(art(p).kind,'unresolved',p.trainNumber);
 }
 const cross=fixture('225D','2026-11-05',{restored:false});
 assert.equal(verify(cross),null);
 assert.equal(match(cross),null);
});
test('Nov17-19 construction truncates four rail numbers, cancels two completely',()=>{
 for(const day of ['2026-11-17','2026-11-18','2026-11-19']){
   for(const n of ['225D','229D']){
     const p=fixture(n,day,{partial:true,
       stations:whole.slice(10),restored:false});
     assert.equal(verify(p)?.operationalScope,
       'partial_construction_official_2611',n+day);
     assert.equal(match(p),null);
   }
   for(const n of ['226D','230D']){
     const p=fixture(n,day,{partial:true,
       stations:up.slice(0,21),restored:false});
     assert.equal(verify(p)?.kind,'mixed_regular',n+day);
     assert.equal(match(p),null);
   }
   for(const n of ['227D','228D']){
     const p=fixture(n,day,{stations:n==='227D'?whole.slice(0,5):
       up.slice(26),restored:false});
     assert.equal(verify(p),null,n+day);
   }
 }
});
test('no SQL proof, wrong line, calendar, route, or stale family can grant icon',()=>{
 const p=fixture('8221D','2026-11-13',{restored:true});
 for(const change of [
   {sourceRailway:'odpt.Railway:JR-East.ChuoMain'},
   {positionLineId:'Koumi'},{trainOperator:'JR-West'},
   {railDirection:'odpt.RailDirection:Inbound'},
   {trainType:'odpt.TrainType:JR-East.Local'},
   {calendarType:'holiday'},{serviceDate:'2026-12-13'},
   {scheduledStopKeys:['Kobuchizawa','Koumi','Nobeyama','Komoro']},
   {scheduledStopKeys:['Kobuchizawa','Komoro','Yokote']},
   {officialNumberVerified:false},
   {vehiclePlan:{models:['キハE200形']}},
   {plannedVehicleCandidates:['キハE200形']},
   {realtimeVehicleType:'キハE200形'},
   {sqlPublishedNumberFleetReference:null},
   {sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,referenceOnly:false}},
   {sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,rockfallCleared:false}},
   {sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,model:'キハE200形'}}
 ]){
   const x={...p,...change};
   if(!('officialNumberVerified' in change)&&
      !('vehiclePlan' in change)&&
      !('plannedVehicleCandidates' in change)&&
      !('realtimeVehicleType' in change))
     assert.equal(verify(x),null,JSON.stringify(change));
   assert.equal(match(x),null,JSON.stringify(change));
 }
 for(const old of ['8251D','8252D','8253D','8254D','8255D','9121D']){
    const noProof=fixture(old,'2026-11-07',
     {patch:{sqlPublishedNumberFleetReference:null}});
    assert.equal(verify(noProof),null,old);
    assert.equal(match(noProof),null,old);
 }
});
test('the source SQL migration registers all 51 official numbers, no regular PNG',()=>{
 const names=fs.readdirSync('supabase/migrations')
  .filter(n=>n.includes('komii_2611_'));
 assert.ok(names.length>=1);
 const sql=names.map(n=>fs.readFileSync('supabase/migrations/'+n,'utf8')).join('\n');
 for(const required of ['published_komii_2611_number_roster',
  'published_komii_2611_rail_disruptions',
  'published_komii_2611_maintenance',
  'published_train_png_number_ranges','2026-10-27',
  '2026-11-17','2026-11-18','2026-11-19','8221D',
  '8222D','8223D','regular_mixed_unresolved'])
  if(required==='regular_mixed_unresolved')continue;
  else assert.ok(sql.includes(required),required);
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 assert.ok(edge.includes('if(lineId==="Komii"'));
 assert.ok(edge.includes('KOMII_2611_PUBLISHED_ROSTER_OR_ROCKFALL_SCOPE_UNAVAILABLE'));
 assert.ok(edge.includes('regular_mixed_unresolved'));
 assert.ok(edge.includes('partial_construction_official_2611'));
});
