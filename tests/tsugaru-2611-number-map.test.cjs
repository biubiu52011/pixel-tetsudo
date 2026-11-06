'use strict';
/* Official November 2026 Tsugaru 11-station railway, 701 source map. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const root={},ctx=vm.createContext({window:root,Date,console:{
 debug(){},warn(){},log(){},error(){}
}});
for(const path of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'data/timetables/jreast-tsugaru-2611-number-index.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const idx=root.JREastTsugaruNumberIndex202611;
const image='../images/列车/JR東日本/JR東日本_701系_秋田地区.png';
function p(number,options={}){
 const day=options.serviceDate||'2026-11-06';
 const calendar=options.calendarType||'weekday';
 const dir=idx.board.Outbound[number]?'Outbound':'Inbound';
 const source=idx.board[dir][number]||['06:17','06:52'];
 return {
  trainNumber:number,positionLineId:'Tsugaru',displayLineId:'Tsugaru',
  sourceRailway:'odpt.Railway:JR-East.Tsugaru',
  trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local',
  railDirection:'odpt.RailDirection:'+dir,
  calendarType:calendar,serviceDate:day,
  positionSource:'supabase-train-run',estimated:true,
  scheduledStopKeys:(dir==='Outbound'
   ?[...idx.openStations]:[...idx.openStations].reverse())
   .map(x=>'odpt.Station:JR-East.'+x),
  stationIndex:4,segmentToIndex:5,segmentProgress:.5,
  firstDepartureClock:source[0],lastArrivalClock:source[1],
  vehicleIdentityStatus:'UNKNOWN',...options
 };
}
test('18 numbered official runs span exactly Aomori–Kanita, no closure north',()=>{
 assert.equal(Object.keys(idx.board.Outbound).length,9);
 assert.equal(Object.keys(idx.board.Inbound).length,9);
 assert.equal(idx.openStations.length,11);
 assert.equal(idx.openStations[0],'Aomori');
 assert.equal(idx.openStations[10],'Kanita');
 assert.equal(idx.closedAfter,'Kanita');
 const numbers=[...Object.keys(idx.board.Outbound),...Object.keys(idx.board.Inbound)];
 assert.equal(new Set(numbers).size,18);
 for(const n of numbers){
  const x=p(n),proof=idx.verify(x);
  assert.ok(proof,n);
  assert.equal(proof.lastStation,x.railDirection.endsWith('Outbound')?'Kanita':'Aomori');
  assert.equal(proof.firstClock,idx.board[x.railDirection.split(':').pop()][n][0]);
  assert.equal(proof.lastClock,idx.board[x.railDirection.split(':').pop()][n][1]);
 }
 for(const n of ['321M','323M','340M','342M','4632M','832M','701M','327D']){
  const x=p('325M',{trainNumber:n});
  assert.equal(idx.verify(x),null,'unsupported '+n);
 }
});
test('324M runs Mon–Sat but not Sun and official holidays; other 17 continue',()=>{
 for(const day of ['2026-11-02','2026-11-04','2026-11-06'])
  assert.ok(idx.verify(p('324M',{serviceDate:day,calendarType:'weekday'})),day);
 for(const day of ['2026-11-07','2026-11-14','2026-11-21','2026-11-28'])
  assert.ok(idx.verify(p('324M',{serviceDate:day,calendarType:'holiday'})),day+' Sat');
 for(const day of ['2026-11-01','2026-11-03','2026-11-08','2026-11-15',
  '2026-11-22','2026-11-23','2026-11-29']){
  assert.equal(idx.verify(p('324M',{serviceDate:day,calendarType:'holiday'})),null,day);
  assert.ok(idx.verify(p('322M',{serviceDate:day,calendarType:'holiday'})),day);
 }
 assert.equal(idx.verify(p('324M',{serviceDate:'2026-11-07',calendarType:'weekday'})),null);
 assert.equal(idx.verify(p('325M',{serviceDate:'2026-12-01'})),null);
 assert.equal(idx.verify(p('325M',{serviceDate:'2026-10-31',calendarType:'holiday'})),null);
});
test('origin/terminus clocks match official 2026-11 280 up/down timetable',()=>{
 const pairs={325:['06:17','06:52'],329:['11:01','11:39'],331:['13:16','13:51'],
  332:['14:14','14:54'],338:['19:08','19:43']};
 for(const [n,times] of Object.entries(pairs)){
  const x=p(n+'M');
  assert.deepEqual(Array.from(idx.board[x.railDirection.split(':').pop()][n+'M']),times);
  assert.ok(idx.verify(x));
  assert.equal(idx.verify({...x,firstDepartureClock:'00:01'}),null);
  assert.equal(idx.verify({...x,lastArrivalClock:'00:02'}),null);
 }
});
test('SQL source, station order and timetable railway identity are mandatory',()=>{
 const x=p('325M');
 for(const alt of [
  {positionLineId:'OuMain'},{sourceRailway:'odpt.Railway:JR-East.OuMain'},
  {displayLineId:'OuMain'}, {positionSource:'realtime-api'},
  {estimated:false},{trainType:'odpt.TrainType:JR-East.Rapid'},
  {trainOperator:'JR-West'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {scheduledStopKeys:[]},
  {scheduledStopKeys:x.scheduledStopKeys.slice(0,10)},
  {scheduledStopKeys:x.scheduledStopKeys.concat(['odpt.Station:JR-East.Naka-Oguni'])},
  {scheduledStopKeys:x.scheduledStopKeys.map((v,i)=>i===5?'odpt.Station:JR-East.Minmaya':v)},
  {scheduledStopKeys:x.scheduledStopKeys.slice().reverse()}
 ]){
  assert.equal(idx.resolve({...x,...alt}),null,JSON.stringify(alt));
 }
});
test('railway diagram never projects a marker on suspended Kanita–Minmaya',()=>{
 for(const ix of [11,12,13,17,18,-1]){
  const x=p('325M',{stationIndex:ix,segmentToIndex:ix});
  assert.equal(idx.resolve(x),null,ix+' beyond open section');
 }
 assert.equal(idx.resolve(p('325M',{stationIndex:10,segmentToIndex:11})),null);
 assert.equal(idx.resolve(p('325M',{stationIndex:10,segmentToIndex:10})).illustrationModel,
   '701系（秋田地区）');
});
test('existing 701 Akita picture is illustrative, never an EXACT physical consist',()=>{
 assert.equal(root.VehicleGaragePngMap.matchModelPath('701系（秋田地区）',image,'Tsugaru'),true);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('701系（秋田地区）',image,'Tazawako'),false);
 assert.equal(root.VehicleGaragePngMap.matchModelPath('701系（秋田地区）',image,'OuMain'),false);
 const x=p('332M');
 const match=root.TrainNumberPngRanges.match(x.trainNumber,'Tsugaru',x);
 assert.equal(match.pngPath,image);
 assert.equal(match.model,'701系（秋田地区）');
 assert.equal(match.referenceOnly,true);
 assert.equal(match.illustrative,true);
 const art=root.TrainVehicle.selectMarkerArtwork(x,false);
 assert.equal(art.kind,'vehicle');
 assert.equal(art.iconSrc,image);
 assert.equal(art.illustrative,true);
 assert.equal(art.representativeOnly,true);
 assert.equal(art.actualVehicleConfirmed,false);
 assert.equal(idx.resolve(x).authorizesPNG,false);
 for(const change of [
  {actualVehicleConfirmed:true},{vehicleIdentityStatus:'EXACT'},
  {vehicleResolvedFromRealtime:true},{vehicleFormationId:'A1'},
  {realtimeVehicleType:'701系'},{vehicleResolution:{identityStatus:'EXACT'}},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['GV-E400系']}},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['701系5000番台']}}
 ])assert.equal(idx.resolve({...x,...change}),null,JSON.stringify(change));
 assert.equal(root.TrainVehicle.selectMarkerArtwork(x,true).kind,'unresolved');
});
test('cold lazy loader, source dates and HTML version fingerprints stay coherent',()=>{
 const manifest=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
 const path='data/timetables/jreast-tsugaru-2611-number-index.js';
 assert.deepEqual(manifest.lazyScopes.trains[path],['Tsugaru']);
 assert.equal(manifest.lazy.trains.filter(s=>s===path).length,1);
 assert.equal(manifest.lazy.trains.indexOf(path),
  manifest.lazy.trains.indexOf('data/timetables/jreast-tazawako-2611-number-index.js')+1);
 const html=fs.readFileSync('pages/trains.html','utf8');
 assert.match(html,/jreast-tsugaru-2611-number-index\.js\?v=[a-f0-9]{12}" data-line-scope="Tsugaru"/);
 for(const f of [path,'js/train-position-estimator.js',
  'data/timetables/vehicle-garage-png-map.js']){
  const b=fs.readFileSync(f),hash=crypto.createHash('sha1')
    .update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+f+'?v='+hash),f+' correct SHA');
 }
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 assert.match(estimator,/lineId==="Tsugaru"&&tt\._positionSource==="supabase-train-run"/);
 assert.match(estimator,/tsugaruIndex\.verify\(/);
 assert.match(estimator,/lastArrivalClock:/);
 assert.match(estimator,/firstDepartureClock:/);
});
