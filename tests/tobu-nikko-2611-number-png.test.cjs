'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const n=data.lines.TobuNikko,k=data.lines.Nikkoku;
test('Tobu Nikko topology, duration hops and published through boundaries share canonical ownership',()=>{
 assert.equal(n.stations.length,26);
 assert.equal(n.durations.length,25);
 assert.ok(n.durations.some(v=>v>=5),'no blanket two-minute segments');
 assert.equal(n.durationTotalMin,n.durations.reduce((a,b)=>a+b,0));
 assert.equal(n.color.toLowerCase(),n.presentation.color.toLowerCase());
 assert.ok(n.throughServices.includes('TobuSkytree'));
 assert.ok(n.throughServices.includes('Nikkoku'));
 assert.ok(k.throughServices.includes('TobuNikko'));
 assert.deepEqual(n.serviceBoundaries.find(b=>b.lineId==='Nikkoku').handoverStations,['Shimo-Imaichi']);
 assert.deepEqual(k.serviceBoundaries.find(b=>b.lineId==='TobuNikko').handoverStations,['Shimo-Imaichi']);
 assert.equal(n.throughServices.includes('UtsunomiyaJR'),false,
  'JR limited express is not a blanket local train continuation');
});
const context=vm.createContext({window:{}});
for(const file of ['data/timetables/vehicle-garage-png-map.js','data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
 vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:10000});
const root=context.window;
function sample(number,mod={}){
 return Object.assign({positionLineId:'TobuNikko',displayLineId:'TobuNikko',
  sourceRailway:'odpt.Railway:Tobu.Nikko',trainOperator:'Tobu',
  trainNumber:number,trainType:'odpt.TrainType:Tobu.LimitedExpress',
  positionSource:'supabase-train-run',estimated:true,serviceDate:'2026-11-13',
  calendarType:'weekday',vehicleIdentityStatus:'UNKNOWN'},mod);
}
test('Nikko numbered express artwork stays evidence-based and reference-only',()=>{
 for(const [num,model,suffix] of [
  ['1001','東武500系','500系_リバティ.png'],
  ['1007','東武N100系','N100系_SPACIA_X.png'],
  ['1012','東武100系','100系_原色.png'],
  ['1020','東武N100系','N100系_SPACIA_X.png']]){
  const p=sample(num),m=root.TrainNumberPngRanges.match(num,'TobuNikko',p);
  assert.ok(m,'missing '+num);
  assert.equal(m.model,model);
  assert.ok(m.pngPath.endsWith(suffix));
  assert.equal(m.referenceOnly,true);
  assert.equal(m.actualVehicleConfirmed,false);
  assert.equal(root.VehicleGaragePngMap.matchModelPath(m.model,m.pngPath,'TobuNikko'),true);
  const art=root.TrainVehicle.selectMarkerArtwork(p,false);
  assert.equal(art.kind,'vehicle',num);
  assert.equal(art.representativeOnly,true);
 }
});
test('wrong source, service, date, stock identity and mixed-corridor numbers fail closed',()=>{
 const cases=[
  sample('9999'),sample('1007',{positionLineId:'TobuSkytree'}),
  sample('1007',{displayLineId:'Nikkoku'}),
  sample('1007',{sourceRailway:'odpt.Railway:Tobu.Kinugawa'}),
  sample('1007',{trainType:'odpt.TrainType:Tobu.Local'}),
  sample('1007',{serviceDate:'2026-12-01'}),
  sample('1007',{calendarType:'unverified'}),
  sample('1007',{vehicleIdentityStatus:'EXACT'}),
  sample('1007',{actualVehicleConfirmed:true}),
  sample('1007',{vehicleFormationId:'set-1'}),
  sample('1007',{realtimeVehicleType:'東武20400型'}),
  sample('1310'),
  sample('2501')
 ];
 cases.forEach((p,i)=>assert.equal(root.TrainNumberPngRanges.match(p.trainNumber,'TobuNikko',p),null,'case '+i));
});
test('source timetable remains explicitly pending edition verification',()=>{
 const audit=JSON.parse(fs.readFileSync('data/research/tobu-nikko-20261115-audit.json','utf8'));
 assert.match(audit.currentStatus,/not verified/);
 assert.equal(audit.totalMinutes,n.durationTotalMin);
 assert.deepEqual(audit.segmentMinutes,n.durations);
});
