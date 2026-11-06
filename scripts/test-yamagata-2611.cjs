"use strict";
// Run: node scripts/test-yamagata-2611.cjs
// Historical SQL clocks and physical trainsets are intentionally NOT certified.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const window = {};
const context = vm.createContext({window});
for (const name of [
  "data/timetables/vehicle-garage-png-map.js",
  "data/timetables/jreast-yamagata-2611-number-index.js"
]) vm.runInContext(read(name), context, {filename:name, timeout:2500});

const garage = window.VehicleGaragePngMap;
const index = window.JREastYamagataNumberIndex202611;
assert.ok(garage && index);
assert.equal(index.stops.length, 35);
assert.equal(index.stops[0], "Fukushima");
assert.equal(index.stops[34], "Shinjo");
assert.equal(new Set(index.stops).size, 35);
assert.equal(index.candidates.length, 3);
assert.ok(index.candidates.includes("719系5000番台"));

function fixture(cal, number, date) {
  const record = index.roster[cal][number];
  assert.ok(record);
  return {
    trainNumber:number, positionLineId:"Yamagata", displayLineId:"Yamagata",
    sourceRailway:"odpt.Railway:JR-East.Yamagata",
    positionSource:"supabase-train-run", estimated:true,
    trainOperator:"JR-East", trainType:"odpt.TrainType:JR-East.Local",
    railDirection:"odpt.RailDirection:"+record[0],
    calendarType:cal==="Weekday"?"weekday":"holiday",
    serviceDate:date,
    scheduledStopKeys:record[1].map(i=>"odpt.Station:JR-East."+index.stops[i])
  };
}

let total=0, illustrated=0, unknown=0;
for (const [cal, roster] of Object.entries(index.roster)) {
  const date=cal==="Weekday"?"2026-11-06":"2026-11-07";
  assert.equal(Object.keys(roster).length, cal==="Weekday"?91:92);
  for (const [number, record] of Object.entries(roster)) {
    assert.match(number, /^(?:4\d{2}|14\d{2}|54\d{2})M$/);
    assert.ok(record[1].length>=2);
    assert.ok(record[1].every((n,i,a)=>Number.isInteger(n)&&n>=0&&n<35&&
      (i===0||(record[0]==="Inbound"?n<a[i-1]:n>a[i-1]))));
    const p=fixture(cal,number,date);
    const proof=index.verify(p);
    assert.ok(proof, cal+"/"+number+" must verify");
    assert.equal(proof.officialNumberScope,true);
    assert.equal(proof.actualVehicleConfirmed,false);
    assert.equal(proof.sourceClocksVerified,false);
    assert.match(proof.numberSourceUrl,
      /^https:\/\/timetables\.jreast\.co\.jp\/2611\/timetable-v\/249[ud][12]\.html$/);
    const art=index.resolve(p);
    if (art) {
      illustrated++;
      assert.equal(art.referenceOnly,true);
      assert.equal(art.authorizesPNG,false);
      assert.equal(art.actualVehicleConfirmed,false);
      assert.equal(art.model,null);
      assert.ok(garage.matchModelPath(art.illustrationModel,art.illustrationPng,"Yamagata"));
    } else {
      unknown++;
      const candidates=index.resolveCandidates(p);
      assert.ok(candidates&&candidates.referenceOnly);
      assert.equal(candidates.models.length,3);
      assert.equal(candidates.candidateAssets.length,3);
      candidates.candidateAssets.forEach((png,i)=>
        assert.ok(garage.matchModelPath(candidates.assetModels[i],png,"Yamagata")));
    }
    total++;
  }
}
assert.equal(total,183);
assert.equal(illustrated,54);
assert.equal(unknown,129);
assert.equal(garage.lineModels("Yamagata").includes("719系5000番台"),true);
assert.ok(garage.matchModelPath("719系5000番台",
  "../images/列车/JR東日本/JR東日本_719系_5000番台.png","Yamagata"));
// The uploaded legacy 205 is searchable, not a live Tsurumi candidate.
assert.equal(garage.findModel("205系1100番台（鶴見線）").length,1);
assert.equal(garage.lineModels("Tsurumi").includes("205系1100番台（鶴見線）"),false);
assert.equal(garage.matchModelPath("205系1100番台（鶴見線）",
  "../images/列车/JR東日本/JR東日本_205系_1100番台_鶴見線.png","Tsurumi"),false);

const p=fixture("Weekday","420M","2026-11-06");
assert.equal(index.resolve(p).illustrationModel,"E723系5000番台");
assert.equal(index.resolve(p).actualNovemberModelConfirmed,false);
assert.ok(index.verify({...p,serviceDate:"2026-11-30"}));
assert.equal(index.verify({...p,serviceDate:"2026-11-07"}),null);
assert.equal(index.verify({...p,trainNumber:"121M"}),null);
assert.equal(index.verify({...p,trainNumber:"3427M"}),null);
assert.equal(index.verify({...p,positionLineId:"OuMain"}),null);
assert.equal(index.verify({...p,displayLineId:"YamagataShinkansen"}),null);
assert.equal(index.verify({...p,trainType:"odpt.TrainType:JR-East.Rapid"}),null);
assert.equal(index.verify({...p,scheduledStopKeys:p.scheduledStopKeys.slice(1)}),null);
assert.equal(index.verify({...p,scheduledStopKeys:p.scheduledStopKeys.slice().reverse()}),null);
assert.equal(index.resolve({...p,actualVehicleConfirmed:true}),null);
assert.equal(index.resolve({...p,vehicleFormationId:"B-1"}),null);
const holiday=fixture("SaturdayHoliday","420M","2026-11-07");
assert.ok(index.verify({...holiday,serviceDate:"2026-11-03"}));
assert.ok(index.verify({...holiday,serviceDate:"2026-11-23"}));
assert.equal(index.verify({...holiday,serviceDate:"2026-11-06"}),null);

const vehicles=read("js/train-vehicle.js");
assert.ok(vehicles.includes('"planned-stock-library-9": ["Yamagata"]'));
assert.ok(!vehicles.includes('"planned-stock-library-9": ["YamagataShinkansen"]'));
assert.ok(vehicles.includes('"jr-yamagata-2026-e723-family-reference"'));
assert.ok(!vehicles.includes('"artwork-inventory-032"'));

const html=read("pages/trains.html");
function assertCache(source, relative) {
  const bytes=fs.readFileSync(path.join(root,source));
  const hash=crypto.createHash("sha1")
    .update("blob "+bytes.length+"\0").update(bytes).digest("hex").slice(0,12);
  assert.ok(html.includes('data-script-src="'+relative+'?v='+hash+'"'),
    "Stale train-page cache version: "+source);
}
assertCache("data/timetables/vehicle-garage-png-map.js",
  "../data/timetables/vehicle-garage-png-map.js");
assertCache("js/train-vehicle.js","../js/train-vehicle.js");
assertCache("js/train-position-estimator.js","../js/train-position-estimator.js");
assertCache("data/timetables/jreast-yamagata-2611-number-index.js",
  "../data/timetables/jreast-yamagata-2611-number-index.js");
assert.ok(html.indexOf("jreast-yamagata-2611-number-index.js")<
  html.indexOf("train-vehicle.js"));
assert.ok(html.includes('data-line-scope="Yamagata"'));
console.log("Yamagata 2611 passed: "+total+" roster cases, "+
  illustrated+" illustrative mappings, "+unknown+
  " mixed-fleet candidates; cache tags current.");
