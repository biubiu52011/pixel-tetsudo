'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261108231000_fukuchiyama_kounotori_source_family_50_rows.sql');
const fridaySql=read('supabase/migrations/20261108232000_fukuchiyama_7025m_friday_official_sample.sql');
const edge=read('supabase/functions/train-runs/index.ts');
const render=read('js/trains-render.js');
const context={window:{},Date,console:{log(){},warn(){},error(){},debug(){}}};
vm.createContext(context);
for(const path of ['data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
  vm.runInContext(read(path),context,{filename:path});
const verify=context.window.TrainNumberPngRanges.verifyFukuchiyamaSourceFleet;
const fridayVerify=context.window.TrainNumberPngRanges.verifyFukuchiyamaFriday7025;
const marker=(p,fail)=>context.window.TrainVehicle.selectMarkerArtwork(p,fail);
const models=['287系','289系'];
const png='../images/列车/JR西日本/JR西日本_287系.png';
const fridayDates=['2026-11-06','2026-11-13','2026-11-20','2026-11-27'];
const fridayStops=['Osaka','Amagasaki','Takarazuka','Sanda-Hyogo',
 'Shinmita','Sou-No','Shinoyamaguchi','Tanigawa',
 'Kaibara-Hyogo','Kuroi-Tamba','Fukuchiyama'];
function sample(num,id,{day='2026-11-08',dir='Inbound',keys=['Fukuchiyama','Shinoyamaguchi','Osaka'],friday=false}={}){
 const holiday=!friday;
 const path=friday?'official-sampled:fukuchiyama:2611:7025M-friday':
  'data/timetables/Fukuchiyama-manual.js';
 const proof={
   source:friday?'sql-jrwest-fukuchiyama-2611-official-7025-friday':
     'sql-jrwest-fukuchiyama-2611-historical-fleet-reference',
   lineId:'Fukuchiyama',sourceTemplateId:id,sourceTrainId:num,
   serviceDate:day,calendar:holiday?'odpt.Calendar:SaturdayHoliday':'odpt.Calendar:Weekday',
   direction:'odpt.RailDirection:'+dir,
   trainType:'odpt.TrainType:JR-West.LimitedExpress',
   sourceStopKeys:keys.slice(),candidateModels:models.slice(),candidateAssets:[],
   timetableSourcePath:path,
   timetableValidity:friday?'date_verified':'undated_not_current_verified',
   numberDateVerified:friday,referenceOnly:true,
   actualVehicleConfirmed:false,authorizesPNG:false
 };
 return {
   trainNumber:num,serviceDate:day,positionLineId:'Fukuchiyama',
   displayLineId:'Fukuchiyama',sourceRailway:'odpt.Railway:JR-West.Fukuchiyama',
   trainOperator:'JR-West',positionSource:'supabase-train-run',
   trainType:proof.trainType,railDirection:proof.direction,
   serviceId:proof.calendar,calendarType:holiday?'holiday':'weekday',
   scheduledStopKeys:keys.slice(),estimated:true,
   timetableDateVerified:friday,vehicleIdentityStatus:'UNKNOWN',
   vehicleResolvedUpstream:false,vehicleResolvedFromRealtime:false,
   vehicleFormationId:'',vehicleFormationCandidates:[],
   plannedVehicleCandidates:models.slice(),plannedVehicleCandidateStatus:'unresolved',
   vehiclePlan:null,sqlPublishedNumberFleetReference:proof
 };
}
function inspect(p,verifier){
 const f=verifier(p);
 assert.ok(f,p.trainNumber+' verified scoped reference');
 assert.deepEqual(Array.from(f.candidateModels),models);
 assert.equal(f.illustrationModel,'JR西日本287系');
 assert.equal(f.illustrationPng,png);
 assert.equal(f.authorizesIllustration,true);
 assert.equal(f.authorizesPNG,false);
 assert.equal(f.actualVehicleConfirmed,false);
 assert.equal(context.window.VehicleGaragePngMap.matchModelPath('JR西日本287系',png,'Fukuchiyama'),true);
 const art=marker(p);
 assert.equal(art.kind,'vehicle');
 assert.equal(art.iconSrc,png);
 assert.equal(art.illustrative,true);
 assert.equal(art.representativeOnly,true);
 assert.equal(art.actualVehicleConfirmed,false);
 assert.equal(marker(p,true).kind,'candidate');
 return f;
}
test('all 50 historical 30xx/70xx source families become unconfirmed LimitedExpress 287/289 references, not exact PNG',()=>{
 assert.match(sql,/<> 50/);
 assert.match(sql,/<> 43/);
 assert.match(sql,/source_train_number ~ '\^\(30\|70\)\[0-9\]\{2\}MH\?\$'/);
 assert.match(sql,/candidate_models=ARRAY\['287系','289系'\]::text\[\]/);
 assert.match(sql,/authorizes_png OR number_date_verified/);
 assert.match(sql,/cardinality\(operating_dates\)=11/);
 assert.doesNotMatch(sql,/\bINSERT INTO public\.manual_timetable_template_stops\b/);
 for(const [no,id,dir] of [
  ['3002MH',68216,'Inbound'],['3001MH',67964,'Outbound'],
  ['7006MH',68236,'Inbound'],['7007MH',68002,'Outbound'],
  ['7013MH',68055,'Outbound'],['7016MH',68276,'Inbound'],
  ['7026MH',68309,'Inbound'],['3028MH',68315,'Inbound']]){
  const p=sample(no,id,{dir});
  inspect(p,verify);
  assert.equal(verify({...p,trainType:'odpt.TrainType:JR-West.Local'}),null);
  assert.equal(verify({...p,sqlPublishedNumberFleetReference:{
    ...p.sqlPublishedNumberFleetReference,authorizesPNG:true}}),null);
  assert.equal(verify({...p,scheduledStopKeys:['WrongStation','Osaka']}),null);
 }
});
test('Friday 7025M clones the exact 11-stop known segment on four published November dates only',()=>{
 assert.match(fridaySql,/OVERRIDING SYSTEM VALUE/);
 assert.match(fridaySql,/template_id=68168/);
 for(const date of fridayDates)assert.ok(fridaySql.includes(date));
 assert.match(fridaySql,/source:2611087025001/);
 assert.match(fridaySql,/source_template_id=2611087025001/);
 assert.match(fridaySql,/<>388/);
 assert.match(edge,/JRWEST_FUKUCHIYAMA_7025M_NOVEMBER_FRIDAY_SOURCE_CONFLICT/);
 for(const day of fridayDates){
  const p=sample('7025M',2611087025001,{day,dir:'Outbound',keys:fridayStops,friday:true});
  inspect(p,fridayVerify);
  assert.equal(fridayVerify({...p,serviceDate:'2026-11-09'}),null);
  assert.equal(fridayVerify({...p,sqlPublishedNumberFleetReference:{
   ...p.sqlPublishedNumberFleetReference,sourceTemplateId:68168}}),null);
  assert.equal(fridayVerify({...p,vehicleIdentityStatus:'EXACT'}),null);
 }
});
test('marker accessible text distinguishes representative 287 Kounotori from 321 local',()=>{
 assert.match(render,/车辆图片：287系仅是287／289系特急车型候选中的示意/);
 assert.match(render,/287系の画像は287・289系/);
 assert.match(render,/fukKounotori/);
 assert.match(render,/车辆图片：321系仅为207／321系共通运用示意/);
});
