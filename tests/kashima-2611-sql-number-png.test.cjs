'use strict';
/* JR East November 2026 Kashima line SQL authorization.
 * Number/date/route AND family proof precede every fleet PNG.
 * On 11/07 four historic service numbers are substituted.
 * E131 0/80 is an illustrative family, not one observed carset.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:win,Date,console:quiet,
  _isTrainArtworkFailureActive(){return false}});
for(const path of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
const numsOut='3521M 523M 525M 527M 529M 531M 533M 535M 537M 539M 541M 543M 2545M 3547M 549M 551M'.split(' ');
const numsIn='2520M 522M 524M 526M 3528M 530M 532M 534M 536M 538M 540M 542M 544M 546M 548M 550M'.split(' ');
const nov7Replace={'2520M':'9520M','2545M':'9545M','548M':'9548M','549M':'9549M'};
const modelOf=n=>['2520M','2545M','9520M','9545M'].includes(n)
  ?'E235系1000番台'
  :['548M','549M','9548M','9549M'].includes(n)?'':'E131系0番台 / 80番台';
const pngOf=n=>modelOf(n)==='E235系1000番台'
  ?'../images/列车/JR東日本/JR東日本_E235系_1000番台.png'
  :modelOf(n)?'../images/列车/JR東日本/JR東日本_E131系_0番台.png':'';
const forward=['Sawara','Katori','Junikyo','Itako','Nobukata','Kashimajingu'];
const holiday=date=>[0,6].includes(new Date(date+'T12:00:00Z').getUTCDay())
  ||date==='2026-11-03'||date==='2026-11-23';
function fixture(n,date='2026-11-05',mods={}){
  const numOriginal=Object.entries(nov7Replace).find(([,v])=>v===n)?.[0]||n;
  const dir=numsOut.includes(numOriginal)?'Outbound':'Inbound';
  const stops=dir==='Outbound'?forward:forward.slice().reverse();
  const model=modelOf(n),png=pngOf(n),segment=model
    ?model==='E235系1000番台'?'e235_through':'e131_family'
    :'mixed_unresolved';
  const proof={source:'sql-jreast-2611-number-roster',lineId:'Kashima',
    trainNumber:n,serviceDate:date,direction:'odpt.RailDirection:'+dir,
    calendar:'odpt.Calendar:'+(holiday(date)?'SaturdayHoliday':'Weekday'),
    model,pngReference:png,segmentKey:segment,
    trainType:'odpt.TrainType:JR-East.Local',
    officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/214'+
      (dir==='Outbound'?'d':'u')+(holiday(date)?'2':'1')+'.html',
    stopClockStatus:'overview_all_six_stations',
    routeFrom:stops[0],routeTo:stops.at(-1),
    actualVehicleConfirmed:false,referenceOnly:true};
  return {trainNumber:n,positionLineId:'Kashima',displayLineId:'Kashima',
    sourceRailway:'odpt.Railway:JR-East.Kashima',trainOperator:'JR-East',
    railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:date,calendarType:holiday(date)?'holiday':'weekday',
    scheduledStopKeys:stops,estimated:true,positionSource:'supabase-train-run',
    officialNumberVerified:true,vehicleIdentityStatus:'UNKNOWN',
    vehicleResolvedUpstream:false,
    plannedVehicleCandidates:model?[model]:[],
    vehiclePlan:{status:model?'PLANNED_MODEL':'UNKNOWN',
      models:model?[model]:[],confirmed:false,referenceOnly:true},
    sqlPublishedNumberFleetReference:proof,...mods};
}
const verify=p=>win.TrainNumberPngRanges.verifyKashimaService(p);
const img=p=>win.TrainVehicle.selectMarkerArtwork(p,false);
test('32 published regular numbers match scoped PNG or remain deliberately neutral',()=>{
  for(const n of [...numsOut,...numsIn]){
    const p=fixture(n);
    assert.equal(verify(p)?.number,n);
    const selected=win.TrainVehicle.lookupTrainNumberRangePng(p);
    if(modelOf(n)){
      assert.equal(selected?.model,modelOf(n),n);
      assert.equal(selected?.pngPath,pngOf(n),n);
      assert.equal(img(p).iconSrc,pngOf(n),n);
      assert.equal(img(p).planned,true,n);
      assert.equal(win.VehicleGaragePngMap.matchModelPath(modelOf(n),pngOf(n),'Kashima'),true,n);
    }else{
      assert.equal(selected,null,n);
      assert.equal(img(p).kind,'unresolved',n);
    }
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN',n);
  }
});
test('November 7 switches all four numbers without showing original train twice',()=>{
  const d='2026-11-07';
  for(const [oldN,newN] of Object.entries(nov7Replace)){
    const real=fixture(newN,d);
    assert.equal(verify(real)?.number,newN);
    assert.equal(img(real).kind,pngOf(newN)?'vehicle':'unresolved');
    const missingProof=fixture(oldN,d,{sqlPublishedNumberFleetReference:null});
    assert.equal(verify(missingProof),null,oldN);
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(missingProof),null,oldN);
    const next=fixture(newN,'2026-11-08',{sqlPublishedNumberFleetReference:null});
    assert.equal(verify(next),null,newN);
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(next),null,newN);
  }
});
test('foreign stop, wrong direction/operator/month, conflicting plan cannot use reference PNG',()=>{
  const p=fixture('9520M','2026-11-07');
  for(const patch of [
    {sourceRailway:'odpt.Railway:JR-East.Narita'},
    {trainOperator:'JR-West'},
    {positionLineId:'Narita'},
    {displayLineId:'Narita'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {calendarType:'weekday'},
    {serviceDate:'2026-10-07'},
    {scheduledStopKeys:['Kashimajingu','Nobukata','Itako','Junikyo','Katori','Yokote']},
    {scheduledStopKeys:['Kashimajingu','Nobukata','Itako','Junikyo','Katori']},
    {scheduledStopKeys:['Sawara','Katori','Junikyo','Itako','Nobukata','Kashimajingu']},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E131系0番台 / 80番台']}},
    {plannedVehicleCandidates:['E131系0番台 / 80番台']},
    {realtimeVehicleType:'E131系0番台 / 80番台'},
    {officialNumberVerified:false},
    {sqlPublishedNumberFleetReference:null},
    {sqlPublishedNumberFleetReference:{...p.sqlPublishedNumberFleetReference,actualVehicleConfirmed:true}},
    {sqlPublishedNumberFleetReference:{...p.sqlPublishedNumberFleetReference,source:'local-js-range'}}
  ]){
    const x={...p,...patch};
    if(!('vehiclePlan' in patch)&&!('plannedVehicleCandidates' in patch)&&
       !('realtimeVehicleType' in patch)&&!('officialNumberVerified' in patch))
      assert.equal(verify(x),null,JSON.stringify(patch));
    assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(x),null,JSON.stringify(patch));
  }
});
test('SQL migrations and Edge enforce exact Nov-7 replacement calendars',()=>{
  const ms=fs.readdirSync('supabase/migrations').filter(n=>n.includes('kashima_2611_'));
  assert.ok(ms.length>=1);
  const sql=ms.map(n=>fs.readFileSync('supabase/migrations/'+n,'utf8')).join('\n');
  for(const item of ['published_kashima_2611_number_roster',
      'published_train_png_number_ranges','manual_timetable_templates',
      'train_timetable_members','9520M','9545M','9548M','9549M',
      'exclude_2026_11_07','only_2026_11_07'])
    assert.ok(sql.includes(item),item);
  const api=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
  assert.ok(api.includes('if(lineId==="Kashima"'));
  assert.ok(api.includes('rule.date_rule==="exclude_2026_11_07"'));
  assert.ok(api.includes('rule.date_rule==="only_2026_11_07"'));
  assert.ok(api.includes('official-2611-six-stop-number-date'));
});
