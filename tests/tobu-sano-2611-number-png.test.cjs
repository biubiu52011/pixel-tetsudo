'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const ctx=vm.createContext({window:{},console});
const files=[
 'data/timetables/vehicle-garage-png-map.js',
 'data/timetables/tobu-sano-2611-number-png.js',
 'data/timetables/train-number-png-ranges.js',
 'js/train-vehicle.js'
];
for(const file of files)
 vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file,timeout:15000});
const root=ctx.window;
function p(number,opts={}){
 const num=String(number).match(/^\d+/);
 const outbound=num&&Number(num[0])%2===1;
 return {positionLineId:'Sano',displayLineId:'Sano',
   sourceRailway:'odpt.Railway:Tobu.Sano',trainOperator:'Tobu',
   trainNumber:number,
   trainType:/E$/.test(number)?'odpt.TrainType:Tobu.Local':'odpt.TrainType:Tobu.LimitedExpress',
   railDirection:'odpt.RailDirection:'+(outbound?'Outbound':'Inbound'),
   positionSource:'supabase-train-run',estimated:true,
   calendarType:'holiday',serviceDate:'2026-11-15',
   vehicleIdentityStatus:'UNKNOWN',...opts};
}
test('Sano historical source permits only 61 locals + 2 Liberty numbers per calendar',()=>{
 const index=root.TobuSano2611Png;
 assert.equal(index.numbersPerCalendar,63);
 assert.equal(index.sourceTemplates,126);
 let seen=0;
 for(let n=550;n<=700;n++){
   const accepted=index.hasPublishedNumber(n+'E');
   const expected=(n>=601&&n<=659&&n%2===1)||(n>=602&&n<=662&&n%2===0);
   assert.equal(accepted,expected,n);
   if(accepted)seen++;
 }
 assert.equal(seen,61);
 for(const n of ['1612','1643'])assert.equal(index.hasPublishedNumber(n),true);
 for(const n of ['600E','661E','663E','1613','1644','635','635A'])
   assert.equal(index.hasPublishedNumber(n),false,n);
});
test('number->PNG is always referenceOnly, never actual physical stock',()=>{
 const expected=[
  ['601E','Local','東武10030型50番台（佐野線代表）','10030型_50番台_更新車.png'],
  ['635E','Local','東武10030型50番台（佐野線代表）','10030型_50番台_更新車.png'],
  ['662E','Local','東武10030型50番台（佐野線代表）','10030型_50番台_更新車.png'],
  ['1643','LimitedExpress','東武500系','500系_リバティ.png'],
  ['1612','LimitedExpress','東武500系','500系_リバティ.png']
 ];
 for(const [number,type,model,suffix] of expected){
  for(const calendarType of ['weekday','holiday']){
   const v=p(number,{calendarType});
   const ref=root.TrainNumberPngRanges.match(number,'Sano',v);
   assert.ok(ref,number+'/'+calendarType);
   assert.equal(ref.model,model);
   assert.equal(ref.trainType,type);
   assert.ok(ref.pngPath.endsWith(suffix));
   assert.equal(ref.actualVehicleConfirmed,false);
   assert.equal(ref.authorizesDatedService,false);
   assert.equal(ref.authorizesPhysicalVehicle,false);
   assert.equal(ref.sourceEdition,'historical-undated');
   assert.equal(ref.illustrative,true);
   assert.equal(ref.referenceOnly,true);
   assert.equal(root.VehicleGaragePngMap.matchModelPath(model,ref.pngPath,'Sano'),true);
   const marker=root.TrainVehicle.selectMarkerArtwork(v,false);
   assert.equal(marker.kind,'vehicle',number);
   assert.equal(marker.iconSrc,ref.pngPath,number);
   assert.equal(marker.actualVehicleConfirmed,false,number);
  }
 }
});
test('route, day, source, train kind, direction, physical identity and conflict fail closed',()=>{
 const base=p('601E');
 const invalid=[
  {positionLineId:'Koizumi'},{displayLineId:'TobuIsesaki'},
  {sourceRailway:'odpt.Railway:Tobu.Isesaki'},
  {trainOperator:'JR-East'},
  {positionSource:'realtime-api'},{positionSource:'station-timetable'},
  {estimated:false},{serviceDate:'2026-10-31'},{serviceDate:'2026-12-01'},
  {calendarType:'unknown'},{trainType:'LimitedExpress'},
  {railDirection:'odpt.RailDirection:Inbound'},
  {vehicleIdentityStatus:'EXACT'},{vehicleResolvedUpstream:true},
  {vehicleResolvedFromRealtime:true},{actualVehicleConfirmed:true},
  {vehicleFormationId:'12345F'},{vehicleFormationConflict:true},
  {vehicleFormationCandidates:['12345F']},{realtimeVehicleType:'東武800型'},
  {vehiclePlan:{models:['東武500系']}}
 ];
 for(const bad of invalid)
   assert.equal(root.TrainNumberPngRanges.match('601E','Sano',{...base,...bad}),null,JSON.stringify(bad));
 assert.equal(root.TrainNumberPngRanges.match('635E','TobuIsesaki',p('635E')),null);
 assert.equal(root.TrainNumberPngRanges.match('1643','Sano',p('1643',{trainType:'Local'})),null);
 assert.equal(root.TrainNumberPngRanges.match('1612','Sano',p('1612',{railDirection:'odpt.RailDirection:Outbound'})),null);
 assert.equal(root.TrainVehicle.selectMarkerArtwork(base,true).kind,'unresolved');
});
test('Sano representative geometry uses SQL-station hop medians, not 2-minute placeholders',()=>{
 const d=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
 const line=d.lines.Sano;
 assert.deepEqual(line.stations,[
 'Tatebayashi','Watarase','Tajima','Sano-shi','Sano',
 'Horigome','Yoshimizu','Tanuma','Tada','Kuzu']);
 assert.deepEqual(line.durations,[3,5,3,3,3,3,3,2,4]);
 assert.deepEqual(line.durationDerivation.sampleCountsBySegment,
 [60,60,60,60,60,61,61,61,61]);
 assert.equal(line.durationDerivation.timetableDateVerified,false);
 assert.equal(line.durationDerivation.sourceRevisionVerified,false);
 assert.equal(line.durationTotalMin,null);
 const compact=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
 assert.deepEqual(compact.lines.Sano,line);
 const bytes=JSON.stringify(d).replace(/<\/script/gi,'<\\/script');
 assert.equal(fs.readFileSync('data/core/railway-data.file.js','utf8'),'window.RAILWAY_DATA = '+bytes+';\n');
});
test('Sano lazy registry precedes central PNG matcher with line scope and matching page hashes',()=>{
 const manifest=require('../scripts/page-scripts.json');
 const asset='data/timetables/tobu-sano-2611-number-png.js';
 const assets=['data/timetables/vehicle-garage-png-map.js',asset,
 'data/timetables/train-number-png-ranges.js'];
 const order=manifest.lazy.trains;
 assert.ok(order.indexOf(asset)>order.indexOf('data/timetables/tobu-koizumi-2611-number-png.js'));
 assert.ok(order.indexOf(asset)<order.indexOf('data/timetables/train-number-png-ranges.js'));
 assert.deepEqual(manifest.lazyScopes.trains[asset],['Sano']);
 const html=fs.readFileSync('pages/trains.html','utf8');
 for(const item of assets){
  const normalized=fs.readFileSync(item,'utf8').replace(/\r\n/g,'\n');
  const b=Buffer.from(normalized,'utf8');
  const sha=crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+item+'?v='+sha),item);
 }
 assert.match(html,/tobu-sano-2611-number-png\.js\?v=[a-f0-9]{12}" data-line-scope="Sano"/);
});
