'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const ctx=vm.createContext({window:{},console});
for(const f of ['data/timetables/vehicle-garage-png-map.js',
  'data/timetables/tobu-kiryu-2611-number-png.js',
  'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
  vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f,timeout:15000});
const w=ctx.window;
function p(n,ex={}){
 return {positionLineId:'Kiryu',displayLineId:'Kiryu',
 sourceRailway:'odpt.Railway:Tobu.Kiryu',trainOperator:'Tobu',
 trainNumber:n,trainType:'odpt.TrainType:Tobu.Local',
 railDirection:Number(n.slice(0,3))%2?'odpt.RailDirection:Outbound':'odpt.RailDirection:Inbound',
 positionSource:'supabase-train-run',estimated:true,calendarType:'holiday',
 serviceDate:'2026-11-15',vehicleIdentityStatus:'UNKNOWN',...ex};
}
test('Kiryu historical SQL numbers have 50 locals + 32 ambiguous limited expresses',()=>{
 assert.equal(w.TobuKiryu2611Png.sourceTemplates,164);
 assert.equal(w.TobuKiryu2611Png.localNumbersPerCalendar,50);
 for(let n=795;n<=855;n++)
  assert.equal(w.TobuKiryu2611Png.hasPublishedNumber(n+'E'),n>=801&&n<=850);
 for(const n of ['800E','851E','1806','1838','801','801A'])
  assert.equal(w.TobuKiryu2611Png.hasPublishedNumber(n),false);
});
test('local PNG is always a Kiryu-scoped reference, not a physical train',()=>{
 for(const n of ['801E','802E','839E','850E']){
  for(const calendarType of ['weekday','holiday']){
   const pos=p(n,{calendarType}),hit=w.TrainNumberPngRanges.match(n,'Kiryu',pos);
   assert.ok(hit,n+'/'+calendarType);
   assert.equal(hit.referenceOnly,true);assert.equal(hit.actualVehicleConfirmed,false);
   assert.equal(hit.authorizesDatedService,false);assert.equal(hit.illustrative,true);
   assert.equal(hit.sourceEdition,'historical-undated');
   assert.equal(w.VehicleGaragePngMap.matchModelPath(hit.model,hit.pngPath,'Kiryu'),true);
   const marker=w.TrainVehicle.selectMarkerArtwork(pos,false);
   assert.equal(marker.kind,'vehicle');assert.equal(marker.iconSrc,hit.pngPath);
   assert.equal(marker.actualVehicleConfirmed,false);
  }
 }
});
test('guard rejects other railways, other dates, physical evidence, and express without proof',()=>{
 const changes=[
 {positionLineId:'Sano'},{displayLineId:'Koizumi'},
 {sourceRailway:'odpt.Railway:Tobu.Koizumi'},{trainOperator:'JR-East'},
 {positionSource:'realtime-api'},{estimated:false},{serviceDate:'2026-12-01'},
 {calendarType:'?'},{trainType:'odpt.TrainType:Tobu.LimitedExpress'},
 {railDirection:'odpt.RailDirection:Inbound'},{vehicleIdentityStatus:'EXACT'},
 {vehicleResolvedUpstream:true},{vehicleResolvedFromRealtime:true},
 {actualVehicleConfirmed:true},{vehicleFormationId:'11258F'},
 {vehicleFormationConflict:true},{vehicleFormationCandidates:['11258F']},
 {realtimeVehicleType:'東武800型'},{vehiclePlan:{confirmed:true}},
 {vehiclePlan:{models:['東武200型']}}
 ];
 changes.forEach(x=>assert.equal(w.TrainNumberPngRanges.match('801E','Kiryu',p('801E',x)),null,JSON.stringify(x)));
 assert.equal(w.TrainNumberPngRanges.match('1806','Kiryu',p('1806',{trainType:'odpt.TrainType:Tobu.LimitedExpress'})),null);
});
test('canonical line and generated mirrors, source-only through boundary, spelling',()=>{
 const source=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
 const k=source.lines.Kiryu,b=source.lines.KoizumiBranch;
 assert.equal(k.color,'#2B8ACD');assert.equal(k.presentation.color,k.color);
 assert.deepEqual(k.durations,[4,4,4,4,3,5,4]);
 assert.equal(k.durationDerivation.timetableDateVerified,false);
 assert.equal(k.durationTotalMin,null);
 assert.ok(k.throughServices.includes('KoizumiBranch')&&b.throughServices.includes('Kiryu'));
 assert.ok(k.serviceBoundaries.some(x=>x.lineId==='KoizumiBranch'&&x.serviceScope==='selected-local'&&x.handoverStations.includes('Ota')));
 assert.ok(b.serviceBoundaries.some(x=>x.lineId==='Kiryu'&&x.handoverStations.includes('Ota')));
 assert.equal(k.externalTransfers.find(x=>x.station==='Aioi').routeEdge,false);
 assert.deepEqual(JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8')).lines.Kiryu,k);
 assert.equal(JSON.parse(fs.readFileSync('data/core/station_i18n.json','utf8'))['Jiromaru-bashi'].en,'Jiroembashi');
});
test('Kiryu index is lazily loaded before central number matcher with git blob hash',()=>{
 const manifest=require('../scripts/page-scripts.json'),a='data/timetables/tobu-kiryu-2611-number-png.js';
 const ix=manifest.lazy.trains.indexOf(a);
 assert.ok(ix>manifest.lazy.trains.indexOf('data/timetables/tobu-sano-2611-number-png.js'));
 assert.ok(ix<manifest.lazy.trains.indexOf('data/timetables/train-number-png-ranges.js'));
 assert.deepEqual(manifest.lazyScopes.trains[a],['Kiryu']);
 const html=fs.readFileSync('pages/trains.html','utf8');
 for(const file of [a,'data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js']){
  const buf=Buffer.from(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),'utf8');
  const sha=crypto.createHash('sha1').update('blob '+buf.length+'\0').update(buf).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+file+'?v='+sha),file);
 }
});
