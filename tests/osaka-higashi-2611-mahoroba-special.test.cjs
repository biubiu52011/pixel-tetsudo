'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261108124500_jrwest_osaka_higashi_mahoroba_2611_special_segments.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
const vehicle=fs.readFileSync('js/train-vehicle.js','utf8');
const gallery=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
const fleet=fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8');
const render=fs.readFileSync('js/trains-render.js','utf8');
const html=fs.readFileSync('pages/trains.html','utf8');
let simulatedNow='2026-11-08T01:01:00.000Z';
class FakeDate extends Date {
  constructor(...args){super(...(args.length?args:[simulatedNow]));}
  static now(){return Date.parse(simulatedNow);}
}
const w={location:{pathname:'/pages/trains.html'},RuntimeConfig:{},ODPT_LAZY:true,
  TRAIN_OPERATION_EVIDENCE_PROVIDERS:[]};
const quiet={debug(){},warn(){},error(){}};
for(const code of [gallery,fleet,vehicle,estimator]){
  new Function('window','console','Date',code)(w,quiet,FakeDate);
}
const line={operator:'JR-West',stations:[
  'Osaka','Shin-Osaka','Minami-Suita','J-R-Awaji','Jouhoku-Kouen-Toori',
  'J-R-Noe','Shigino','Hanaten','Takaida-Chuuou','J-R-Kawauchi-Hisakazu',
  'J-R-Toshinori-Michi','J-R-Nagase','Koromo-Suri-Kami-Kita',
  'Shin-Kami','Kyuhouji'
]};
const cases=[
 {id:'7092MH',display:'7092M',name:'まほろば',time:'2026-11-08T01:01:00.000Z',
  first:'09:58',secondArrival:'10:03',secondDeparture:'10:04'},
 {id:'9024MH',display:'9024M',name:'まほろば92号',time:'2026-11-08T05:17:00.000Z',
  first:'14:15',secondArrival:'14:20',secondDeparture:'14:21'}
];
function fixture(record,patch) {
  const ref={
    source:'sql-jrwest-osaka-higashi-2611-mahoroba-two-stop',
    lineId:'OsakaHigashi',sourceTrainNumber:record.id,
    publishedNumber:record.display,calendar:'odpt.Calendar:SaturdayHoliday',
    publicTrainType:'LimitedExpress',serviceName:record.name,
    segmentScope:'osaka_shin_osaka_only',sourceStopKeys:['Osaka','Shin-Osaka'],
    numberDateVerified:true,stopClocksVerified:true,
    carCount:3,candidateModels:['683系'],candidateAssets:[],
    referenceOnly:true,actualVehicleConfirmed:false,authorizesPNG:false,
    officialStopClockSourceUrl:'https://timetable.jr-odekake.net/train-timetable/279101?date=20261101'
  };
  if(patch) patch(ref);
  return {
    '@id':'manual-template:'+record.id,
    'odpt:operator':'odpt.Operator:JR-West',
    'odpt:railway':'odpt.Railway:JR-West.OsakaHigashi',
    'odpt:trainNumber':record.id,
    'odpt:calendar':'odpt.Calendar:SaturdayHoliday',
    'odpt:railDirection':'odpt.RailDirection:Outbound',
    'odpt:trainType':'odpt.TrainType:JR-West.LimitedExpress',
    'odpt:destinationStation':[],
    'odpt:trainTimetableObject':[
      {'odpt:departureStation':'odpt.Station:JR-West.OsakaHigashi.Osaka',
       'odpt:departureTime':record.first},
      {'odpt:arrivalStation':'odpt.Station:JR-West.OsakaHigashi.Shin-Osaka',
       'odpt:departureStation':'odpt.Station:JR-West.OsakaHigashi.Shin-Osaka',
       'odpt:arrivalTime':record.secondArrival,
       'odpt:departureTime':record.secondDeparture}
    ],
    _positionSource:'supabase-train-run',_serviceDate:'2026-11-08',
    _sqlLineId:'OsakaHigashi',_sqlPublishedNumberFleetReference:ref,
    _sqlPublishedTrainNumber:record.display,
    _sqlPublishedNumberScope:'osaka_shinosaka_source_segment_only',
    _sqlTrainNumberVerification:'official-2611-osaka-higashi-mahoroba-two-stop',
    _sqlVehicleMappingLevel:'unresolved',_sqlVehicleCandidateLabel:'683系',
    _canonicalGroupEvidence:'source_only',_timetableValidity:'date_verified_segment_only',
    _timetableDateVerified:true,_sqlServiceName:record.name
  };
}
function position(record,patch){
 simulatedNow=record.time;
 const p=w.TrainPositionEstimator.estimateLinePositions('OsakaHigashi',
   line,[fixture(record,patch)],null,'JR-West');
 return p[0]||null;
}
function picture(p){
 return p&&w.TrainVehicle.selectMarkerArtwork(
   Object.assign({},p,{displayLineId:'OsakaHigashi'}),false);
}
test('Mahoroba official number source maps only two exact pre-existing station clocks',()=>{
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.published_jrwest_osaka_higashi_2611_special_segments/);
  assert.match(sql,/WITH\(security_invoker=true\) AS/);
  assert.match(sql,/source_stops_md5/);
  assert.match(sql,/source_train_number IN\('7092MH','9024MH'\)/);
  assert.match(sql,/published_train_number IN\('7092M','9024M'\)/);
  assert.match(sql,/segment_scope='osaka_shin_osaka_only'/);
  assert.match(sql,/authorizes_png boolean NOT NULL DEFAULT false CHECK\(NOT authorizes_png\)/);
  assert.match(edge,/new Set\(\["1091M"\]\)/);
  assert.match(edge,/JRWEST_OSAKA_HIGASHI_2611_MAHOROBA_CLOCK_CONFLICT/);
  assert.match(edge,/seen\.size!==expectedSpecials/);
  assert.match(edge,/run\.train_type=proof\.public_train_type_urn/);
  assert.match(edge,/run\.vehicle_type_candidates=proof\.model_family/);
  assert.match(edge,/run\.published_number_scope="osaka_shinosaka_source_segment_only"/);
});
test('scheduled Saturday Mahoroba and Mahoroba 92 produce public M numbers, special identity and 683 fleet',()=>{
  for(const row of cases){
    const p=position(row);
    assert.ok(p,'missing position for '+row.id);
    assert.equal(p.trainNumber,row.id);
    assert.equal(p.displayTrainNumber,row.display);
    assert.equal(p.officialNumberVerified,true);
    assert.equal(p.typeName,'特急');
    assert.equal(p.isLimitedExpress,true);
    assert.equal(p.serviceName,row.name);
    assert.equal(p.vehiclePlan.status,'FLEET_REFERENCE');
    assert.deepEqual(Array.from(p.plannedVehicleCandidates),['683系']);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    assert.deepEqual(Array.from(p.scheduledStopKeys),['Osaka','Shin-Osaka']);
    assert.equal(p.vehicleIconPath,'');
    assert.equal(p.vehiclePlan.iconPath,'');
    const art=picture(p);
    assert.equal(art.kind,'unresolved','generic Thunderbird 683 is NOT Mahoroba paint');
    assert.equal(art.iconSrc,'');
  }
});
test('forged clock proof never promotes special fleet or chooses mismatched artwork',()=>{
  for(const row of cases){
    const p=position(row,r=>r.stopClocksVerified=false);
    assert.ok(p);
    assert.notEqual(p.vehiclePlan&&p.vehiclePlan.source,
      'sql-jrwest-osaka-higashi-2611-mahoroba-two-stop');
    assert.notEqual(picture(p).kind,'vehicle');
  }
});
test('Mahoroba requires actual SaturdayHoliday calendar, not a generic M suffix',()=>{
  const rec=cases[0],tt=fixture(rec);
  tt._serviceDate='2026-11-09';
  simulatedNow='2026-11-09T01:01:00.000Z';
  assert.equal(w.TrainPositionEstimator.estimateLinePositions(
    'OsakaHigashi',line,[tt],null,'JR-West').length,0);
});
test('passenger label shows 683 series / three cars with formation and livery explicitly unresolved',()=>{
  const a=render.indexOf('    var special=p.sqlPublishedNumberFleetReference;');
  const b=render.indexOf('    // Osaka Higashi scheduled 221 series',a);
  assert.ok(a>0&&b>a);
  const label=new Function('p','lineId','lang','plan',render.slice(a,b)+'\nreturn "";');
  const p=position(cases[1]);
  assert.match(label(p,'OsakaHigashi','zh',p.vehiclePlan),
    /683系（3辆，安寧／悠久实际编组未确认/);
  assert.match(label(p,'OsakaHigashi','ja',p.vehiclePlan),
    /683系（3両、安寧／悠久の実際の編成未確認/);
});
test('page loads the matching new estimator/vehicle/render JS revisions',()=>{
  assert.match(html,/train-position-estimator\.js\?v=2a9aa8d46c24/);
  assert.match(html,/train-vehicle\.js\?v=1cea5e03d095/);
  assert.match(html,/trains-render\.js\?v=1d4ca86bb5f7/);
});
