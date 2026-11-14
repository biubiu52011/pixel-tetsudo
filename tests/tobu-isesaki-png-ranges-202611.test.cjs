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
vm.runInContext(fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8'),context);
vm.runInContext(fs.readFileSync('js/train-vehicle.js','utf8'),context);
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
  assert.equal(match('A9999T','TH-LINER'),null);
  assert.equal(match('501','Local','weekday',{realtimeVehicleType:'東武10030系'}).model,'東武10030系');
  assert.ok(w.VehicleGaragePngMap.matchModelPath(
    '東武10030系','../images/列车/東武鉄道/東武鉄道_10030型_未更新車.png',
    'TobuIsesaki'));
});


test('through-company source numbers resolve 2026-11 PNG illustration on Isesaki',()=>{
  assert.equal(ix.throughNumbers,157);
  const examples=[
    ['E1018K','holiday','Express','東急2020系','東急電鉄_2020系.png','hanzomon-through-k-owner',2],
    ['F1057S','holiday','Express','東京メトロ18000系','東京メトロ_18000系.png','hanzomon-through-s-owner',3],
    ['E1056T','holiday','Express','東武50050系','東武鉄道_50050型.png','hanzomon-through-t-owner',1],
    ['F1206K','weekday','Express','東急2020系','東急電鉄_2020系.png','hanzomon-through-k-owner',2],
    ['E1055S','weekday','Express','東京メトロ18000系','東京メトロ_18000系.png','hanzomon-through-s-owner',3],
    ['F1058T','weekday','Express','東武50050系','東武鉄道_50050型.png','hanzomon-through-t-owner',1],
    ['E4664T','holiday','SemiExpress','東武50050系','東武鉄道_50050型.png','hanzomon-through-t-owner',1],
    ['A4845T','holiday','TH-LINER','東武70090型','東武鉄道_70090型.png','th-liner-70090',1],
    ['A4643T','weekday','TH-LINER','東武70090型','東武鉄道_70090型.png','th-liner-70090',1]
  ];
  for(const [num,cal,typ,model,filename,family,candidateCount] of examples){
    const p={positionLineId:'TobuIsesaki',displayLineId:'TobuIsesaki',
      sourceRailway:'odpt.Railway:Tobu.Isesaki',trainOperator:'Tobu',
      positionSource:'supabase-train-run',estimated:true,
      serviceDate:'2026-11-14',calendarType:cal,
      trainType:'odpt.TrainType:Tobu.'+typ,trainNumber:num};
    const ref=w.TrainNumberPngRanges.match(num,'TobuIsesaki',p);
    assert.ok(ref,num);
    assert.equal(ref.model,model,num);
    assert.equal(ref.serviceFamily,family,num);
    assert.ok(ref.pngPath.endsWith(filename),num);
    assert.equal(ref.candidateModels.length,candidateCount,num);
    assert.equal(ref.referenceOnly,true,num);
    assert.equal(ref.illustrative,true,num);
    assert.equal(ref.actualVehicleConfirmed,false,num);
    assert.equal(w.VehicleGaragePngMap.matchModelPath(model,ref.pngPath,'TobuIsesaki'),true,num);
    const selected=w.TrainVehicle.selectMarkerArtwork(p,false);
    assert.equal(selected.kind,'vehicle',num);
    assert.ok(selected.iconSrc.endsWith(filename),num);
    assert.equal(selected.representativeOnly,true,num);
    assert.equal(selected.actualVehicleConfirmed,false,num);
  }
});
test('through-reference whitelist rejects wrong calendar, service, company, route and known set',()=>{
  const excluded=[
    ['E1018K','weekday','Express'],
    ['E1111K','holiday','Express'],
    ['A4643T','holiday','TH-LINER'],
    ['E1018K','holiday','Local'],
    ['A4845T','holiday','Express'],
    ['E9999K','holiday','Express'],
    ['F9999S','weekday','Express'],
    ['A9999T','holiday','TH-LINER']
  ];
  for(const [n,cal,typ] of excluded)
    assert.equal(match(n,typ,cal),null,n+'/'+cal+'/'+typ);
  for(const changes of [
    {positionLineId:'TobuSkytree',lineId:'TobuSkytree'},
    {displayLineId:'TobuSkytree'},
    {sourceRailway:'odpt.Railway:Tobu.TobuSkytree'},
    {trainOperator:'JR-East'},
    {positionSource:'station-timetable'},
    {estimated:false},
    {serviceDate:'2026-12-01'},
    {vehicleIdentityStatus:'EXACT'},
    {vehicleFormationId:'confirmed-set'},
    {vehicleResolvedFromRealtime:true},
    {actualVehicleConfirmed:true},
    {realtimeVehicleType:'東武50050系'},
    {vehiclePlan:{models:['東武50050系']}}
  ])assert.equal(match('E1018K','Express','holiday',changes),null,JSON.stringify(changes));
  assert.equal(match('E1018K','Express','holiday',{realtimeVehicleType:'東急2020系'}).model,'東急2020系');
});

