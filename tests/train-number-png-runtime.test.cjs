'use strict';
/* Train number -> approved PNG -> actual SVG marker.
 * Feed exactly the fields delivered by ODPT realtime and Supabase SQL.
 * A known MODEL is still PLANNED, never a claimed physical carset.
 * node --test tests/train-number-png-runtime.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root={},ctx=vm.createContext({
  window:root,Date,console:{debug(){},warn(){},log(){},error(){}},
  _isTrainArtworkFailureActive(){return false}
});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/train-number-png-ranges.js',
  'js/train-vehicle.js',
  'data/timetables/vehicle-operation-evidence-data.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const render=fs.readFileSync('js/trains-render.js','utf8');
const start=render.indexOf('  function _trainMarkerDomKind(');
const end=render.indexOf('  // Public identification boundary:',start);
assert.ok(start>=0 && end>start,'map SVG marker selection functions missing');
vm.runInContext(render.slice(start,end),ctx,{filename:'js/trains-render.js:marker'});
function live(extra={}){
  return {
    trainNumber:'8084M',trainId:'odpt:train:8084M',
    serviceDate:'2026-11-03',calendarType:'holiday',
    sourceRailway:'odpt.Railway:JR-East.Chuo',
    positionLineId:'ChuoMain',trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    positionSource:'realtime-api',estimated:false,
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    ...extra
  };
}
function sql(extra={}){
  const x=live({...extra,positionSource:'supabase-train-run',estimated:true});
  if(!Object.prototype.hasOwnProperty.call(extra,'calendarType')){
    x.calendarType='';
    x.serviceId='odpt.Calendar:SaturdayHoliday';
  }
  return x;
}
const png='../images/列车/JR東日本/JR東日本_E353系.png';
function marker(p,lineId='ChuoMain'){
  return ctx._trainMarkerSpec(p,p.trainId,lineId);
}
test('ODPT realtime number -> garage PNG -> ChuoMain SVG image without preattached plan',()=>{
  const p=live();
  assert.equal(p.vehiclePlan,undefined);
  const resolved=root.TrainVehicle.lookupTrainNumberPng(p);
  assert.equal(resolved.trainNumber,'8084M');
  assert.equal(resolved.lineId,'ChuoMain');
  assert.equal(resolved.model,'E353系');
  assert.equal(resolved.pngPath,png);
  assert.equal(resolved.source,'official-published-number');
  const m=marker(p);
  assert.equal(m.kind,'vehicle');
  assert.equal(m.compact,false);
  assert.equal(m.planned,true);
  assert.equal(m.iconSrc,png);
  assert.equal(p.vehiclePlan,undefined,'lookup does not mutate actual-day train');
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN','artwork does not prove a carset');
});
test('Supabase SQL train number + source service calendar -> garage PNG on same line',()=>{
  const p=sql();
  assert.equal(p.calendarType,'');
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p).pngPath,png);
  assert.equal(marker(p).iconSrc,png);
  assert.equal(marker(p).planned,true);
});
test('Supabase certified single-model plan uses the same number-to-PNG map',()=>{
  const run={
    trainNumber:'37M',calendar:'odpt.Calendar:SaturdayHoliday',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    railDirection:'odpt.RailDirection:Inbound',
    destinationStationUrn:'odpt.Station:JR-East.Chuo.Shiojiri',
    timetableIdentity:'canonical-test-37M'
  };
  const tt={
    _positionSource:'supabase-train-run',
    _sqlVehicleMappingLevel:'official_service_vehicle_plan',
    _sqlVerifiedPublishedVehicleType:'E353系',
    _sqlVerifiedPublishedVehicleSourceUrl:'https://www.jreast.co.jp/train/express/azusa_kaiji.html',
    _serviceDate:'2026-11-03',
    'odpt:trainType':'odpt.TrainType:JR-East.LimitedExpress',
    'odpt:railway':'odpt.Railway:JR-East.Chuo',
    'odpt:operator':'odpt.Operator:JR-East',
    'odpt:trainTimetableObject':[]
  };
  const identity=root.TrainVehicle.resolveTimetableRun(
    run,tt,'ChuoMain',{operator:'JR-East'},'2026-11-03');
  const p=sql({
    trainNumber:'37M',
    vehiclePlan:identity.vehicleResult.vehiclePlan
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p).pngPath,png);
  assert.equal(marker(p).iconSrc,png);
  assert.equal(marker(p).planned,true);
  assert.equal(identity.vehicleResult.identityStatus,'UNKNOWN');
});
test('wrong date, line, source railway, train type, operator or missing fields never get PNG',()=>{
  for(const p of [
    live({serviceDate:'2026-11-07'}),
    live({serviceDate:''}),
    live({calendarType:''}),
    live({trainNumber:'442M',trainType:'odpt.TrainType:JR-East.Local'}),
    live({sourceRailway:'odpt.Railway:JR-East.Joban'}),
    live({positionLineId:'Joban'}),
    live({trainOperator:'JR-Central'}),
    live({trainType:'odpt.TrainType:JR-East.Local'}),
    live({displayLineId:'ChuoRapid'}),
    live({trainNumber:''}),
    sql({serviceId:'',calendarType:''})
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null,
      'invalid reference must not map '+JSON.stringify(p));
    assert.equal(marker(p,p.displayLineId||p.positionLineId).kind,'unresolved');
  }
});
test('date-restricted 9086M is mapped only on 22/23 November, never 3 November',()=>{
  const allowed=live({trainNumber:'9086M',serviceDate:'2026-11-22'});
  const denied=live({trainNumber:'9086M',serviceDate:'2026-11-03'});
  assert.equal(marker(allowed).iconSrc,png);
  assert.equal(marker(denied).kind,'unresolved');
});
test('conflicting upstream model candidates cannot silently be replaced by same-number PNG',()=>{
  const p=live({vehiclePlan:{
    lineId:'ChuoMain',status:'PLANNED_CANDIDATES',
    models:['211系（長野地区）'],iconPath:''
  }});
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null);
  assert.equal(marker(p).kind,'unresolved');
});
test('failed image requests fall back to neutral dot without changing the train number',()=>{
  const p=live();
  const trainNo=p.trainNumber;
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...p,displayLineId:'ChuoMain'},true).kind,'unresolved');
  assert.equal(p.trainNumber,trainNo);
});
test('renderer always queries the unified number-to-PNG selector on the displayed line',()=>{
  assert.match(render,/TrainVehicle\.selectMarkerArtwork\(selectionPosition, artworkFailed\)/);
  assert.match(render,/displayLineId: lineId/);
  assert.match(render,/var markerSpec = _trainMarkerSpec\(p, trainUid, lineId\)/);
  assert.match(render,/caption\.textContent=captionBase;/,
    'ordinary train numbers must not reappear in folded list');
});

test('1940K: ODPT train NUMBER range -> E233-7000 PNG on SaikyoKawagoe SVG',()=>{
  const p=live({trainNumber:'1940K',trainId:'odpt.Train:JR-East.SaikyoKawagoe.1940K',
    positionLineId:'SaikyoKawagoe',sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
    trainType:'odpt.TrainType:JR-East.Local'});
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null,
    'no exact published vehicle should be fabricated for 1940K');
  const selected=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.ok(selected);
  assert.equal(selected.trainNumber,'1940K');
  assert.equal(selected.model,'E233系7000番台');
  assert.equal(selected.source,'train-number-range');
  assert.match(selected.pngPath,/JR東日本_E233系_7000番台\.png$/);
  const spec=marker(p,'SaikyoKawagoe');
  assert.equal(spec.kind,'vehicle');
  assert.equal(spec.planned,true);
  assert.equal(spec.compact,false);
  assert.equal(spec.iconSrc,selected.pngPath);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  assert.equal(p.vehiclePlan,undefined);
});
test('the same direct train-number range works for estimated SQL positions',()=>{
  const p=sql({trainNumber:'1940K',positionLineId:'SaikyoKawagoe',
    sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'});
  assert.match(marker(p,'SaikyoKawagoe').iconSrc,/E233系_7000番台\.png$/);
});
test('K/F/S number tails select display PNG by scoped number ranges, without converting to operation IDs',()=>{
  const cases=[
    ['1938F','E233系7000番台'],
    ['1940S','E233系7000番台'],
    ['1976K','相鉄12000系'],
    ['1984K','東京臨海高速鉄道70-000形']
  ];
  for(const [number,model] of cases){
    const p=live({trainNumber:number,positionLineId:'SaikyoKawagoe',
      sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'});
    const chosen=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(chosen,number+' must match the published number range');
    assert.equal(chosen.model,model);
    assert.equal(marker(p,'SaikyoKawagoe').kind,'vehicle');
  }
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe').trainNumber,'1940K');
  assert.equal(root.TrainNumberPngRanges.match('1940K','ChuoMain'),null);
});
test('unlisted number tails and mismatched display lines remain neutral',()=>{
  for(const number of ['1992K','1940M','garbage']){
    const p=live({trainNumber:number,positionLineId:'SaikyoKawagoe'});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null);
    assert.equal(marker(p,'SaikyoKawagoe').kind,'unresolved');
  }
  const valid=live({trainNumber:'1940K',positionLineId:'SaikyoKawagoe'});
  assert.equal(marker(valid,'ChuoMain').kind,'unresolved');
});

test('277M: ODPT full train-number range -> representative E233-7000 PNG',()=>{
  const p=live({trainNumber:'277M',
    trainId:'odpt.Train:JR-East.SaikyoKawagoe.277M',
    positionLineId:'SaikyoKawagoe',
    sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
    trainType:'odpt.TrainType:JR-East.Local'});
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null);
  const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.ok(mapped,'277M should use the 220M+ full-number interval');
  assert.equal(mapped.trainNumber,'277M');
  assert.equal(mapped.model,'E233系7000番台');
  assert.equal(mapped.representative,true);
  assert.match(mapped.pngPath,/JR東日本_E233系_7000番台\.png$/);
  const rendered=marker(p,'SaikyoKawagoe');
  assert.equal(rendered.kind,'vehicle');
  assert.equal(rendered.planned,true);
  assert.equal(rendered.compact,false);
  assert.equal(rendered.iconSrc,mapped.pngPath);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN','a representative image never certifies stock');
});
test('277M: SQL estimates use same number-based artwork as ODPT',()=>{
  const p=sql({trainNumber:'277M',positionLineId:'SaikyoKawagoe',
    sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'});
  assert.match(marker(p,'SaikyoKawagoe').iconSrc,/JR東日本_E233系_7000番台\.png$/);
});
test('Sotetsu M numbering uses full numbers rather than final digits',()=>{
  for(const n of ['120M','137M','220M','277M','299M']){
    const m=root.TrainNumberPngRanges.match(n,'SaikyoKawagoe');
    assert.ok(m,n+' must be mapped by its own train-number family');
    assert.equal(m.model,'E233系7000番台');
  }
  for(const n of ['119M','200M','219M','300M','277K']){
    // 277K is a separate K/F/S family; not an M-number match.
    const m=root.TrainNumberPngRanges.match(n,'SotetsuJRDirect');
    assert.equal(m,null,n+' must not be admitted into the through-M number range');
  }
  assert.equal(root.TrainNumberPngRanges.match('277M','ChuoMain'),null);
  assert.equal(root.TrainNumberPngRanges.match('277M','Rinkai'),null);
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe').model,'E233系7000番台');
});

test('1932T: ChuoRapid ODPT live number -> scoped E233-0 SVG PNG',()=>{
  const p=live({trainNumber:'1932T',trainId:'odpt.Train:JR-East.ChuoRapid.1932T',
    positionLineId:'ChuoRapid',sourceRailway:'odpt.Railway:JR-East.ChuoRapid',
    trainType:'odpt.TrainType:JR-East.Rapid'});
  const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.ok(mapped);
  assert.equal(mapped.trainNumber,'1932T');
  assert.equal(mapped.model,'E233系0番台');
  assert.equal(mapped.representative,true);
  assert.match(mapped.pngPath,/JR東日本_E233系_0番台\.png$/);
  const spec=marker(p,'ChuoRapid');
  assert.equal(spec.kind,'vehicle');
  assert.equal(spec.planned,true);
  assert.equal(spec.compact,false);
  assert.equal(spec.iconSrc,mapped.pngPath);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
});
test('1932T: SQL planned-trip reuses the same ChuoRapid direct-number PNG',()=>{
  const p=sql({trainNumber:'1932T',
    trainId:'planned-trip:2026-11-03|JR-East|ChuoRapid|1932T',
    positionLineId:'ChuoRapid',sourceRailway:'odpt.Railway:JR-East.ChuoRapid',
    trainType:'odpt.TrainType:JR-East.Rapid'});
  assert.match(marker(p,'ChuoRapid').iconSrc,/JR東日本_E233系_0番台\.png$/);
});
test('2026 ChuoRapid T/H number ranges never leak to other lines or M trains',()=>{
  for(const num of ['486T','1926H','1932T','2452T']){
    const row=root.TrainNumberPngRanges.match(num,'ChuoRapid');
    assert.ok(row,num+' should match the actual ChuoRapid train-number interval');
    assert.equal(row.model,'E233系0番台');
  }
  for(const num of ['2627M','399T','2600T','1932M','1932B']){
    assert.equal(root.TrainNumberPngRanges.match(num,'ChuoRapid'),null,
      num+' must remain outside the T/H train-number range');
  }
  assert.equal(root.TrainNumberPngRanges.match('1932T','ChuoMain'),null);
  assert.equal(root.TrainNumberPngRanges.match('1932T','SaikyoKawagoe'),null);
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe').model,'E233系7000番台');
  assert.equal(root.TrainNumberPngRanges.match('277M','SaikyoKawagoe').model,'E233系7000番台');
});

test('regular 2026 Chuo special expresses map by whole M train number and LimitedExpress type',()=>{
  const cases=[
    ['1M','あずさ1号'],['27M','かいじ／あずさ'],
    ['2107M','富士回遊7号'],['3107M','かいじ7号'],
    ['5003M','あずさ3号'],['5050M','あずさ50号']
  ];
  for(const [trainNumber,service] of cases){
    for(const positionLineId of ['ChuoMain','ChuoRapid']){
      const p=live({trainNumber,trainId:'odpt.Train:JR-East.Chuo.'+trainNumber,
        sourceRailway:'odpt.Railway:JR-East.Chuo',positionLineId,
        trainType:'odpt.TrainType:JR-East.LimitedExpress'});
      const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.ok(mapped,trainNumber+' / '+positionLineId+' ('+service+')');
      assert.equal(mapped.model,'E353系');
      assert.equal(mapped.pngPath,png);
      assert.equal(mapped.representative,true);
      const spec=marker(p,positionLineId);
      assert.equal(spec.kind,'vehicle');
      assert.equal(spec.planned,true);
      assert.equal(spec.iconSrc,png);
    }
  }
});
test('2026 regular Chuo express SQL positions use the same E353 PNG',()=>{
  const p=sql({trainNumber:'3107M',trainId:'planned-trip:2026-11-03|JR-East|ChuoMain|3107M',
    sourceRailway:'odpt.Railway:JR-East.Chuo',
    positionLineId:'ChuoMain',
    trainType:'odpt.TrainType:JR-East.LimitedExpress'});
  assert.equal(marker(p,'ChuoMain').iconSrc,png);
});
test('Chuo M regulars, numbered non-expresses and date-gated extras never become E353',()=>{
  for(const number of ['427M','2152M','3107M','5003M','1M']){
    const p=live({trainNumber:number,positionLineId:'ChuoMain',
      trainType:'odpt.TrainType:JR-East.Local'});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,number+' is not a LimitedExpress');
  }
  for(const n of ['8084M','9086M','8079M','9022M','0M','3107T']){
    const p=live({trainNumber:n,positionLineId:'ChuoRapid',
      trainType:'odpt.TrainType:JR-East.LimitedExpress'});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      n+' is outside the regular express intervals');
  }
  const unrelated=live({trainNumber:'3107M',positionLineId:'SaikyoKawagoe',
    trainType:'odpt.TrainType:JR-East.LimitedExpress'});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(unrelated),null);
  assert.equal(root.TrainNumberPngRanges.match('3107M','ChuoMain'),null,
    'the range alone without LimitedExpress context is insufficient');
  assert.equal(root.TrainNumberPngRanges.match('3107M','ChuoMain',
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'}).model,'E353系');
});

test('2026 Ome official plain train numbers map directly to E233-0 PNG',()=>{
  const numbers=['509','843','1103','1705','2348'];
  for(const trainNumber of numbers){
    const p=live({trainNumber,positionLineId:'Ome',
      trainId:'odpt.Train:JR-East.Ome.'+trainNumber,
      sourceRailway:'odpt.Railway:JR-East.Ome',
      trainType:'odpt.TrainType:JR-East.Local'});
    const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(mapped,'published Ome train number '+trainNumber);
    assert.equal(mapped.trainNumber,trainNumber);
    assert.equal(mapped.model,'E233系0番台');
    assert.equal(mapped.representative,true);
    assert.match(mapped.pngPath,/JR東日本_E233系_0番台\.png$/);
    const spec=marker(p,'Ome');
    assert.equal(spec.kind,'vehicle');
    assert.equal(spec.planned,true);
    assert.equal(spec.iconSrc,mapped.pngPath);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
});
test('2026 Ome official T and H suffix numbers map directly to E233-0 PNG',()=>{
  for(const trainNumber of ['434T','405H','1378T','1926H','2386T']){
    const p=live({trainNumber,positionLineId:'Ome',
      trainId:'odpt.Train:JR-East.Ome.'+trainNumber,
      sourceRailway:'odpt.Railway:JR-East.Ome',
      trainType:'odpt.TrainType:JR-East.Local'});
    const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(mapped,trainNumber);
    assert.equal(mapped.model,'E233系0番台');
    assert.match(marker(p,'Ome').iconSrc,/JR東日本_E233系_0番台\.png$/);
  }
});
test('2026 Ome SQL planned-trip number uses the same PNG as live ODPT',()=>{
  const p=sql({trainNumber:'1103',
    trainId:'planned-trip:2026-11-03|JR-East|Ome|1103',
    positionLineId:'Ome',
    sourceRailway:'odpt.Railway:JR-East.Ome',
    trainType:'odpt.TrainType:JR-East.Local'});
  const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.ok(mapped);
  assert.equal(marker(p,'Ome').iconSrc,mapped.pngPath);
});
test('Ome regular train-number mapping excludes specials and unrelated lines',()=>{
  for(const n of ['7741','7847','9270M','9271M','9351M','9577M','399','2500','399T','2600T','1103M']){
    const p=live({trainNumber:n,positionLineId:'Ome',
      sourceRailway:'odpt.Railway:JR-East.Ome',
      trainType:'odpt.TrainType:JR-East.Local'});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      n+' must not enter the regular Ome map');
  }
  for(const line of ['ChuoRapid','ChuoMain','SaikyoKawagoe']){
    assert.equal(root.TrainNumberPngRanges.match('1103',line),null,
      'bare Ome train numbers must stay scoped: '+line);
  }
  for(const n of ['843','1378T']){
    const p=live({trainNumber:n,positionLineId:'Ome',
      trainType:'odpt.TrainType:JR-East.LimitedExpress'});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'a LimitedExpress must not receive an ordinary Ome reference');
  }
  assert.equal(root.TrainNumberPngRanges.match('1932T','ChuoRapid').model,'E233系0番台');
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe').model,'E233系7000番台');
  assert.equal(root.TrainNumberPngRanges.match('277M','SaikyoKawagoe').model,'E233系7000番台');
});
