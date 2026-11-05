'use strict';
// JR East Kururi 2026-11: typhoon closure of Kururi–KazusaKameyama.
// 40 published train numbers; only 34 on Kisarazu–Kururi are RAIL.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const f of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-regional-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const idx=win.JREastRegionalNumberIndex202611;
const model='キハE130形100番台';
const png='../images/列车/JR東日本/JR東日本_キハE130系100番台.png';
const down=['Kisarazu','Gion','KazusaKiyokawa','HigashiKiyokawa',
 'Yokota','HigashiYokota','Makuta','Shimogori','Obitsu','Tawarada','Kururi'];
const closed=['2941D','2943D','2949D','2944D','2946D','2952D'];
const through=new Set(['921D','923D','933D','939D','947D',
 '922D','924D','926D','928D','938D','948D']);
const holiday=date=>{
 const day=new Date(date+'T12:00:00Z').getUTCDay();
 return day===0||day===6||['2026-11-03','2026-11-23'].includes(date);
};
function make(n,date='2026-11-06',extra={}){
 const inbound=Number(n.replace('D',''))%2===0,
 dir=inbound?'Inbound':'Outbound',
 cal=holiday(date)?'holiday':'weekday',
 route=inbound?down.slice().reverse():down.slice(),
 scope=through.has(n)?'trimmed_through_rail':'open_rail_only';
 return {trainNumber:n,positionLineId:'Kururi',displayLineId:'Kururi',
  sourceRailway:'odpt.Railway:JR-East.Kururi',trainOperator:'JR-East',
  railDirection:'odpt.RailDirection:'+dir,
  trainType:'odpt.TrainType:JR-East.Local',
  calendarType:cal,serviceDate:date,positionSource:'supabase-train-run',
  estimated:true,officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
  plannedVehicleCandidates:[model],
  vehiclePlan:{status:'PLANNED_MODEL',models:[model],confirmed:false},
  scheduledStopKeys:route,
  sqlPublishedNumberFleetReference:{
   source:'sql-jreast-2611-number-roster',lineId:'Kururi',
   trainNumber:n,serviceDate:date,direction:'odpt.RailDirection:'+dir,
   calendar:'odpt.Calendar:'+(cal==='holiday'?'SaturdayHoliday':'Weekday'),
   trainType:'odpt.TrainType:JR-East.Local',
   segmentKey:'kisarazu_kururi_rail',railScope:scope,
   railwayFrom:route[0],railwayTo:route[10],
   plannedCandidates:[model],model,pngReference:png,
   officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/217'+
    (inbound?'u':'d')+(cal==='holiday'?'2':'1')+'.html',
   stopClockStatus:'historical_not_2611_verified',
   referenceOnly:true,actualVehicleConfirmed:false,
   closedRailSection:'Kururi–KazusaKameyama'
  },...extra};
}
const verify=p=>win.TrainNumberPngRanges.verifyKururiService(p);
const match=p=>win.TrainVehicle.lookupTrainNumberRangePng(p);
test('all 34 surviving open-rail numbers map to KiHaE130-100 for both calendars',()=>{
 const active=[...idx.lines.Kururi.up,...idx.lines.Kururi.down].filter(n=>!closed.includes(n));
 assert.equal(active.length,34);
 assert.equal(through.size,11);
 assert.equal(win.VehicleGaragePngMap.matchModelPath(model,png,'Kururi'),true);
 for(const n of active)for(const day of ['2026-11-06','2026-11-07','2026-11-23']){
  const p=make(n,day),proof=verify(p);
  assert.equal(proof?.number,n,n+' '+day);
  assert.equal(proof?.model,model);
  assert.equal(proof?.actualVehicleConfirmed,false);
  assert.equal(match(p)?.pngPath,png,n+' '+day);
  assert.equal(match(p)?.planned,true);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
 }
});
test('all six published closed-only 29xxD services never receive a railway PNG',()=>{
 assert.deepEqual(Array.from(idx.kururiClosedRailNumbers),closed);
 for(const n of closed)for(const date of ['2026-11-06','2026-11-07']){
  const p=make(n,date);
  const v=idx.verify('Kururi',n,p.sourceRailway,p.railDirection,
    p.trainType,p.calendarType,p.serviceDate);
  assert.equal(v,false,n+' '+date);
  assert.equal(verify(p),null);
  assert.equal(match(p),null);
 }
});
test('a historically through train may only illustrate its open 11-stop railway segment',()=>{
 for(const n of through){
  const p=make(n);
  assert.equal(verify(p)?.railScope,'trimmed_through_rail',n);
  assert.equal(match(p)?.pngPath,png,n);
  assert.equal(verify({...p,scheduledStopKeys:
    [...p.scheduledStopKeys,'Hirayama']}),null,n+' phantom onward train');
  assert.equal(match({...p,scheduledStopKeys:
    ['KazusaKameyama',...p.scheduledStopKeys]}),null,n+' phantom inbound');
 }
});
test('number-only, unrelated source, calendar, old full-route or claimed actual stock fails closed',()=>{
 const p=make('922D','2026-11-06');
 for(const change of [
  {positionLineId:'Hanawa'}, {displayLineId:'Hachinohe'},
  {sourceRailway:'odpt.Railway:JR-East.Hachinohe'},
  {trainOperator:'JR-West'}, {railDirection:'odpt.RailDirection:Outbound'},
  {trainType:'odpt.TrainType:JR-East.Rapid'},
  {serviceDate:'2026-12-06'},{calendarType:'holiday'},
  {scheduledStopKeys:[]},
  {scheduledStopKeys:['Kisarazu','Kururi']},
  {scheduledStopKeys:['Kururi','Hirayama','KazusaMatsuoka','KazusaKameyama']},
  {positionSource:'odpt-realtime'}, {estimated:false},
  {officialNumberVerified:false}, {vehicleIdentityStatus:'EXACT'},
  {realtimeVehicleType:'キハ110系'}, {plannedVehicleCandidates:['キハ110系']},
  {sqlPublishedNumberFleetReference:null},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,referenceOnly:false}},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,model:'キハ110系'}},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,closedRailSection:''}},
  {sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,segmentKey:'closed_segment_only'}}
 ]){
  const bad={...p,...change};
  assert.equal(match(bad),null,JSON.stringify(change));
 }
 const noProof={...p,sqlPublishedNumberFleetReference:undefined};
 assert.equal(match(noProof),null,'number alone cannot choose image');
});
test('migration and Edge apply strict 40/34/6 published numbers and rail-only stop clipping',()=>{
 const sql=fs.readFileSync('supabase/migrations/'+
  '20261106004500_kururi_2611_rail_only_kie130_exact_roster.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 for(const term of ['published_kururi_2611_rail_vehicle_roster',
  'published_train_number_evidence','published_train_png_number_ranges',
  'closed_segment_only','trimmed_through_rail','open_rail_only','2611217',
  'KazusaKameyama'])assert.ok(sql.includes(term),'SQL missing '+term);
 assert.ok(edge.includes('KURURI_2611_RAIL_SCOPE_UNAVAILABLE'));
 assert.ok(edge.includes('run.stops.slice(3)'));
 assert.ok(edge.includes('run.stops.slice(0,11)'));
 assert.ok(edge.includes('rule.rail_scope==="closed_segment_only"'));
 assert.ok(estimator.includes('officialKururiPlan'));
 assert.ok(fs.existsSync('images/列车/JR東日本/JR東日本_キハE130系100番台.png'));
});
