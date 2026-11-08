'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8'),ctx);
const lookup=ctx.window.MajorVehicleFleetPresets.lookup;
const local='odpt.TrainType:JR-West.Local';
const north=['Shinoyamaguchi','Tamba-Oyama','Shimotaki','Tanigawa',
  'Kaibara-Hyogo','Iso-Tamba','Kuroi-Tamba','Ichijima','Tamba-Takeda','Fukuchiyama'];
const south=['Amagasaki','Tsukaguchi','Itami','Takarazuka','Shinoyamaguchi'];
const generic=['JR西日本207系','JR西日本321系','JR西日本223系6000番台','JR西日本225系6000番台'];
const get=(keys,type=local,owner='')=>lookup('Fukuchiyama','JR-West',type,
  {stationKeys:keys,trainOwner:owner});

test('north-local 223-5500 is segment scoped and never confirms a physical train',()=>{
 for(const keys of [north,north.slice().reverse(),
   ['Shinoyamaguchi','Tamba-Oyama'],
   ['Tanigawa','Kaibara-Hyogo','Fukuchiyama']]){
  const p=get(keys);
  assert.deepEqual(Array.from(p.vehicleCandidates),['JR西日本223系5500番台']);
  assert.equal(p.presetId,'jrwest-fukuchiyama-north-local');
  assert.equal(p.evidenceRole,'route-fleet-reference');
  assert.equal(p._fleetReferenceOnly,true);
  assert.equal(p.planOverride,false);
  assert.equal(p.actualVehicleConfirmed,undefined);
  assert.equal(p.vehicleArtworkPath,undefined);
 }
});

test('south/mixed/unknown/express/other owner never inherits north local 223-5500',()=>{
 for(const keys of [south,['Osaka','Shinoyamaguchi','Fukuchiyama'],
     ['Shinoyamaguchi'],[],['Tanigawa','UnknownStation']]){
  assert.deepEqual(Array.from(get(keys).vehicleCandidates),generic);
  assert.equal(get(keys).presetId,'jrwest-fukuchiyama');
 }
 assert.deepEqual(Array.from(lookup('Fukuchiyama','JR-West',local).vehicleCandidates),generic);
 assert.deepEqual(Array.from(get(north,'odpt.TrainType:JR-West.Rapid').vehicleCandidates),generic);
 assert.equal(get(north,'odpt.TrainType:JR-West.LimitedExpress'),null);
 assert.equal(get(north,local,'JR-East'),null);
});

test('existing SQL timetable adapter forwards actual stop URNs to major preset',()=>{
 const script=fs.readFileSync('js/train-vehicle.js','utf8');
 const start=script.indexOf('function _officialConventionalServicePlan(tt, lineId, line)');
 const end=script.indexOf('function resolveTimetableRun(',start);
 assert.ok(start>=0&&end>start);
 const scoped=vm.createContext({
   window:{MajorVehicleFleetPresets:ctx.window.MajorVehicleFleetPresets},
   normOp:v=>String(v||'').replace(/^odpt\.Operator:/,'')
 });
 const fn=vm.runInContext(script.slice(start,end)+'\n_officialConventionalServicePlan',scoped);
 const urn=k=>'odpt.Station:JR-West.Fukuchiyama.'+k;
 const tt={
   _positionSource:'supabase-train-run',_sqlVehicleMappingLevel:'unresolved',
   'odpt:operator':'odpt.Operator:JR-West','odpt:trainType':local,
   'odpt:originStation':[urn('Shinoyamaguchi')],
   'odpt:destinationStation':[urn('Fukuchiyama')],
   'odpt:trainTimetableObject':[
     {'odpt:departureStation':urn('Shinoyamaguchi')},
     {'odpt:arrivalStation':urn('Tanigawa'),'odpt:departureStation':urn('Tanigawa')},
     {'odpt:arrivalStation':urn('Fukuchiyama')}
   ]
 };
 const result=fn(tt,'Fukuchiyama',{operator:'JR-West'});
 assert.deepEqual(Array.from(result.vehicleCandidates),['JR西日本223系5500番台']);
 assert.equal(result.planOverride,false);
 assert.deepEqual(Array.from(fn({...tt,'odpt:originStation':[urn('Amagasaki')]},
   'Fukuchiyama',{operator:'JR-West'}).vehicleCandidates),generic);
});
