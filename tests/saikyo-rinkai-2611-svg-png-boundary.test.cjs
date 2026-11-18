'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root={};
const context=vm.createContext({
 window:root,Date,console:{log(){},warn(){},debug(){},error(){}},
 _isTrainArtworkFailureActive(){return false}
});
for(const path of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start);
vm.runInContext(render.slice(start,end),context,{filename:'trains-render:marker'});
const e233='../images/列车/JR東日本/JR東日本_E233系_7000番台.png';
const sotetsu='../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png';
const png70='../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_70-000形.png';
const png71='../images/列车/東京臨海高速鉄道/東京臨海高速鉄道_71-000形.png';
const model70='東京臨海高速鉄道70-000形';
const model71='東京臨海高速鉄道71-000形';
function pos(number,line='Rinkai',fields={}){
 const n=parseInt(number,10);
 const rinkai=line==='Rinkai';
 return {
  trainNumber:number,trainId:'odpt:train:'+number,
  positionLineId:line,displayLineId:line,
  sourceRailway:rinkai?'odpt.Railway:TWR.Rinkai':
    'odpt.Railway:JR-East.SaikyoKawagoe',
  trainOperator:rinkai?'TWR':'JR-East',
  trainType:rinkai?'odpt.TrainType:TWR.Local':'odpt.TrainType:JR-East.Local',
  railDirection:n%2===0?'odpt.RailDirection:Inbound':'odpt.RailDirection:Outbound',
  serviceDate:'2026-11-18',calendarType:'weekday',
  positionSource:'realtime-api',estimated:false,
  vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
  ...fields
 };
}
const mark=(p,line=p.positionLineId)=>context._trainMarkerSpec(p,p.trainId,line);
function assertPng(number,line,png,fields={}){
 const p=pos(number,line,fields);
 const result=mark(p,line);
 assert.equal(result.kind,'vehicle',number+' '+line);
 assert.equal(result.iconSrc,png,number+' '+line);
 return result;
}
test('0-71 and 72-79 Saikyo numbered fleet families work in every month',()=>{
 for(const date of ['2025-01-01','2026-11-18','2031-01-01','']){
  assertPng('510S','SaikyoKawagoe',e233,{serviceDate:date});
  assertPng('759K','SaikyoKawagoe',e233,{serviceDate:date});
  assertPng('1974K','SaikyoKawagoe',sotetsu,{serviceDate:date});
 }
});
test('all audited TWR 80-91 K/F/S/T bands map on SVG without any date',()=>{
 const byOdd={
  81:png70,83:png70,85:png71,87:png70,89:png71,91:png70
 };
 for(const date of ['2026-04-03','2026-11-19','2026-12-01','2030-08-02','']){
  for(let tail=80;tail<=91;tail++){
   const working=tail%2===0?tail+1:tail,png=byOdd[working];
   for(const suffix of ['K','F','S','T']){
    const number=String(1000+tail)+suffix;
    for(const line of suffix==='T'?['Rinkai']:['Rinkai','SaikyoKawagoe']){
     const m=assertPng(number,line,png,{serviceDate:date});
     assert.equal(m.planned,true,number);
     assert.equal(m.illustrative,true,number);
     assert.equal(m.representativeOnly,true,number);
    }
   }
  }
 }
});
test('real observed model overrides the pool without any physical Z-formation assumption',()=>{
 for(const [model,png] of [[model70,png70],[model71,png71]]){
  for(const line of ['Rinkai','SaikyoKawagoe']){
   assertPng('1984K',line,png,{realtimeVehicleType:model,
    serviceDate:'2035-01-01'});
   assertPng('1984K',line,png,{realtimeVehicleType:
    model===model70?'70-000形':'71-000形'});
  }
 }
 for(const line of ['Rinkai','SaikyoKawagoe']){
  const p=pos('1984K',line,{realtimeVehicleType:model70,
   realtimeDerivedVehicleType:model71});
  assert.equal(mark(p,line).kind,'unresolved',
   'conflicting model evidence fails closed');
 }
});
test('Rinkai T low-tail references and composite 80-91 are both all-date',()=>{
 for(const [num,png] of [
  ['636T',png70],['738T',png70],['1638T',png71],
  ['1640T',png71],['580T',png70],['584T',png71],
  ['1080T',png70],['1088T',png71],['888T',png71],['991T',png70]
 ])assertPng(num,'Rinkai',png,{serviceDate:'2031-01-01',
  calendarType:'holiday'});
 for(const no of ['637T','739T','1079T']){
  assert.equal(mark(pos(no),'Rinkai').kind,'unresolved',no);
 }
});
test('live JR Saikyo Northbound/Southbound vocabulary keeps its own direction check',()=>{
 assertPng('1263K','SaikyoKawagoe',e233,{
  railDirection:'odpt.RailDirection:Northbound'});
 assertPng('1236K','SaikyoKawagoe',e233,{
  railDirection:'odpt.RailDirection:Southbound'});
 assert.equal(mark(pos('1984K','SaikyoKawagoe',{
  railDirection:'odpt.RailDirection:Northbound'}),'SaikyoKawagoe').kind,
  'unresolved','opposite direction must fail');
});
test('verified Osaki through-boundary preserves the source railway PNG',()=>{
 const rinkai=pos('1984K','Rinkai',{
  stationId:'Osaki',fusionLineId:'Rinkai',fusionRole:'through-boundary'
 });
 assert.equal(mark(rinkai,'SaikyoKawagoe').iconSrc,png71);
 const saikyo=pos('510S','SaikyoKawagoe',{
  stationId:'Osaki',fusionLineId:'SaikyoKawagoe',
  fusionRole:'through-boundary'
 });
 assert.equal(mark(saikyo,'Rinkai').iconSrc,e233);
 for(const patch of [
  {stationId:'Oimachi'},{fusionLineId:'SaikyoKawagoe'},
  {fusionRole:'extension'},{sourceRailway:'odpt.Railway:JR-East.Joban'}
 ]){
  assert.equal(mark({...rinkai,...patch},'SaikyoKawagoe').kind,
   'unresolved',JSON.stringify(patch));
 }
});
test('number-pool guards continue rejecting foreign sources, types and directions',()=>{
 for(const fields of [
  {sourceRailway:'odpt.Railway:JR-East.Joban'},
  {trainType:''},{railDirection:''},
  {railDirection:'odpt.RailDirection:Outbound'},
  {realtimeVehicleType:'東京臨海高速鉄道72-000形'}
 ]){
  assert.equal(mark(pos('1984K','Rinkai',fields),'Rinkai').kind,
   'unresolved',JSON.stringify(fields));
 }
 assert.equal(mark(pos('1088T','SaikyoKawagoe'),'SaikyoKawagoe').kind,
  'unresolved','Rinkai-local T never leaks to JR');
});
test('archived April Z-set provider is not a second, date-sensitive TWR PNG authority',()=>{
 const source=root.TRAIN_OPERATION_EVIDENCE_PROVIDERS.find(x=>
  x.id==='loo-ool-saikyo-dated-formations');
 assert.ok(source);
 for(const day of ['2026-04-03','2026-04-04','2026-11-19','']){
  for(const number of ['1983K','1984K','580T','991T']){
   assert.equal(source.resolveEvidence(number,{
    serviceDate:day,lineId:'Rinkai'}),null,
    'TWR comprehensive number art has one canonical resolver');
   assert.equal(mark(pos(number,'Rinkai',{
    serviceDate:day}),'Rinkai').kind,'vehicle',number+' '+day);
  }
 }
 assert.equal(source.resolveEvidence('77M',{
  serviceDate:'2026-04-03',lineId:'SaikyoKawagoe'})?.vehicleType,
  '相鉄12000系','unrelated dated Sotetsu evidence remains intact');
 assert.equal(source.resolveEvidence('77M',{
  serviceDate:'2026-11-19',lineId:'SaikyoKawagoe'}),null);
});
test('timetable estimates use pool as illustration, not actual carset',()=>{
 const p=pos('1984K','Rinkai',{
  positionSource:'train-timetable',estimated:true,
  actualVehicleConfirmed:false,serviceDate:'2032-08-05'
 });
 const m=mark(p,'Rinkai');
 assert.equal(m.kind,'vehicle');
 assert.equal(m.iconSrc,png71);
 assert.equal(m.illustrative,true);
 assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
});
