'use strict';
/* 2026-11 JR East Kitakami: all public number references are carried
 * through SQL, with the flooded Hotto-Yuda–Yokote rail section excluded.
 * Vehicle-family PNG is illustrative only; physical set UNKNOWN.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const root={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:root,console:quiet,Date});
for(const path of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-kitakami-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const idx=root.JREastKitakamiNumberIndex202611;
const image='../images/列车/JR東日本/JR東日本_キハ110系.png';
const forward=['Kitakami','Yanagihara','Ezuriko','Fujine',
  'Tatekawame','Yokokawame','Iwasawa','Waka-Sennin',
  'Yuda-Kinshuko','Hotto-Yuda'],backward=[...forward].reverse();
const down=['723D','725D','727D','3729D','3731D','733D','735D','737D','3739D'];
const up=['722D','724D','726D','728D','3730D','732D','734D','736D','738D'];
const rapid=new Set(['3729D','3730D','3731D','3739D']);
function holiday(day){
  const dow=new Date(day+'T12:00:00Z').getUTCDay();
  return dow===0||dow===6||day==='2026-11-03'||day==='2026-11-23';
}
function pos(n,day='2026-11-05',more={}){
  const dir=down.includes(n)?'Outbound':'Inbound';
  const isRapid=rapid.has(n);
  const stops=dir==='Outbound'?forward:backward;
  const route=n==='725D'?stops.slice(0,4):n==='724D'?stops.slice(6):stops;
  const cal=holiday(day)?'SaturdayHoliday':'Weekday';
  const proof={source:'sql-jreast-2611-number-roster',lineId:'Kitakami',
    trainNumber:n,serviceDate:day,direction:'odpt.RailDirection:'+dir,
    calendar:'odpt.Calendar:'+cal,model:'キハ110系',
    pngReference:image,segmentKey:'rail_to_hotto_yuda',
    officialSourceUrl:'https://timetables.jreast.co.jp/2611/train/050/051721.html',
    trainType:'odpt.TrainType:JR-East.'+(isRapid?'Rapid':'Local'),
    sourceScope:'official_2611_stop_list',stopClockStatus:'official_2611_stop_list',
    railwayFrom:route[0],railwayTo:route.at(-1),
    closedRailSection:'Hotto-Yuda–Yokote',referenceOnly:true,
    actualVehicleConfirmed:false};
  return {trainNumber:n,positionLineId:'Kitakami',sourceRailway:
    'odpt.Railway:JR-East.Kitakami',trainOperator:'JR-East',
    railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.'+(isRapid?'Rapid':'Local'),
    calendarType:holiday(day)?'holiday':'weekday',serviceDate:day,
    scheduledStopKeys:route,plannedVehicleCandidates:['キハ110系'],
    vehiclePlan:{models:['キハ110系'],status:'PLANNED_MODEL',
      confirmed:false,referenceOnly:true},vehicleIdentityStatus:'UNKNOWN',
    officialNumberVerified:true,estimated:true,positionSource:'supabase-train-run',
    sqlPublishedNumberFleetReference:proof,...more};
}
test('full SQL-authorized 18 number roster, including four rapid 37xxD',()=>{
  for(const n of [...down,...up]){
    const p=pos(n),v=idx.verifySqlProof(p);
    assert.ok(v,n);
    assert.equal(v.trainType,rapid.has(n)?'Rapid':'Local');
    assert.equal(v.actualVehicleConfirmed,false);
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p)?.pngPath,image,n);
    assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false).iconSrc,image,n);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
});
test('725D runs Saturday but not Sunday/national holiday',()=>{
  const sat=pos('725D','2026-11-07');
  assert.equal(idx.verifySqlProof(sat)?.number,'725D');
  for(const d of ['2026-11-01','2026-11-03','2026-11-08',
    '2026-11-15','2026-11-22','2026-11-23','2026-11-29']){
    const p=pos('725D',d);
    assert.equal(idx.verifySqlProof(p),null,d);
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,d);
  }
});
test('bus-only flooded segment, wrong operator/day/source/model cannot inherit rail artwork',()=>{
  const x=pos('3731D');
  for(const modify of [
    {scheduledStopKeys:[...forward,'Yokote']},
    {scheduledStopKeys:['Kitakami','Yokote']},
    {scheduledStopKeys:['Hotto-Yuda','Yuda-Kinshuko','Kitakami']},
    {scheduledStopKeys:['Kitakami','Fujine','Yanagihara','Hotto-Yuda']},
    {sourceRailway:'odpt.Railway:JR-East.Yamada'},
    {trainOperator:'JR-West'},
    {trainType:'odpt.TrainType:JR-East.Local'},
    {serviceDate:'2026-12-03'},
    {calendarType:'holiday'},
    {vehiclePlan:{models:['キハ100系']}},
    {realtimeVehicleType:'キハ100系'},
    {officialNumberVerified:false},
    {sqlPublishedNumberFleetReference:null},
    {sqlPublishedNumberFleetReference:{...x.sqlPublishedNumberFleetReference,source:'js-number-range'}},
    {sqlPublishedNumberFleetReference:{...x.sqlPublishedNumberFleetReference,closedRailSection:''}}
  ]){
    const y={...x,...modify};
    if(!('vehiclePlan' in modify)&&!('realtimeVehicleType' in modify)
       &&!('officialNumberVerified' in modify))
      assert.equal(idx.verifySqlProof(y),null,JSON.stringify(modify));
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(y),null,JSON.stringify(modify));
  }
  for(const n of ['9729D','9730D']){
    const p=pos(n);
    const noProof={...p,sqlPublishedNumberFleetReference:null};
    assert.equal(idx.verifySqlProof(noProof),null,n);
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(noProof),null,n);
  }
});
test('migrations store exact train stops and suspension separate from image range',()=>{
  const dir='supabase/migrations',files=fs.readdirSync(dir)
    .filter(x=>x.includes('kitakami_2611_'));
  assert.ok(files.length>=2);
  const sql=files.map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('\n');
  for(const required of ['published_kitakami_2611_number_roster',
    'published_kitakami_2611_rail_suspension','Hotto-Yuda',
    'Yokote','published_train_png_number_ranges',
    'manual_timetable_templates','train_timetables',
    '3729D','3730D','3731D','3739D','725D',
    'source_single_type_candidate'])
    assert.ok(sql.includes(required),required);
});
