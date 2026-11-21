'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const asset='data/timetables/tobu-tojo-through-fleet-202611.js';
const source=fs.readFileSync(asset,'utf8');
const w={};
const sandbox=vm.createContext({window:w});
for(const file of ['data/timetables/vehicle-garage-png-map.js',asset,'js/train-vehicle.js'])
  vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file,timeout:10000});
const dir='../images/列车/';
const png={
 ogose:dir+'東武鉄道/東武鉄道_8000型_標準塗装.png',
 brown:dir+'東武鉄道/東武鉄道_8000型.png',
 west:dir+'東武鉄道/東武鉄道_8000型_標準塗装.png',
 tj:dir+'東武鉄道/東武鉄道_50090型.png',
 tobu:dir+'東武鉄道/東武鉄道_50070型.png',
 metro:dir+'東京メトロ/東京メトロ_17000系.png',
 tokyu:dir+'東急電鉄/東急電鉄_5050系.png',
 ground:dir+'東武鉄道/東武鉄道_50000型.png'
};
function pos(overrides={}){
 return {positionLineId:'Tojo',displayLineId:'Tojo',
 sourceRailway:'odpt.Railway:Tobu.Tojo',
 trainOperator:'Tobu',trainNumber:'500',
 trainType:'odpt.TrainType:Tobu.Local',
 positionSource:'supabase-train-run',estimated:true,
 serviceDate:'2026-11-15',vehicleIdentityStatus:'UNKNOWN',
 vehicleResolvedUpstream:false,vehicleResolvedFromRealtime:false,
 actualVehicleConfirmed:false,...overrides};
}
const scenarios=[
 ['ground',pos(),png.ground ,'東武50000系'],
 ['TJ',pos({trainNumber:'23',trainType:'odpt.TrainType:Tobu.TJ-Liner'}),png.tj ,'東武50090系'],
 ['Y working',pos({trainNumber:'Y1176',scheduledStopKeys:['Yorii','Ogawamachi','ShinrinKoen']}),png.west ,'東武8000系'],
 ['west segment',pos({trainNumber:'Y1070',scheduledStopKeys:['Yorii','Tamayodo','Hachigata','Ogawamachi']}),png.west ,'東武8000系'],
 ['T working',pos({trainNumber:'C2107T'}),png.tobu ,'東武50070系'],
 ['E-prefix T',pos({trainNumber:'E103T'}),png.tobu ,'東武50070系'],
 ['S working',pos({trainNumber:'D2159S'}),png.metro,'東京メトロ17000系'],
 ['K working',pos({trainNumber:'C3152K'}),png.tokyu,'東急5050系'],
 ['F-prefix K',pos({trainNumber:'F3162K'}),png.tokyu,'東急5050系']
];
test('Tojo working/service groups resolve exactly one approved PNG',()=>{
 for(const [name,p,expected,model] of scenarios){
  const ref=w.TobuTojoFixedPng202611.resolve(p);
  assert.ok(ref,name);
  assert.equal(ref.illustrationPng,expected,name);
  assert.equal(ref.illustrationModel,model,name);
  assert.equal(ref.actualVehicleConfirmed,false,name);
  assert.equal(ref.referenceOnly,true,name);
  const generic=w.VehicleGaragePngMap.matchModelPath(model,expected,p.positionLineId);
  const scoped=w.VehicleGaragePngMap.matchScopedReferencePath(
    model,expected,p.positionLineId,'tobu-tojo-fixed-8000-reference');
  assert.equal(generic||scoped,true,name+' gallery scope');
  const art=w.TrainVehicle.selectMarkerArtwork(p,false);
  assert.equal(art.kind,'vehicle',name);
  assert.equal(art.iconSrc,expected,name);
  assert.equal(art.illustrationModel,model,name);
  assert.equal(art.planned,true,name);
  assert.equal(art.illustrative,true,name);
  assert.equal(art.representativeOnly,true,name);
  assert.equal(art.actualVehicleConfirmed,false,name);
 }
});
function ogosePosition(overrides={}){
 return pos({positionLineId:'Ogose',displayLineId:'Ogose',
  sourceRailway:'odpt.Railway:Tobu.Ogose',trainNumber:'A1080',
  calendarType:'holiday',...overrides});
}
test('Ogose GTFS number roster grants a standard-blue-white reference, never the brown 81111F',()=>{
 const counts={weekday:0,holiday:0};
 const seen=new Set();
 for(const cal of ['weekday','holiday']){
  for(let n=0;n<=5400;n++){
   const trainNumber='A'+n;
   const hit=w.TobuTojoFixedPng202611.resolve(ogosePosition({
    trainNumber,calendarType:cal,serviceDate:cal==='weekday'?'2026-11-16':'2026-11-15'
   }));
   if(!hit)continue;
   assert.equal(hit.illustrationPng,png.ogose,trainNumber);
   assert.equal(hit.illustrationModel,'東武8000系',trainNumber);
   assert.equal(hit.authorizesIllustration,true,trainNumber);
   assert.equal(hit.actualVehicleConfirmed,false,trainNumber);
   assert.equal(hit.actualVehicleConfirmed,false,trainNumber);
   counts[cal]++;
   seen.add(trainNumber);
  }
 }
 assert.deepEqual(counts,{weekday:146,holiday:144});
 assert.equal(seen.size,150);
 for(const number of ['A685','A1782','A2387','A3780','A3980']){
  assert.ok(w.TobuTojoFixedPng202611.resolve(ogosePosition({
   trainNumber:number,calendarType:'weekday',serviceDate:'2026-11-16'
  })),number+' weekday');
  assert.equal(w.TobuTojoFixedPng202611.resolve(ogosePosition({trainNumber:number})),null,number+' holiday');
 }
 for(const number of ['A880','A3687','A5180','A5385']){
  assert.ok(w.TobuTojoFixedPng202611.resolve(ogosePosition({trainNumber:number})),number+' holiday');
  assert.equal(w.TobuTojoFixedPng202611.resolve(ogosePosition({
   trainNumber:number,calendarType:'weekday',serviceDate:'2026-11-16'
  })),null,number+' weekday');
 }
 for(const number of ['A9999','A1088','A2382','A580']){
  assert.equal(w.TobuTojoFixedPng202611.resolve(ogosePosition({trainNumber:number})),null,number+' absent');
 }
 for(const bad of [
  {calendarType:''},{calendarType:'unknown'},
  {trainType:'odpt.TrainType:Tobu.Express'},
  {sourceTripId:'Tobu.Ogose.A1080.Weekday'},
  {sourceTripId:'Tobu.Tojo.A1080.SaturdayHoliday'},
  {sourcePath:'gtfs-stage:TokyoGTFS:unrelated:Ogose'}
 ])assert.equal(w.TobuTojoFixedPng202611.resolve(ogosePosition(bad)),null,JSON.stringify(bad));
 assert.ok(w.TobuTojoFixedPng202611.resolve(ogosePosition({
  sourceTripId:'Tobu.Ogose.A1080.SaturdayHoliday',
  sourcePath:'gtfs-stage:TokyoGTFS:bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f:Ogose'
 })));
});

