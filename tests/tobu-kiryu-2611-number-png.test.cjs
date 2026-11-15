'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const ctx=vm.createContext({window:{},console});
for(const f of ['data/timetables/vehicle-garage-png-map.js',
  'data/timetables/tobu-isesaki-2611-number-png.js',
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
test('Kiryu SQL has 50 locals + 32 Ryomo services with official planned series',()=>{
 assert.equal(w.TobuKiryu2611Png.sourceTemplates,164);
 assert.equal(w.TobuKiryu2611Png.localNumbersPerCalendar,50);
 for(let n=795;n<=855;n++)
  assert.equal(w.TobuKiryu2611Png.hasPublishedNumber(n+'E'),n>=801&&n<=850);
 assert.equal(w.TobuKiryu2611Png.limitedExpressNumbersPerCalendar,32);
 for(const n of ["1801","1803","1805","1806","1807","1808","1811","1813","1814","1815","1816","1817","1818","1819","1820","1822","1823","1824","1826","1827","1828","1830","1831","1834","1835","1837","1838","1841","1842","1845","1846","1850"])
  assert.equal(w.TobuKiryu2611Png.hasPublishedNumber(n),true,n);
 for(const n of ['800E','851E','1802','1836','1851','1409','1612','801','801A'])
  assert.equal(w.TobuKiryu2611Png.hasPublishedNumber(n),false,n);
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
 assert.equal(w.TrainNumberPngRanges.match('1806','Kiryu',p('1806',{trainType:'Local'})),null);
 assert.equal(w.TrainNumberPngRanges.match('1801','Kiryu',p('1801',{vehiclePlan:{models:['東武200型']}})),null);
});

test('Official 2026-03-14 Ryomo numbers match Kiryu and existing Isesaki 200/500 PNG',()=>{
 const numbers={"1801":"500","1803":"200","1805":"200","1806":"200","1807":"200","1808":"500","1811":"200","1813":"500","1814":"500","1815":"500","1816":"200","1817":"200","1818":"500","1819":"200","1820":"200","1822":"200","1823":"200","1824":"200","1826":"200","1827":"500","1828":"500","1830":"500","1831":"500","1834":"200","1835":"200","1837":"200","1838":"200","1841":"200","1842":"200","1845":"500","1846":"500","1850":"500"};
 assert.equal(Object.keys(numbers).length,32);
 assert.equal(Object.values(numbers).filter(x=>x==='200').length,19);
 assert.equal(Object.values(numbers).filter(x=>x==='500').length,13);
 for(const [number,series] of Object.entries(numbers)){
  for(const calendarType of ['weekday','holiday']){
   const v=p(number,{calendarType,
     trainType:'odpt.TrainType:Tobu.LimitedExpress',
     railDirection:'odpt.RailDirection:'+(Number(number)%2?'Outbound':'Inbound')});
   const hit=w.TrainNumberPngRanges.match(number,'Kiryu',v);
   assert.ok(hit,number+'/'+calendarType);
   assert.equal(hit.model,series==='200'?'東武200型':'東武500系',number);
   assert.ok(hit.pngPath.endsWith(series==='200'?
     '200型_りょうもう_赤.png':'500系_リバティ.png'),number);
   assert.equal(hit.sourceEdition,'2026-03-14-official-ryomo');
   assert.equal(hit.authorizesDatedService,false);
   assert.equal(hit.authorizesPhysicalVehicle,false);
   assert.equal(hit.actualVehicleConfirmed,false);
   assert.equal(hit.referenceOnly,true);
   assert.equal(w.VehicleGaragePngMap.matchModelPath(hit.model,hit.pngPath,'Kiryu'),true);
   const marker=w.TrainVehicle.selectMarkerArtwork(v,false);
   assert.equal(marker.kind,'vehicle',number);
   assert.equal(marker.iconSrc,hit.pngPath,number);
   const i=w.TobuIsesaki2611Png.match(number,{
     ...v,positionLineId:'TobuIsesaki',displayLineId:'TobuIsesaki',
     sourceRailway:'odpt.Railway:Tobu.Isesaki'
   });
   assert.ok(i,number);
   assert.equal(i.model,hit.model,number);
   assert.equal(i.pngPath,hit.pngPath,number);
  }
 }
 for(const x of [
  {positionLineId:'Sano'},
  {trainType:'Local'},
  {sourceRailway:'odpt.Railway:Tobu.Isesaki'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {vehiclePlan:{confirmed:true}},
  {vehiclePlan:{models:['東武200型']}},
  {vehicleIdentityStatus:'EXACT'},
  {serviceDate:'2026-12-01'},
  {trainNumber:'1803'}
 ])
  assert.equal(w.TrainNumberPngRanges.match('1801','Kiryu',p('1801',x)),null,JSON.stringify(x));
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
