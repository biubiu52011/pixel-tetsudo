'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function loadReferenceMatcher(){
  const window={};
  const context=vm.createContext({window,console});
  for(const path of [
    'data/timetables/vehicle-garage-png-map.js',
    'data/timetables/train-number-png-ranges.js'
  ]) vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
  return window;
}
function plannedSqlRun(changes={}){
  return {
    trainNumber:'701M',positionLineId:'ChuoCentral',displayLineId:'ChuoCentral',
    serviceDate:'2026-11-11',calendarType:'weekday',
    positionSource:'supabase-train-run',estimated:true,
    officialNumberVerified:true,timetableDateVerified:true,
    timetableValidity:'date_verified',
    sourceRailway:'odpt.Railway:JR-Central.Chuo',trainOperator:'JR-Central',
    trainType:'odpt.TrainType:JR-Central.Local',
    railDirection:'odpt.RailDirection:Outbound',
    scheduledStopKeys:['Nagoya','JRC-TokaidoCentral-067',
      'JRC-ChuoCentral-003','JRC-ChuoCentral-020'],
    ...changes
  };
}
const png='../images/列车/JR東海/JR東海_315系.png';
test('ChuoCentral 315 PNG belongs to its own approved reference gallery',()=>{
  const w=loadReferenceMatcher();
  assert.equal(w.VehicleGaragePngMap.matchModelPath('315系',png,'ChuoCentral'),true);
  assert.equal(w.VehicleGaragePngMap.matchModelPath('315系',png,'ChuoRapid'),false);
});
test('dated, numbered Nagoya–Nakatsugawa SQL commuter train selects only a reference PNG',()=>{
  const w=loadReferenceMatcher(),p=plannedSqlRun();
  const result=w.TrainNumberPngRanges.match('701M','ChuoCentral',p);
  assert.ok(result);
  assert.equal(result.model,'315系');
  assert.equal(result.pngPath,png);
  assert.equal(result.illustrative,true);
  assert.equal(result.referenceOnly,true);
  assert.equal(result.actualVehicleConfirmed,false);
  assert.equal(result.numberReference?.numberClass,'ordinary-315');
  assert.equal(result.numberReference?.exactRoster,true);
  assert.equal(w.TrainNumberPngRanges.match('701M','ChuoMain',p),null);
  const holiday=plannedSqlRun({trainNumber:'3701M',serviceDate:'2026-11-03',
    calendarType:'holiday'});
  assert.ok(w.TrainNumberPngRanges.match('3701M','ChuoCentral',holiday));
  assert.equal(w.TrainNumberPngRanges.match('801M','ChuoCentral',
    plannedSqlRun({trainNumber:'801M'})),null,
  'a pattern-compatible number outside the exact roster stays unmapped');
});
test('Chuo 2026-03 exact roster preserves all four calendar-direction lists',()=>{
  const api=loadReferenceMatcher().TrainNumberPngRanges;
  const roster=api.jrCentralChuo202603NumberRoster;
  assert.equal(roster.revision,'2026-03-14');
  assert.deepEqual([
    roster.ordinary315.weekday.Outbound.length,
    roster.ordinary315.weekday.Inbound.length,
    roster.ordinary315.holiday.Outbound.length,
    roster.ordinary315.holiday.Inbound.length
  ],[136,139,132,133]);
  assert.deepEqual(Array.from(roster.homeLiner383.weekday.Outbound),
    ['2681M','2683M']);
  assert.deepEqual(Array.from(roster.homeLiner383.weekday.Inbound),
    ['2682M','2684M']);
  assert.equal(api.findJrCentralChuo202603Number(
    '701M','weekday','Outbound')?.numberClass,'ordinary-315');
  assert.equal(api.findJrCentralChuo202603Number(
    '701M','holiday','Outbound'),null);
  assert.equal(api.findJrCentralChuo202603Number(
    '2682M','weekday','Inbound')?.numberClass,'home-liner-383');
});
test('exact weekday Home Liner numbers select the scoped 383 reference PNG',()=>{
  const w=loadReferenceMatcher();
  const png383='../images/列车/JR東海/JR東海_383系.png';
  for(const [n,direction] of [['2681M','Outbound'],['2682M','Inbound'],
    ['2683M','Outbound'],['2684M','Inbound']]){
    const stops=direction==='Outbound'
      ?['Nagoya','JRC-TokaidoCentral-067','JRC-ChuoCentral-020']
      :['JRC-ChuoCentral-020','JRC-TokaidoCentral-067','Nagoya'];
    const p=plannedSqlRun({trainNumber:n,
      trainType:'odpt.TrainType:JR-Central.HomeLiner',
      railDirection:'odpt.RailDirection:'+direction,scheduledStopKeys:stops});
    const result=w.TrainNumberPngRanges.match(n,'ChuoCentral',p);
    assert.equal(result?.model,'383系',n);
    assert.equal(result?.pngPath,png383,n);
    assert.equal(result?.numberReference?.numberClass,'home-liner-383',n);
    assert.equal(result?.actualVehicleConfirmed,false,n);
  }
  assert.equal(w.TrainNumberPngRanges.match('2685M','ChuoCentral',
    plannedSqlRun({trainNumber:'2685M',
      trainType:'odpt.TrainType:JR-Central.HomeLiner'})),null);
});
test('existing 2611 Shinano SQL numbers select the scoped JR Central 383 reference PNG',()=>{
  const w=loadReferenceMatcher();
  const png383='../images/列车/JR東海/JR東海_383系.png';
  for(const n of ['1001M','1002M','1003M','1004M','1005M','1006M','1011M','1026M']){
    const inbound=Number(n.slice(0,-1))%2===0;
    const p=plannedSqlRun({
      trainNumber:n,trainType:'odpt.TrainType:JR-Central.LimitedExpress',
      railDirection:inbound?'odpt.RailDirection:Inbound':'odpt.RailDirection:Outbound',
      scheduledStopKeys:inbound
        ?['Shiojiri','JRC-ChuoCentral-031','JRC-ChuoCentral-020','Nagoya']
        :['Nagoya','JRC-ChuoCentral-020','JRC-ChuoCentral-031','Shiojiri']
    });
    const result=w.TrainNumberPngRanges.match(n,'ChuoCentral',p);
    assert.equal(result?.model,'383系',n);
    assert.equal(result?.pngPath,png383,n);
    assert.equal(result?.referenceOnly,true,n);
    assert.equal(result?.actualVehicleConfirmed,false,n);
  }
  assert.equal(w.VehicleGaragePngMap.matchModelPath('383系',png383,'ChuoCentral'),true);
});
test('number-only, live, other operator, other month, limited express and unknown segments cannot pick 315',()=>{
  const w=loadReferenceMatcher(),p=plannedSqlRun();
  const rejected=[
    {officialNumberVerified:undefined},{officialNumberVerified:false},{timetableDateVerified:false},
    {timetableValidity:'unverified'},{estimated:false},
    {positionSource:'realtime-api'},
    {sourceRailway:'odpt.Railway:JR-East.Chuo'},
    {trainOperator:'JR-East'},{serviceDate:'2026-12-11'},
    {calendarType:'holiday'},
    {trainType:'odpt.TrainType:JR-Central.LimitedExpress'},
    {trainType:'odpt.TrainType:JR-Central.HomeLiner'},
    {scheduledStopKeys:[]},
    {scheduledStopKeys:['JRC-ChuoCentral-020','JRC-ChuoCentral-021']},
    {scheduledStopKeys:['Nagoya','JRC-ChuoCentral-003','JRC-ChuoCentral-003']},
    {scheduledStopKeys:['JRC-ChuoCentral-020','Nagoya']},
    {railDirection:'odpt.RailDirection:Inbound'},
    {vehicleIdentityStatus:'EXACT'},{vehiclePlan:{models:['383系']}},
    {plannedVehicleCandidates:['315系','383系']},
    {realtimeVehicleType:'313系'}
  ];
  for(const change of rejected)
    assert.equal(w.TrainNumberPngRanges.match('701M','ChuoCentral',
      plannedSqlRun(change)),null,JSON.stringify(change));
  assert.equal(w.TrainNumberPngRanges.match('1001M','ChuoCentral',
    plannedSqlRun()),null,'caller train number must equal SQL source');
});
test('missing timetable is announced from an audited SQL status, not inferred from zero positions',()=>{
  const render=fs.readFileSync('js/trains-render.js','utf8');
  const page=fs.readFileSync('js/trains-page.js','utf8');
  const t=fs.readFileSync('js/translations.js','utf8');
  // Train-page owns the audited SQL coverage state; train-render owns only
  // the on-screen real-time / estimated / unavailable presentation.
  assert.match(page,/planStatus\.auditCoverageStatus === "missing_all_plans"/);
  assert.match(page,/planStatus\.planAvailability === "unconfirmed"/);
  assert.match(page,/planStatus\.runs === 0/);
  assert.match(page,/planStatus\.source !== "SOURCE_ERROR"/);
  assert.match(render,/t\(hasEstimate \? "trains\.estimated_note" : "trains\.unavailable_note"\)/);
  assert.match(render,/if \(hasRealtime\) \{/);
  assert.match(page,/auditedMissingPlan/);
  assert.equal(t.split('"trains.plan_not_imported_note"').length-1,4);
  // An empty train map must be explained onsite, not replaced with an
  // external journey lookup or fabricated train-position icons.
  assert.doesNotMatch(render,/tp-official-source-link/);
  assert.doesNotMatch(t,/"trains.jrc_official_positions"/);
  // No train runs are invented by a gallery, status, or importer migration.
  const sql=fs.readFileSync('supabase/migrations/20261111100000_jr_central_shared_authorized_plan_import.sql','utf8');
  assert.match(sql,/No published 2026-11 trains are created by this schema migration/);
});

test('ChuoCentral SQL public numbers are admitted only after date, source, and exact-number checks',()=>{
  const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
  const begin=estimator.indexOf('Boolean((lineId==="TokaidoCentral"||lineId==="ChuoCentral"||');
  const marker=estimator.indexOf('Boolean(saganoDisplayNumber)',begin);
  const end=estimator.lastIndexOf(' ||',marker);
  assert.ok(begin>0&&end>begin,'missing canonical JR Central SQL number guard');
  const predicate=new Function('lineId','tt','publicTrainNumber','run',
    'return '+estimator.slice(begin,end));
  const tt={'odpt:railway':'odpt.Railway:JR-Central.Chuo',
    _positionSource:'supabase-train-run',_timetableDateVerified:true,
    _timetableValidity:'date_verified'};
  assert.equal(predicate('ChuoCentral',tt,'801M',{trainNumber:'801M'}),true);
  assert.equal(predicate('ChuoCentral',tt,'801M',{trainNumber:'801F'}),false);
  assert.equal(predicate('ChuoCentral',tt,'801F',{trainNumber:'801F'}),false);
  assert.equal(predicate('ChuoCentral',{...tt,_timetableDateVerified:false},
    '801M',{trainNumber:'801M'}),false);
  assert.equal(predicate('ChuoCentral',{...tt,
    'odpt:railway':'odpt.Railway:JR-East.Chuo'},
    '801M',{trainNumber:'801M'}),false);
  assert.equal(predicate('TokaidoCentral',tt,'3201F',{trainNumber:'3201F'}),false,
    'the Chuo source cannot authorize a Tokaido train number');
  assert.equal(predicate('TokaidoCentral',
    {...tt,'odpt:railway':'odpt.Railway:JR-Central.Tokaido'},
    '3201F',{trainNumber:'3201F'}),true,
    'source-correct dated TokaidoCentral F-number rule remains intact');
  assert.equal(predicate('KansaiCentral',
    {...tt,'odpt:railway':'odpt.Railway:JR-Central.Kansai'},
    '3001D',{trainNumber:'3001D'}),true,
    'source-correct dated KansaiCentral D-number is admitted');
  assert.equal(predicate('KiseiCentral',
    {...tt,'odpt:railway':'odpt.Railway:JR-Central.Kisei'},
    '3002D',{trainNumber:'3002D'}),true,
    'source-correct dated KiseiCentral D-number is admitted');
});
