'use strict';
/* Every repository vehicle PNG is represented in the garage map.
 * This is stock-model -> file indexing, not proof of which car a train uses.
 * Run: node tools/vehicle-garage-png-map.test.cjs
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={};
const ctx=vm.createContext({window:root,console:{debug(){},warn(){},log(){},error(){}}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const garage=root.VehicleGaragePngMap;
function filesIn(folder,prefix,out){
  for(const d of fs.readdirSync(folder,{withFileTypes:true})){
    const rel=prefix+'/'+d.name;
    if(d.isDirectory())filesIn(folder+'/'+d.name,rel,out);
    else if(d.name.endsWith('.png'))out.push('../'+rel);
  }
}
const existing=[];filesIn('images/列车','images/列车',existing);
assert.equal(existing.length,garage.totalPng,'gallery inventory must refresh when assets change');
assert.equal(garage.totalPng,579);
assert.equal(garage.canonicalEntries,597);
assert.equal(garage.mappedPng,579);
for(const path of existing)assert.ok(garage.hasPng(path),'garage missing '+path);
assert.equal(garage.unassigned.length,0);
assert.equal(garage.alternates.length,1);
const alt=garage.alternates[0];
assert.match(alt,/JR東日本_E233系_5000番台\.png$/);
assert.equal(garage.findPath(alt)[0].alternateOnly,true);
assert.equal(garage.matchModelPath('E233系5000番台',alt,'Keiyo'),false);
assert.equal(garage.findModel('E233系5000番台','ChuoMain').length,0);
const normal=garage.findModel('E233系5000番台','Keiyo');
assert.ok(normal.some(r=>r.canonicalImage&&!r.alternateOnly));
const model=garage.findModel('E353系','ChuoMain');
assert.equal(model.length,1);
assert.ok(model[0].path.endsWith('JR東日本_E353系.png'));
assert.equal(garage.matchModelPath('E353系',model[0].path,'ChuoMain'),true);
assert.equal(garage.matchModelPath('E353系',model[0].path,'Yamagata'),false);
assert.equal(garage.findModel('211系（長野地区）','ChuoMain').length,1);
assert.equal(garage.findModel('211系（長野地区）','Takasaki').length,0);
assert.equal(garage.findModel('211系（高崎地区）','ChuoMain').length,0);
const official=root.CHUO_MAIN_OFFICIAL_VEHICLE_REFERENCES;
for(const row of official.rules){
  assert.equal(row.garagePngPath,model[0].path);
  assert.ok(garage.matchModelPath(row.vehicleType,row.garagePngPath,'ChuoMain'));
}
const pos={
  trainNumber:'9086M',serviceDate:'2026-11-22',calendarType:'holiday',
  positionLineId:'ChuoMain',sourceRailway:'odpt.Railway:JR-East.Chuo',
  trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.LimitedExpress'
};
const chosen=root.TrainVehicle.resolvePublishedPositionPlan(pos);
assert.ok(chosen && chosen.garagePngMapped && chosen.garagePngPath===model[0].path);
assert.equal(root.TrainVehicle.resolvePublishedPositionPlan({...pos,serviceDate:'2026-11-03'}),null);
assert.equal(root.TrainVehicle.resolvePublishedPositionPlan({
  ...pos,sourceRailway:'odpt.Railway:JR-East.Yamagata'
}),null);
assert.equal(root.TrainVehicle.resolvePublishedPositionPlan({
  ...pos,trainType:'odpt.TrainType:JR-East.Local'
}),null);
assert.equal(root.TrainVehicle.resolvePublishedPositionPlan({
  ...pos,trainNumber:'442M',trainType:'odpt.TrainType:JR-East.Local'
}),null);
const run={trainNumber:'37M',calendar:'odpt.Calendar:SaturdayHoliday',
  timetableIdentity:'test:37M',
  trainType:'odpt.TrainType:JR-East.LimitedExpress',
  railDirection:'odpt.RailDirection:Inbound',
  destinationStationUrn:'odpt.Station:JR-East.Chuo.Shiojiri'};
const timetable={
  _positionSource:'supabase-train-run',
  _serviceDate:'2026-11-03',
  _sqlVehicleMappingLevel:'official_service_vehicle_plan',
  _sqlVerifiedPublishedVehicleType:'E353系',
  _sqlVerifiedPublishedVehicleSourceUrl:'https://www.jreast.co.jp/train/express/azusa_kaiji.html',
  'odpt:trainType':'odpt.TrainType:JR-East.LimitedExpress',
  'odpt:railway':'odpt.Railway:JR-East.Chuo',
  'odpt:operator':'odpt.Operator:JR-East',
  'odpt:trainTimetableObject':[]
};
const identity=root.TrainVehicle.resolveTimetableRun(run,timetable,'ChuoMain',{operator:'JR-East'},'2026-11-03');
const plan=identity.vehicleResult.vehiclePlan;
assert.equal(identity.vehicleResult.identityStatus,'UNKNOWN');
assert.equal(plan.status,'PLANNED_MODEL');
assert.equal(plan.garagePngMapped,true);
assert.equal(plan.garagePngPath,model[0].path);
const marker=root.TrainVehicle.selectMarkerArtwork({
  displayLineId:'ChuoMain',positionLineId:'ChuoMain',
  positionSource:'supabase-train-run',estimated:true,
  vehicleIdentityStatus:'UNKNOWN',vehiclePlan:plan
},false);
assert.equal(marker.kind,'vehicle');
assert.equal(marker.planned,true);
assert.equal(marker.iconSrc,model[0].path);
console.log('garage map: PASS — 579 assets, 597 canonical model references, one non-default alternate, scoped published train plan');
