'use strict';
/* JR East 2611 Ishinomaki: published train numbers, dated exclusions,
 * scoped reference PNGs, and SQL-only position admission.
 * node --test tests/ishinomaki-2611-official-number-png.test.cjs
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const SRC='odpt.Railway:JR-East.Ishinomaki';
const win={};
const ctx=vm.createContext({window:win,Date,console:{
  log(){},warn(){},error(){},debug(){}
},_isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-ishinomaki-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const renderer=fs.readFileSync('js/trains-render.js','utf8');
const markerStart=renderer.indexOf('  function _trainMarkerDomKind(');
const markerEnd=renderer.indexOf('  // Public identification boundary:',markerStart);
assert.ok(markerStart>=0&&markerEnd>markerStart);
vm.runInContext(renderer.slice(markerStart,markerEnd),ctx,{filename:'js/trains-render.js:marker'});
const index=win.JREastIshinomakiNumberIndex202611;
const normalPng='../images/列车/JR東日本/JR東日本_キハ110系.png';
const hybridPng='../images/列车/JR東日本/JR東日本_HB-E210系.png';
const position=(number,direction,type,model,extra={})=>({
  trainId:'planned-trip:2026-11-05|'+number,
  trainNumber:number,positionLineId:'Ishinomaki',
  sourceRailway:SRC,trainOperator:'JR-East',
  railDirection:'odpt.RailDirection:'+direction,
  trainType:'odpt.TrainType:JR-East.'+type,
  serviceDate:'2026-11-05',calendarType:'weekday',
  positionSource:'supabase-train-run',estimated:true,
  vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
  plannedVehicleCandidates:[model],...extra
});
test('2611 official 37 regular + 2 rapid through numbers map to existing scoped PNGs',()=>{
  assert.equal(index.inboundRegular.length,20);
  assert.equal(index.outboundRegular.length,17);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('キハ110系',normalPng,'Ishinomaki'),true);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('HB-E210系',hybridPng,'Ishinomaki'),true);
  const groups=[
    [index.inboundRegular,'Inbound','Local','キハ110系',normalPng],
    [index.outboundRegular,'Outbound','Local','キハ110系',normalPng],
    [['5530D'],'Inbound','Rapid','HB-E210系',hybridPng],
    [['5543D'],'Outbound','Rapid','HB-E210系',hybridPng]
  ];
  for(const [numbers,dir,type,model,png] of groups){
    for(const number of numbers){
      for(const [day,cal] of [['2026-11-05','weekday'],['2026-11-07','holiday']]){
        const p=position(number,dir,type,model,{serviceDate:day,calendarType:cal});
        const v=win.TrainVehicle.lookupTrainNumberRangePng(p);
        assert.ok(v,number+'/'+day);
        assert.equal(v.model,model);
        assert.equal(v.pngPath,png);
        assert.equal(v.planned,true);
        const marker=ctx._trainMarkerSpec(p,p.trainId,'Ishinomaki');
        assert.equal(marker.kind,'vehicle',number+'/'+day);
        assert.equal(marker.iconSrc,png);
        assert.equal(marker.planned,true);
        assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
      }
    }
  }
});
test('dated seasonal rapid numbers admitted only November 21-23, never receive KiHa or HB image',()=>{
  for(const [number,dir] of [['9621D','Outbound'],['9624D','Inbound']]){
    for(const day of ['2026-11-21','2026-11-22','2026-11-23']){
      const plan=index.verify(number,SRC,'odpt.RailDirection:'+dir,
        'odpt.TrainType:JR-East.Local','holiday',day);
      assert.ok(plan,number+'/'+day);
      assert.equal(plan.trainType,'Rapid');
      assert.equal(plan.kind,'seasonal');
      assert.equal(plan.model,'');
      const p=position(number,dir,'Rapid','キハ110系',{serviceDate:day,calendarType:'holiday'});
      assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null);
    }
    assert.equal(index.verify(number,SRC,dir,'Local','weekday','2026-11-05'),false);
    assert.equal(index.verify(number,SRC,dir,'Local','holiday','2026-11-07'),false);
    assert.equal(index.verify(number,SRC,dir,'Local','holiday','2026-12-05'),null);
  }
});
test('wrong source/direction, phantom number, candidate or date cannot inherit artwork',()=>{
  const local=position('1623D','Outbound','Local','キハ110系');
  const hb=position('5530D','Inbound','Rapid','HB-E210系');
  const invalid=[
    {...local,trainNumber:'9631D'}, {...local,trainNumber:'9634D'},
    {...local,trainNumber:'9524D'}, {...local,trainNumber:'9621D'},
    {...local,trainNumber:'9624D'},
    {...local,railDirection:'odpt.RailDirection:Inbound'},
    {...local,sourceRailway:'odpt.Railway:JR-East.IshinomakiWrong'},
    {...local,positionLineId:'BanetsuEast'},
    {...local,displayLineId:'BanetsuWest'},
    {...local,trainOperator:'JR-West'},
    {...local,serviceDate:'2026-12-05'},
    {...local,trainType:'odpt.TrainType:JR-East.Rapid'},
    {...local,plannedVehicleCandidates:['HB-E210系']},
    {...hb,plannedVehicleCandidates:['キハ110系']},
    {...hb,realtimeVehicleType:'キハ110系'},
    {...hb,vehiclePlan:{confirmed:true,status:'PLANNED_MODEL',models:['キハ110系']}}
  ];
  for(const p of invalid)assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(p),null,
    'must reject '+JSON.stringify(p));
  assert.equal(index.verify('1623D',SRC,'Outbound','Local','weekday','2026-11-05').kind,'regular');
  assert.equal(index.verify('9631D',SRC,'Outbound','Local','weekday','2026-11-05'),false);
  assert.equal(index.verify('9524D',SRC,'Inbound','Rapid','weekday','2026-11-05'),false);
});
test('estimator keeps official SQL number but drops historical phantom timetable',()=>{
  const dateIso='2026-11-04T21:00:00Z'; // 2026-11-05 06:00 JST
  class FixedDate extends Date{
    constructor(...args){super(...(args.length?args:[dateIso]));}
    static now(){return Date.parse(dateIso);}
  }
  const railwayLine={stations:['Kogota','Maeyachi','Ishinomaki','Onagawa'],operator:'JR-East'};
  const root={RuntimeConfig:{},JREastIshinomakiNumberIndex202611:index,
    ODPTClient:{LINE_RAILWAY_CODE:{Ishinomaki:'Ishinomaki'},
      LINE_TO_OPERATOR:{Ishinomaki:'JR-East'}}};
  const c=vm.createContext({window:root,Date:FixedDate,console:{
    log(){},warn(){},error(){},debug(){}
  }});
  vm.runInContext(fs.readFileSync('js/train-position-estimator.js','utf8'),c);
  const stops=[
    ['Kogota',null,'05:55'],['Maeyachi','06:10','06:10'],
    ['Ishinomaki','06:31','06:31'],['Onagawa','07:23',null]
  ];
  function tt(number){
    return {'@id':'sql:Ishinomaki:'+number,'odpt:railway':SRC,
      'odpt:trainNumber':number,'odpt:calendar':'odpt.Calendar:Weekday',
      'odpt:railDirection':'odpt.RailDirection:Outbound',
      'odpt:trainType':'odpt.TrainType:JR-East.Local',
      'odpt:destinationStation':['odpt.Station:JR-East.Ishinomaki.Onagawa'],
      'odpt:trainTimetableObject':stops.map(([station,arrival,departure])=>({
        ...(arrival?{'odpt:arrivalStation':'odpt.Station:JR-East.Ishinomaki.'+station,
          'odpt:arrivalTime':arrival}:{}),
        ...(departure?{'odpt:departureStation':'odpt.Station:JR-East.Ishinomaki.'+station,
          'odpt:departureTime':departure}:{})
      })),
      _positionSource:'supabase-train-run',_sqlLineId:'Ishinomaki',
      _serviceDate:'2026-11-05',_canonicalGroupEvidence:'source_only',
      _timetableValidity:'undated_not_current_verified',_timetableDateVerified:false};
  }
  root.TrainPositionEstimator.registerManualTimetable('Ishinomaki',
    [tt('1623D'),tt('9631D'),tt('9621D')]);
  const positions=root.TrainPositionEstimator.estimateAllPositions(
    {Ishinomaki:railwayLine},{},{},null,{lineIds:['Ishinomaki']}).Ishinomaki;
  assert.equal(positions.length,1);
  assert.equal(positions[0].trainNumber,'1623D');
  assert.equal(positions[0].positionSource,'supabase-train-run');
  assert.equal(positions[0].estimated,true);
  assert.equal(positions[0].timetableDateVerified,false);
  assert.equal(positions[0].vehicleIdentityStatus,'UNKNOWN');
});
