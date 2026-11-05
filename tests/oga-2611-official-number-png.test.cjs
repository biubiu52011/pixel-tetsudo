'use strict';
/* 2026-11 男鹿線 official train numbers + EV-E801 planned vehicle PNG.
 * node --test tests/oga-2611-official-number-png.test.cjs
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},ctx=vm.createContext({window:win,Date,console:{
  debug(){},log(){},warn(){},error(){}
},_isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-oga-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start);
vm.runInContext(render.slice(start,end),ctx,{filename:'js/trains-render.js:marker'});
const index=win.JREastOgaNumberIndex202611;
const src='odpt.Railway:JR-East.Oga',png='../images/列车/JR東日本/JR東日本_EV-E801系.png';
function pos(number,direction,date='2026-11-07',calendar='holiday',extra={}){
  return {trainNumber:number,positionLineId:'Oga',trainOperator:'JR-East',
    sourceRailway:src,railDirection:'odpt.RailDirection:'+direction,
    trainType:'odpt.TrainType:JR-East.Local',serviceDate:date,
    calendarType:calendar,positionSource:'supabase-train-run',
    estimated:true,plannedVehicleCandidates:['EV-E801系（ACCUM）'],
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,...extra};
}
test('29 official Oga M-number services yield approved EV-E801 reference gallery',()=>{
  assert.equal(index.inbound.length,15);
  assert.equal(index.outbound.length,14);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('EV-E801系',png,'Oga'),true);
  for(const [numbers,direction] of [[index.inbound,'Inbound'],[index.outbound,'Outbound']]){
    for(const number of numbers){
      for(const [day,cal] of [['2026-11-07','holiday'],['2026-11-06','weekday']]){
        const p=pos(number,direction,day,cal);
        assert.equal(index.verify(number,src,p.railDirection,p.trainType,cal,day).number,number);
        const image=win.TrainVehicle.lookupTrainNumberRangePng(p);
        assert.ok(image,number+'/'+day);
        assert.equal(image.model,'EV-E801系');
        assert.equal(image.pngPath,png);
        assert.equal(image.planned,true);
        const marker=ctx._trainMarkerSpec(p,'planned:'+number,'Oga');
        assert.equal(marker.kind,'vehicle');
        assert.equal(marker.iconSrc,png);
        assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
      }
    }
  }
});
test('six November 5 cancelled services never become active timetable train markers',()=>{
  const cancels=[
    ...['1130M','1132M','1134M'].map(n=>[n,'Inbound']),
    ...['1131M','1133M','1135M'].map(n=>[n,'Outbound'])
  ];
  for(const [number,direction] of cancels){
    assert.equal(index.verify(number,src,direction,'Local','weekday','2026-11-05'),false);
    const p=pos(number,direction,'2026-11-05','weekday');
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
    assert.equal(ctx._trainMarkerSpec(p,'planned:'+number,'Oga').kind,'unresolved');
    assert.ok(index.verify(number,src,direction,'Local','holiday','2026-11-07'));
  }
  assert.ok(index.verify('1120M',src,'Inbound','Local','weekday','2026-11-05'));
  assert.ok(index.verify('1123M',src,'Outbound','Local','weekday','2026-11-05'));
});
test('special D trains, wrong sources, days, types, or foreign vehicles do not match',()=>{
  const normal=pos('1120M','Inbound');
  for(const p of [
    {...normal,trainNumber:'9129D'}, {...normal,trainNumber:'9135D'},
    {...normal,trainNumber:'9134D'}, {...normal,trainNumber:'9146D'},
    {...normal,trainNumber:'1121M'}, {...normal,railDirection:'odpt.RailDirection:Outbound'},
    {...normal,sourceRailway:'odpt.Railway:JR-East.OuMain'},
    {...normal,positionLineId:'OuMain'},
    {...normal,displayLineId:'BanetsuEast'},
    {...normal,trainOperator:'JR-West'},
    {...normal,trainType:'odpt.TrainType:JR-East.Rapid'},
    {...normal,serviceDate:'2026-12-05'},
    {...normal,plannedVehicleCandidates:['701系']},
    {...normal,realtimeVehicleType:'701系'}
  ])assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null,
    'incorrect Oga gallery must be blocked: '+JSON.stringify(p));
});
