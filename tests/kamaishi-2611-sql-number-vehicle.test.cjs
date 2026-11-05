'use strict';
/* Official JR East 2611 Kamaishi. The client NEVER infers PNG permission
 * from a number alone: database roster proof gates every reference image.
 * A model illustration is not an operating carset or a GPS observation. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={log(){},warn(){},error(){},debug(){}};
const ctx=vm.createContext({window:win,Date,console:quiet});
for(const file of ['data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'])
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const prefix='../images/列车/JR東日本/';
const families={
  '651D':['Outbound','Local','HB-E220系','',prefix+'JR東日本_HB-E220系.png'],
  '1654D':['Inbound','Local','HB-E220系','',prefix+'JR東日本_HB-E220系.png'],
  '3657D':['Outbound','Rapid','HB-E220系','はまゆり',prefix+'JR東日本_HB-E220系.png'],
  '3658D':['Inbound','Rapid','HB-E220系','はまゆり',prefix+'JR東日本_HB-E220系.png'],
  '3659D':['Outbound','Rapid','HB-E220系','はまゆり',prefix+'JR東日本_HB-E220系.png'],
  '3662D':['Inbound','Rapid','HB-E220系','はまゆり',prefix+'JR東日本_HB-E220系.png'],
  '3666D':['Inbound','Rapid','HB-E220系','はまゆり',prefix+'JR東日本_HB-E220系.png'],
  '8621D':['Outbound','Rapid','HB-E300系（ひなび）','ひなび 釜石',prefix+'JR東日本_HB-E300系_ひなび_陽旅.png'],
  '8622D':['Inbound','Rapid','HB-E300系（ひなび）','ひなび 釜石',prefix+'JR東日本_HB-E300系_ひなび_陽旅.png']
};
const hinabiDates=['2026-11-07','2026-11-08','2026-11-14',
  '2026-11-15','2026-11-21','2026-11-22','2026-11-23'];
const stations=['Hanamaki','Shin-Hanamaki','Tsuchizawa','Miyamori',
  'Tono','Kami-Arisu','Rikuchu-Ohashi','Kamaishi'];
const calendar=date=>([0,6].includes(new Date(date+'T12:00:00Z').getUTCDay())||
  date==='2026-11-03'||date==='2026-11-23')?'holiday':'weekday';
function proof(number,day){
  const a=families[number];
  if(!a||number.startsWith('862')&&!hinabiDates.includes(day))return null;
  return {source:'sql-jreast-2611-number-roster',lineId:'Kamaishi',
    trainNumber:number,serviceDate:day,direction:'odpt.RailDirection:'+a[0],
    calendar:'odpt.Calendar:'+(calendar(day)==='holiday'?'SaturdayHoliday':'Weekday'),
    model:a[2],trainType:'odpt.TrainType:JR-East.'+a[1],
    pngReference:a[4],serviceName:a[3],segmentKey:'full',
    officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/979d1.html',
    referenceOnly:true,actualVehicleConfirmed:false};
}
function p(number,day='2026-11-07',mods={}){
  const a=families[number]||['Outbound','Local','HB-E220系','',prefix+'JR東日本_HB-E220系.png'];
  return {trainNumber:number,positionLineId:'Kamaishi',
    displayLineId:'Kamaishi',sourceRailway:'odpt.Railway:JR-East.Kamaishi',
    trainOperator:'JR-East',railDirection:'odpt.RailDirection:'+a[0],
    trainType:'odpt.TrainType:JR-East.'+a[1],
    calendarType:calendar(day),serviceDate:day,
    scheduledStopKeys:stations,estimated:true,positionSource:'supabase-train-run',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    plannedVehicleCandidates:[a[2]],
    vehiclePlan:{status:'PLANNED_MODEL',lineId:'Kamaishi',models:[a[2]],
      confirmed:false,referenceOnly:true},
    sqlPublishedNumberFleetReference:proof(number,day),...mods};
}
const verify=x=>win.TrainNumberPngRanges.verifyKamaishiService(x);
const icon=x=>win.TrainVehicle.selectMarkerArtwork(x,false);
test('SQL verified local, Hamayuri and Hinabi train numbers map to correct family PNG',()=>{
  for(const [number,day]of [['651D','2026-11-05'],['1654D','2026-11-07'],
    ['3657D','2026-11-05'],['3658D','2026-11-05'],
    ['3659D','2026-11-05'],['3662D','2026-11-07'],
    ['3666D','2026-11-07'],
    ['8621D','2026-11-07'],['8622D','2026-11-23']]){
    const x=p(number,day),a=families[number],plan=verify(x);
    assert.equal(plan?.model,a[2],number);
    assert.equal(plan?.trainType,a[1],number);
    assert.equal(plan?.serviceName,a[3],number);
    assert.equal(plan?.actualVehicleConfirmed,false);
    assert.equal(win.VehicleGaragePngMap.matchModelPath(a[2],a[4],'Kamaishi'),true);
    const marker=icon(x);
    assert.equal(marker.kind,'vehicle',number);
    assert.equal(marker.iconSrc,a[4],number);
    assert.equal(marker.planned,true,number);
    assert.equal(x.vehicleIdentityStatus,'UNKNOWN');
  }
});
test('a verified Morioka through terminus is allowed with Kamaishi section stops',()=>{
  for(const n of ['3658D','3666D']){
    const x=p(n,'2026-11-07',{scheduledStopKeys:
      ['Kamaishi','Tono','Hanamaki','Morioka']});
    assert.equal(verify(x).model,'HB-E220系',n);
    assert.equal(icon(x).kind,'vehicle',n);
  }
  const denied=p('3658D','2026-11-07',{scheduledStopKeys:
    ['Morioka','Yahaba','Hanamaki']});
  assert.equal(verify(denied),null);
  assert.equal(icon(denied).kind,'unresolved');
});
test('the SQL canonical cross-line proof alone admits verified Morioka–Hanamaki stops',()=>{
  const stops=['Morioka','Iwate-Iioka','Yahaba','Furudate','Hizume',
    'Ishidorii','Hanamaki-Kuko','Hanamaki','Shin-Hanamaki','Tono','Kamaishi'];
  const prior=p('3657D','2026-11-07',{scheduledStopKeys:stops});
  assert.equal(verify(prior),null,'number-only proof must not authorize Tohoku stops');
  assert.equal(icon(prior).kind,'unresolved');
  const through=p('3657D','2026-11-07',{
    scheduledStopKeys:stops,
    sqlPublishedNumberFleetReference:{
      ...prior.sqlPublishedNumberFleetReference,verifiedTohokuThrough:true
    }
  });
  assert.equal(verify(through)?.model,'HB-E220系');
  assert.equal(icon(through).kind,'vehicle');
  const injected={...through,scheduledStopKeys:
    [...stops.slice(0,4),'Niigata',...stops.slice(4)]};
  assert.equal(verify(injected),null);
  assert.equal(icon(injected).kind,'unresolved');
});
test('no date or DB proof means no image even for 8621D or a plausible 9657D number',()=>{
  for(const number of ['5559D','5562D','9532D','9543D','9555D',
    '9657D','9659D','9664D','9666D','9672D']){
    const x=p(number);
    assert.equal(verify(x),null,number);
    assert.equal(icon(x).kind,'unresolved',number);
  }
  for(const day of ['2026-11-05','2026-11-06','2026-11-09',
    '2026-11-20','2026-11-24']){
    const x=p('8621D',day);
    assert.equal(verify(x),null,day);
    assert.equal(icon(x).kind,'unresolved',day);
  }
  const x=p('651D');
  assert.equal(verify({...x,sqlPublishedNumberFleetReference:null}),null);
  assert.equal(icon({...x,sqlPublishedNumberFleetReference:null}).kind,'unresolved');
});
test('source, route, date, family and actual stock contradictions deny the PNG',()=>{
  const x=p('8621D');
  for(const change of [
    {sourceRailway:'odpt.Railway:JR-East.KamaishiShinkansen'},
    {trainOperator:'JR-West'},{displayLineId:'Tohoku'},
    {calendarType:'weekday'},{serviceDate:'2026-12-07'},
    {railDirection:'odpt.RailDirection:Inbound'},
    {trainType:'odpt.TrainType:JR-East.Local'},
    {scheduledStopKeys:[]},{scheduledStopKeys:['Tono']},
    {scheduledStopKeys:['Hanamaki','Niigata']},
    {sqlPublishedNumberFleetReference:{...x.sqlPublishedNumberFleetReference,model:'HB-E220系'}},
    {sqlPublishedNumberFleetReference:{...x.sqlPublishedNumberFleetReference,referenceOnly:false}},
    {vehiclePlan:{models:['HB-E220系']}},
    {realtimeVehicleType:'HB-E220系'}
  ]){
    const y={...x,...change};
    if(!('vehiclePlan' in change)&&!('realtimeVehicleType' in change))
      assert.equal(verify(y),null,JSON.stringify(change));
    assert.equal(icon(y).kind,'unresolved',JSON.stringify(change));
  }
});
test('Kamaishi source-to-image migration contains actual DB evidence tables',()=>{
  const migrations=fs.readdirSync('supabase/migrations').filter(x=>x.includes('kamaishi_2611_'));
  assert.ok(migrations.length>=2);
  const joined=migrations.map(n=>fs.readFileSync('supabase/migrations/'+n,'utf8')).join('\n');
  for(const item of ['published_kamaishi_2611_number_roster',
    'published_train_png_number_ranges','published_train_number_evidence',
    'HB-E220系','HB-E300系（ひなび）','8621D','8622D',
    'published_train_vehicle_number_references','manual_timetable_template_stops'])
    assert.ok(joined.includes(item),item);
});
