'use strict';
/* JR East 2026-11 train-number -> scheduled-model -> PNG evidence checks.
 * Never upgrade an exact timetable service to observed rolling stock.
 * node --test tests/chuo-main-official-vehicle-index.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root={};
const ctx=vm.createContext({
  window:root,Date,console:{debug(){},log(){},warn(){},error(){}}
});
for(const file of [
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
]){
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
}
const data=root.CHUO_MAIN_OFFICIAL_VEHICLE_REFERENCES;
const resolver=root.TrainVehicle.resolvePublishedPositionPlan;
function position(number,date,other={}){
  return {
    positionLineId:'ChuoMain',lineId:'ChuoMain',
    sourceRailway:'odpt.Railway:JR-East.Chuo',
    trainNumber:number,serviceDate:date,
    calendarType:date==='2026-11-03'||date==='2026-11-22'||date==='2026-11-23'
      ?'holiday':'weekday',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    trainOperator:'JR-East',
    positionSource:'supabase-train-run',estimated:true,...other
  };
}
test('every indexed source is JR East official, scoped, dated and has gallery E353 stock image',()=>{
  assert.ok(data.rules.length>=11);
  assert.equal(root.VEHICLE_REFERENCE_RULES.length,data.rules.length);
  const nums=new Set();
  for(const r of data.rules){
    assert.ok(!nums.has(r.trainNumber),'duplicate service number '+r.trainNumber);
    nums.add(r.trainNumber);
    assert.equal(r.operator,'JR-East');
    assert.equal(r.networkKey,'ChuoMain');
    assert.equal(r.trainType,'LimitedExpress');
    assert.equal(r.vehicleType,'E353系');
    assert.ok(r.sourceUrl.startsWith('https://timetables.jreast.co.jp/2611/train/'));
    assert.equal(r.modelSourceUrl,'https://www.jreast.co.jp/train/express/azusa_kaiji.html');
    assert.equal(r.actualVehicleConfirmed,false);
    assert.equal(r.effectiveFrom,'2026-11-01');
    assert.equal(r.effectiveTo,'2026-11-30');
    const day=r.operatingDates&&r.operatingDates[0]||
      (r.calendarType==='weekday'?'2026-11-04':'2026-11-03');
    const plan=resolver(position(r.trainNumber,day,{calendarType:r.calendarType}));
    assert.ok(plan,r.trainNumber+': requires mapped official plan');
    assert.equal(plan.status,'PLANNED_MODEL');
    assert.equal(plan.serviceName,r.serviceName);
    assert.equal(plan.models[0],'E353系');
    assert.equal(plan.evidenceRole,'official-train-name-and-model');
    assert.equal(plan.actualVehicleConfirmed,false);
    assert.equal(plan.confirmed,false);
    assert.equal(plan.lineId,'ChuoMain');
    assert.match(plan.iconPath,/JR東日本_E353系\.png$/);
    assert.ok(fs.existsSync(path.join('pages',plan.iconPath)));
    const glyph=root.TrainVehicle.selectMarkerArtwork({
      ...position(r.trainNumber,day,{calendarType:r.calendarType}),
      displayLineId:'ChuoMain',vehiclePlan:plan,
      vehicleIdentityStatus:'UNKNOWN'
    },false);
    assert.equal(glyph.kind,'vehicle');
    assert.equal(glyph.planned,true);
    assert.equal(glyph.iconSrc,plan.iconPath);
  }
});
test('special trains are not mapped on days that official source excludes',()=>{
  assert.equal(resolver(position('9086M','2026-11-03')),null);
  assert.equal(resolver(position('9071M','2026-11-28',{calendarType:'holiday'})),null);
  assert.ok(resolver(position('9086M','2026-11-22',{calendarType:'holiday'})));
  assert.ok(resolver(position('8084M','2026-11-03',{calendarType:'holiday'})));
  assert.ok(resolver(position('9081M','2026-11-03',{calendarType:'holiday'})));
  assert.equal(resolver(position('8193M','2026-11-03',{calendarType:'holiday'})),null);
  assert.ok(resolver(position('8193M','2026-11-04',{calendarType:'weekday'})));
  assert.ok(resolver(position('8194M','2026-11-04',{calendarType:'weekday'})));
  assert.equal(resolver(position('8084M','2026-12-06',{calendarType:'holiday'})),null);
});
test('exact public number is insufficient without railway/operator/service type',()=>{
  const base=position('9086M','2026-11-22',{calendarType:'holiday'});
  for(const override of [
    {positionLineId:'Joban',lineId:'Joban',sourceRailway:'odpt.Railway:JR-East.Joban'},
    {positionLineId:'ChuoRapid',lineId:'ChuoRapid',sourceRailway:'odpt.Railway:JR-East.ChuoRapid'},
    {sourceRailway:'odpt.Railway:JR-East.Joban'},
    {trainType:'odpt.TrainType:JR-East.Local'},
    {trainOperator:'JR-Central'},
    {serviceDate:'2026-11-21'},
    {calendarType:'weekday'},
  ]) assert.equal(resolver({...base,...override}),null,JSON.stringify(override));
});
test('unpublished local model assignments remain UNKNOWN rather than forced 211/E131 PNG',()=>{
  for(const n of ['442M','443M','445M','550M','321M','323M']){
    assert.equal(resolver(position(n,'2026-11-03',{
      calendarType:'holiday',trainType:'odpt.TrainType:JR-East.Local'
    })),null,n);
  }
  assert.equal(data.fleetScope.actualVehicleConfirmed,false);
  assert.ok(data.fleetScope.candidateModels.includes('211系（長野地区）'));
  assert.ok(data.fleetScope.candidateModels.includes('E131系200番台'));
});
test('existing unrelated named train reference rules are retained on extension',()=>{
  assert.equal(new Set(data.rules.map(r=>r.trainNumber)).size,data.rules.length);
  const full=fs.readFileSync('js/train-vehicle.js','utf8');
  assert.match(full,/operatingDates/);
  assert.match(full,/sourceRailways/);
  assert.match(full,/row\.trainType/);
});
