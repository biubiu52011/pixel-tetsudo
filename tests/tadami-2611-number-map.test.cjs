'use strict';
/* JR East Tadami 2611: official baseline schedule and illustrative family ONLY. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const root={},ctx=vm.createContext({window:root,Date,console:{
  log(){},warn(){},debug(){},error(){}
},_isTrainArtworkFailureActive(){return false}});
for(const path of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'data/timetables/jreast-tadami-2611-number-index.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const roster=root.JREastTadamiNumberIndex202611;
const east='../images/列车/JR東日本/JR東日本_キハE120形_只見線色.png';
const west='../images/列车/JR東日本/JR東日本_キハ110系（只見線）.png';
const endpoints={
 '2421D':['Oshirakawa','Koide'],'423D':['Aizu-Wakamatsu','Koide'],
 '425D':['Aizu-Wakamatsu','Aizu-Kawaguchi'],'427D':['Aizu-Wakamatsu','Koide'],
 '8429D':['Oshirakawa','Koide'],'431D':['Aizu-Wakamatsu','Koide'],
 '433D':['Aizu-Wakamatsu','Aizu-Bange'],'435D':['Aizu-Wakamatsu','Aizu-Kawaguchi'],
 '437D':['Aizu-Wakamatsu','Aizu-Kawaguchi'],
 '422D':['Aizu-Kawaguchi','Aizu-Wakamatsu'],
 '424D':['Aizu-Kawaguchi','Aizu-Wakamatsu'],'426D':['Koide','Aizu-Wakamatsu'],
 '428D':['Aizu-Kawaguchi','Aizu-Wakamatsu'],
 '430D':['Koide','Aizu-Wakamatsu'],'432D':['Aizu-Bange','Aizu-Wakamatsu'],
 '434D':['Koide','Aizu-Wakamatsu'],'8436D':['Koide','Oshirakawa'],
 '2428D':['Koide','Oshirakawa']
};
const dirFor=n=>roster.regular.Weekday.Outbound.includes(n)?'Outbound':'Inbound';
function pos(n,opts={}){
 const day=opts.serviceDate||'2026-11-06',cal=opts.calendarType||'weekday';
 const endpointsFor=endpoints[n]||['Tadami','Koide'];
 return {
  trainNumber:n,positionLineId:'Tadami',displayLineId:'Tadami',
  sourceRailway:'odpt.Railway:JR-East.Tadami',
  trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local',
  railDirection:'odpt.RailDirection:'+dirFor(n),
  serviceDate:day,calendarType:cal,positionSource:'supabase-train-run',
  estimated:true,stationIndex:6,segmentToIndex:7,segmentProgress:.5,
  scheduledStopKeys:endpointsFor.map(x=>'odpt.Station:JR-East.'+x),
  vehicleIdentityStatus:'UNKNOWN',
  ...opts
 };
}
const icon=x=>root.TrainVehicle.selectMarkerArtwork(x,false);
test('official 2611 roster contains 18 weekday, 16 holiday base services',()=>{
 assert.equal(roster.regular.Weekday.Outbound.length,9);
 assert.equal(roster.regular.Weekday.Inbound.length,9);
 assert.equal(roster.regular.SaturdayHoliday.Outbound.length,8);
 assert.equal(roster.regular.SaturdayHoliday.Inbound.length,8);
 const nums=new Set([...roster.regular.Weekday.Outbound,...roster.regular.Weekday.Inbound]);
 assert.equal(nums.size,18);
 for(const number of nums){
   assert.equal(roster.verify(pos(number))!==null,true,number);
 }
 for(const n of ['9423D','9425D','9430D','2422D','421D'])
   assert.equal(roster.verify(pos(n)),null,n);
});
test('Saturday, Sundays and Nov 3/23 public holidays use holiday diagrams',()=>{
 for(const day of ['2026-11-01','2026-11-03','2026-11-07','2026-11-08','2026-11-23']){
   const x=pos('423D',{serviceDate:day,calendarType:'holiday'});
   assert.ok(roster.verify(x),day);
   assert.equal(roster.verify({...x,calendarType:'weekday'}),null);
   assert.equal(roster.verify({...x,trainNumber:'8429D'}),null);
 }
 assert.ok(roster.verify(pos('8429D')));
 assert.ok(roster.verify(pos('8436D')));
 assert.equal(roster.verify(pos('8436D',{serviceDate:'2026-11-07',calendarType:'holiday'})),null);
 assert.equal(roster.verify(pos('423D',{serviceDate:'2026-12-02'})),null);
 assert.equal(roster.verify(pos('423D',{serviceDate:'2026-10-31',calendarType:'holiday'})),null);
});
test('number-only, wrong source, wrong operator and station span cannot fabricate a service',()=>{
 const base=pos('423D');
 for(const change of [
 {sourceRailway:'odpt.Railway:JR-East.Suigun'},
 {positionLineId:'Ome'},{positionSource:'realtime-api'},
 {trainOperator:'JR-West'},{trainType:'odpt.TrainType:JR-East.Rapid'},
 {railDirection:'odpt.RailDirection:Inbound'},
 {scheduledStopKeys:['Aizu-Wakamatsu','Aizu-Kawaguchi']},
 {scheduledStopKeys:['Koide','Aizu-Wakamatsu']},
 {scheduledStopKeys:[]}
 ])assert.equal(roster.verify({...base,...change}),null,JSON.stringify(change));
 assert.ok(roster.verify(base));
});
test('illustrative E120 east and KiHa110 west; never actual confirmed consist',()=>{
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハE120形',east,'Tadami'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハ110系',west,'Tadami'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハ110系',west,'Suigun'),false);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('キハE120形',east,'Ome'),false);
 for(const [index,asset,model] of [[6,east,'キハE120形'],[30,west,'キハ110系']]){
  const sample=pos('423D',{stationIndex:index,segmentToIndex:index+1});
  const art=icon(sample),match=root.TrainNumberPngRanges.match(sample.trainNumber,'Tadami',sample);
  assert.equal(art.iconSrc,asset,index+' icon');
  assert.equal(match.model,model);
  assert.equal(art.kind,'vehicle');
  assert.equal(art.illustrative,true);
  assert.equal(art.representativeOnly,true);
  assert.equal(art.actualVehicleConfirmed,false);
  assert.equal(root.JREastTadamiNumberIndex202611.resolve(sample).authorizesPNG,false);
 }
});
test('no fake fleet for undated specials, foreign line, exact car or failed PNG',()=>{
 const p=pos('423D');
 for(const change of [
  {trainNumber:'9423D'},{calendarType:'holiday'},
  {displayLineId:'Suigun'},
  {vehicleIdentityStatus:'EXACT'}, {actualVehicleConfirmed:true},
  {vehicleResolvedFromRealtime:true},{vehicleFormationId:'A1'},
  {realtimeVehicleType:'キハ110系'},
  {stationIndex:36},{stationIndex:-1},{segmentToIndex:36},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['E233系']}}
 ])assert.equal(icon({...p,...change}).kind,'unresolved',JSON.stringify(change));
 assert.equal(root.TrainVehicle.selectMarkerArtwork(p,true).kind,'unresolved');
});
test('static manifest, cold loader and SHA asset revisions are complete',()=>{
 const manifest=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
 const path='data/timetables/jreast-tadami-2611-number-index.js';
 assert.equal(manifest.lazy.trains.filter(x=>x===path).length,1);
 assert.deepEqual(manifest.lazyScopes.trains[path],['Tadami']);
 assert.equal(manifest.lazy.trains.indexOf(path),
  manifest.lazy.trains.indexOf('data/timetables/jreast-suigun-2611-number-index.js')+1);
 const page=fs.readFileSync('pages/trains.html','utf8');
 assert.match(page,/jreast-tadami-2611-number-index\.js\?v=[a-f0-9]{12}" data-line-scope="Tadami"/);
 assert.match(fs.readFileSync('js/trains-detail-loader.js','utf8'),
  /scope\.split\(","\)\.indexOf\(id\)/);
 for(const asset of [path,'data/timetables/vehicle-garage-png-map.js','js/train-position-estimator.js']){
  const b=fs.readFileSync(asset),sha=crypto.createHash('sha1')
   .update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
  assert.ok(page.includes('../'+asset+'?v='+sha),asset);
 }
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 assert.match(estimator,/lineId==="Tadami"&&tt\._positionSource==="supabase-train-run"/);
 assert.match(estimator,/tadamiIndex\.verify\(/);
});
