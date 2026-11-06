'use strict';
// JR-West Kyoto/Kobe historical C/T/M source-only mixed-fleet regression.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={},ctx=vm.createContext({window:root,Date,
  console:{log(){},warn(){},debug(){},error(){}},
  _isTrainArtworkFailureActive(){return false}});
for(const f of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js','data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const verify=root.TrainNumberPngRanges.verifyJrWestKyotoKobeSourceFleet;
const kyoto=[
 'Kyoto','Nishiooji','Katsuragawa','Mukouchou','Nagaokakyou',
 'Yamazaki','Shimamoto','Takatsuki','Settsu-Tomita','J-R-Soujidera',
 'Ibaraki','Senri-Oka','Kishibe','Suita','Higashiyodogawa',
 'Shin-Osaka','Osaka','Tsukamoto','Amagasaki','Tachibana',
 'Koshienguchi','Nishinomiya','Sakura-Shukugawa','Ashiya',
 'Kōnan-Yamate','Settsu-Motoyama','Sumiyoshi-Hyogo','Rokkoumichi',
 'Maya','Nada','San-No-Miya','Motomachi','Kobe'
];
const sanyoRapid=[
 'Hyougo','Suma','Tarumi','Maiko','Akashi','Nishi-Akashi',
 'Okubo-Hyogo','Uozumi','Tsuchiyama','Higashi-Kakogawa',
 'Kakogawa','Houden','Sone','Himeji-Bessho','O-Chaku',
 'Higashi-Himeji','Himeji'
];
const assets=[
 '../images/列车/JR西日本/JR西日本_207系_NK.png',
 '../images/列车/JR西日本/JR西日本_207系_Y2.png',
 '../images/列车/JR西日本/JR西日本_321系.png'
],pngModels=['JR西日本207系（NK）','JR西日本207系（Y2）','JR西日本321系'];
const rows=[
 {id:3554,line:'TokaidoKansai',num:'500300-1871500-107C',
  date:'2026-11-06',dir:'Outbound',family:'local_c',stops:kyoto},
 {id:3576,line:'TokaidoKansai',num:'500300-1871600-107C',
  date:'2026-11-07',dir:'Outbound',family:'local_c',stops:kyoto},
 {id:3571,line:'TokaidoKansai',num:'500310-1384900-3478M',
  date:'2026-11-06',dir:'Inbound',family:'regional_rapid_t_m',
  stops:['San-No-Miya','Ashiya','Amagasaki','Osaka','Shin-Osaka','Takatsuki','Kyoto']},
 {id:3578,line:'TokaidoKansai',num:'500300-1583900-733T',
  date:'2026-11-07',dir:'Outbound',family:'regional_rapid_t_m',
  stops:['Nishiooji','Katsuragawa','Mukouchou','Nagaokakyou','Yamazaki',
         'Shimamoto','Takatsuki','Ibaraki','Shin-Osaka','Osaka','Amagasaki',
         'Nishinomiya','Ashiya','Sumiyoshi-Hyogo','Rokkoumichi',
         'San-No-Miya','Motomachi','Kobe']},
 {id:6097,line:'SanyoMain',num:'710100-1096200-173C',
  date:'2026-11-06',dir:'Outbound',family:'local_c',
  stops:['Hyougo','Shinnagata','Takatori','Suma-Kaihin-Kouen','Suma']},
 {id:6117,line:'SanyoMain',num:'710100-2041200-4631C',
  date:'2026-11-07',dir:'Outbound',family:'local_c',
  stops:['Hyougo','Shinnagata','Takatori','Suma-Kaihin-Kouen','Suma',
         'Shioya','Tarumi','Maiko','Asagiri','Akashi','Nishi-Akashi']},
 {id:6094,line:'SanyoMain',num:'710100-4338200-845T',
  date:'2026-11-06',dir:'Outbound',family:'regional_rapid_t_m',stops:sanyoRapid},
 {id:6113,line:'SanyoMain',num:'710100-4344500-845T',
  date:'2026-11-07',dir:'Outbound',family:'regional_rapid_t_m',stops:sanyoRapid},
 {id:6115,line:'SanyoMain',num:'710100-2112700-3425M',
  date:'2026-11-07',dir:'Outbound',family:'regional_rapid_t_m',
  stops:['Akashi','Nishi-Akashi','Kakogawa','Himeji']}
];
function isHoliday(date){
 const weekday=new Date(date+'T12:00:00Z').getUTCDay();
 return weekday===0||weekday===6||date==='2026-11-03'||date==='2026-11-23';
}
function pos(row,extra={}){
 const local=row.family==='local_c',line=row.line,
   cal=isHoliday(row.date)?'SaturdayHoliday':'Weekday',
   models=local?['207系','321系']:['223系','225系'],
   allowed=local&&line==='TokaidoKansai',
   gs=allowed?pngModels:[],paths=allowed?assets:[],
   type=local?'Local':'Rapid',
   fleet=local?'https://www.westjr.co.jp/fan/paper/local/':
    'https://www.westjr.co.jp/press/article/2020/02/page_15645.html';
 return {
  trainNumber:row.num,serviceDate:row.date,
  positionLineId:line,displayLineId:line,
  sourceRailway:'odpt.Railway:JR-West.'+line,
  trainOperator:'JR-West',positionSource:'supabase-train-run',
  trainType:'odpt.TrainType:JR-West.'+type,
  railDirection:'odpt.RailDirection:'+row.dir,
  calendarType:cal==='Weekday'?'weekday':'holiday',
  scheduledStopKeys:row.stops.slice(),
  estimated:true,vehicleIdentityStatus:'UNKNOWN',
  plannedVehicleCandidates:models.slice(),
  plannedVehicleCandidateStatus:'unresolved-mixed-fleet',
  vehiclePlan:{status:'UNCONFIRMED_FLEET',models:models.slice(),confirmed:false},
  sqlPublishedNumberFleetReference:{
    source:'sql-jrwest-kyoto-kobe-2611-source-family',
    lineId:line,sourceTrainId:row.num,
    sourcePublicNumberSuffix:row.num.split('-').pop(),
    serviceDate:row.date,calendar:'odpt.Calendar:'+cal,
    direction:'odpt.RailDirection:'+row.dir,
    trainType:'odpt.TrainType:JR-West.'+type,
    serviceFamily:row.family,
    sourceSegment:line==='TokaidoKansai'?'kyoto_osaka_kobe':'kobe_himeji',
    sourceTemplateId:row.id,sourceStopKeys:row.stops.slice(),
    candidateModels:models.slice(),candidateGalleryModels:gs.slice(),
    candidateAssets:paths.slice(),fleetSourceUrl:fleet,
    timetableSourcePath:'data/timetables/'+line+'-manual.js',
    timetableValidity:'undated_not_current_verified',
    numberDateVerified:false,referenceOnly:true,
    actualVehicleConfirmed:false,authorizesPNG:false
  },...extra
 };
}
test('one source-only neutral marker for nine real Kyoto/Kobe C/T/M sources',()=>{
 for(const item of rows){
  const p=pos(item),f=verify(p);
  assert.ok(f,item.num);
  assert.equal(f.numberDateVerified,false);
  assert.equal(f.authorizesPNG,false);
  assert.equal(f.actualVehicleConfirmed,false);
  assert.equal(f.historicalNumberSuffix,item.num.split('-').pop());
  const result=root.TrainVehicle.selectMarkerArtwork(p,false);
  assert.equal(result.kind,'candidate',item.num);
  assert.equal(result.iconSrc,'');
  assert.equal(result.planned,false);
  assert.equal(result.sourceNumberSuffix,f.historicalNumberSuffix);
  assert.deepEqual(Array.from(result.candidateModels),
    item.family==='local_c'?['207系','321系']:['223系','225系']);
  assert.deepEqual(Array.from(result.candidateAssets),
    item.line==='TokaidoKansai'&&item.family==='local_c'?assets:[]);
 }
});
test('local asset references are truly registered, but rapid Hanwa artwork is not reused',()=>{
 for(let i=0;i<assets.length;i++)
  assert.equal(root.VehicleGaragePngMap.matchModelPath(
    pngModels[i],assets[i],'TokaidoKansai'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('JR西日本225系',
   '../images/列车/JR西日本/JR西日本_225系.png','TokaidoKansai'),false);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('JR西日本207系（NK）',
   assets[0],'SanyoMain'),false);
 assert.ok(!rows.some(r=>r.num==='3429A'));
});
test('source, route, day, owner, formation, suffix and model proof fail closed',()=>{
 const base=pos(rows[0]),bad=[
  {serviceDate:'2026-12-01'},{calendarType:'holiday'},
  {sourceRailway:'odpt.Railway:JR-East.Tokaido'},
  {positionLineId:'TokaidoMain'},{trainOperator:'JR-East'},
  {positionSource:'realtime-api'},
  {scheduledStopKeys:kyoto.slice().reverse()},
  {scheduledStopKeys:['Osaka',...kyoto]},
  {trainNumber:'107C'},{trainNumber:'500300-1871500-107T'},
  {trainType:'odpt.TrainType:JR-West.LimitedExpress'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {sqlPublishedNumberFleetReference:null},
  {sqlPublishedNumberFleetReference:{
    ...base.sqlPublishedNumberFleetReference,
    candidateModels:['207系']}},
  {sqlPublishedNumberFleetReference:{
    ...base.sqlPublishedNumberFleetReference,
    candidateAssets:['../images/列车/JR西日本/JR西日本_223系_H2.png']}},
  {sqlPublishedNumberFleetReference:{
    ...base.sqlPublishedNumberFleetReference,
    numberDateVerified:true}}
 ];
 for(const diff of bad){
  const p={...base,...diff};
  assert.equal(verify(p),null,JSON.stringify(diff));
  assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false).iconSrc,'');
 }
 for(const diff of [
  {vehicleIdentityStatus:'NARROWED'},
  {vehicleFormationId:'D3'},
  {vehicleResolvedFromRealtime:true},
  {plannedVehicleCandidates:['207系']},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['207系'],confirmed:true}},
  {plannedVehicleCandidateStatus:'source_single_type_candidate'}
 ]){
  const marker=root.TrainVehicle.selectMarkerArtwork({...base,...diff},false);
  assert.notEqual(marker.kind,'candidate',JSON.stringify(diff));
  assert.equal(marker.iconSrc,'');
 }
});
test('other SanyoMain sources and special A/D number remain outside scoped family',()=>{
 const sanyo=pos(rows[4],{
  trainNumber:'710110-633900-1326M',
  scheduledStopKeys:['Okayama','Himeji']});
 assert.equal(verify(sanyo),null);
 assert.equal(root.TrainNumberPngRanges.match('3429A','TokaidoKansai'),null);
 assert.equal(root.TrainNumberPngRanges.match('51D','TokaidoKansai'),null);
 assert.equal(root.TrainNumberPngRanges.match('714T','TokaidoMain'),null);
});
test('SQL provenance, 58-row constraints and edge / estimator integration are present',()=>{
 const sql=fs.readFileSync(
  'supabase/migrations/20261107050000_jrwest_kyoto_kobe_2611_source_only_fleet_candidates.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 const est=fs.readFileSync('js/train-position-estimator.js','utf8');
 for(const x of ['<>58','<>38','<>20','<>26','<>32',
  'number_date_verified boolean NOT NULL DEFAULT false',
  'authorizes_png boolean NOT NULL DEFAULT false',
  'data/timetables/TokaidoKansai-manual.js',
  'data/timetables/SanyoMain-manual.js'])
  assert.ok(sql.includes(x),x);
 for(const x of ['published_jrwest_kyoto_kobe_2611_source_fleet',
   'JRWEST_KYOTO_KOBE_2611_SOURCE_FLEET_UNAVAILABLE',
   'run.vehicle_type_candidates=pub.candidate_models.join(" / ")'])
  assert.ok(edge.includes(x),x);
 for(const x of ['officialJrWestKyotoKobePlan',
    'verifyJrWestKyotoKobeSourceFleet',
    'historicalSourcePublicNumberSuffix'])
  assert.ok(est.includes(x),x);
});