test('Ogose uses blue-white illustration by default, brown only with 81111F physical proof',()=>{
 const base=ogosePosition();
 const cfg=w.TobuTojoFixedPng202611.assets.ogose;
 assert.equal(cfg.png,png.ogose);
 assert.equal(cfg.specialLiveryPng,png.brown);
 assert.equal(cfg.specialLiveryFormation,'81111F');
  assert.equal(w.VehicleGaragePngMap.matchModelPath(cfg.model,png.ogose,'Ogose'),false);
  assert.equal(w.VehicleGaragePngMap.matchScopedReferencePath(
    cfg.model,png.ogose,'Ogose','tobu-tojo-fixed-8000-reference'),true);
 assert.equal(w.VehicleGaragePngMap.matchModelPath(cfg.model,png.brown,'Ogose'),true);
 const ordinary=w.TrainVehicle.selectMarkerArtwork(base,false);
 assert.equal(ordinary.kind,'vehicle');
 assert.equal(ordinary.iconSrc,png.ogose);
 assert.equal(ordinary.referenceOnly,true);
 assert.equal(ordinary.actualVehicleConfirmed,false);
 assert.equal(ordinary.illustrative,true);
 assert.notEqual(ordinary.iconSrc,png.brown);
 for(const override of [
   {vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true,vehicleFormationId:'81111F'},
   {vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true,vehicleFormationId:'8183F',
    vehicleResolution:{lineId:'Ogose',sources:['official-realtime-car-number']}},
   {vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:true,vehicleFormationId:'81111F',
    vehicleResolution:{lineId:'Ogose',sources:['official-realtime-car-number']}},
   {vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true,vehicleFormationId:'81111F',
    vehicleResolution:{lineId:'Ogose',sources:['realtime']}}
 ]){
   const art=w.TrainVehicle.selectMarkerArtwork({...base,...override},false);
   assert.equal(art.kind,'unresolved',JSON.stringify(override));
   assert.equal(art.iconSrc,'',JSON.stringify(override));
   assert.equal(art.reason,'ogose-8000-formation-unresolved');
 }
 const verified={...base,vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true,
   vehicleFormationId:'81111F',
   vehicleResolution:{identityStatus:'EXACT',lineId:'Ogose',sources:['official-realtime-car-number']}};
 const special=w.TrainVehicle.selectMarkerArtwork(verified,false);
 assert.equal(special.kind,'vehicle');
 assert.equal(special.iconSrc,png.brown);
 assert.equal(special.actualVehicleConfirmed,true);
 assert.equal(special.illustrationRole,'ogose-verified-81111f-special-livery');
 assert.equal(w.TrainVehicle.selectMarkerArtwork({...verified,trainNumber:'A9999'},false).kind,'unresolved');
 assert.equal(w.TrainVehicle.selectMarkerArtwork({...verified,sourceRailway:'odpt.Railway:Tobu.Tojo'},false).kind,'unresolved');
 assert.equal(w.TrainVehicle.selectMarkerArtwork(verified,true).kind,'unresolved');
});
test('Tojo west service uses standard 8000 PNG and never defaults to brown',()=>{
 const west=pos({trainNumber:'Y1176',scheduledStopKeys:['Yorii','Ogawamachi','ShinrinKoen']});
 const ref=w.TobuTojoFixedPng202611.resolve(west);
 assert.equal(ref.illustrationPng,png.west);
 assert.notEqual(ref.illustrationPng,png.brown);
 const art=w.TrainVehicle.selectMarkerArtwork(west,false);
 assert.equal(art.iconSrc,png.west);
 assert.equal(art.referenceOnly,true);
 assert.equal(art.actualVehicleConfirmed,false);
});

