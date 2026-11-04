'use strict';
/* Exact JR East 2026-11 Yokosuka-Sobu/Boso public-number display PNGs.
 * E257-5000 special trainset is NEVER inferred from an 8xxx/9xxx M range.
 * Run: node --test tests/yokosuka-sobu-202611-number-png.test.cjs
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');

function hashFor(file) {
  const bytes=fs.readFileSync(file);
  return crypto.createHash('sha1').update('blob '+bytes.length+'\0')
    .update(bytes).digest('hex').slice(0,12);
}
const root={};
const ctx=vm.createContext({window:root,Date,console:{debug(){},warn(){},log(){},error(){}},
  _isTrainArtworkFailureActive(){return false}});
const indexFile='data/timetables/jreast-sobu-yokosuka-202611-number-index.js';
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  indexFile,
  'data/timetables/jreast-chiba-number-index-202611.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0&&end>start);
vm.runInContext(render.slice(start,end),ctx,{filename:'js/trains-render.js:spec'});
const p235='../images/列车/JR東日本/JR東日本_E235系_1000番台.png';
const p259='../images/列车/JR東日本/JR東日本_E259系.png';
const p257='../images/列车/JR東日本/JR東日本_E257系_500番台.png';
function position(line,number,type,calendar='holiday',change={}) {
  return {
    trainId:'published:'+line+':'+number,
    trainNumber:number,positionLineId:line,
    sourceRailway:'odpt.Railway:JR-East.'+(line==='SobuMain'?'Sobu':line),trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.'+type,
    serviceDate:'2026-11-03',calendarType:calendar,
    positionSource:'realtime-api',estimated:false,
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    ...change
  };
}
function choose(p) {
  return root.TrainVehicle.lookupTrainNumberRangePng(p);
}
function picture(p) {
  return ctx._trainMarkerSpec(p,p.trainId,p.positionLineId);
}
function assertModel(p,model,icon){
  const answer=choose(p);
  assert.ok(answer,p.positionLineId+' '+p.trainNumber+' '+p.calendarType);
  assert.equal(answer.model,model);
  assert.equal(answer.pngPath,icon);
  assert.equal(answer.planned,true);
  const marker=picture(p);
  assert.equal(marker.kind,'vehicle');
  assert.equal(marker.iconSrc,icon);
  assert.equal(marker.planned,true);
  assert.equal(marker.compact,false);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN',
    'public timetable reference must not confirm physical carset');
  assert.equal(p.vehicleResolvedUpstream,false);
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...p,displayLineId:p.positionLineId},true).kind,'unresolved');
}
test('E235-1000 Yokosuka S, Sobu Rapid F and verified Narita F through lines',()=>{
  for(const args of [
    ['Yokosuka','1005S','Local','holiday'],
    ['Yokosuka','1004S','Local','weekday'],
    ['SobuRapid','1004F','Rapid','holiday'],
    ['SobuRapid','1005F','Rapid','weekday'],
    ['SobuMain','2627F','Rapid','holiday'],
    ['Narita','2627F','Rapid','holiday'],
    ['NaritaAirportBranch','2627F','Rapid','holiday']
  ])assertModel(position(...args),'E235系1000番台',p235);
  // Yokosuka Shonan-Shinjuku H/Y and M-numbered trains are different
  // service groups, not proof that the physical train is E235-1000.
  for(const number of ['859H','2521Y','4521Y','3835M','1004F']){
    assert.equal(choose(position('Yokosuka',number,'Local','weekday')),null,
      'Yokosuka other service family must not be blanket mapped '+number);
  }
  assert.equal(choose(position('SobuRapid','1004F','Rapid','weekday')),null,
    'weekday and holiday have distinct published number sets');
});
test('E259 Narita Express 2001M-2054M and calendar-specific Shiosai 400xM',()=>{
  for(const args of [
    ['Yokosuka','2001M','LimitedExpress','holiday'],
    ['Yokosuka','2054M','LimitedExpress','holiday'],
    ['SobuRapid','2001M','LimitedExpress','holiday'],
    ['SobuMain','2001M','LimitedExpress','holiday'],
    ['Narita','2054M','LimitedExpress','holiday'],
    ['NaritaAirportBranch','2054M','LimitedExpress','weekday'],
    ['SobuMain','4001M','LimitedExpress','holiday'],
    ['SobuMain','4002M','LimitedExpress','weekday'],
    ['SobuMain','4014M','LimitedExpress','holiday']
  ])assertModel(position(...args),'E259系',p259);
  for(const number of ['4006M','4011M']){
    const p=position('SobuMain',number,'LimitedExpress','weekday');
    const reference=choose(p);
    assert.equal(reference && reference.model,'E257系500番台',
      'weekday Shiosai '+number+' must be E257-500, not E259');
  }
  for(const [line,number] of [['SobuMain','4002M'],['SobuRapid','2054M']]){
    assert.equal(choose(position(line,number,'LimitedExpress','holiday')),null,
      'absent holiday NEX/Shiosai number '+line+' '+number);
  }
});
test('E257-500 Wakashio/Sazanami, Keiyo through line and two weekday Shiosai runs',()=>{
  for(const args of [
    ['Uchibo','1001M','LimitedExpress','weekday'],
    ['Uchibo','1007M','LimitedExpress','weekday'],
    ['Sotobo','1051M','LimitedExpress','holiday'],
    ['Sotobo','1052M','LimitedExpress','weekday'],
    ['Sotobo','1071M','LimitedExpress','weekday'],
    ['Keiyo','1051M','LimitedExpress','holiday'],
    ['Keiyo','1001M','LimitedExpress','weekday'],
    ['SobuMain','4006M','LimitedExpress','weekday'],
    ['SobuMain','4011M','LimitedExpress','weekday']
  ])assertModel(position(...args),'E257系500番台',p257);
  for(const args of [
    ['Uchibo','1001M','LimitedExpress','holiday'],
    ['Sotobo','1052M','LimitedExpress','holiday'],
    ['Keiyo','1001M','LimitedExpress','holiday']
  ])assert.equal(choose(position(...args)),null);
  const e259=choose(position('SobuMain','4007M','LimitedExpress','weekday'));
  assert.equal(e259 && e259.model,'E259系',
    'weekday Shiosai 4007M must stay E259 rather than E257-500');
});
test('do not treat E257-5000 8xxx/9xxx special numbers as a monthly fleet interval',()=>{
  for(const num of ['9071M','9077M','8083M','9882M','9086M']){
    assert.equal(choose(position('SobuMain',num,'LimitedExpress')),null);
    assert.equal(choose(position('Yokosuka',num,'LimitedExpress')),null);
  }
  // Without a dated train-by-train official roster AND an approved 5000
  // series gallery artwork, do not borrow the E257-500 PNG.
});
test('source railway, operator, train type, date, approved model and page cache isolation',()=>{
  const base=position('Yokosuka','1005S','Local');
  for(const change of [
    {sourceRailway:'odpt.Railway:JR-East.SobuRapid'},
    {sourceRailway:'odpt.Railway:TokyoMetro.Yokosuka'},
    {sourceRailway:''},
    {trainOperator:'JR-West'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {serviceDate:'2026-12-01'},
    {serviceDate:'2026-10-31'},
    {serviceDate:''},
    {calendarType:'unknown',serviceId:''},
    {realtimeVehicleType:'E231系1000番台'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E231系1000番台']}}
  ])assert.equal(choose({...base,...change}),null,JSON.stringify(change));
  const sql={...base,positionSource:'supabase-train-run',estimated:true,
    trainOperator:'',calendarType:'',serviceId:'odpt.Calendar:SaturdayHoliday'};
  assertModel(sql,'E235系1000番台',p235);
  assert.equal(ctx._trainMarkerSpec({...base,displayLineId:'SobuRapid'},
    base.trainId,'SobuRapid').kind,'unresolved');
  const html=fs.readFileSync('pages/trains.html','utf8');
  const index=fs.readFileSync(indexFile,'utf8');
  const version=index.match(/version:"([^"]+)"/);
  assert.ok(version);
  assert.ok(html.includes('jreast-sobu-yokosuka-202611-number-index.js?v='+hashFor(indexFile)));
  const gallery=html.indexOf('vehicle-garage-png-map.js');
  const indexAt=html.indexOf('jreast-sobu-yokosuka-202611-number-index.js');
  const numberRules=html.indexOf('train-number-png-ranges.js');
  const vehicle=html.indexOf('js/train-vehicle.js');
  assert.ok(gallery>=0&&gallery<indexAt&&indexAt<numberRules&&numberRules<vehicle,
    'approved gallery and dated index must load before number PNG selector');
});


test('all sourced Boso through services use provider URNs, not UI aliases',()=>{
  assert.ok(root.JREastChibaNumberIndex202611);
  assert.equal(root.JREastChibaNumberIndex202611.rows,35);
  const p235='../images/列车/JR東日本/JR東日本_E235系_1000番台.png';
  const p259='../images/列车/JR東日本/JR東日本_E259系.png';
  const p257='../images/列车/JR東日本/JR東日本_E257系_500番台.png';
  const entries=[
    ['SobuMain','2627F','Rapid','holiday','E235系1000番台',p235],
    ['Uchibo','2577F','Rapid','holiday','E235系1000番台',p235],
    ['Sotobo','3573F','Rapid','holiday','E235系1000番台',p235],
    ['Kashima','2520M','Local','holiday','E235系1000番台',p235],
    ['Narita','2545M','Local','weekday','E235系1000番台',p235],
    ['Yokosuka','1005S','Local','holiday','E235系1000番台',p235],
    ['Yokosuka','2001M','LimitedExpress','holiday','E259系',p259],
    ['Yokosuka','2204M','LimitedExpress','holiday','E259系',p259],
    ['Yokosuka','2249M','LimitedExpress','holiday','E259系',p259],
    ['SobuMain','4001M','LimitedExpress','holiday','E259系',p259],
    ['SobuRapid','4001M','LimitedExpress','holiday','E259系',p259],
    ['SobuMain','4006M','LimitedExpress','weekday','E257系500番台',p257],
    ['SobuRapid','4006M','LimitedExpress','weekday','E257系500番台',p257],
    ['Keiyo','1051M','LimitedExpress','holiday','E257系500番台',p257],
    ['Sotobo','1071M','LimitedExpress','weekday','E257系500番台',p257],
    ['Uchibo','1001M','LimitedExpress','weekday','E257系500番台',p257]
  ];
  entries.forEach(([line,num,kind,calendar,model,png])=>{
    const p=position(line,num,kind,calendar);
    assertModel(p,model,png);
    const sql={...p,positionSource:'supabase-train-run',estimated:true,
      calendarType:'',serviceId:calendar==='weekday'?
        'odpt.Calendar:Weekday':'odpt.Calendar:SaturdayHoliday',
      trainOperator:''};
    assertModel(sql,model,png);
  });
  const index=root.JREastChibaNumberIndex202611;
  const looksSimilar=[
    position('SobuMain','4001M','LimitedExpress','holiday',{
      sourceRailway:'odpt.Railway:JR-East.SobuMain'}),
    position('SobuMain','4006M','LimitedExpress','weekday',{
      sourceRailway:'odpt.Railway:JR-East.SobuRapid'}),
    position('Yokosuka','2255M','LimitedExpress','holiday'),
    position('Yokosuka','2522Y','Local','holiday'),
    position('Yokosuka','1004H','Local','holiday'),
    position('Yokosuka','3835M','Local','weekday'),
    position('Kashima','548M','Local','holiday'),
    position('SobuRapid','4006M','LimitedExpress','holiday'),
    position('Uchibo','1001M','LimitedExpress','holiday'),
    position('Sotobo','1071M','LimitedExpress','holiday'),
    position('Narita','2001M','Local','holiday'),
    position('SobuRapid','1004F','Rapid','weekday'),
    position('SobuMain','4001M','LimitedExpress','holiday',{
      realtimeVehicleType:'E257系500番台'}),
    position('Uchibo','2577F','Rapid','holiday',{
      vehiclePlan:{status:'PLANNED_MODEL',models:['E131系0番台']}})
  ];
  looksSimilar.forEach(p=>{
    assert.equal(choose(p),null,'no incorrect train or actual model '+JSON.stringify(p));
  });
  assert.equal(index.observedE2575000['2026-09-21'].join(','),
    '9071M,9077M,8083M','three evidenced one-day Azusa carset numbers');
  for(const n of ['9071M','9077M','8083M']) {
    assert.equal(choose(position('ChuoMain',n,'LimitedExpress','holiday')),null,
      'Sep 21 E257-5000 observation never proves Nov service or PNG');
  }
  const html=fs.readFileSync('pages/trains.html','utf8');
  const src=fs.readFileSync('data/timetables/jreast-chiba-number-index-202611.js','utf8');
  const version=src.match(/version:"([^"]+)"/);
  assert.ok(version);
  assert.ok(html.includes('jreast-chiba-number-index-202611.js?v='+hashFor('data/timetables/jreast-chiba-number-index-202611.js')));
  assert.ok(html.indexOf('jreast-chiba-number-index-202611.js') <
    html.indexOf('train-number-png-ranges.js'));
});

test('2262F renders E235 on Yokosuka composite via the verified SobuRapid extension',()=>{
  // User-reported actual SVG: 2026-11-03 Chiba 23:50 -> Tokyo, 2262F.
  // The direction label is in the Yokosuka display, but the train
  // keeps its official SobuRapid source/number and planned reference.
  const uid='planned-trip:2026-11-03|JR-East|odpt.Railway%3AJR-East.SobuRapid|SobuRapid|2262F';
  const p=position('SobuRapid','2262F','Rapid','holiday',{
    trainId:uid,positionSource:'supabase-train-run',estimated:true,
    fusionLineId:'SobuRapid',fusionRole:'extension',
    destinationStation:'Tokyo',railDirection:'odpt.RailDirection:Inbound'
  });
  assertModel(p,'E235系1000番台',p235);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(
    {...p,displayLineId:'Yokosuka'}).pngPath,p235);
  const projected=ctx._trainMarkerSpec(p,uid,'Yokosuka');
  const boundary={...p,fusionRole:'through-boundary'};
  assert.equal(ctx._trainMarkerSpec(boundary,uid,'Yokosuka').iconSrc,p235,
    'DataFusion exact Tokyo through boundary also displays sourced model');
  assert.equal(projected.kind,'vehicle');
  assert.equal(projected.iconSrc,p235);
  assert.equal(projected.planned,true);
  assert.equal(projected.compact,false);
  assert.equal(p.positionLineId,'SobuRapid','keep source railway');
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN','never claim actual formation');
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...p,displayLineId:'Yokosuka'},true).kind,'unresolved',
    'failed projection PNG retains the gray location marker');
  const live={...p,positionSource:'realtime-api',estimated:false};
  assert.equal(ctx._trainMarkerSpec(live,uid,'Yokosuka').iconSrc,p235);
  // 2262F is published in both weekday and holiday number lists.
  assert.equal(ctx._trainMarkerSpec({...p,calendarType:'weekday'},uid,'Yokosuka').iconSrc,p235);
  const nex=position('SobuRapid','2001M','LimitedExpress','holiday',{
    fusionLineId:'SobuRapid',fusionRole:'extension'
  });
  assert.equal(ctx._trainMarkerSpec(nex,nex.trainId,'Yokosuka').iconSrc,p259,
    'the same verified extension preserves NEX model reference');
  const reverse=position('Yokosuka','1005S','Local','holiday',{
    fusionLineId:'Yokosuka',fusionRole:'extension'
  });
  assert.equal(ctx._trainMarkerSpec(reverse,reverse.trainId,'SobuRapid').iconSrc,p235);
  for(const changes of [
    {fusionRole:''},{fusionRole:'branch'},
    {fusionLineId:'Yokosuka'},{fusionLineId:''},
    {sourceRailway:'odpt.Railway:JR-East.Yokosuka'},
    {trainNumber:'2263F'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {calendarType:'unknown',serviceId:''},
    {serviceDate:'2026-12-01'},
    {trainOperator:'JR-West'},
    {realtimeVehicleType:'E217系'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E217系']}}
  ]){
    const wrong={...p,...changes};
    assert.equal(ctx._trainMarkerSpec(wrong,uid,'Yokosuka').kind,'unresolved',
      'invalid cross-line PNG projection: '+JSON.stringify(changes));
  }
  assert.equal(ctx._trainMarkerSpec(p,uid,'SobuMain').kind,'unresolved',
    'an extension cannot borrow arbitrary third-line artwork');
  const page=fs.readFileSync('pages/trains.html','utf8');
  assert.ok(page.includes('train-vehicle.js?v='+hashFor('js/train-vehicle.js')),
    'train vehicle selector cache must match its file contents');
  assert.ok(page.includes('data-fusion.js?v='+hashFor('js/data-fusion.js')),
    'DataFusion asset cache must match its file contents');
  const fusion=fs.readFileSync('js/data-fusion.js','utf8');
  assert.match(fusion,/fusionRole: "through-boundary"/,
    'direct-through station projections explicitly mark their verified role');
});
