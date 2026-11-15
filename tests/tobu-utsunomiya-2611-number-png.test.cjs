'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const ctx=vm.createContext({window:{},console});
for(const file of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/tobu-utsunomiya-2611-number-png.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file,timeout:15000});
const root=ctx.window;
function run(n,ex={}){
 return {positionLineId:'TobuUtsunomiya',displayLineId:'TobuUtsunomiya',
  sourceRailway:'odpt.Railway:Tobu.Utsunomiya',trainOperator:'Tobu',
  trainNumber:n,trainType:'odpt.TrainType:Tobu.Local',
  railDirection:'odpt.RailDirection:'+(Number(n.slice(0,3))%2?'Outbound':'Inbound'),
  positionSource:'supabase-train-run',estimated:true,
  calendarType:'holiday',serviceDate:'2026-11-15',vehicleIdentityStatus:'UNKNOWN',...ex};
}
test('exact 86 SQL service numbers and no neighboring extrapolation',()=>{
 assert.equal(root.TobuUtsunomiya2611Png.numbersPerCalendar,86);
 assert.equal(root.TobuUtsunomiya2611Png.sourceTemplates,172);
 for(let n=395;n<=491;n++)
  assert.equal(root.TobuUtsunomiya2611Png.hasPublishedNumber(n+'N'),n>=401&&n<=486,n);
 for(const n of ['400N','487N','0401N','401','401E','401NA','1501N'])
  assert.equal(root.TobuUtsunomiya2611Png.hasPublishedNumber(n),false,n);
});
test('number bands are explicit, parity-separated and limited to their own railway',()=>{
 const reg=root.TobuUtsunomiya2611Png;
 const ranges=reg.ranges;
 assert.equal(ranges.length,2);
 assert.equal(ranges[0].first,'401N');
 assert.equal(ranges[0].last,'485N');
 assert.equal(ranges[0].railDirection,'Outbound');
 assert.equal(ranges[0].origin,'Shin-Tochigi');
 assert.equal(ranges[0].destination,'Tobu-Utsunomiya');
 assert.equal(ranges[1].first,'402N');
 assert.equal(ranges[1].last,'486N');
 assert.equal(ranges[1].railDirection,'Inbound');
 assert.equal(ranges[1].origin,'Tobu-Utsunomiya');
 assert.equal(ranges[1].destination,'Shin-Tochigi');
 assert.equal(ranges[0].count+ranges[1].count,reg.numbersPerCalendar);
 assert.ok(Object.isFrozen(ranges));
 for(const range of ranges){
  assert.ok(Object.isFrozen(range));
  assert.equal(range.step,2);
  assert.equal(range.count,(range.max-range.min)/range.step+1);
  for(let i=range.min;i<=range.max;i+=range.step){
   const value=reg.rangeFor(i+'N');
   assert.equal(value,range,i+'N');
   assert.equal(reg.hasPublishedNumber(i+'N'),true);
  }
 }
 for(const invalid of ['400N','487N','499N','401D','0401N','401','1N','401NN']){
  assert.equal(reg.rangeFor(invalid),null,invalid);
 }
});
test('20400 PNG is a reference for all 86 numbers in both source calendars',()=>{
 for(let n=401;n<=486;n++)for(const calendarType of ['weekday','holiday']){
  const number=n+'N';const position=run(number,{calendarType});
  const value=root.TrainNumberPngRanges.match(number,'TobuUtsunomiya',position);
  assert.ok(value,number+'/'+calendarType);
  assert.equal(value.model,'東武20400型');
  const band=root.TobuUtsunomiya2611Png.rangeFor(number);
  assert.equal(value.rangeId,band.id);
  assert.equal(value.rangeFirst,band.first);
  assert.equal(value.rangeLast,band.last);
  assert.equal(value.rangeStep,2);
  assert.equal(value.rangeCount,43);
  assert.equal(value.expectedDirection,n%2?'Outbound':'Inbound');
  assert.equal(value.sourceCalendar,calendarType);
  assert.equal(value.sourceEdition,'historical-undated');
  assert.equal(value.referenceOnly,true);
  assert.equal(value.illustrative,true);
  assert.equal(value.actualVehicleConfirmed,false);
  assert.equal(value.authorizesDatedService,false);
  assert.equal(value.authorizesPhysicalVehicle,false);
  assert.ok(value.pngPath.endsWith('東武鉄道_20400型.png'));
  assert.equal(root.VehicleGaragePngMap.matchModelPath(value.model,value.pngPath,'TobuUtsunomiya'),true);
  const marker=root.TrainVehicle.selectMarkerArtwork(position,false);
  assert.equal(marker.kind,'vehicle',number);
  assert.equal(marker.iconSrc,value.pngPath);
  assert.equal(marker.actualVehicleConfirmed,false);
 }
});
test('reject wrong line/calendar/vehicle/physical identity; image retry is neutral',()=>{
 const p=run('401N');
 const cases=[
 {positionLineId:'TobuNikko'},{displayLineId:'TobuNikko'},
 {sourceRailway:'odpt.Railway:Tobu.Nikko'},{trainOperator:'JR-East'},
 {positionSource:'realtime-api'},{positionSource:'train-timetable'},
 {estimated:false},{serviceDate:'2026-10-31'},{serviceDate:'2026-12-01'},
 {calendarType:'unknown'},{trainType:'odpt.TrainType:Tobu.LimitedExpress'},
 {railDirection:'odpt.RailDirection:Inbound'},
 {vehicleIdentityStatus:'EXACT'},{vehicleResolvedUpstream:true},
 {vehicleResolvedFromRealtime:true},{actualVehicleConfirmed:true},
 {vehicleFormationId:'20411F'},{vehicleFormationConflict:true},
 {vehicleFormationCandidates:['20411F']},{realtimeVehicleType:'東武10000型'},
 {vehiclePlan:{models:['東武10000型']}},{vehiclePlan:{confirmed:true,models:['東武20400型']}}
 ];
 for(const bad of cases)
  assert.equal(root.TrainNumberPngRanges.match('401N','TobuUtsunomiya',{...p,...bad}),null,JSON.stringify(bad));
 assert.equal(root.TrainNumberPngRanges.match('401N','TobuNikko',p),null);
 assert.equal(root.TrainVehicle.selectMarkerArtwork(p,true).kind,'unresolved');
});
test('canonical geometry and conditional boundary are synchronized across formats',()=>{
 const raw=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
 const compact=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
 const u=raw.lines.TobuUtsunomiya,n=raw.lines.TobuNikko;
 assert.equal(u.stations.length,11);
 assert.deepEqual(u.durations,[3,3,3,4,3,2,4,3,3,3]);
 assert.deepEqual(u.durationDerivation.sampleCountsBySegment,Array(10).fill(86));
 assert.equal(u.durationDerivation.timetableDateVerified,false);
 assert.equal(u.durationDerivation.sourceRevisionVerified,false);
 assert.equal(u.durationTotalMin,null);
 for(const [source,target] of [[u,'TobuNikko'],[n,'TobuUtsunomiya']]){
  assert.ok(source.throughServices.includes(target));
  const b=source.serviceBoundaries.find(x=>x.lineId===target);
  assert.ok(b);
  assert.deepEqual(b.handoverStations,['Shin-Tochigi']);
  assert.equal(b.serviceScope,'selected-local-destination-only');
  assert.equal(b.evidence.physicalContinuationVerified,false);
 }
 assert.equal(u.nameJa,'東武宇都宮線');
 assert.equal(u.nameZh,'东武宇都宫线');
 assert.equal(u.nameEn,'Tobu Utsunomiya Line');
 assert.equal(u.nameKo,'도부 우츠노미야선');
 assert.equal(raw.lines.UtsunomiyaJR.nameZh,'宇都宫线');
 const outside=u.transferStations.find(t=>t.station==='Tobu-Utsunomiya'&&t.lineId==='UtsunomiyaJR');
 assert.ok(outside);
 assert.equal(outside.type,'out');
 assert.equal(outside.toStation,'Utsunomiya');
 assert.equal(outside.note,'徒歩約25分');
 assert.deepEqual(compact.lines.TobuUtsunomiya,u);
 assert.deepEqual(compact.lines.TobuNikko,n);
 const bytes=JSON.stringify(raw).replace(/<\/script/gi,'<\\/script');
 assert.equal(fs.readFileSync('data/core/railway-data.file.js','utf8'),
  'window.RAILWAY_DATA = '+bytes+';\n');
});
test('date proof gate for current SQL projections and conservative through label',()=>{
 const config=fs.readFileSync('data/core/runtime-config.js','utf8');
 assert.match(config,/TobuUtsunomiya:\s*Object\.freeze\(\["\*"\]\)/);
 const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
 assert.match(estimator,/requireSqlDateProof\s*&&\s*tt\._timetableDateVerified!==true/);
 const through=fs.readFileSync('js/through-chip.js','utf8');
 assert.match(through,/throughScope\s*!==\s*"selected-local-destination-only"/);
});
test('PNG mapper is lazy-loaded before central matcher and page hashes match',()=>{
 const manifest=require('../scripts/page-scripts.json');
 const asset='data/timetables/tobu-utsunomiya-2611-number-png.js';
 const matcher='data/timetables/train-number-png-ranges.js';
 assert.ok(manifest.lazy.trains.indexOf(asset)<manifest.lazy.trains.indexOf(matcher));
 assert.deepEqual(manifest.lazyScopes.trains[asset],['TobuUtsunomiya']);
 const html=fs.readFileSync('pages/trains.html','utf8');
 for(const path of [asset,matcher,'js/trains-data.js']){
  const b=Buffer.from(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n'),'utf8');
  const sha=crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+path+'?v='+sha),path);
 }
 assert.match(html,/tobu-utsunomiya-2611-number-png\.js\?v=[a-f0-9]{12}" data-line-scope="TobuUtsunomiya"/);
});
