const PUBLISHED_JP_HOLIDAYS=require('./support/published-jp-holidays.cjs');
/* Regression test for the shared dated-plan vehicle renderer.
 * Run: node --test tests/scheduled-vehicle-mapping.test.cjs
 * No network, server, or third-party packages are required.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Tokyo2026Date extends Date {
  constructor(...args) { super(...(args.length ? args : ["2026-11-03T07:16:00Z"])); }
  static now() { return Date.parse("2026-11-03T07:16:00Z"); }
}
const w = {
  TRAIN_OPERATION_EVIDENCE_PROVIDERS: [],
  RuntimeConfig: { SERVICE_DAY_CALENDAR:{},PUBLISHED_JP_HOLIDAYS },
  ODPTClient: {
    LINE_RAILWAY_CODE:{ UenoTokyo:"UenoTokyo" },
    LINE_TO_OPERATOR:{ UenoTokyo:"JR-East" }
  }
};
const context=vm.createContext({
  window:w, Date:Tokyo2026Date, console:{debug(){},log(){},warn(){},error(){}}
});
for(const source of [
  "../data/timetables/north-south-through-index.js",
  "../js/train-vehicle.js",
  "../js/train-position-estimator.js"
]) {
  const file=path.join(__dirname,source);
  vm.runInContext(fs.readFileSync(file,"utf8"),context,{filename:file});
}
const line={stations:["Ueno","Tokyo"],operator:"JR-East",color:"#ff8700"};
const allLines={UenoTokyo:line};
function timetable(number, options={}) {
  return {
    "@id":"timetable:test:"+number+(options.uid||""),
    "odpt:railway":options.railway || "odpt.Railway:JR-East.UenoTokyo",
    "odpt:operator":options.operator || "odpt.Operator:JR-East",
    "odpt:trainNumber":number,
    "odpt:trainType":options.trainType || "odpt.TrainType:JR-East.Local",
    "odpt:calendar":options.calendar || "odpt.Calendar:Holiday",
    "odpt:railDirection":"odpt.RailDirection:Southbound",
    "odpt:destinationStation":["odpt.Station:JR-East.UenoTokyo.Tokyo"],
    "odpt:trainTimetableObject":[
      {"odpt:departureStation":"odpt.Station:JR-East.UenoTokyo.Ueno",
       "odpt:departureTime":"16:00"},
      {"odpt:arrivalStation":"odpt.Station:JR-East.UenoTokyo.Tokyo",
       "odpt:arrivalTime":"16:30"}
    ]
  };
}
function positions(number,options={}) {
  return w.TrainPositionEstimator.estimateLinePositions(
    "UenoTokyo",line,[timetable(number,options)],{},"JR-East",allLines);
}
function marker(position,displayLineId="UenoTokyo") {
  return w.TrainVehicle.selectMarkerArtwork(
    {...position,displayLineId},false);
}

test("November 3 is a Japanese holiday schedule, not weekday",() => {
  assert.ok(w.TrainPositionEstimator.getCurrentCalendars().includes("odpt.Calendar:Holiday"));
  assert.equal(positions("1585E",{calendar:"odpt.Calendar:Weekday"}).length,0);
});
test("1585E and 1891E now resolve dated north/south references even when estimated",() => {
  for(const [number,north] of [["1585E","UtsunomiyaJR"],["1891E","Takasaki"]]) {
    const pos=positions(number)[0];
    assert.ok(pos,"position exists");
    assert.equal(pos.calendarType,"holiday");
    assert.equal(pos.vehiclePlan.status,"FLEET_REPRESENTATIVE");
    assert.equal(pos.vehiclePlan.source,"north-south-shared-working-representative");
    assert.equal(pos.vehiclePlan.crossLineEvidence.north,north);
    assert.equal(pos.vehiclePlan.crossLineEvidence.trainNumber,number);
    assert.equal(pos.vehiclePlan.representativeOnly,true);
    assert.ok(pos.vehiclePlan.alternativeModels.includes("E231系1000番台"));
    const spec=marker(pos);
    assert.equal(spec.kind,"vehicle");
    assert.equal(spec.planned,true);
    assert.match(spec.iconSrc,/JR東日本_E233系3000番台\.png$/);
    // Neither a timetable index nor an icon is evidence of actual rolling stock.
    assert.equal(pos.vehicleIdentityStatus,"UNKNOWN");
    assert.equal(pos.vehicleResolvedUpstream,false);
    assert.equal(pos.vehicleFormationId,"");
    assert.equal(pos.vehicleType,"");
    assert.equal(pos.trainClass,"");
    assert.equal(pos.vehicleIconPath,"");
  }
});
test("unindexed train numbers and mismatched train types stay unresolved",() => {
  const missing=positions("9999E")[0];
  assert.ok(missing);
  assert.equal(missing.vehiclePlan,null);
  assert.equal(marker(missing).kind,"unresolved");
  const wrongClass=positions("1585E",{
    trainType:"odpt.TrainType:JR-East.LimitedExpress",uid:"-wrong"
  })[0];
  assert.ok(wrongClass);
  assert.equal(wrongClass.vehiclePlan,null);
  assert.equal(marker(wrongClass).kind,"unresolved");
});
test("no cross-operator or unscoped image leakage",() => {
  const otherOp=positions("1585E",{operator:"odpt.Operator:Tobu"})[0];
  assert.ok(otherOp);
  assert.equal(otherOp.vehiclePlan,null);
  const pos=positions("1585E")[0];
  assert.equal(marker(pos,"Takasaki").kind,"unresolved");
});
test("the scheduled plan is tied to the source timetable and cannot establish actual stock",() => {
  const pos=positions("1585E")[0];
  assert.equal(pos.vehiclePlan.confirmed,false);
  assert.equal(pos.vehiclePlan.evidenceRole,"shared-working-representative");
  assert.ok(pos.vehiclePlan.sourceUrl.startsWith("https://timetables.jreast.co.jp/"));
  assert.equal(pos.vehiclePlan.crossLineEvidence.calendarType,"holiday");
});
