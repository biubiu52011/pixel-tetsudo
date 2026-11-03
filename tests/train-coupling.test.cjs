/* Run with: node --test tests/train-coupling.test.cjs
 * Uses only Node built-ins; the website itself remains static.
 */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const file = path.resolve(__dirname, "../data/timetables/train-coupling-index.js");
const sandbox = { window:{} };
vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename:file });
const coupling = sandbox.window.TrainCoupling;
const stations = ["NaritaAirport", "AirportTerminal2", "Chiba", "Kinshicho",
  "Tokyo", "Shinagawa", "Yokohama", "Ofuna"].map(stationId => ({stationId}));

function position(trainNumber, stationIndex, extra={}) {
  return {
    trainNumber, stationIndex, serviceDate:"2026-11-03",
    trainType:"odpt.TrainType:JR-East.LimitedExpress",
    positionLineId:"SobuRapid", sourceRailway:"odpt.Railway:JR-East.SobuRapid",
    railDirection:"Inbound", estimated:true, positionSource:"train-timetable",
    trainId:"timetable:" + trainNumber, segmentProgress:0, ...extra
  };
}

test("published split trains retain their original independent public train numbers", () => {
  assert.equal(coupling.lookup(position("2002M",1)).partner, "2202M");
  assert.equal(coupling.lookup(position("2202M",1)).partner, "2002M");
  assert.equal(coupling.lookup(position("2001M",1)).partner, "2201M");
  assert.equal(coupling.lookup(position("2054M",1)).partner, "2254M");
});

test("same service number does not prove two coupled formations", () => {
  assert.equal(coupling.lookup(position("2004M",1)), null);
  assert.equal(coupling.lookup(position("2204M",1)), null);
  assert.equal(coupling.lookup(position("2008M",1)), null);
  assert.equal(coupling.lookup(position("2002E",1)), null);
});

test("reject mismatching dates, lines, operators and service types", () => {
  assert.equal(coupling.lookup(position("2002M",1,{serviceDate:"2026-12-01"})), null);
  assert.equal(coupling.lookup(position("2002M",1,{serviceDate:"2026-10-31"})), null);
  assert.equal(coupling.lookup(position("2002M",1,{trainType:"Local"})), null);
  assert.equal(coupling.lookup(position("2002M",1,{positionLineId:"TobuTojo",sourceRailway:""})), null);
  assert.equal(coupling.lookup(position("2002M",1,{operator:"Tobu"})), null);
  assert.equal(coupling.lookup(position("2002M",1,{vehiclePlan:{crossLineEvidence:{serviceGroup:"joban-rapid"}}})), null);
});

test("one physical marker for a provably co-located timetable pair", () => {
  const before = [position("2002M",2),position("2202M",2)];
  const after = coupling.prepare(before, stations);
  assert.equal(after.length,1);
  assert.equal(after[0].trainNumber,"2002M");
  assert.equal(after[0].trainId,"timetable:2002M");
  assert.deepEqual(Array.from(after[0].coupling.numbers),["2002M","2202M"]);
  assert.equal(after[0].coupling.joinedPositionsVerified,true);
  assert.equal(after[0].coupling.physicalConfirmed,false);
  assert.equal(before[0].coupling,undefined,"upstream records are immutable");
});

test("split portions at Tokyo and beyond remain two separately numbered services", () => {
  for (const index of [4,5,6]) {
    const result = coupling.prepare([position("2002M",index),position("2202M",index)],stations);
    assert.equal(result.length,2);
    assert.deepEqual(result.map(p=>p.trainNumber),["2002M","2202M"]);
    assert.notEqual(result[0].trainId,result[1].trainId);
  }
});

test("do not silently merge trains at different positions, times or sources", () => {
  assert.equal(coupling.prepare([position("2002M",1),position("2202M",2)],stations).length,2);
  assert.equal(coupling.prepare([
    position("2002M",1,{segmentProgress:0.15}),
    position("2202M",1,{segmentProgress:0.90})
  ],stations).length,2);
  assert.equal(coupling.prepare([
    position("2002M",1,{estimated:false,positionSource:"realtime-api"}),
    position("2202M",1)
  ],stations).length,2);
  assert.equal(coupling.prepare([
    position("2002M",1,{serviceDate:"2026-11-03"}),
    position("2202M",1,{serviceDate:"2026-11-04"})
  ],stations).length,2);
});

test("do not invent a split location for positions without usable station evidence", () => {
  const noStation = position("2002M",null);
  const result = coupling.prepare([noStation],null);
  assert.equal(result.length,1);
  assert.equal(result[0].coupling,undefined);
});

test("labels distinguish timetable coupled pair, own post-split number and actual-day stock", () => {
  const joint = coupling.prepare([position("2002M",1),position("2202M",1)],stations)[0];
  assert.match(coupling.label(joint.coupling,"zh"),/时刻表并结车号 2002M \+ 2202M/);
  const split = coupling.prepare([position("2202M",6)],stations)[0];
  assert.match(coupling.label(split.coupling,"zh"),/独立编组 2202M/);
  assert.match(coupling.label(split.coupling,"ja"),/相手 2002M/);
  assert.match(coupling.label(split.coupling,"en"),/other portion 2002M/);
});
