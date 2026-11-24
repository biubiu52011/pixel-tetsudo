'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function loadMatcher(){
  const window={};
  const context=vm.createContext({window,console});
  for(const path of [
    'data/timetables/vehicle-garage-png-map.js',
    'data/timetables/train-number-png-ranges.js'
  ]) vm.runInContext(fs.readFileSync(path,'utf8'),context,{filename:path});
  return window;
}
const kansai=['Nagoya','Hatta','Kuwana','Yokkaichi','Kameyama'];
const kisei=['Kameyama','JRC-KiseiCentral-010','JRC-KiseiCentral-025','Shingu'];
function run(line,number,changes={}){
  const outbound=Number(number.match(/^\d+/)?.[0]||1)%2===1;
  const isKisei=line==='KiseiCentral';
  const stops=isKisei?kisei:kansai;
  return {
    trainNumber:number,positionLineId:line,displayLineId:line,
    serviceDate:'2026-11-11',calendarType:'weekday',
    positionSource:'supabase-train-run',estimated:true,
    officialNumberVerified:true,timetableDateVerified:true,
    timetableValidity:'date_verified',
    sourceRailway:'odpt.Railway:JR-Central.'+(isKisei?'Kisei':'Kansai'),
    trainOperator:'JR-Central',
    trainType:'odpt.TrainType:JR-Central.'+(number.endsWith('D')?'LimitedExpress':'Local'),
    railDirection:'odpt.RailDirection:'+(outbound?'Outbound':'Inbound'),
    scheduledStopKeys:outbound?stops:stops.slice().reverse(),
    ...changes
  };
}
const png315='../images/列车/JR東海/JR東海_315系.png';
const pngHC85='../images/列车/JR東海/JR東海_HC85系.png';

test('KansaiCentral owns only the approved 315 and HC85 reference art',()=>{
  const w=loadMatcher();
  assert.equal(w.VehicleGaragePngMap.matchModelPath('315系',png315,'KansaiCentral'),true);
  assert.equal(w.VehicleGaragePngMap.matchModelPath('315系',png315,'KiseiCentral'),false);
  assert.equal(w.VehicleGaragePngMap.matchModelPath('HC85系',pngHC85,'KansaiCentral'),true);
  assert.equal(w.VehicleGaragePngMap.matchModelPath('HC85系',pngHC85,'KiseiCentral'),true);
});

test('2026-03 Kansai source numbers are stored as exact weekday and holiday rosters',()=>{
  const w=loadMatcher();
  const api=w.TrainNumberPngRanges;
  const roster=api.jrCentralKansai202603NumberRoster;
  assert.equal(roster.revision,'2026-03-14');
  assert.deepEqual([
    roster.ordinary315.weekday.Outbound.length,
    roster.ordinary315.weekday.Inbound.length,
    roster.ordinary315.holiday.Outbound.length,
    roster.ordinary315.holiday.Inbound.length
  ],[65,62,64,60]);
  assert.deepEqual([
    roster.mie.weekday.Outbound.length,roster.mie.weekday.Inbound.length,
    roster.mie.holiday.Outbound.length,roster.mie.holiday.Inbound.length
  ],[13,13,13,13]);
  for(const [calendar,direction,number] of [
    ['weekday','Outbound','1301G'],['weekday','Inbound','364G'],
    ['holiday','Outbound','4301G'],['holiday','Inbound','3360G']
  ]){
    const ref=api.findJrCentralKansai202603Number(number,calendar,direction);
    assert.equal(ref?.numberClass,'ordinary-315',number);
    assert.equal(ref?.exactRoster,true,number);
    assert.equal(ref?.actualVehicleConfirmed,false,number);
  }
  assert.equal(api.findJrCentralKansai202603Number(
    '2901D','weekday','Outbound')?.numberClass,'rapid-mie');
  assert.equal(api.findJrCentralKansai202603Number(
    '8951D','holiday','Outbound')?.serviceDateVerified,false);
  assert.equal(api.findJrCentralKansai202603Number(
    '8951D','weekday','Outbound'),null,'special service date is not generalized');
  assert.equal(api.findJrCentralKansai202603Number(
    '2371G','weekday','Outbound'),null,'well-formed but unlisted G number is rejected');
});

test('dated Kansai ordinary and rapid G runs select a planned 315 illustration',()=>{
  const w=loadMatcher();
  for(const [number,type] of [['1301G','Local'],['2301G','Rapid'],['2351G','SectionRapid']]){
    const p=run('KansaiCentral',number,{trainType:'odpt.TrainType:JR-Central.'+type});
    const result=w.TrainNumberPngRanges.match(number,'KansaiCentral',p);
    assert.equal(result?.model,'315系',number);
    assert.equal(result?.pngPath,png315,number);
    assert.equal(result?.referenceOnly,true,number);
    assert.equal(result?.actualVehicleConfirmed,false,number);
  }
  const holiday=run('KansaiCentral','4301G',{
    serviceDate:'2026-11-23',calendarType:'holiday'
  });
  assert.match(w.TrainNumberPngRanges.match('4301G','KansaiCentral',holiday).sourceUrl,
    /kansaiH\.html$/);
});

test('the two audited Nanki SQL runs select HC85 on both canonical segments',()=>{
  const w=loadMatcher();
  for(const line of ['KansaiCentral','KiseiCentral']){
    for(const number of ['3001D','3002D']){
      const result=w.TrainNumberPngRanges.match(number,line,run(line,number));
      assert.equal(result?.model,'HC85系',line+' '+number);
      assert.equal(result?.pngPath,pngHC85,line+' '+number);
      assert.equal(result?.referenceOnly,true,line+' '+number);
      assert.equal(result?.actualVehicleConfirmed,false,line+' '+number);
    }
  }
});

test('source, date, route, identity and conflicting vehicle evidence remain strict',()=>{
  const w=loadMatcher();
  const rejected=[
    {officialNumberVerified:false},{timetableDateVerified:false},
    {timetableValidity:'unverified'},{positionSource:'realtime-api'},
    {estimated:false},{serviceDate:'2026-12-11'},
    {calendarType:'holiday'},
    {sourceRailway:'odpt.Railway:JR-Central.Tokaido'},
    {trainOperator:'JR-West'},{vehicleIdentityStatus:'EXACT'},
    {scheduledStopKeys:[]},{scheduledStopKeys:['Nagoya','Shingu']},
    {scheduledStopKeys:['Kameyama','Nagoya']},
    {vehiclePlan:{models:['313系']}},{plannedVehicleCandidates:['313系']},
    {realtimeVehicleType:'313系'}
  ];
  for(const change of rejected)
    assert.equal(w.TrainNumberPngRanges.match('1301G','KansaiCentral',
      run('KansaiCentral','1301G',change)),null,JSON.stringify(change));
  assert.equal(w.TrainNumberPngRanges.match('2901D','KansaiCentral',
    run('KansaiCentral','2901D')),
    null,'Mie remains unresolved while the KiHa75 artwork is unreviewed');
  assert.equal(w.TrainNumberPngRanges.match('3003D','KansaiCentral',
    run('KansaiCentral','3003D')),null,'unreviewed Nanki number is not inferred');
  assert.equal(w.TrainNumberPngRanges.match('2371G','KansaiCentral',
    run('KansaiCentral','2371G')),
    null,'a pattern-looking G number outside the source roster is not invented');
});
