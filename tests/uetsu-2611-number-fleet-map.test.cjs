'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const root={},ctx=vm.createContext({window:root,Date,Set,console:{
 log(){},debug(){},warn(){},error(){}
}});
for(const file of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/train-number-png-ranges.js',
 'data/timetables/jreast-uetsu-2611-number-index.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const idx=root.JREastUetsuNumberIndex202611,route=idx.stations;
function p(n,opts={}){
 const day=opts.serviceDate||'2026-11-06',cal=opts.calendarType||'weekday',
 calendar=cal==='weekday'?'Weekday':'SaturdayHoliday';
 const r=idx.roster[calendar][n]||idx.roster.Weekday[n];
 assert.ok(r,'source record '+n);
 const a=route.indexOf(r[0]),b=route.indexOf(r[1]);
 const stops=Array.from({length:r[2]},(_,i)=>'odpt.Station:JR-East.'+
  route[Math.round(a+(b-a)*i/(r[2]-1))]);
 return {trainNumber:n,positionLineId:'Uetsu',displayLineId:'Uetsu',
  sourceRailway:'odpt.Railway:JR-East.Uetsu',
  trainOperator:'JR-East',
  railDirection:'odpt.RailDirection:'+r[3],
  trainType:'odpt.TrainType:JR-East.'+r[4],
  calendarType:cal,serviceDate:day,
  positionSource:'supabase-train-run',estimated:true,
  scheduledStopKeys:stops,
  stationIndex:Math.min(a,b),segmentToIndex:Math.min(a,b)+1,
  vehicleIdentityStatus:'UNKNOWN',...opts};
}
test('60 stations, 143 historical/filtered SQL source numbers per calendar',()=>{
 assert.equal(route.length,60);
 assert.equal(route[0],'Niitsu');
 assert.equal(route[59],'Akita');
 assert.equal(route[37],'Sakata');
 assert.equal(Object.keys(idx.roster.Weekday).length,143);
 assert.equal(Object.keys(idx.roster.SaturdayHoliday).length,143);
 for(const n of ['1M','2M','3M','4M','5M','6M','7M',
  '8M','9M','10M','11M','12M','13M','14M'])
  assert.ok(idx.verify(p(n)),n+' regular Inaho');
});
test('all source entries match direction, stop length and calendar for SQL evidence',()=>{
 for(const [calendar,dict] of Object.entries(idx.roster)){
  const opts={serviceDate:calendar==='Weekday'?'2026-11-06':'2026-11-07',
   calendarType:calendar==='Weekday'?'weekday':'holiday'};
  for(const n of Object.keys(dict)){
   if((n==='8853D'||n==='8854D')&&!idx.kairiDays.includes(opts.serviceDate))
    continue;
   const x=p(n,opts),result=idx.verify(x);
   assert.ok(result,n+' '+calendar+' candidate source verified');
   assert.equal(result.actualVehicleConfirmed,false);
   assert.equal(result.sourceClocksVerified,false);
  }
 }
});
test('date-scoped special Kairi, and 8xxx/9xxx extras are never daily services',()=>{
 assert.ok(idx.verify(p('8853D',{serviceDate:'2026-11-06'})));
 assert.ok(idx.verify(p('8853D',{serviceDate:'2026-11-07',calendarType:'holiday'})));
 assert.ok(idx.verify(p('8854D',{serviceDate:'2026-11-29',calendarType:'holiday'})));
 for(const d of ['2026-11-02','2026-11-04','2026-11-09','2026-11-23']){
  assert.equal(idx.verify(p('8853D',{serviceDate:d,calendarType:d.endsWith('23')?'holiday':'weekday'})),null);
 }
 for(const n of ['8055M','9083M','9883D','9539M','9011M','8005M','8852D']){
   assert.equal(idx.roster.SaturdayHoliday[n],undefined,'seasonal '+n+' excluded');
 }
 assert.equal(idx.verify(p('525M',{serviceDate:'2026-11-07',calendarType:'weekday'})),null);
 assert.equal(idx.verify(p('525M',{serviceDate:'2026-12-01'})),null);
});
test('source scope and complete original station sequence required',()=>{
 const x=p('525M');
 for(const change of [
  {positionLineId:'Hakushin'},
  {displayLineId:'OuMain'},
  {sourceRailway:'odpt.Railway:JR-East.Hakushin'},
  {trainOperator:'JR-West'},{positionSource:'realtime-api'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
  {scheduledStopKeys:x.scheduledStopKeys.slice(1)},
  {scheduledStopKeys:x.scheduledStopKeys.slice().reverse()},
  {scheduledStopKeys:x.scheduledStopKeys.map((s,i)=>i===3?
    'odpt.Station:JR-East.Aomori':s)}
 ])assert.equal(idx.verify({...x,...change}),null,JSON.stringify(change));
 const dup=p('556M');
 assert.ok(idx.verify(dup));
 assert.equal(idx.verify({...dup,scheduledStopKeys:dup.scheduledStopKeys.slice(2)}),null);
});
test('five models use existing source-scoped references, not confirmed trainsets',()=>{
 const cases=[
 ['1M','E653系（いなほ）','inaho'],
 ['923M','E129系','e129'],
 ['823D','GV-E400系','diesel'],
 ['525M','701系（秋田地区）','akita'],
 ['8853D','HB-E300系（海里）','kairi']
 ];
 for(const [n,model,family] of cases){
  const x=p(n),out=idx.resolve(x);
  assert.ok(out,n);
  assert.equal(out.illustrationModel,model);
  assert.equal(out.family,family);
  assert.equal(out.actualVehicleConfirmed,false);
  assert.equal(out.referenceOnly,true);
  assert.equal(out.authorizesPNG,false);
  const entry=root.TrainNumberPngRanges.match(n,'Uetsu',x);
  assert.equal(entry.pngPath,out.illustrationPng);
  assert.equal(root.VehicleGaragePngMap.matchModelPath(model,out.illustrationPng,'Uetsu'),true);
  const art=root.TrainVehicle.selectMarkerArtwork(x,false);
  assert.equal(art.kind,'vehicle',n);
  assert.equal(art.iconSrc,out.illustrationPng);
  assert.equal(art.representativeOnly,true);
  assert.equal(art.actualVehicleConfirmed,false);
 }
 assert.equal(idx.resolve(p('151D')),null,'Rikuu West stock not guessed');
 for(const x of [{actualVehicleConfirmed:true},{vehicleIdentityStatus:'EXACT'},
  {vehicleFormationId:'S123'},{realtimeVehicleType:'E653系'},
  {vehiclePlan:{status:'PLANNED_MODEL',models:['E653系']}}])
  assert.equal(idx.resolve({...p('923M'),...x}),null);
});
test('lazy HTML version and estimator guard are synchronized with Git blob SHAs',()=>{
 const m=JSON.parse(fs.readFileSync('scripts/page-scripts.json','utf8'));
 const file='data/timetables/jreast-uetsu-2611-number-index.js';
 assert.deepEqual(m.lazyScopes.trains[file],['Uetsu']);
 assert.equal(m.lazy.trains.filter(x=>x===file).length,1);
 assert.equal(m.lazy.trains.indexOf(file),
  m.lazy.trains.indexOf('data/timetables/jreast-tsugaru-2611-number-index.js')+1);
 const html=fs.readFileSync('pages/trains.html','utf8');
 assert.match(html,/jreast-uetsu-2611-number-index\.js\?v=[a-f0-9]{12}" data-line-scope="Uetsu"/);
 for(const f of [file,'data/timetables/vehicle-garage-png-map.js',
  'js/train-position-estimator.js']){
  const content=fs.readFileSync(f),sha=crypto.createHash('sha1')
   .update('blob '+content.length+'\0').update(content).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+f+'?v='+sha),f+' stale cache hash');
 }
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 assert.match(estimator,/lineId==="Uetsu" && tt\._positionSource==="supabase-train-run"/);
 assert.match(estimator,/uetsu\.verify\(/);
});
