'use strict';
/* 奥羽本線 2026-11: six official E751 Tsugaru/Super Tsugaru M numbers,
 * two service calendars, exact historical SQL source stops and no carset ID.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},ctx=vm.createContext({window:win,Date,console:{
 debug(){},log(){},warn(){},error(){}
},_isTrainArtworkFailureActive(){return false}});
for(const file of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js',
 'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const a=render.indexOf('  function _trainMarkerDomKind('),
 b=render.indexOf('  // Public identification boundary:',a);
assert.ok(a>=0&&b>a);
vm.runInContext(render.slice(a,b),ctx);
const png='../images/列车/JR東日本/JR東日本_E751系.png';
const downSuper=['Akita','Higashi-Noshiro','Higashi-Noshiro',
 'Takanosu','Takanosu','Odate','Odate','Owani-Onsen','Owani-Onsen',
 'Hirosaki','Hirosaki','Shin-Aomori','Shin-Aomori','Aomori'];
const downOrdinary=['Akita','Hachirogata','Moritake','Higashi-Noshiro',
 'Higashi-Noshiro','Futatsui','Takanosu','Takanosu','Odate','Odate',
 'Owani-Onsen','Owani-Onsen','Hirosaki','Hirosaki','Namioka',
 'Shin-Aomori','Shin-Aomori','Aomori'];
const names={
 '2021M':'スーパーつがる1号','2022M':'スーパーつがる2号',
 '2041M':'つがる41号','2042M':'つがる42号',
 '2043M':'つがる43号','2044M':'つがる44号'
};
function pos(number,day='2026-11-06',extras={}){
 const weekday=day==='2026-11-06',cal=weekday?'weekday':'holiday',
   direction=parseInt(number,10)%2===0?'Inbound':'Outbound',
   inbound=direction==='Inbound',
   basic=number.startsWith('202')?downSuper:downOrdinary,
   stops=inbound?[...basic].reverse():basic.slice();
 const proof={
  source:'sql-jreast-2611-number-roster',lineId:'OuMain',
  segmentKey:'akita_aomori_tsugaru_e751',
  trainNumber:number,serviceDate:day,
  calendar:'odpt.Calendar:'+(weekday?'Weekday':'SaturdayHoliday'),
  direction:'odpt.RailDirection:'+direction,
  trainType:'odpt.TrainType:JR-East.LimitedExpress',
  serviceName:names[number],sourceTemplateId:70035,
  sourceStopKeys:stops.slice(),plannedCandidates:['E751系'],
  model:'E751系',pngReference:png,
  officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/258'+
   (inbound?'u':'d')+(weekday?'1':'2')+'.html',
  stopClockStatus:'historical_not_2611_verified',
  referenceOnly:true,actualVehicleConfirmed:false
 };
 return {
  trainNumber:number,positionLineId:'OuMain',displayLineId:'OuMain',
  sourceRailway:'odpt.Railway:JR-East.OuMain',trainOperator:'JR-East',
  railDirection:'odpt.RailDirection:'+direction,
  trainType:'odpt.TrainType:JR-East.LimitedExpress',
  calendarType:cal,serviceDate:day,
  positionSource:'supabase-train-run',estimated:true,
  vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
  officialNumberVerified:true,plannedVehicleCandidates:['E751系'],
  scheduledStopKeys:stops,sqlPublishedNumberFleetReference:proof,...extras
 };
}
const verify=p=>win.TrainNumberPngRanges.verifyOuMainTsugaruService(p);
const image=p=>win.TrainVehicle.lookupTrainNumberRangePng(p);
test('6 E751 limited expresses x both calendars have source-bound PNGs',()=>{
 assert.equal(fs.existsSync('images/列车/JR東日本/JR東日本_E751系.png'),true);
 assert.equal(win.VehicleGaragePngMap.matchModelPath('E751系',png,'OuMain'),true);
 assert.equal(win.VehicleGaragePngMap.matchModelPath('E751系',png,'Yamagata'),false);
 for(const number of Object.keys(names))
  for(const day of ['2026-11-06','2026-11-07']){
   const p=pos(number,day),v=verify(p),im=image(p);
   assert.equal(v?.number,number,number+'/'+day);
   assert.equal(v?.serviceName,names[number]);
   assert.equal(v?.actualVehicleConfirmed,false);
   assert.equal(im?.model,'E751系',number+'/'+day);
   assert.equal(im?.pngPath,png);
   assert.equal(im?.representative,true);
   assert.equal(ctx._trainMarkerSpec(p,number,'OuMain').kind,'vehicle');
   assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
});
test('source mismatches cannot mint a Tsugaru train or wrong fleet',()=>{
 const p=pos('2041M'),proof=p.sqlPublishedNumberFleetReference;
 for(const bad of [
  {trainNumber:'2045M'},{trainNumber:'3001M'},
  {positionLineId:'Gono'},{displayLineId:'Yamagata'},
  {sourceRailway:'odpt.Railway:JR-East.Gono'},
  {trainOperator:'JR-West'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {trainType:'odpt.TrainType:JR-East.Local'},
  {positionSource:'train-timetable'},{estimated:false},
  {officialNumberVerified:false},
  {vehicleIdentityStatus:'EXACT'},
  {plannedVehicleCandidates:['701系']},
  {realtimeVehicleType:'701系'},
  {serviceDate:'2026-12-06'},{calendarType:'holiday'},
  {scheduledStopKeys:['Akita','Aomori']},
  {sqlPublishedNumberFleetReference:null},
  {sqlPublishedNumberFleetReference:{...proof,serviceName:'つがる42号'}},
  {sqlPublishedNumberFleetReference:{...proof,pngReference:'../images/列车/JR東日本/JR東日本_701系_秋田地区.png'}},
  {sqlPublishedNumberFleetReference:{...proof,sourceTemplateId:0}},
  {sqlPublishedNumberFleetReference:{...proof,sourceStopKeys:['Akita','Aomori']}},
  {sqlPublishedNumberFleetReference:{...proof,actualVehicleConfirmed:true}},
  {sqlPublishedNumberFleetReference:{...proof,officialSourceUrl:'https://example.com'}},
 ])assert.equal(image({...p,...bad}),null,JSON.stringify(bad).slice(0,160));
});
test('SQL and backend retain exact six-number roster, do not promote old clocks',()=>{
 const sql=fs.readFileSync('supabase/migrations/'+
 '20261106140000_oumain_2611_tsugaru_e751_exact_12_calendar_sources.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 for(const term of ['published_oumain_2611_tsugaru_number_roster','2021M','2022M',
  '2041M','2042M','2043M','2044M','<>12',
  'historical_not_2611_verified','requires_exact_roster'])
  assert.ok(sql.includes(term),'missing roster: '+term);
 for(const term of ['OU_2611_TSUGARU_E751_ROSTER_UNAVAILABLE',
  'tsugaruNumbers','akira_aomori_tsugaru_e751'.replace('akira','akita'),
  'run.vehicle_artwork_path=null','run.train_type=t.train_type_urn',
  'run.service_name=t.service_name'])
  assert.ok(edge.includes(term),'missing backend mapping: '+term);
 for(const term of ['officialOuMainTsugaruPlan',
  'verifyOuMainTsugaruService','_ouTsugaruFleet',
  'publishedFleetReference:_ouTsugaruFleet'])
  assert.ok(estimator.includes(term),'missing diagram proof: '+term);
});
