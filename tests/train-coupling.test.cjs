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
    assert.deepEqual(Array.from(result, p=>p.trainNumber),["2002M","2202M"]);
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


test("Odoriko 1 and 9 split at Atami with distinct 30xxM/40xxM numbers", () => {
  const one = position("3021M",1,{positionLineId:"Tokaido",sourceRailway:"odpt.Railway:JR-East.Tokaido"});
  const nine = position("4029M",1,{positionLineId:"Tokaido",sourceRailway:"odpt.Railway:JR-East.Tokaido"});
  assert.equal(coupling.lookup(one).partner,"4021M");
  assert.equal(coupling.lookup(nine).partner,"3029M");
  assert.equal(coupling.lookup(one).junction,"Atami");
  assert.equal(coupling.lookup(one).operation,"split");
  assert.equal(coupling.lookup(nine).serviceName,"Odoriko");
});

test("Odoriko 4 and 10 join at Atami, rather than split", () => {
  const four = position("3024M",1,{positionLineId:"Tokaido",sourceRailway:"odpt.Railway:JR-East.Tokaido"});
  const ten = position("4030M",1,{positionLineId:"Tokaido",sourceRailway:"odpt.Railway:JR-East.Tokaido"});
  assert.equal(coupling.lookup(four).partner,"4024M");
  assert.equal(coupling.lookup(ten).partner,"3030M");
  assert.equal(coupling.lookup(four).operation,"join");
  assert.equal(coupling.lookup(ten).operation,"join");
});

test("temporary Odoriko 7 and 8 respect exact November 2026 operating dates", () => {
  const options = {positionLineId:"Tokaido",sourceRailway:"odpt.Railway:JR-East.Tokaido"};
  assert.equal(coupling.lookup(position("9027M",1,options)).partner,"8077M");
  assert.equal(coupling.lookup(position("8078M",1,options)).partner,"9028M");
  assert.equal(coupling.lookup(position("9027M",1,{...options,serviceDate:"2026-11-02"})),null);
  assert.equal(coupling.lookup(position("8078M",1,{...options,serviceDate:"2026-11-04"})),null);
  assert.equal(coupling.lookup(position("9027M",1,{...options,serviceDate:"2026-11-29"})).partner,"8077M");
});

test("Atami split: two independent train numbers after junction, one jointly displayed before", () => {
  const line = ["Tokyo","Shinagawa","Yokohama","Ofuna","Odawara","Atami","Ito","IzukyuShimoda"]
    .map(stationId=>({stationId}));
  const opts = {positionLineId:"Tokaido",sourceRailway:"odpt.Railway:JR-East.Tokaido"};
  const pair = [position("3021M",3,opts),position("4021M",3,opts)];
  const before = coupling.prepare(pair,line);
  assert.equal(before.length,1);
  assert.equal(before[0].coupling.junction,"Atami");
  assert.deepEqual(Array.from(before[0].coupling.numbers),["3021M","4021M"]);
  assert.match(coupling.label(before[0].coupling,"ja"),/熱海駅/);
  assert.equal(coupling.prepare([position("3021M",5,opts),position("4021M",5,opts)],line).length,2);
  const separate = coupling.prepare([position("3021M",6,opts),position("4021M",6,opts)],line);
  assert.equal(separate.length,2);
  assert.deepEqual(Array.from(separate, x=>x.trainNumber),["3021M","4021M"]);
  assert.match(coupling.label(separate[0].coupling,"zh"),/热海站分离后/);
});

test("Atami join: two independent train numbers on private branches, one jointly displayed to Tokyo", () => {
  const line = ["Shuzenji","Mishima","Atami","Odawara","Yokohama","Shinagawa","Tokyo"]
    .map(stationId=>({stationId}));
  const opts = {positionLineId:"Tokaido",sourceRailway:"odpt.Railway:JR-East.Tokaido"};
  assert.equal(coupling.prepare([position("3024M",1,opts),position("4024M",1,opts)],line).length,2);
  assert.equal(coupling.prepare([position("3024M",2,opts),position("4024M",2,opts)],line).length,2);
  const joint=coupling.prepare([position("3024M",3,opts),position("4024M",3,opts)],line);
  assert.equal(joint.length,1);
  assert.match(coupling.label(joint[0].coupling,"zh"),/热海站并结/);
});
