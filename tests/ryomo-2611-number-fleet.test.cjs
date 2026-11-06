'use strict';
/* Exact, month-scoped JR-East Ryomo public-number fleet illustrations.
 * Run: node --test tests/ryomo-2611-number-fleet.test.cjs
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const win={},ctx=vm.createContext({window:win,Date,console:{
  log(){},warn(){},debug(){},error(){}},
  _isTrainArtworkFailureActive(){return false}
});
for(const f of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-ryomo-2611-number-index.js',
  'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const home='../images/列车/JR東日本/JR東日本_211系_湘南色.png';
const through='../images/列车/JR東日本/JR東日本_E233系3000番台.png';
function pos(n,cal,dir,type='Local'){
 return {trainNumber:n,calendarType:cal,
  railDirection:'odpt.RailDirection:'+dir,
  trainType:'odpt.TrainType:JR-East.'+type,
  serviceDate:'2026-11-06',positionLineId:'Ryomo',displayLineId:'Ryomo',
  sourceRailway:'odpt.Railway:JR-East.Ryomo',
  positionSource:'supabase-train-run',estimated:true,
  vehicleIdentityStatus:'UNKNOWN'};
}
test('four official timetable source groups cover 101 two-direction 211 numbers in each calendar',()=>{
 const map=win.JREastRyomoNumberIndex202611;
 let c=0;
 for(const cal of ['weekday','holiday'])
  for(const dir of ['Inbound','Outbound'])
   for(let n=420;n<=484;n++){
    if((n%2===0)!==(dir==='Outbound'))continue;
    const row=map.resolve(pos(n+'M',cal,dir));
    assert.ok(row&&row.kind==='211',n+'M '+cal+' '+dir);
    c++;
   }
 assert.equal(c,130);
});
test('211 gallery is a planned illustration, not a confirmed carset',()=>{
 for(const n of ['420M','422M','620M','652M']){
  const p=pos(n,'weekday','Outbound');
  const info=win.JREastRyomoNumberIndex202611.resolve(p);
  assert.equal(info.illustrationModel,'211系（高崎地区）');
  assert.equal(info.authorizesPNG,false);
  const svg=win.TrainVehicle.selectMarkerArtwork(p,false);
  assert.equal(svg.iconSrc,home);
  assert.equal(svg.planned,true);
  assert.equal(svg.illustrative,true);
  assert.equal(svg.actualVehicleConfirmed,false);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
 }
});
test('E/Y through and green-car M exceptions never become 211',()=>{
 for(const [n,cal,dir,type] of [
  ['1621M','weekday','Inbound','Local'],
  ['832M','weekday','Outbound','Local'],
  ['852M','holiday','Outbound','Local'],
  ['1837E','weekday','Outbound','Local'],
  ['2825Y','holiday','Outbound','Rapid'],
  ['2856Y','weekday','Inbound','Rapid']
 ]){
  const p=pos(n,cal,dir,type);
  const info=win.JREastRyomoNumberIndex202611.resolve(p);
  assert.equal(info.kind,'mixed',n);
  assert.equal(info.models.length,2,n);
  assert.equal(info.actualVehicleConfirmed,false,n);
  const marker=win.TrainVehicle.selectMarkerArtwork(p,false);
  assert.equal(marker.iconSrc,through,n);
  assert.equal(marker.illustrative,true,n);
 }
});
test('bad calendar, source, direction, type, date, or known actual car is rejected',()=>{
 const p=pos('420M','weekday','Outbound');
 const wrong=[
  {calendarType:'bad'}, {railDirection:'odpt.RailDirection:Inbound'},
  {trainType:'odpt.TrainType:JR-East.Rapid'},
  {serviceDate:'2026-12-01'}, {positionLineId:'Joetsu'},
  {displayLineId:'Takasaki'},
  {sourceRailway:'odpt.Railway:JR-East.Takasaki'},
  {positionSource:'station-timetable'},
  {positionSource:'realtime-api',realtimePositionRecordPresent:false},
  {trainOperator:'TokyoMetro'},
  {vehicleIdentityStatus:'EXACT'},{vehicleResolvedFromRealtime:true},
  {vehicleFormationId:'C3'}, {realtimeVehicleType:'E231系1000番台'}
 ];
 for(const bad of wrong)
  assert.equal(win.JREastRyomoNumberIndex202611.resolve({...p,...bad}),null,JSON.stringify(bad));
 assert.equal(win.TrainVehicle.selectMarkerArtwork(p,true).kind,'unresolved');
 for(const n of ['9482M','9484M','9486M','9046M','9049M','662B'])
  assert.equal(win.JREastRyomoNumberIndex202611.resolve({...p,trainNumber:n}),null,n);
 assert.equal(win.JREastRyomoNumberIndex202611.resolve(pos('832M','holiday','Outbound')),null);
});
test('existing approved garage assets and lazy page fingerprints are current',()=>{
 const g=win.VehicleGaragePngMap;
 assert.equal(g.matchModelPath('211系（高崎地区）',home,'Ryomo'),true);
 assert.equal(g.matchModelPath('E233系3000番台',through,'Ryomo'),true);
 assert.equal(g.matchModelPath('211系（高崎地区）',home,'SobuRapid'),false);
 const html=fs.readFileSync('pages/trains.html','utf8');
 for(const f of [
  'data/timetables/jreast-ryomo-2611-number-index.js',
  'data/timetables/vehicle-garage-png-map.js','js/train-vehicle.js']){
  const b=fs.readFileSync(f);
  const hash=crypto.createHash('sha1').update('blob '+b.length+'\0')
    .update(b).digest('hex').slice(0,12);
  assert.ok(html.includes('../'+f+'?v='+hash),'stale '+f);
 }
});
test('SQL migration and edge guard preserve full public train number',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261106200000_ryomo_2611_official_train_number_fleet_scope.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 for(const x of ['published_ryomo_2611_fleet_scope','206','25',
  '9482M','9484M','9486M','reference_only','actual_vehicle_confirmed'])
  assert.ok(sql.includes(x),x);
 for(const x of ['RYOMO_2611_NUMBER_FLEET_SCOPE_UNAVAILABLE',
  'run.vehicle_plan_confirmed=false','run.vehicle_artwork_path=null',
  'run.train_number_verification="official-2611-number-scope"'])
  assert.ok(edge.includes(x),x);
});
