'use strict';
// Lake Biwa west shore Kosei: source-only 179 local/rapid M(MH)
// rows without attributing a physical consist or inventing a 2611 run.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={},ctx=vm.createContext({window:root,Date,
  console:{log(){},warn(){},error(){},debug(){}},
  _isTrainArtworkFailureActive(){return false}});
for(const f of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const verify=root.TrainNumberPngRanges.verifyKoseiSourceFleet,
  outside=['Kyoto','Yamashina','Ootsu-Kyou','Karasaki',
    'Hieizan-Sakamoto','Ogoto-Onsen','Katata','Ono-Kansai',
    'Wani','Hourai','Shiga','Hira','Oumi-Maiko','Kitakomatsu',
    'Oumi-Takashima','Adogawa',"Shin'asahi",'Oumiimazu'],
  north=['Omi-Shiotsu','Nagahara-Kansai','Makino',
    'Oumi-Naka-Shou','Oumiimazu'],
  rapidNorth=['Nagahara-Kansai','Makino','Oumi-Naka-Shou','Oumiimazu',
    "Shin'asahi",'Adogawa','Oumi-Takashima','Kitakomatsu',
    'Oumi-Maiko','Katata','Hieizan-Sakamoto','Ootsu-Kyou',
    'Yamashina','Kyoto'];
function isHoliday(date){
 const day=new Date(date+'T12:00:00Z').getUTCDay();
 return day===0||day===6||date==='2026-11-03'||date==='2026-11-23';
}
function mk(num='1802M',date='2026-11-06',extra={}){
 const h=isHoliday(date),group=/^48/.test(num)?'north_shuttle':
   /^3[1-6]/.test(num)?'special_rapid':
   /^38/.test(num)?'rapid':'other_local',
   stops=group==='north_shuttle'?north:
     group==='special_rapid'?rapidNorth:
     group==='rapid'?['Yamashina','Ootsu-Kyou','Hieizan-Sakamoto',
       'Ogoto-Onsen','Katata','Oumi-Maiko','Kitakomatsu',
       'Oumi-Takashima','Adogawa',"Shin'asahi",'Oumiimazu',
       'Oumi-Naka-Shou','Makino','Nagahara-Kansai','Omi-Shiotsu']:outside,
   inbound=group==='north_shuttle'||group==='special_rapid',
   dir=inbound?'Inbound':'Outbound',
   type=group==='special_rapid'?'SpecialRapid':group==='rapid'?'Rapid':'Local',
   models=group==='north_shuttle'?['223系','225系','521系']:
     group==='other_local'?['221系','223系','225系']:
       ['223系','225系'],
   url=group==='north_shuttle'?
     'https://train.mi-ktt.ne.jp/rosen/koseisen/':
     'https://www.westjr.co.jp/fan/paper/local/';
 return {
   trainNumber:num,serviceDate:date,
   positionLineId:'Kosei',displayLineId:'Kosei',
   trainOperator:'JR-West',sourceRailway:'odpt.Railway:JR-West.Kosei',
   positionSource:'supabase-train-run',estimated:true,
   trainType:'odpt.TrainType:JR-West.'+type,
   railDirection:'odpt.RailDirection:'+dir,
   calendarType:h?'holiday':'weekday',
   scheduledStopKeys:stops.slice(),
   vehicleIdentityStatus:'UNKNOWN',
   plannedVehicleCandidates:models.slice(),
   plannedVehicleCandidateStatus:'unresolved-mixed-fleet',
   vehiclePlan:{status:'UNCONFIRMED_FLEET',models:models.slice(),confirmed:false},
   sqlPublishedNumberFleetReference:{
     source:'sql-jrwest-kosei-2611-source-family',
     lineId:'Kosei',trainNumber:num,sourceTrainNumber:num,
     historicalNumber:num.replace(/H$/,''),
     serviceDate:date,calendar:'odpt.Calendar:'+
       (h?'SaturdayHoliday':'Weekday'),
     direction:'odpt.RailDirection:'+dir,
     trainType:'odpt.TrainType:JR-West.'+type,
     sourceTemplateId:15110,corridorSegment:group,
     sourceStopKeys:stops.slice(),candidateModels:models.slice(),
     candidateAssets:[],fleetSourceUrl:url,
     routeSourceUrl:'https://www.train-guide.westjr.co.jp/kosei.html',
     timetableValidity:'undated_not_current_verified',
     referenceOnly:true,numberDateVerified:false,
     actualVehicleConfirmed:false,authorizesPNG:false
   },...extra
 };
}
test('normal M weekday + MH holiday are source-candidate ONLY',()=>{
 for(const [n,date,fleet,group] of [
  ['1802M','2026-11-06','221系|223系|225系','other_local'],
  ['1802MH','2026-11-07','221系|223系|225系','other_local'],
  ['4840M','2026-11-06','223系|225系|521系','north_shuttle'],
  ['4840MH','2026-11-07','223系|225系|521系','north_shuttle'],
  ['3804M','2026-11-06','223系|225系','rapid'],
  ['3832MH','2026-11-07','223系|225系','rapid'],
  ['3107M','2026-11-06','223系|225系','special_rapid'],
  ['3145MH','2026-11-07','223系|225系','special_rapid'],
  ['1802MH','2026-11-03','221系|223系|225系','other_local'],
  ['1802MH','2026-11-23','221系|223系|225系','other_local']
 ]){
  const p=mk(n,date),proven=verify(p);
  assert.ok(proven,n+' '+date);
  assert.equal(proven.corridorSegment,group);
  assert.equal(proven.candidateModels.join('|'),fleet);
  assert.equal(proven.historicalNumber,n.replace(/H$/,''));
  assert.equal(proven.authorizesPNG,false);
  assert.equal(proven.actualVehicleConfirmed,false);
  assert.equal(proven.numberDateVerified,false);
  const marker=root.TrainVehicle.selectMarkerArtwork(p,false);
  assert.equal(marker.kind,'candidate',n);
  assert.equal(marker.iconSrc,'');
  assert.equal(marker.planned,false);
  assert.equal(marker.candidateModels.join('|'),fleet);
  assert.equal(marker.candidateAssets.length,0);
 }
});
test('9017DH (historical seasonal special) must not be a Local or Thunderbird PNG',()=>{
 assert.equal(root.TrainNumberPngRanges.match('9017DH','Kosei'),null);
 for(const source of ['9017DH','9017D','9017MH']){
  const p=mk(source,'2026-11-07');
  assert.equal(verify(p),null);
  assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false).iconSrc,'');
 }
 for(const n of ['1802M','3107M','4840MH']){
  assert.equal(root.TrainNumberPngRanges.match(n,'Kosei'),null,
    'M/MH must not automatically select 681/683 Thunderbird or other PNG');
 }
});
test('inverted route, wrong weekday H, 521 south, false fleet, line or proof fail closed',()=>{
 const base=mk();
 const wrong=[
  {trainNumber:'1802MH'},{trainNumber:'1802D'},
  {serviceDate:'2026-12-01'},{calendarType:'holiday'},
  {positionLineId:'TokaidoKansai'},
  {sourceRailway:'odpt.Railway:JR-East.Kosei'},
  {trainOperator:'JR-East'},{trainType:'odpt.TrainType:JR-West.LimitedExpress'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {positionSource:'realtime-api'},
  {scheduledStopKeys:outside.slice().reverse()},
  {scheduledStopKeys:['Shin-Osaka',...outside]},
  {scheduledStopKeys:['Kyoto','Oumiimazu','Yamashina']},
  {sqlPublishedNumberFleetReference:null},
  {sqlPublishedNumberFleetReference:{
    ...base.sqlPublishedNumberFleetReference,candidateModels:['683系']}},
  {sqlPublishedNumberFleetReference:{
    ...base.sqlPublishedNumberFleetReference,candidateModels:['221系']}},
  {sqlPublishedNumberFleetReference:{
    ...base.sqlPublishedNumberFleetReference,candidateAssets:[
      '../images/列车/JR西日本/JR西日本_683系.png']}},
  {sqlPublishedNumberFleetReference:{
    ...base.sqlPublishedNumberFleetReference,numberDateVerified:true}},
  {sqlPublishedNumberFleetReference:{
    ...base.sqlPublishedNumberFleetReference,sourceTemplateId:0}}
 ];
 for(const delta of wrong){
  const p={...base,...delta};
  assert.equal(verify(p),null,JSON.stringify(delta));
  assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false).iconSrc,'');
 }
 for(const delta of [
  {vehicleIdentityStatus:'EXACT'},
  {vehicleFormationId:'W37'},
  {vehicleResolvedFromRealtime:true},
  {plannedVehicleCandidates:['221系']},
  {plannedVehicleCandidateStatus:'single_model_proven'},
  {vehiclePlan:{models:['223系'],confirmed:true}}
 ]){
  const marker=root.TrainVehicle.selectMarkerArtwork({...base,...delta},false);
  assert.notEqual(marker.kind,'candidate',JSON.stringify(delta));
  assert.equal(marker.iconSrc,'');
 }
});
test('SQL 179 sources and runtime constraints preserve special/Express boundary',()=>{
 const sql=fs.readFileSync(
  'supabase/migrations/20261107052500_jrwest_kosei_2611_source_fleet_candidates.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const est=fs.readFileSync('js/train-position-estimator.js','utf8');
 for(const token of ['<>180','<>179','<>16','<>125','<>4','<>34',
    'source_train_number ~','9017DH',
    'number_date_verified boolean NOT NULL DEFAULT false',
    'authorizes_png boolean NOT NULL DEFAULT false'])
  assert.ok(sql.includes(token),token);
 for(const token of [
  'published_jrwest_kosei_2611_source_fleet',
  'JRWEST_KOSEI_2611_SOURCE_FLEET_UNAVAILABLE',
  'run.vehicle_type_candidates=p.candidate_models.join(" / ")',
  'result.splice(i,1);continue;'
 ])assert.ok(edge.includes(token),token);
 for(const token of ['officialKoseiPlan',
     'verifyKoseiSourceFleet',
     'historicalKoseiPublicNumber'])
   assert.ok(est.includes(token),token);
});
