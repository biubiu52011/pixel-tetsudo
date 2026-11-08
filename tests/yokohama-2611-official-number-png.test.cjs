'use strict';
/* JR East Yokohama 2611: all 622 official K train numbers, reference
 * E233-6000 PNG and conflict isolation. No actual H-carset inference.
 * node --test tests/yokohama-2611-official-number-png.test.cjs
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const win={};
const ctx=vm.createContext({window:win,Date,console:{
  log(){},warn(){},error(){},debug(){}
},_isTrainArtworkFailureActive(){return false}});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/jreast-yokohama-2611-number-index.js',
  'data/timetables/jreast-keihin-2611-number-index.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start,'existing SVG marker contract missing');
vm.runInContext(render.slice(start,end),ctx);
const idx=win.JREastYokohama202611NumberIndex;
const img='../images/列车/JR東日本/JR東日本_E233系_6000番台.png';
const src='odpt.Railway:JR-East.Yokohama';
function pos(trainNumber,cal='weekday',dir='Inbound',extra={}){
  const date=cal==='holiday'?'2026-11-08':'2026-11-09';
  return {
    trainId:'planned-trip:'+date+'|Yokohama|'+trainNumber,
    trainNumber,positionLineId:'Yokohama',displayLineId:'Yokohama',
    sourceRailway:src,trainOperator:'JR-East',
    railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:date,calendarType:cal,positionSource:'supabase-train-run',
    estimated:true,vehicleIdentityStatus:'UNKNOWN',
    vehicleResolvedUpstream:false,plannedVehicleCandidates:['E233系6000番台'],
    ...extra
  };
}
test('622 official K numbers: full-number, calendar and direction match',()=>{
  const expected={
    'Weekday|Inbound':161,'Weekday|Outbound':164,
    'SaturdayHoliday|Inbound':148,'SaturdayHoliday|Outbound':149
  };
  assert.equal(idx.version,'2026-11');
  assert.equal(idx.scope,'published-train-number-only');
  let total=0;
  for(const [key,numbers] of Object.entries(idx.lists)){
    assert.equal(numbers.length,expected[key],key);
    assert.equal(new Set(numbers).size,numbers.length,key);
    const [calendar,direction]=key.split('|');
    for(const n of numbers){
      assert.match(n,/^[0-9]{3,4}K$/);
      assert.equal(Number(n.slice(0,-1))%2,direction==='Inbound'?0:1,n);
      assert.equal(idx.contains(n,{calendarType:calendar,railDirection:direction}),true,n);
      total++;
    }
  }
  assert.equal(total,622);
  assert.equal(new Set(Object.values(idx.lists).flat()).size,526);
});
test('all 622 numbered services select only scoped E233-6000 reference artwork',()=>{
  assert.equal(fs.existsSync('images/列车/JR東日本/JR東日本_E233系_6000番台.png'),true);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('E233系6000番台',img,'Yokohama'),true);
  let count=0;
  for(const [key,numbers] of Object.entries(idx.lists)){
    const [day,dir]=key.split('|');
    const cal=day==='Weekday'?'weekday':'holiday';
    for(const number of numbers){
      for(const origin of ['realtime-api','supabase-train-run']){
        const p=pos(number,cal,dir,{positionSource:origin,estimated:origin!=='realtime-api'});
        const matched=win.TrainVehicle.lookupTrainNumberRangePng(p);
        assert.equal(matched?.trainNumber,number,number+'/'+cal+'/'+origin);
        assert.equal(matched?.model,'E233系6000番台');
        assert.equal(matched?.pngPath,img);
        const marker=ctx._trainMarkerSpec(p,p.trainId,'Yokohama');
        assert.equal(marker.kind,'vehicle',number+'/'+origin);
        assert.equal(marker.iconSrc,img,number+'/'+origin);
        assert.equal(marker.planned,true);
        assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
        assert.equal(p.vehicleFormationId,undefined);
        assert.equal(p.vehiclePlan,undefined);
        count++;
      }
    }
  }
  assert.equal(count,1244);
});
test('wrong stock, number, calendar, source, service or date cannot take Yokohama PNG',()=>{
  const valid=pos('408K','weekday','Inbound');
  const bad=[
    {trainNumber:'999K'},{trainNumber:'408B'},{trainNumber:'40K'},
    {trainNumber:'1940K'},{trainNumber:'4747K'},
    {calendarType:'holiday',serviceDate:'2026-11-08'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {sourceRailway:'odpt.Railway:JR-East.KeihinTohokuNegishi'},
    {sourceRailway:''},{positionLineId:'KeihinTohoku'},
    {displayLineId:'KeihinTohoku'},
    {trainOperator:'JR-West'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {serviceDate:'2026-12-01'},{serviceDate:'2026-10-31'},
    {plannedVehicleCandidates:['E233系1000番台']},
    {realtimeVehicleType:'E233系1000番台'},
    {realtimeDerivedVehicleType:'E233系1000番台'},
    {vehiclePlan:{status:'PLANNED_MODEL',confirmed:true,models:['E233系1000番台']}},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',models:['E233系1000番台']}},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',models:['E233系6000番台','E233系1000番台']}}
  ];
  for(const update of bad)assert.equal(
    win.TrainVehicle.lookupTrainNumberRangePng({...valid,...update}),null,
    'conflict: '+JSON.stringify(update));
  // Full 4xxxK, including through numbers, must not be truncated to two digits.
  assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(
    pos('4747K','holiday','Outbound'))?.pngPath,img);
  assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(
    pos('1940K','holiday','Inbound'))?.pngPath,img);
  const noOperator=pos('408K','weekday','Inbound',{
    trainOperator:'',calendarType:'',serviceId:'odpt.Calendar:Weekday'
  });
  assert.equal(win.TrainVehicle.lookupTrainNumberRangePng(noOperator)?.pngPath,img);
  assert.equal(win.TrainVehicle.selectMarkerArtwork({...valid,displayLineId:'KeihinTohoku'},false).kind,'unresolved');
  assert.equal(win.TrainVehicle.selectMarkerArtwork(valid,true).kind,'unresolved');
});
test('page lazy script hash and migration audit scope are preserved',()=>{
  const file='data/timetables/train-number-png-ranges.js';
  const buf=fs.readFileSync(file);
  const sha=crypto.createHash('sha1').update('blob '+buf.length+'\0')
    .update(buf).digest('hex').slice(0,12);
  const html=fs.readFileSync('pages/trains.html','utf8');
  assert.ok(html.includes('../'+file+'?v='+sha),'trains lazy asset cache key must match Git blob');
  const sql=fs.readFileSync(
    'supabase/migrations/20261108175301_jr_east_yokohama_2611_official_number_evidence.sql','utf8');
  for(const label of ['622','608u1','608d1','608u2','608d2',
    'train_number_only','train_number_set_only','carsets'])
    assert.ok(sql.includes(label),label);
});
