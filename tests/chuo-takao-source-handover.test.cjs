'use strict';
/* Central Main <-> Chuo Rapid source handover at Takao.
 * A canonical published train persists without inventing a live position.
 * Run with: node --test tests/chuo-takao-source-handover.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const estimatorSource=fs.readFileSync('js/train-position-estimator.js','utf8');
const resolverSource=fs.readFileSync('js/running-chain-resolver.js','utf8');
const fusionSource=fs.readFileSync('js/data-fusion.js','utf8');
const a=fusionSource.indexOf('  function _linkVerifiedCanonicalRealtime(');
const b=fusionSource.indexOf('  function loadTrainPositions()',a);
assert.ok(a>=0&&b>a,'handover bridge function boundaries changed');
const lines={
  ChuoMain:{operator:'JR-East',stations:['Otsuki','Takao']},
  ChuoRapid:{operator:'JR-East',stations:['Takao','Tachikawa','Nakano']}
};
function timetable(id=66496,extra={}){
  const date='2026-11-03';
  return Object.assign({
    '@id':'canonical-sql-trip:'+date+':'+id,
    'odpt:railway':'odpt.Railway:JR-East.ChuoMain',
    'odpt:trainNumber':'640M',
    'odpt:calendar':'odpt.Calendar:Holiday',
    'odpt:railDirection':'odpt.RailDirection:Inbound',
    'odpt:trainType':'odpt.TrainType:JR-East.Local',
    // A source section's destination can be Takao even when the
    // verified canonical train continues toward the rapid line.
    'odpt:destinationStation':['odpt.Station:JR-East.ChuoMain.Takao'],
    'odpt:trainTimetableObject':[
      {'odpt:departureStation':'odpt.Station:JR-East.ChuoMain.Otsuki',
       'odpt:departureTime':'15:30'},
      {'odpt:arrivalStation':'odpt.Station:JR-East.ChuoMain.Takao',
       'odpt:arrivalTime':'16:00'},
      {'odpt:departureStation':'odpt.Station:JR-East.ChuoRapid.Tachikawa',
       'odpt:departureTime':'16:40'},
      {'odpt:arrivalStation':'odpt.Station:JR-East.ChuoRapid.Nakano',
       'odpt:arrivalTime':'17:00'}
    ],
    _positionSource:'supabase-train-run',_sqlLineId:'ChuoMain',
    _serviceDate:date,_canonicalGroupEvidence:'verified_continuation',
    _canonicalTrainTimetableId:id,_canonicalLineIds:['ChuoMain','ChuoRapid'],
    _canonicalTrainNumberAliases:[
      {line_key:'ChuoMain',train_number:'640M',
       railway_urn:'odpt.Railway:JR-East.ChuoMain',
       direction_urn:'odpt.RailDirection:Inbound'},
      {line_key:'ChuoRapid',train_number:'640T',
       railway_urn:'odpt.Railway:JR-East.ChuoRapid',
       direction_urn:'odpt.RailDirection:Inbound'}
    ]
  },extra);
}
function bootstrap(clock,rows){
  class TestDate extends Date{
    constructor(...args){super(...(args.length?args:[clock]))}
    static now(){return Date.parse(clock)}
  }
  const w={
    RuntimeConfig:{VERIFIED_CANONICAL_PLAN_PARTNERS:{
      ChuoMain:['ChuoRapid'],ChuoRapid:['ChuoMain']}},
    ODPTClient:{
      LINE_RAILWAY_CODE:{ChuoMain:'ChuoMain',ChuoRapid:'ChuoRapid'},
      LINE_TO_OPERATOR:{ChuoMain:'JR-East',ChuoRapid:'JR-East'}
    }
  };
  const ctxt=vm.createContext({window:w,Date:TestDate,console:{debug(){},log(){},warn(){},error(){}},
    setTimeout(){},clearTimeout(){}});
  vm.runInContext(resolverSource,ctxt);
  vm.runInContext(estimatorSource,ctxt);
  vm.runInContext(fusionSource.slice(a,b),ctxt);
  w.TrainPositionEstimator.registerManualTimetable('ChuoMain',rows);
  const scheduled=w.TrainPositionEstimator.estimateAllPositions(
    lines,{}, {},null,{lineIds:['ChuoMain','ChuoRapid']});
  return {w,scheduled,link:ctxt._linkVerifiedCanonicalRealtime,
    switchSource:ctxt._preferVerifiedChuoLiveHandover,
    evidence:w.TrainPositionEstimator.getCanonicalHandoverEvidence()};
}
function live(extra={}){
  return Object.assign({
    trainNumber:'640T',railDirection:'odpt.RailDirection:Inbound',
    sourceRailway:'odpt.Railway:JR-East.ChuoRapid',
    serviceDate:'2026-11-03',positionSource:'realtime-api',estimated:false,
    sourceFromStation:'odpt.Station:JR-East.ChuoRapid.Tachikawa',
    sourceToStation:'odpt.Station:JR-East.ChuoRapid.Nakano',
    destinationStation:'Nakano',trainId:'odpt:live-640T',
    vehicleIdentityStatus:'UNKNOWN'
  },extra);
}
test('outside realtime region, scheduled 640M keeps its own source and canonical identity',()=>{
  const x=bootstrap('2026-11-03T06:50:00Z',[timetable()]);
  const p=(x.scheduled.ChuoMain||[])[0];
  assert.ok(p,'Otsuki-to-Takao section needs a scheduled position');
  assert.equal(p.trainNumber,'640M');
  assert.equal(p.positionSource,'supabase-train-run');
  assert.equal(p.runningChainId,'canonical-sql-trip:2026-11-03:66496');
  assert.equal(p.estimated,true);
});
test('after timetable terminus: identity survives 27 minutes without a phantom position',()=>{
  const x=bootstrap('2026-11-03T07:27:00Z',[timetable()]);
  assert.equal((x.scheduled.ChuoMain||[]).length,0);
  const e=x.evidence.ChuoMain;
  assert.equal(e.length,1);
  assert.equal(e[0].handoverEvidenceOnly,true);
  assert.equal(e[0].trainNumber,'640M');
  assert.equal(e[0].handoverBoundaryStation,'Takao');
  assert.ok(e[0].canonicalStopKeys.includes('Tachikawa'),
    'terminal clipping may not discard the verified opposite-side stop');
});
test('one authorized 640T live record replaces 640M source without changing real train number',()=>{
  const x=bootstrap('2026-11-03T07:27:00Z',[timetable()]);
  const p=live(),observed={ChuoRapid:[p]};
  assert.equal(x.link(x.scheduled,observed),1);
  assert.equal(x.switchSource(x.scheduled,observed),1);
  assert.equal(p.runningChainId,'canonical-sql-trip:2026-11-03:66496');
  assert.equal(p.runningChainEvidence,'VERIFIED_SQL_CANONICAL_REALTIME_STATION');
  assert.equal(p.trainNumber,'640T','the provider number must never be rewritten');
  assert.equal(p.throughOriginTrainNumber,'640M');
  assert.equal(p.positionSource,'realtime-api');
  assert.equal(p.positionSourceHandover,'TIMETABLE_TO_REALTIME_TAKAO');
  assert.equal(p.destinationStation,'Nakano');
  assert.equal((x.scheduled.ChuoMain||[]).length,0);
});
test('an unconfirmed timetable terminal cannot overwrite a real continuation destination',()=>{
  const x=bootstrap('2026-11-03T07:27:00Z',[timetable()]);
  const p=live({destinationStation:''}),observed={ChuoRapid:[p]};
  assert.equal(x.link(x.scheduled,observed),1);
  x.switchSource(x.scheduled,observed);
  assert.notEqual(p.destinationStation,'Takao');
  assert.equal(p.destinationStation,'');
});
test('when the live observation is already present, hide same-canonical planned map marker',()=>{
  const x=bootstrap('2026-11-03T07:00:00Z',[timetable()]);
  const p=live(),observed={ChuoRapid:[p]};
  const plan=x.scheduled.ChuoMain[0];
  assert.ok(plan);
  assert.equal(x.link(x.scheduled,observed),1);
  assert.equal(x.switchSource(x.scheduled,observed),1);
  assert.equal(x.scheduled.ChuoMain.length,0);
  assert.equal(p.runningChainId,plan.runningChainId);
});
test('wrong number, operator, day, direction and station cannot claim another physical train',()=>{
  const bad=[
    {trainNumber:'640H'},
    {sourceRailway:'odpt.Railway:TokyoMetro.ChuoRapid'},
    {serviceDate:'2026-11-04'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {sourceFromStation:'odpt.Station:JR-East.ChuoRapid.Ueno'},
    {sourceToStation:'odpt.Station:JR-East.ChuoRapid.Otsuki'},
  ];
  bad.forEach((options,i)=>{
    const x=bootstrap('2026-11-03T07:27:00Z',[timetable()]);
    const p=live(options),observed={ChuoRapid:[p]};
    assert.equal(x.link(x.scheduled,observed),0,'mismatch '+i);
    assert.equal(x.switchSource(x.scheduled,observed),0,'no switching '+i);
    assert.equal(p.runningChainId,undefined,'no fake identity '+i);
  });
});
test('two active live observations or two canonical candidates remain ambiguous',()=>{
  let x=bootstrap('2026-11-03T07:27:00Z',[timetable()]);
  const duplicated={ChuoRapid:[live(),live({trainId:'live-two'})]};
  assert.equal(x.link(x.scheduled,duplicated),0);
  assert.equal(x.switchSource(x.scheduled,duplicated),0);
  x=bootstrap('2026-11-03T07:27:00Z',[timetable(),timetable(66499)]);
  const p=live(),observed={ChuoRapid:[p]};
  assert.equal(x.link(x.scheduled,observed),0);
  assert.equal(x.switchSource(x.scheduled,observed),0);
});
test('unverified same-number or no published alias never yields canonical handover',()=>{
  for(const extra of [
    {_canonicalGroupEvidence:'source_only'},
    {_canonicalTrainNumberAliases:[]},
    {_canonicalLineIds:['ChuoMain']},
  ]){
    const x=bootstrap('2026-11-03T07:27:00Z',[timetable(66496,extra)]);
    assert.equal((x.evidence.ChuoMain||[]).length,0);
    const p=live(),observed={ChuoRapid:[p]};
    assert.equal(x.link(x.scheduled,observed),0);
  }
});
test('identity-only evidence expires after the bounded published Takao handover window',()=>{
  const x=bootstrap('2026-11-03T09:00:00Z',[timetable()]);
  assert.equal((x.evidence.ChuoMain||[]).length,0);
  const p=live(),observed={ChuoRapid:[p]};
  assert.equal(x.link(x.scheduled,observed),0);
});
test('the folding UI continues hiding ordinary train numbers',()=>{
  const render=fs.readFileSync('js/trains-render.js','utf8');
  assert.match(render,/caption\.textContent=captionBase;/);
  assert.doesNotMatch(render,/caption\.textContent=.*foldTrainNumber/);
});
