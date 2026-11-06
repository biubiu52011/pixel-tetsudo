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
test('production estimator positions use serviceId and directionName, not only calendarType',()=>{
 for(const n of ['1M','923M','525M','823D','8853D']){
  const original=p(n),runtime={...original,serviceId:'odpt.Calendar:Weekday',
   railDirection:original.railDirection.split(':').pop()};
  delete runtime.calendarType;
  assert.ok(idx.verify(runtime),n+' actual runtime calendar source');
  const fleet=idx.resolve(runtime);
  assert.ok(fleet,n+' gallery matches serviceId-only runtime');
  const artwork=root.TrainVehicle.selectMarkerArtwork(runtime,false);
  assert.equal(artwork.kind,'vehicle');
  assert.equal(artwork.iconSrc,fleet.illustrationPng);
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
 ['8853D','HB-E300系（海里）','kairi'],
 ['222M','701系（秋田地区）','shonai-electric-reference'],
 ['225M','701系（秋田地区）','shonai-electric-reference'],
 ['150D','キハ110系','rikuu-west-reference'],
 ['151D','キハ110系','rikuu-west-reference'],
 ['152D','キハ110系','rikuu-west-reference'],
 ['160D','キハ110系','rikuu-west-reference'],
 ['161D','キハ110系','rikuu-west-reference'],
 ['162D','キハ110系','rikuu-west-reference'],
 ['163D','キハ110系','rikuu-west-reference'],
 ['3131D','キハ110系','rikuu-west-reference']
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
 assert.equal(idx.resolve(p('151D')).illustrationModel,'キハ110系',
   '2026-11 Rikuu West 151D has source-backed generic KiHa110 artwork');
 assert.equal(idx.resolve({...p('151D'),displayLineId:'RikutsuWest'}),null);
 assert.equal(idx.resolve({...p('3131D'),trainType:'odpt.TrainType:JR-East.Local'}),null);
 for(const n of ['150D','151D','152D','160D','161D','162D','163D','3131D']){
   const mapped=idx.resolve(p(n));
   assert.equal(mapped.illustrationPng,'../images/列车/JR東日本/JR東日本_キハ110系.png');
   assert.equal(mapped.referenceOnly,true);
 }
 for(const x of [{actualVehicleConfirmed:true},{vehicleIdentityStatus:'EXACT'},
  {vehicleFormationId:'S123'},{realtimeVehicleType:'E653系'},
  {vehiclePlan:{status:'PLANNED_MODEL',confirmed:true,models:['E653系']}}])
  assert.equal(idx.resolve({...p('923M'),...x}),null);
});
test('no unexplained pending mapped vehicles remain in the 143 regular source numbers',()=>{
 for(const [cal,rows] of Object.entries(idx.roster)){
  const day=cal==='Weekday'?'2026-11-06':'2026-11-07';
  const calendarType=cal==='Weekday'?'weekday':'holiday';
  for(const n of Object.keys(rows)){
   const x=p(n,{serviceDate:day,calendarType:calendarType});
   const reference=idx.resolve(x);
   assert.ok(reference,cal+' '+n+' must have a source-scoped fleet reference');
   assert.ok(root.VehicleGaragePngMap.matchModelPath(
     reference.illustrationModel,reference.illustrationPng,'Uetsu'),
     cal+' '+n+' mapped to registered gallery model');
   const art=root.TrainVehicle.selectMarkerArtwork(x,false);
   assert.equal(art.kind,'vehicle',cal+' '+n+' neutral marker not expected');
   assert.equal(art.representativeOnly,true);
   assert.equal(art.actualVehicleConfirmed,false);
  }
 }
});
test('14M Akita–Shibata DOM: confirmed generic E653 family gets scoped Inaho icon',()=>{
 const original=p('14M'),sqlPlan={
  status:'PLANNED_MODEL',confirmed:true,
  lineId:'Uetsu',source:'database-verified-published-plan',
  models:['E653系'],iconPath:''
 };
 const published={
  ...original,serviceDate:'2026-11-06',
  positionLineId:'Uetsu',displayLineId:'Uetsu',
  sourceRailway:'odpt.Railway:JR-East.Uetsu',
  serviceId:'odpt.Calendar:Weekday',
  railDirection:'Inbound',trainType:'odpt.TrainType:JR-East.LimitedExpress',
  vehicleIdentityStatus:'UNKNOWN',
  vehicleResolution:{identityStatus:'UNKNOWN'},
  vehiclePlan:sqlPlan,
  destinationStation:'Shibata',
  plannedTripId:'planned-trip:2026-11-06|JR-East|odpt.Railway:JR-East.Uetsu|Uetsu|14M|odpt.RailDirection:Inbound'
 };
 delete published.calendarType;
 const evidence=idx.verify(published);
 assert.ok(evidence,'14M on 2026-11-06 has the verified source itinerary');
 assert.equal(evidence.origin,'Akita');
 assert.equal(evidence.terminus,'Shibata');
 assert.equal(evidence.trainType,'LimitedExpress');
 const reference=idx.resolve(published);
 assert.ok(reference,'generic E653 planned series must not veto Inaho illustration');
 assert.equal(reference.illustrationModel,'E653系（いなほ）');
 assert.equal(reference.illustrationPng,idx.image.inaho);
 assert.equal(reference.actualVehicleConfirmed,false);
 const artwork=root.TrainVehicle.selectMarkerArtwork(published,false);
 assert.equal(artwork.kind,'vehicle','14M should not remain an unresolved gray dot');
 assert.equal(artwork.iconSrc,idx.image.inaho);
 assert.equal(artwork.planned,true);
 assert.equal(artwork.representativeOnly,true);
 assert.equal(artwork.actualVehicleConfirmed,false);
 assert.equal(root.TrainVehicle.selectMarkerArtwork(published,true).kind,'unresolved',
   'broken PNG does not fall through to another train model');
 // An official series-level E653 designation is compatible; an opposing
 // independently confirmed model is not. No cross-line or realtime leaks.
 for(const n of ['E129系','701系','E653系（水戸地区）','GV-E400系'])
  assert.equal(idx.resolve({...published,
   vehiclePlan:{...sqlPlan,models:[n]}}),null,n+' must stay a conflict');
 assert.equal(idx.resolve({...published,displayLineId:'Hakushin'}),null);
 assert.equal(idx.resolve({...published,vehicleIdentityStatus:'EXACT'}),null);
 assert.equal(idx.resolve({...published,serviceDate:'2026-12-06'}),null);
 for(const name of ['E653系1000番台','E653系（1000番台）']){
  const x={...published,vehiclePlan:{...sqlPlan,models:[name]}};
  assert.equal(root.TrainVehicle.selectMarkerArtwork(x,false).iconSrc,idx.image.inaho,
    name+' is a family alias for verified Inaho only');
 }
});
test('unconfirmed stale SQL 701/E721 candidate never overrides a source-checked number',()=>{
 for(const n of ['1M','923M','525M','823D','150D','222M']){
  const a=p(n),unconfirmed={...a,
    serviceId:'odpt.Calendar:Weekday',
    railDirection:a.railDirection.split(':').pop(),
    vehiclePlan:{status:'PLANNED_MODEL',confirmed:false,
      evidenceRole:'unverified-source-candidate',models:['701系','E721系']}};
  delete unconfirmed.calendarType;
  const reference=idx.resolve(unconfirmed);
  assert.ok(reference,n+' historical candidate cannot veto official mapping');
  const result=root.TrainVehicle.selectMarkerArtwork(unconfirmed,false);
  assert.equal(result.kind,'vehicle',n+' image not shown in true runtime record');
  assert.equal(result.iconSrc,reference.illustrationPng);
  assert.equal(result.actualVehicleConfirmed,false);
  assert.equal(idx.resolve({...unconfirmed,
    vehiclePlan:{...unconfirmed.vehiclePlan,confirmed:true}}),null,
    'independently confirmed contradicting model must not be overridden');
 }
 const renderer=fs.readFileSync('js/trains-render.js','utf8');
 assert.match(renderer,/lineId==="Uetsu" && window\.JREastUetsuNumberIndex202611/);
 assert.match(renderer,/if \(lineId === "Uetsu" && fleetText\)/);
 assert.match(renderer,/caption\.appendChild\(uetsuNote\)/);
});
test('folded Uetsu list derives source-verified terminus even with no SVG direction label',()=>{
 const renderer=fs.readFileSync('js/trains-render.js','utf8');
 const start=renderer.indexOf('  function _uetsuFoldDestinationCaption(');
 const end=renderer.indexOf('  // The fold list only needs',start);
 assert.ok(start>=0&&end>start,'source direction caption helper exists');
 const fnCtx=vm.createContext({window:root,_trainDestText:x=>String(x).split('.').pop()});
 vm.runInContext(renderer.slice(start,end),fnCtx);
 const label=fnCtx._uetsuFoldDestinationCaption;
 const sql=p('525M');
 assert.equal(label(sql,'Uetsu','ja'),'Akita行き');
 assert.equal(label(sql,'Uetsu','zh-CN'),'开往Akita');
 assert.equal(label(sql,'Uetsu','en'),'Akita bound');
 assert.equal(label(sql,'Uetsu','ko'),'Akita행');
 assert.equal(label(sql,'OuMain','ja'),'','foreign display must not borrow Uetsu terminus');
 assert.equal(label({...sql,sourceRailway:'odpt.Railway:JR-East.Hakushin'},'Uetsu','ja'),'');
 assert.equal(label({...sql,scheduledStopKeys:[]},'Uetsu','ja'),'');
 assert.equal(label({...sql,serviceDate:'2026-12-06'},'Uetsu','ja'),'');
 assert.match(renderer,/var captionBase=popupCaption\s*\|\|\s*_uetsuFoldDestinationCaption\(p,lineId,lang\)/,
   'visible SVG label has priority; verified endpoint replaces only the unknown fallback');
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
  'js/train-position-estimator.js','js/trains-render.js']){
  const content=fs.readFileSync(f),sha=crypto.createHash('sha1')
   .update('blob '+content.length+'\0').update(content).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+f+'?v='+sha),f+' stale cache hash');
 }
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 assert.match(estimator,/lineId==="Uetsu" && tt\._positionSource==="supabase-train-run"/);
 assert.match(estimator,/uetsu\.verify\(/);
});
