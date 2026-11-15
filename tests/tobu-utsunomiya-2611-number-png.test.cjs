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
test('20400 PNG is a reference for all 86 numbers in both source calendars',()=>{
 for(let n=401;n<=486;n++)for(const calendarType of ['weekday','holiday']){
  const number=n+'N';const position=run(number,{calendarType});
  const value=root.TrainNumberPngRanges.match(number,'TobuUtsunomiya',position);
  assert.ok(value,number+'/'+calendarType);
  assert.equal(value.model,'東武20400型');
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
 const through=fs.readFileSync('js/trains-data.js','utf8');
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
