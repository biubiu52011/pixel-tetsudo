'use strict';
// Regression: 2611 Shinkansen PNGs are illustrations of SQL-certified
// planned models, NOT a vehicle-formation lookup or nickname/number heuristic.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const win={};
const quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:win,Date,console:quiet});
for(const path of ['data/timetables/vehicle-garage-png-map.js','js/train-vehicle.js'])
  vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});

const e6='../images/列车/JR東日本/JR東日本_E6系.png';
const e8='../images/列车/JR東日本/JR東日本_E8系.png';
const n700='../images/列车/JR東海/JR東海_N700系.png';
const garage=win.VehicleGaragePngMap;
const tv=win.TrainVehicle;

function plan({number='3001M',lineId='TohokuShinkansen',
   model='E6系',image=e6,confirmed=true,date='2026-11-07',
   operator='JR-East',mappingLevel='official_service_vehicle_plan'}={}) {
  const run={trainNumber:number,calendar:'odpt.Calendar:SaturdayHoliday',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    destinationStationUrn:'odpt.Station:JR-East.TohokuShinkansen.Morioka'};
  const tt={_positionSource:'supabase-train-run',_serviceDate:date,
    'odpt:operator':'odpt.Operator:'+operator,
    'odpt:railway':'odpt.Railway:'+operator+'.'+lineId,
    'odpt:trainType':'odpt.TrainType:'+operator+'.LimitedExpress',
    'odpt:trainNumber':number,
    vehicleType:'',_sqlVerifiedPublishedVehicleType:model,
    _sqlVerifiedPublishedVehicleSourceUrl:'https://timetables.jreast.co.jp/2611/train/030/033833.html',
    _sqlVehiclePlanConfirmed:confirmed,_sqlVehicleMappingLevel:mappingLevel,
    _sqlVehicleArtworkPath:image,
    'odpt:trainTimetableObject':[]};
  const result=tv.resolveTimetableRun(run,tt,lineId,{operator},date);
  return result.vehicleResult.vehiclePlan;
}

test('E6/E8 gallery images are scoped to the Tohoku through sections',()=>{
  assert.equal(garage.matchModelPath('E6系',e6,'TohokuShinkansen'),true);
  assert.equal(garage.matchModelPath('E6系',e6,'AkitaShinkansen'),true);
  assert.equal(garage.matchModelPath('E8系',e8,'TohokuShinkansen'),true);
  assert.equal(garage.matchModelPath('E8系',e8,'YamagataShinkansen'),true);
  assert.equal(garage.matchModelPath('E6系',e6,'NishiKyushuShinkansen'),false);
});

test('only SQL-qualified official planned model with exact PNG is illustrated',()=>{
  const good=plan();
  assert.ok(good);
  assert.equal(good.status,'PLANNED_MODEL');
  assert.equal(good.confirmed,true);
  assert.equal(good.iconPath,e6);
  assert.equal(good.actualVehicleConfirmed,false);
  const marker=tv.selectMarkerArtwork({
    estimated:true,positionSource:'supabase-train-run',
    positionLineId:'TohokuShinkansen',displayLineId:'TohokuShinkansen',
    vehicleIdentityStatus:'UNKNOWN',vehiclePlan:good},false);
  assert.equal(marker.kind,'vehicle');
  assert.equal(marker.iconSrc,e6);
  assert.equal(marker.planned,true);
});

test('no roster PNG, incorrect PNG, unconfirmed plan and other month all stay neutral',()=>{
  for(const params of [
    {image:''},{image:e8},{confirmed:false},{date:'2026-12-07'},
    {mappingLevel:'source_single_type_candidate'},
    {model:'N700S系',operator:'JR-Kyushu',lineId:'NishiKyushuShinkansen',number:'1001G',image:n700}
  ]) {
    const p=plan(params);
    if(p)assert.equal(p.iconPath,'','must reject '+JSON.stringify(params));
  }
});

test('existing SQL is the only Shinkansen PNG roster, not broad frontend ranges',()=>{
  const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
  const generic=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  assert.match(edge,/publishedShinkansenPngByNumber/);
  assert.match(edge,/published_train_png_number_ranges/);
  assert.match(edge,/requires_exact_roster!==true/);
  assert.match(edge,/pngProof\.model/);
  assert.doesNotMatch(generic,/NishiKyushuShinkansen|TohokuShinkansen/);
});
