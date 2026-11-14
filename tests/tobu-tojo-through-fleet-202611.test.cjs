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
 ogose:dir+'東武鉄道/東武鉄道_8000型.png',
 west:dir+'東武鉄道/東武鉄道_8000型.png',
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
 ['ground',pos(),png.ground,'東武50000型'],
 ['TJ',pos({trainNumber:'23',trainType:'odpt.TrainType:Tobu.TJ-Liner'}),png.tj,'東武50090型'],
 ['Y working',pos({trainNumber:'Y1176',scheduledStopKeys:['Yorii','Ogawamachi','ShinrinKoen']}),png.west,'東武8000型'],
 ['west segment',pos({trainNumber:'Y1070',scheduledStopKeys:['Yorii','Tamayodo','Hachigata','Ogawamachi']}),png.west,'東武8000型'],
 ['T working',pos({trainNumber:'C2107T'}),png.tobu,'東武50070型'],
 ['E-prefix T',pos({trainNumber:'E103T'}),png.tobu,'東武50070型'],
 ['S working',pos({trainNumber:'D2159S'}),png.metro,'東京メトロ17000系'],
 ['K working',pos({trainNumber:'C3152K'}),png.tokyu,'東急5050系'],
 ['F-prefix K',pos({trainNumber:'F3162K'}),png.tokyu,'東急5050系'],
 ['Ogose',pos({positionLineId:'Ogose',displayLineId:'Ogose',
 sourceRailway:'odpt.Railway:Tobu.Ogose',trainNumber:'A1080',
 scheduledStopKeys:['Sakado','Kawakado','Ogose']}),png.ogose,'東武8000型']
];
test('all working/service groups resolve exactly one approved PNG',()=>{
 for(const [name,p,expected,model] of scenarios){
  const ref=w.TobuTojoFixedPng202611.resolve(p);
  assert.ok(ref,name);
  assert.equal(ref.illustrationPng,expected,name);
  assert.equal(ref.illustrationModel,model,name);
  assert.equal(ref.actualVehicleConfirmed,false,name);
  assert.equal(ref.referenceOnly,true,name);
  assert.equal(w.VehicleGaragePngMap.matchModelPath(model,expected,p.positionLineId),true,name+' gallery scope');
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
