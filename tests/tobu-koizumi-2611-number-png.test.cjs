'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx=vm.createContext({window:{},console});
for(const file of [
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/tobu-koizumi-2611-number-png.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js'])
 vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file,timeout:15000});
const root=ctx.window;
function p(number,extra={}){
 return Object.assign({
  positionLineId:'Koizumi',displayLineId:'Koizumi',
  sourceRailway:'odpt.Railway:Tobu.Koizumi',trainOperator:'Tobu',
  trainNumber:number,trainType:'odpt.TrainType:Tobu.Local',
  positionSource:'supabase-train-run',estimated:true,
  calendarType:'weekday',serviceDate:'2026-11-13',
  vehicleIdentityStatus:'UNKNOWN',
  railDirection:Number(String(number).slice(0,3))%2===1?
    'odpt.RailDirection:Outbound':'odpt.RailDirection:Inbound'
 },extra);
}
test('historical 126 SQL source templates define exactly 63 whitelisted numbers per calendar',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261115170000_tobu_koizumi_2611_png_reference_bands.sql','utf8');
 assert.match(sql,/manual_timetable_templates/);
 assert.match(sql,/count\(\*\).*126|<>126/);
 for(let n=701;n<=762;n++) assert.equal(root.TobuKoizumi2611Png.hasPublishedNumber(n+'E'),true,n);
 assert.equal(root.TobuKoizumi2611Png.hasPublishedNumber('764E'),true);
 for(const number of ['700E','763E','765E','803E','902E','701','701A','7010E','1701E'])
  assert.equal(root.TobuKoizumi2611Png.hasPublishedNumber(number),false,number);
 assert.equal(root.TobuKoizumi2611Png.numbersPerCalendar,63);
});
test('listed 701E and 764E use only approved 10000-family illustration',()=>{
 for(const number of ['701E','702E','731E','762E','764E']){
  for(const calendarType of ['weekday','holiday']){
   const pos=p(number,{calendarType});
   const hit=root.TrainNumberPngRanges.match(number,'Koizumi',pos);
   assert.ok(hit,number+'/'+calendarType);
   assert.match(hit.pngPath,/東武鉄道_10030型_50番台_更新車\.png$/);
   assert.equal(hit.referenceOnly,true);
   assert.equal(hit.illustrative,true);
   assert.equal(hit.actualVehicleConfirmed,false);
   assert.equal(hit.sourceEdition,'historical-undated');
   assert.deepEqual(Array.from(hit.candidateModels),
    ['東武10000型','東武10030型','東武10030型50番台']);
   assert.equal(root.VehicleGaragePngMap.matchModelPath(hit.model,hit.pngPath,'Koizumi'),true);
   const marker=root.TrainVehicle.selectMarkerArtwork(pos,false);
   assert.equal(marker.kind,'vehicle');
   assert.equal(marker.iconSrc,hit.pngPath);
   assert.equal(marker.actualVehicleConfirmed,false);
  }
 }
});
test('source line/date/operator/status/calendar/number guard prevents wrong PNG',()=>{
 const bad=[
  p('763E'),p('803E'),p('701E',{positionLineId:'KoizumiBranch'}),
  p('701E',{displayLineId:'KoizumiBranch'}),
  p('701E',{sourceRailway:'odpt.Railway:Tobu.Kiryu'}),
  p('701E',{trainOperator:'JR-East'}),p('701E',{trainType:'LimitedExpress'}),
  p('701E',{serviceDate:'2026-12-01'}),p('701E',{serviceDate:'2026-10-31'}),
  p('701E',{calendarType:'unknown'}),p('701E',{estimated:false}),
  p('701E',{positionSource:'realtime-api'}),
  p('701E',{vehicleIdentityStatus:'EXACT'}),
  p('701E',{actualVehicleConfirmed:true}),
  p('701E',{vehicleFormationId:'11258F'}),
  p('701E',{railDirection:'odpt.RailDirection:Inbound'}),
  p('701E',{realtimeVehicleType:'東武10000型'}),
  p('701E',{vehiclePlan:{models:['東武10000型']}})
 ];
 bad.forEach((pos,i)=>assert.equal(root.TrainNumberPngRanges.match(pos.trainNumber,'Koizumi',pos),null,'guard '+i));
 assert.equal(root.TrainNumberPngRanges.match('701E','KoizumiBranch',p('701E')),null);
});
test('source family label does not become exact carset or known subtype',()=>{
 const pos=p('701E',{vehiclePlan:{models:['10000系列']}});
 const found=root.TrainNumberPngRanges.match(pos.trainNumber,'Koizumi',pos);
 assert.ok(found);
 assert.equal(found.actualVehicleConfirmed,false);
 assert.equal(found.referenceOnly,true);
});
