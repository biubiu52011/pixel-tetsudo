'use strict';
// TobuIsesaki: scoped PNG illustrations, not observations of rolling stock.
// SQL source-number roster: manual_timetable_templates (2026-10 import).
// 2026 timetable: https://tabinomemo.jp/train/timetable/tobu/11
// Official north-end car counts: https://www.tobu.co.jp/cms-pdf/news/20260210134344bOudukqdpHQTk7q2T0hikA.pdf
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const w={};
const context=vm.createContext({window:w});
vm.runInContext(fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8'),context);
vm.runInContext(fs.readFileSync('data/timetables/tobu-isesaki-2611-number-png.js','utf8'),context);
const ix=w.TobuIsesaki2611Png;
function match(number,type='Local',cal='weekday',changes={}){
  return ix.match(String(number),{
    lineId:'TobuIsesaki',displayLineId:'TobuIsesaki',
    positionLineId:'TobuIsesaki',sourceRailway:'odpt.Railway:Tobu.Isesaki',
    trainOperator:'Tobu',positionSource:'supabase-train-run',estimated:true,
    serviceDate:'2026-11-14',calendarType:cal,
    trainType:'odpt.TrainType:Tobu.'+type,...changes
  });
}
function range(a,b,step=1){return Array.from({length:Math.floor((b-a)/step)+1},(_,i)=>a+i*step);}
test('Tobu Isesaki PNG: official north-end and Ryomo numbers stay authoritative',()=>{
  assert.equal(ix.localNumbers,95);
  assert.equal(ix.limitedNumbers,50);
  assert.equal(ix.corridorNumbers,125);
  assert.equal(match('303E').scheduledCars,3);
  assert.equal(match('305E').scheduledCars,2);
  assert.equal(match('1801','LimitedExpress').model,'東武500系');
  assert.equal(match('1803','LimitedExpress').model,'東武200型');
  assert.equal(match('501','LimitedExpress'),null);
  assert.equal(match('303E','SectionExpress'),null);
});
test('501–580 corridor Local: exact weekday and holiday number sets',()=>{
  const wdays=range(501,574), hol=[...range(501,576),578,580];
  for(const [cal,expected] of [['weekday',wdays],['holiday',hol]]){
    const known=new Set(expected);
    let hits=0;
    for(let n=499;n<=582;n++){
      const r=match(String(n),'Local',cal);
      assert.equal(!!r,known.has(n),cal+' '+n);
      if(r){
        hits++;
        assert.equal(r.serviceFamily,'kuki-tatebayashi-local');
        assert.equal(r.scheduledCars,null);
        assert.equal(r.model,'東武10030系');
        assert.equal(r.referenceOnly,true);
        assert.equal(r.actualVehicleConfirmed,false);
        assert.deepEqual(Array.from(r.candidateModels),
          ['東武10000系','東武10030系']);
      }
    }
    assert.equal(hits,expected.length);
  }
});
test('2501–2534 section express: weekday-only 2532 and 2534',()=>{
  const base=[...range(2501,2522),...range(2524,2534,2)];
  for(const [cal,expected] of [['weekday',base],['holiday',base.filter(n=>n<=2530)]]){
    const allowed=new Set(expected);
    for(let n=2498;n<=2536;n++){
      const r=match(String(n),'SectionExpress',cal);
      assert.equal(!!r,allowed.has(n),cal+' '+n);
      if(r)assert.equal(r.serviceFamily,'kuki-tatebayashi-section-express');
    }
  }
});
test('3501–3525 section semi-express: weekday-only 3510,3512,3525',()=>{
  const base=[...range(3501,3513),...range(3515,3525,2)];
  for(const [cal,expected] of [['weekday',base],
    ['holiday',base.filter(n=>![3510,3512,3525].includes(n))]]){
    const allowed=new Set(expected);
    for(let n=3498;n<=3527;n++){
      const r=match(String(n),'SectionSemiExpress',cal);
      assert.equal(!!r,allowed.has(n),cal+' '+n);
      if(r)assert.equal(r.serviceFamily,'kuki-tatebayashi-section-semi-express');
    }
  }
});
test('corridor reference never overrides proven vehicle, wrong line, date or source',()=>{
  const blocked=[
    {positionLineId:'TobuSkytree',lineId:'TobuSkytree'}, {displayLineId:'TobuSkytree'},
    {sourceRailway:'odpt.Railway:Tobu.TobuSkytree'},
    {positionSource:'other'}, {estimated:false},
    {serviceDate:'2026-12-01'}, {serviceDate:'2026-10-31'},
    {calendarType:'unknown'}, {vehicleIdentityStatus:'EXACT'},
    {vehicleResolvedFromRealtime:true}, {actualVehicleConfirmed:true},
    {vehicleFormationId:'set-1'}, {vehicleFormationConflict:true},
    {vehicleFormationCandidates:['set-1']},
    {realtimeVehicleType:'東武8000系'},
    {vehiclePlan:{models:['東武50050系']}},
    {trainOperator:'Other'}
  ];
  for(const changes of blocked)assert.equal(match('501','Local','weekday',changes),null,JSON.stringify(changes));
  assert.equal(match('577'),null);
  assert.equal(match('579','Local','holiday'),null);
  assert.equal(match('2501','Local'),null);
  assert.equal(match('3501','SectionExpress'),null);
  assert.equal(match('A4845T','TH-LINER'),null);
  assert.equal(match('501','Local','weekday',{realtimeVehicleType:'東武10030系'}).model,'東武10030系');
  assert.ok(w.VehicleGaragePngMap.matchModelPath(
    '東武10030系','../images/列车/東武鉄道/東武鉄道_10030型_未更新車.png',
    'TobuIsesaki'));
});