test('344E Isesaki half of a verified 344E -> 635E Sano running chain uses source-calendar PNG',()=>{
  const chain='rc:planned-trip:2026-11-14|Tobu|odpt.Railway%3ATobu.Isesaki|TobuIsesaki|344E~'+
    'planned-trip:2026-11-14|Tobu|odpt.Railway%3ATobu.Sano|Sano|635E';
  // Reproduce the original estimator output, which had serviceId but no
  // calendarType unless an unrelated planned-model resolver succeeded.
  const isesaki={
    runningChainId:chain,trainNumber:'344E',
    lineId:'TobuIsesaki',positionLineId:'TobuIsesaki',
    displayLineId:'TobuIsesaki',sourceRailway:'odpt.Railway:Tobu.Isesaki',
    positionSource:'supabase-train-run',estimated:true,
    serviceDate:'2026-11-14',serviceId:'odpt.Calendar:SaturdayHoliday',
    trainType:'odpt.TrainType:Tobu.Local',trainOperator:'Tobu',
    vehicleIdentityStatus:'UNKNOWN',vehicleFormationCandidates:[]
  };
  const ref=w.TrainNumberPngRanges.match('344E','TobuIsesaki',isesaki);
  assert.ok(ref);
  assert.equal(ref.scheduledCars,3);
  assert.equal(ref.referenceOnly,true);
  assert.equal(ref.actualVehicleConfirmed,false);
  assert.ok(ref.pngPath.endsWith('東武鉄道_8000型.png'));
  const icon=w.TrainVehicle.selectMarkerArtwork(isesaki,false);
  assert.equal(icon.kind,'vehicle');
  assert.equal(icon.planned,true);
  assert.equal(icon.representativeOnly,true);
  assert.ok(icon.iconSrc.endsWith('東武鉄道_8000型.png'));
  // Shared runningChainId is a service link, NOT permission to reuse
  // 344E's illustration on the separately sourced Sano 635E segment.
  const sano={...isesaki,trainNumber:'635E',lineId:'Sano',
    positionLineId:'Sano',displayLineId:'Sano',
    sourceRailway:'odpt.Railway:Tobu.Sano'};
  assert.equal(w.TrainNumberPngRanges.match('635E','Sano',sano),null);
  assert.equal(w.TrainVehicle.selectMarkerArtwork(sano,false).kind,'unresolved');
  assert.equal(w.TrainVehicle.selectMarkerArtwork({
    ...isesaki,displayLineId:'Sano'
  },false).kind,'unresolved');
});
test('source calendar fallback remains strict and cannot authorize an unknown calendar',()=>{
  const good={calendarType:'',serviceId:'odpt.Calendar:Weekday'};
  assert.equal(match('344E','Local','weekday',good).trainNumber,'344E');
  assert.equal(match('344E','Local','weekday',{
    calendarType:'',serviceId:'odpt.Calendar:SaturdayHoliday'
  }).trainNumber,'344E');
  for(const id of ['','SaturdayHoliday','odpt.Calendar:unknown','odpt.Calendar:NationalHoliday']){
    assert.equal(match('344E','Local','weekday',{calendarType:'',serviceId:id}),null,id);
  }
  assert.equal(match('344E','Local','weekday',{
    calendarType:'INVALID',serviceId:'odpt.Calendar:SaturdayHoliday'
  }),null);
});
test('estimator exports calendarType on every SQL planned position without requiring a vehicle plan',()=>{
  const source=fs.readFileSync('js/train-position-estimator.js','utf8');
  const pos=source.indexOf('positions.push({');
  const piece=source.slice(pos,pos+20000);
  assert.match(piece,/calendarType: \/\(\?:\^\|\[:\.\]\)Weekday\$\/i/);
  assert.ok(piece.indexOf('calendarType:')<piece.indexOf('vehiclePlan: _publishedVehiclePlan'));
});