test('candidate rules and random PNG rotation are removed',()=>{
 assert.equal(source.includes('vehicleCandidates'),false);
 assert.equal(source.includes('VEHICLE_FAMILY_RULES'),false);
 assert.equal(source.includes('Math.random'),false);
 assert.equal(Object.keys(w.TobuTojoFixedPng202611.assets).length,7);
});
test('public A-F through-service prefixes resolve owner workings',()=>{
 const code=w.TrainOperationEvidence.normalizeOperationCode;
 assert.equal(code('C2101T',{lineId:'Tojo'}),'01T');
 assert.equal(code('D2159S',{lineId:'Tojo'}),'59S');
 assert.equal(code('F3152K',{lineId:'Tojo'}),'52K');
 assert.equal(code('A3103S',{lineId:'Tojo'}),'03S');
 assert.equal(code('1101T',{lineId:'Yamanote'}),'1101T');
});
test('no illustration for wrong line, unknown source, date or verified actual set',()=>{
 for(const overrides of [
  {displayLineId:'Ogose'}, {positionLineId:'Ogose'},
  {sourceRailway:'odpt.Railway:JR-East.Tojo'}, {sourceRailway:''},
  {trainOperator:'TokyoMetro'},
  {positionSource:'supabase-train-run',estimated:false},
  {positionSource:'no-position'},
  {serviceDate:'2028-01-01'}, {serviceDate:'2026-10-01'},
  {trainNumber:'RANDOM'},
  {vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true},
  {vehicleResolvedFromRealtime:true},{actualVehicleConfirmed:true},
  {vehicleFormationId:'51001F'},{vehicleFormationConflict:true},
  {vehicleFormationCandidates:['51001F']}
 ]){
  const art=w.TrainVehicle.selectMarkerArtwork(pos(overrides),false);
  assert.notEqual(art.iconSrc,png.ground,JSON.stringify(overrides));
 }
 assert.notEqual(w.TrainVehicle.selectMarkerArtwork(pos(),true).iconSrc,png.ground);
});
test('lazy asset loads before TrainVehicle and cache key matches Git blob',()=>{
 const manifest=require('../scripts/page-scripts.json');
 const i=manifest.lazy.trains.indexOf(asset);
 assert.ok(i>=0&&i<manifest.lazy.trains.indexOf('js/train-vehicle.js'));
 assert.deepEqual(manifest.lazyScopes.trains[asset],['Tojo','Ogose']);
 const bytes=Buffer.from(source.replace(/\r\n/g,'\n'),'utf8');
 const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex').slice(0,12);
 const html=fs.readFileSync('pages/trains.html','utf8');
 assert.ok(html.includes('../'+asset+'?v='+sha+'" data-line-scope="Tojo,Ogose"'));
});
