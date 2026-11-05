'use strict';
// JR-East November 2026 Mito Line: 62 exact local train numbers.
// E531 five-car is a fleet illustration, never a 0/3000 formation ID.
// 9074/9075M run on 10/31 only; 9785M lacks Nov timetable proof.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={},quiet={debug(){},log(){},warn(){},error(){}};
const ctx=vm.createContext({window:root,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const png='../images/列车/JR東日本/JR東日本_E531系_水戸線.png';
const inNumbers=['1720M','722M','1724M','726M','2728M','730M',
  '1732M','2734M','736M','1738M','740M','1742M','744M','746M',
  '748M','750M','752M','754M','756M','758M','760M','762M',
  '764M','766M','2768M','1770M','772M','1774M','776M','778M',
  '1780M','782M'];
const outNumbers=['721M','723M','725M','2729M','731M','1733M',
  '735M','737M','1739M','741M','743M','745M','747M','749M',
  '751M','753M','755M','757M','759M','761M','763M','765M',
  '1767M','769M','771M','1773M','775M','1777M','779M','1781M'];
const mitoStops=['Oyama','Otabayashi','Yuki','Higashi-Yuki','Kawashima',
  'Tamado','Shimodate','Niihari','Yamato-Mito','Iwase','Haguro',
  'Fukuhara','Inada','Kasama','Shishido','Tomobe'];
function holiday(date){
  const day=new Date(date+'T12:00:00Z').getUTCDay();
  return day===0||day===6||date==='2026-11-03'||date==='2026-11-23';
}
function sourceId(n,date){
  // Actual backend uses SQL source IDs and date_variant_template_ids;
  // these fixtures intentionally assert representative published cases.
  if(n==='756M'&&date==='2026-11-23')return 6717;
  if(n==='763M'&&['2026-11-01','2026-11-08'].includes(date))return 6651;
  if(n==='763M'&&['2026-11-21','2026-11-28','2026-11-29'].includes(date))
    return 6652;
  return 6600;
}
function make(n,date='2026-11-06',extra={}){
  const inbound=(Number(n.slice(0,-1))%2)===0;
  const dir=inbound?'Inbound':'Outbound',
    cal=holiday(date)?'holiday':'weekday';
  return {
    trainNumber:n,trainId:'planned-trip:mito:'+n,
    positionLineId:'Mito',displayLineId:'Mito',
    sourceRailway:'odpt.Railway:JR-East.Mito',trainOperator:'JR-East',
    railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:date,calendarType:cal,
    positionSource:'supabase-train-run',estimated:true,
    officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
    vehicleResolvedUpstream:false,plannedVehicleCandidates:['E531系'],
    scheduledStopKeys:inbound?mitoStops.slice().reverse():mitoStops.slice(),
    sqlPublishedNumberFleetReference:{
      source:'sql-jreast-2611-number-roster',lineId:'Mito',
      trainNumber:n,serviceDate:date,direction:'odpt.RailDirection:'+dir,
      calendar:'odpt.Calendar:'+(cal==='holiday'?'SaturdayHoliday':'Weekday'),
      trainType:'odpt.TrainType:JR-East.Local',
      segmentKey:'mito_regular_local',sourceTemplateId:sourceId(n,date),
      regularLocal:true,plannedCandidates:['E531系'],
      model:'E531系',pngReference:png,
      officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/246'+
        (inbound?'u':'d')+(cal==='holiday'?'2':'1')+'.html',
      stopClockStatus:'historical_not_2611_verified',
      referenceOnly:true,actualVehicleConfirmed:false
    },
    ...extra
  };
}
const verify=p=>root.TrainNumberPngRanges.verifyMitoService(p);
const match=p=>root.TrainVehicle.lookupTrainNumberRangePng(p);
test('all 62 published November Mito local numbers have a scoped E531 illustration',()=>{
  assert.equal(inNumbers.length,32);
  assert.equal(outNumbers.length,30);
  assert.equal(new Set([...inNumbers,...outNumbers]).size,62);
  assert.equal(fs.existsSync('images/列车/JR東日本/JR東日本_E531系_水戸線.png'),true);
  assert.equal(root.VehicleGaragePngMap.matchModelPath('E531系',png,'Mito'),true);
  assert.equal(root.VehicleGaragePngMap.matchModelPath('E531系',png,'Joban'),false);
  assert.equal(root.VehicleGaragePngMap.matchModelPath('E501系',png,'Mito'),false);
  for(const n of [...inNumbers,...outNumbers])
    for(const date of ['2026-11-06','2026-11-07','2026-11-23']){
      const p=make(n,date),v=verify(p);
      assert.equal(v?.number,n,n+' '+date);
      assert.equal(v?.model,'E531系');
      assert.equal(v?.actualVehicleConfirmed,false);
      assert.equal(match(p)?.pngPath,png,n+' '+date);
      assert.equal(match(p)?.planned,true);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    }
});
test('756M, 763M November holiday timetable variants preserve ONE train number',()=>{
  const cases=[
    ['756M','2026-11-23',6717],
    ['763M','2026-11-01',6651],['763M','2026-11-08',6651],
    ['763M','2026-11-21',6652],['763M','2026-11-28',6652],
    ['763M','2026-11-29',6652]
  ];
  for(const [n,d,id] of cases){
    const p=make(n,d);
    assert.equal(p.sqlPublishedNumberFleetReference.sourceTemplateId,id);
    assert.equal(verify(p)?.sourceTemplateId,id);
    assert.equal(match(p)?.pngPath,png);
  }
  for(const n of ['725M','756M','763M','772M'])
    assert.equal(verify(make(n,'2026-11-06'))?.model,'E531系');
});
test('October-only limited expresses and unverified extra never borrow November PNG',()=>{
  for(const n of ['9074M','9075M','9785M','9999M','720M','720D','9000M']){
    const p=make(n);
    assert.equal(verify(p),null,n);
    assert.equal(match(p),null,n);
  }
});
test('wrong line, source, calendar, direction, identity or vehicle rejects SQL proof',()=>{
  const p=make('736M','2026-11-06');
  const cases=[
    {positionLineId:'Joban'},{displayLineId:'Chuo'},
    {sourceRailway:'odpt.Railway:JR-East.Joban'},
    {trainOperator:'JR-West'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {calendarType:'holiday'},{serviceDate:'2026-12-06'},
    {positionSource:'realtime-api'},{positionSource:'train-timetable'},
    {estimated:false},{officialNumberVerified:false},
    {vehicleIdentityStatus:'EXACT'},
    {realtimeVehicleType:'E501系'},
    {plannedVehicleCandidates:['E501系']},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E501系']}},
    {scheduledStopKeys:[]},
    {scheduledStopKeys:[...p.scheduledStopKeys,'Mito']},
    {sqlPublishedNumberFleetReference:null},
    {sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,regularLocal:false}},
    {sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,sourceTemplateId:0}},
    {sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,model:'E531系3000番台'}},
    {sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,
      pngReference:'../images/列车/JR東日本/JR東日本_E531系_赤電.png'}},
    {sqlPublishedNumberFleetReference:{
      ...p.sqlPublishedNumberFleetReference,referenceOnly:false}}
  ];
  for(const change of cases)
    assert.equal(match({...p,...change}),null,JSON.stringify(change));
});
test('SQL, edge source and estimator keep one dated stop template and family-only plan',()=>{
  const sql=fs.readFileSync('supabase/migrations/'+
    '20261106015500_mito_2611_e531_exact_number_calendar.sql','utf8');
  const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
  const est=fs.readFileSync('js/train-position-estimator.js','utf8');
  for(const term of ['published_mito_2611_number_roster',
    'date_variant_template_ids','source_template_id',
    '2026-11-23','2026-11-21','2026-11-28','2026-11-29',
    '9074M','9075M','9785M'])assert.ok(sql.includes(term));
  assert.ok(edge.includes('MITO_2611_EXACT_NUMBER_ROSTER_UNAVAILABLE'));
  assert.ok(edge.includes('Number(run.source_template_id)!==selected'));
  assert.ok(edge.includes('vehicle_type_candidates="E531系"'));
  assert.ok(est.includes('officialMitoPlan'));
  assert.ok(est.includes('verifyMitoService'));
  assert.ok(est.includes('officialMitoPlan || officialYamadaPlan'));
});
