// Run: node scripts/test-yonezawa-2611.cjs
// Source-only checks, not a physical consist or complete stop-clock proof.
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const window={};
const context=vm.createContext({window});
for(const file of ["data/timetables/vehicle-garage-png-map.js","data/timetables/jreast-yonezawa-2611-number-index.js"])
 vm.runInContext(read(file),context,{filename:file,timeout:2000});
const g=window.VehicleGaragePngMap,v=window.JREastYonezawaNumberIndex202611;
assert.ok(g&&v);
assert.equal(v.railStations.length,8);
assert.equal(v.allStations.length,20);
assert.equal(v.railStations[0],"Yonezawa");
assert.equal(v.railStations[7],"Imaizumi");
assert.equal(v.outbound.length,9);
assert.equal(v.inbound.length,9);
const png="../images/列车/JR東日本/JR東日本_キハ110系.png";
assert.ok(g.matchModelPath("キハ110系",png,"Yonezawa"));
function fixture(number,date,cal,direction){
 const stations=direction==="Outbound"?Array.from(v.railStations):Array.from(v.railStations).reverse();
 return {trainNumber:number,positionLineId:"Yonezawa",displayLineId:"Yonezawa",
 sourceRailway:"odpt.Railway:JR-East.Yonezawa",positionSource:"supabase-train-run",
 estimated:true,trainType:"odpt.TrainType:JR-East.Local",trainOperator:"JR-East",
 calendarType:cal,serviceDate:date,railDirection:"odpt.RailDirection:"+direction,
 scheduledStopKeys:stations.map(x=>"odpt.Station:JR-East."+x)};
}
let railway=0,cancelled=0;
for(const [date,cal] of [["2026-11-06","weekday"],["2026-11-07","holiday"]])
 for(const [dir,nums] of [["Outbound",v.outbound],["Inbound",v.inbound]])
  for(const n of nums){
   const p=fixture(n,date,cal,dir),proof=v.verify(p),art=v.resolve(p);
   assert.ok(proof&&art&&proof.railOnly&&!proof.replacementBus);
   assert.equal(proof.sourceClocksVerified,false);
   assert.equal(art.illustrationPng,png);
   assert.equal(art.authorizesPNG,false);
   assert.equal(art.actualVehicleConfirmed,false);
   assert.equal(v.verify({...p,trainNumber:"11"}),null);
   assert.equal(v.verify({...p,scheduledStopKeys:p.scheduledStopKeys.slice(1)}),null);
   assert.equal(v.verify({...p,scheduledStopKeys:p.scheduledStopKeys.slice().reverse()}),null);
   assert.equal(v.verify({...p,positionLineId:"Yamagata"}),null);
   assert.equal(v.resolve({...p,actualVehicleConfirmed:true}),null);
   railway++;
  }
assert.equal(railway,36);
for(let d=9;d<=13;d++)
 for(const [dir,nums] of [["Outbound",v.outbound],["Inbound",v.inbound]])
  for(const n of nums){
   const p=fixture(n,"2026-11-"+String(d).padStart(2,"0"),"weekday",dir);
   assert.equal(!!v.verify(p),!v.maintenance.includes(n));
   if(v.maintenance.includes(n))cancelled++;
  }
assert.equal(cancelled,20);
assert.ok(v.verify(fixture("7143D","2026-11-23","holiday","Outbound")));
const page=read("pages/trains.html");
for(const [file,rel] of [
 ["data/timetables/vehicle-garage-png-map.js","../data/timetables/vehicle-garage-png-map.js"],
 ["data/timetables/jreast-yonezawa-2611-number-index.js","../data/timetables/jreast-yonezawa-2611-number-index.js"],
 ["js/train-vehicle.js","../js/train-vehicle.js"],
 ["js/train-position-estimator.js","../js/train-position-estimator.js"],
 ["js/trains-render.js","../js/trains-render.js"]]){
 const bytes=fs.readFileSync(path.join(root,file));
 const hash=crypto.createHash("sha1").update("blob "+bytes.length+"\0")
   .update(bytes).digest("hex").slice(0,12);
 assert.ok(page.includes(rel+"?v="+hash),"Stale script: "+file);
}
assert.ok(page.includes('data-line-scope="Yonezawa"'));
assert.ok(page.indexOf("jreast-yonezawa-2611-number-index.js")<page.indexOf("train-vehicle.js"));
const server=read("supabase/functions/train-runs/index.ts");
assert.ok(server.includes('if(lineId==="Yonezawa"&&/^2026-11-'));
assert.ok(server.includes('const maintenanceTrains=new Set(["7149D","7150D","7151D","7152D"])'));
assert.ok(server.includes('run.train_number_verification="official-2611-yonesaka-rail-only"'));
console.log("Yonezawa 2611 OK: "+railway+" rail cases, "+cancelled+" cancelled date-cases, bus/route guards and cache hashes.");
