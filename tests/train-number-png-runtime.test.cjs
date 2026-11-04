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
  'data/timetables/joban-e231-h-202611-index.js',
  'data/timetables/jreast-keihin-2611-number-index.js',
  'data/timetables/jreast-yokohama-2611-number-index.js',
  'data/timetables/jreast-yamanote-2611-number-index.js',
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

test('JobanLocal K/S/E published whole-number artwork uses its three approved PNGs for live and SQL',()=>{
  const cases=[
    ['400K','E233系2000番台','JR東日本_E233系_2000番台.png'],
    ['1928K','E233系2000番台','JR東日本_E233系_2000番台.png'],
    ['550S','東京メトロ16000系','東京メトロ_16000系.png'],
    ['2008S','東京メトロ16000系','東京メトロ_16000系.png'],
    ['440E','小田急4000形','小田急電鉄_4000形_標準色.png'],
    ['1948E','小田急4000形','小田急電鉄_4000形_標準色.png']
  ];
  for(const [number,model,asset] of cases){
    for(const source of ['realtime-api','supabase-train-run','train-timetable']){
      const p=live({
        trainNumber:number,trainId:'odpt.Train:JR-East.JobanLocal.'+number,
        positionLineId:'JobanLocal',
        sourceRailway:'odpt.Railway:JR-East.JobanLocal',
        trainType:'odpt.TrainType:JR-East.Local',positionSource:source
      });
      const chosen=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.ok(chosen,number+' / '+source);
      assert.equal(chosen.trainNumber,number);
      assert.equal(chosen.model,model);
      assert.ok(chosen.pngPath.endsWith('/'+asset));
      assert.equal(chosen.representative,true);
      const svg=marker(p,'JobanLocal');
      assert.equal(svg.kind,'vehicle');
      assert.equal(svg.iconSrc,chosen.pngPath);
      assert.equal(svg.planned,true);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
      assert.equal(p.vehiclePlan,undefined);
    }
  }
  const sqlPosition=sql({trainNumber:'1948E',positionLineId:'JobanLocal',
    sourceRailway:'odpt.Railway:JR-East.JobanLocal',
    trainType:'odpt.TrainType:JR-East.Local',trainOperator:''});
  assert.match(marker(sqlPosition,'JobanLocal').iconSrc,/4000形_標準色\.png$/);
});
test('JobanLocal PNG family excludes other lines, operators, dates, types and conflicting models',()=>{
  const base={trainNumber:'550S',positionLineId:'JobanLocal',
    sourceRailway:'odpt.Railway:JR-East.JobanLocal',
    trainType:'odpt.TrainType:JR-East.Local'};
  for(const extra of [
    {trainNumber:'550H'}, {trainNumber:'300S'}, {trainNumber:'2600S'},
    {trainNumber:'550M'}, {trainNumber:'550'},
    {positionLineId:'Joban'}, {positionLineId:'Chiyoda'},
    {positionLineId:'ChiyodaBranch'},
    {sourceRailway:'odpt.Railway:JR-East.JobanRapid'},
    {sourceRailway:'odpt.Railway:TokyoMetro.Chiyoda'},
    {trainOperator:'JR-West'}, {trainType:'odpt.TrainType:JR-East.Rapid'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {serviceDate:'2026-10-31'}, {serviceDate:'2026-12-01'},
    {realtimeVehicleType:'E233系2000番台'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E233系2000番台']}}
  ]){
    const p=live({...base,...extra});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'unapproved JobanLocal variant '+JSON.stringify(extra));
  }
  assert.equal(root.TrainNumberPngRanges.match('1948E','Joban'),null);
  assert.equal(root.TrainNumberPngRanges.match('1948E','JobanMain'),null);
  assert.equal(root.TrainNumberPngRanges.match('400K','SaikyoKawagoe').model,
    'E233系7000番台','existing Saikyo K-tail mapping must remain unchanged');
});
test('Kururi Karasuyama and Senseki-Tohoku scoped number PNG: published 2026-11 service only',()=>{
  const cases=[
    ['Karasuyama','321M','Local','EV-E301系','JR東日本_EV-E301系.png'],
    ['Karasuyama','346M','Local','EV-E301系','JR東日本_EV-E301系.png'],
    ['Kururi','920D','Local','キハE130形100番台','JR東日本_キハE130系100番台.png'],
    ['Kururi','2941D','Local','キハE130形100番台','JR東日本_キハE130系100番台.png'],
    ['SensekiTohoku','5521D','Rapid','HB-E210系','JR東日本_HB-E210系.png'],
    ['SensekiTohoku','5530D','Rapid','HB-E210系','JR東日本_HB-E210系.png']
  ];
  for(const [line,number,type,model,pngFile] of cases){
    for(const source of ['realtime-api','supabase-train-run']){
      const p=live({
        trainNumber:number,trainId:'odpt.Train:JR-East.'+line+'.'+number,
        positionLineId:line,sourceRailway:'odpt.Railway:JR-East.'+line,
        trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.'+type,
        serviceDate:'2026-11-04',positionSource:source,estimated:source!=='realtime-api'
      });
      const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.ok(mapped,line+' '+number+' '+source);
      assert.equal(mapped.trainNumber,number);
      assert.equal(mapped.model,model);
      assert.ok(mapped.pngPath.endsWith('/'+pngFile));
      assert.equal(mapped.representative,true);
      assert.equal(marker(p,line).iconSrc,mapped.pngPath);
      assert.equal(marker(p,line).planned,true);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    }
  }
});
test('Kururi Karasuyama and Senseki-Tohoku never assign model across line, type or unconfirmed services',()=>{
  const pos=(line,num,type='Local',extra={})=>live({
    trainNumber:num,positionLineId:line,sourceRailway:'odpt.Railway:JR-East.'+line,
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.'+type,
    serviceDate:'2026-11-04',...extra});
  for(const p of [
    pos('Karasuyama','320M'),pos('Karasuyama','321D'),
    pos('Kururi','920M'),pos('Kururi','921D','Rapid'),
    pos('SensekiTohoku','5521D','Local'),
    pos('SensekiTohoku','1532S'),
    pos('SensekiTohoku','1523M'),
    pos('SensekiTohoku','9524D','Rapid'),
    pos('SensekiTohoku','5521D','Rapid',{sourceRailway:'odpt.Railway:JR-East.Senseki'}),
    pos('SensekiTohoku','5521D','Rapid',{trainOperator:'TokyoMetro'}),
    pos('SensekiTohoku','5521D','Rapid',{serviceDate:'2026-12-01'}),
    pos('SensekiTohoku','5521D','Rapid',{realtimeVehicleType:'E131系800番台'}),
    pos('Kururi','920D','Local',{vehiclePlan:{status:'PLANNED_MODEL',models:['EV-E301系']}})
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'unsupported model/line/number '+JSON.stringify(p));
  }
});
test('2026-11 JR East Senseki Sagami Echigo exact published numbers paint only scoped representative PNG',()=>{
  const cases=[
    ['Senseki','521S','Local','E131系800番台','JR東日本_E131系_800番台.png'],
    ['Senseki','2342S','Local','E131系800番台','JR東日本_E131系_800番台.png'],
    ['Senseki','5521D','Rapid','HB-E210系','JR東日本_HB-E210系.png'],
    ['Senseki','5530D','Rapid','HB-E210系','JR東日本_HB-E210系.png'],
    ['Sagami','475F','Local','E131系500番台','JR東日本_E131系_500番台.png'],
    ['Sagami','2374F','Local','E131系500番台','JR東日本_E131系_500番台.png'],
    ['Echigo','120M','Local','E129系','JR東日本_E129系.png'],
    ['Echigo','1620M','Local','E129系','JR東日本_E129系.png']
  ];
  for(const [line,num,type,model,asset] of cases){
    const props={trainNumber:num,positionLineId:line,displayLineId:line,
      trainId:'odpt.Train:JR-East.'+line+'.'+num,
      sourceRailway:'odpt.Railway:JR-East.'+line,trainOperator:'JR-East',
      trainType:'odpt.TrainType:JR-East.'+type,serviceDate:'2026-11-04'};
    for(const source of ['realtime-api','supabase-train-run','train-timetable']){
      const p=live({...props,positionSource:source,estimated:source!=='realtime-api'});
      const found=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.ok(found,line+'/'+num+'/'+source);
      assert.equal(found.trainNumber,num,'do not convert published number to operation number');
      assert.equal(found.model,model);
      assert.equal(found.representative,true);
      assert.ok(found.pngPath.endsWith('/'+asset));
      const svg=marker(p,line);
      assert.equal(svg.kind,'vehicle');
      assert.equal(svg.iconSrc,found.pngPath);
      assert.equal(svg.planned,true);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
      assert.equal(p.vehiclePlan,undefined);
    }
  }
});
test('JR East number PNGs reject unlisted extras, wrong train type/source/operator/date and conflicting evidence',()=>{
  const senseki={trainNumber:'521S',positionLineId:'Senseki',
    sourceRailway:'odpt.Railway:JR-East.Senseki',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-04'};
  const bad=[
    {trainNumber:'521D'}, {trainNumber:'5521S'}, {trainNumber:'9524D'},
    {trainNumber:'5521D',trainType:'odpt.TrainType:JR-East.Local'},
    {positionLineId:'Sagami'}, {displayLineId:'Sagami'},
    {sourceRailway:'odpt.Railway:JR-East.SensekiTohoku'},
    {trainOperator:'TokyoMetro'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {serviceDate:'2026-10-31'}, {serviceDate:'2026-12-01'},
    {realtimeVehicleType:'HB-E210系'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['HB-E210系']}}
  ];
  for(const change of bad){
    const p=live({...senseki,...change});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'not a verified Senseki E131 source: '+JSON.stringify(change));
  }
  const sagami=live({trainNumber:'9091F',positionLineId:'Sagami',
    sourceRailway:'odpt.Railway:JR-East.Sagami',trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',serviceDate:'2026-11-07'});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(sagami),null,
    'holiday 9xxx altered-number train needs its own dated evidence');
  const echigo=live({trainNumber:'8132M',positionLineId:'Echigo',
    sourceRailway:'odpt.Railway:JR-East.Echigo',trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',serviceDate:'2026-11-04'});
  const echigoOut=live({...echigo,trainNumber:'8637M'});
  for(const train of [echigo,echigoOut]){
    const mapped=root.TrainVehicle.lookupTrainNumberRangePng(train);
    assert.ok(mapped,'JR official 2611 November 4th 8xxx train should resolve');
    assert.equal(mapped.model,'E129系');
    assert.ok(mapped.pngPath.endsWith('/JR東日本_E129系.png'));
    assert.equal(mapped.representative,true);
    assert.equal(marker(train,'Echigo').planned,true);
  }
  for(const date of ['2026-11-01','2026-11-07','2026-11-23','2026-12-01']){
    for(const number of ['8132M','8637M']){
      const pos=live({...echigo,trainNumber:number,serviceDate:date});
      assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(pos),null,
        number+' does not operate in official 2611 timetable on '+date);
    }
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(
    live({...echigo,trainNumber:'9630M'})),null,
    'Yahiko Chrysanthemum special number requires dedicated train evidence');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(
    live({...echigo,trainNumber:'9524D',positionLineId:'Senseki',
      sourceRailway:'odpt.Railway:JR-East.Senseki'})),null,
    'Daté SATONO 9524D does not run in November; it is HB-E300, not E131/HB-E210');
  assert.equal(root.TrainNumberPngRanges.match('521S','JobanLocal'),null);
  assert.equal(root.TrainNumberPngRanges.match('475F','Nambu'),null);
});
test('Chuo-Sobu subway number crosswalk resolves exact Y/A source trains without confusing Metro S and JR K',()=>{
  const cases=[
    ['485Y','Westbound','weekday','東京メトロ15000系','東京メトロ_15000系.png'],
    ['711A','Westbound','weekday','E231系800番台（東西線直通）','JR東日本_E231系_800番台.png'],
    ['640Y','Eastbound','weekday','東京メトロ15000系','東京メトロ_15000系.png'],
    ['604Y','Eastbound','weekday','E231系800番台（東西線直通）','JR東日本_E231系_800番台.png'],
    ['1023Y','Westbound','holiday','東京メトロ15000系','東京メトロ_15000系.png'],
    ['1003Y','Westbound','holiday','E231系800番台（東西線直通）','JR東日本_E231系_800番台.png']
  ];
  for(const [num,direction,calendar,model,asset] of cases){
    const p=sql({trainNumber:num,positionLineId:'ChuoSobuLocal',
      sourceRailway:'odpt.Railway:JR-East.ChuoSobuLocal',
      trainType:'odpt.TrainType:JR-East.Local',trainOperator:'JR-East',
      railDirection:direction,serviceDate:'2026-11-04',calendarType:calendar,
      serviceId:calendar==='weekday'?'odpt.Calendar:Weekday':'odpt.Calendar:SaturdayHoliday'});
    const chosen=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(chosen,num+' / '+direction+' / '+calendar);
    assert.equal(chosen.trainNumber,num,'public JR segment number must not be rewritten');
    assert.equal(chosen.model,model);
    assert.ok(chosen.pngPath.endsWith('/'+asset));
    assert.equal(chosen.representative,true);
    const svg=marker(p,'ChuoSobuLocal');
    assert.equal(svg.kind,'vehicle');
    assert.equal(svg.iconSrc,chosen.pngPath);
    assert.equal(svg.planned,true);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
});
test('Tozai A/B-prefixed complete K/S/T numbers and rapid R keep actual number and source scope',()=>{
  for(const [num,model,asset] of [
    ['B485S','東京メトロ15000系','東京メトロ_15000系.png'],
    ['B711KR','E231系800番台（東西線直通）','JR東日本_E231系_800番台.png'],
    ['A1758T','東葉高速2000系','東葉高速鉄道_2000系.png']
  ]){
    const p=live({trainNumber:num,positionLineId:'Tozai',serviceDate:'2026-11-04',
      sourceRailway:'odpt.Railway:TokyoMetro.Tozai',trainOperator:'TokyoMetro',
      trainType:'odpt.TrainType:TokyoMetro.Rapid'});
    const chosen=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(chosen,num);
    assert.equal(chosen.trainNumber,num);
    assert.equal(chosen.model,model);
    assert.ok(chosen.pngPath.endsWith('/'+asset));
    assert.equal(marker(p,'Tozai').iconSrc,chosen.pngPath);
  }
});
test('Tozai through representative PNG rejects wrong JR segment numbers, direction, calendar, source, stock and dates',()=>{
  const base={trainNumber:'485Y',positionLineId:'ChuoSobuLocal',
    sourceRailway:'odpt.Railway:JR-East.ChuoSobuLocal',
    railDirection:'Westbound',calendarType:'weekday',serviceDate:'2026-11-04',
    trainType:'odpt.TrainType:JR-East.Local',trainOperator:'JR-East'};
  for(const change of [
    {trainNumber:'485B'},{trainNumber:'485S'},{trainNumber:'711B'},
    {railDirection:'Eastbound'},{railDirection:''},{calendarType:'holiday'},
    {positionLineId:'ChuoRapid'},{sourceRailway:'odpt.Railway:TokyoMetro.Tozai'},
    {trainOperator:'TokyoMetro'},{trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {serviceDate:'2026-12-01'},{serviceDate:'2026-10-31'},
    {realtimeVehicleType:'東京メトロ07系'},
    {vehiclePlan:{status:'PLANNED_MODEL',confirmed:true,models:['E231系800番台']}}
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({...base,...change})),null,
      'conflicting/non-verified route '+JSON.stringify(change));
  }
  assert.equal(root.TrainNumberPngRanges.match('A1758T','ChuoSobuLocal'),null,
    'Toyo Rapid 2000 must not be inferred onto the JR local line');
  assert.equal(root.TrainNumberPngRanges.match('B485S','ChuoSobuLocal'),null);
  assert.equal(root.TrainNumberPngRanges.match('485Y','JobanLocal'),null);
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
  for(const number of ['427M','2153M','3107M','5003M','1M']){
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

test('2026-11 ChuoMain published M numbers map to representative PNGs without operating-number conversion',()=>{
  const cases=[
    ['640M','odpt.TrainType:JR-East.ChuoSpecialRapid','E233系0番台','E233系_0番台'],
    ['321M','odpt.TrainType:JR-East.Local','211系（長野地区）','211系_長野色'],
    ['2152M','odpt.TrainType:JR-East.Local','E233系0番台','E233系_0番台']
  ];
  for(const [trainNumber,trainType,model,asset] of cases){
    for(const source of ['realtime-api','supabase-train-run','train-timetable']){
      const p=live({trainNumber,trainType,positionSource:source,
        trainId:'odpt.Train:JR-East.Chuo.'+trainNumber});
      assert.equal(p.trainNumber,trainNumber,'the source switch must not rewrite the public number');
      const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.ok(mapped,trainNumber+' / '+source);
      assert.equal(mapped.trainNumber,trainNumber);
      assert.equal(mapped.model,model);
      assert.equal(mapped.source,'train-number-range');
      assert.equal(mapped.representative,true);
      assert.ok(mapped.pngPath.includes(asset));
      const spec=marker(p,'ChuoMain');
      assert.equal(spec.kind,'vehicle');
      assert.equal(spec.planned,true);
      assert.equal(spec.iconSrc,mapped.pngPath);
      assert.equal(p.vehiclePlan,undefined);
    }
  }
});
test('Chuo Main -> Chuo Rapid published T/H aliases share gallery model but retain their segment numbers',()=>{
  const common={serviceDate:'2026-11-04',trainOperator:'JR-East'};
  const before=root.TrainNumberPngRanges.match('640M','ChuoMain',{
    ...common,sourceRailway:'odpt.Railway:JR-East.Chuo',
    trainType:'odpt.TrainType:JR-East.Local'});
  const after=root.TrainNumberPngRanges.match('640T','ChuoRapid',{
    ...common,sourceRailway:'odpt.Railway:JR-East.ChuoRapid',
    trainType:'odpt.TrainType:JR-East.ChuoSpecialRapid'});
  assert.ok(before);
  assert.ok(after);
  assert.equal(before.trainNumber,'640M');
  assert.equal(after.trainNumber,'640T');
  assert.equal(before.model,after.model);
  assert.equal(before.pngPath,after.pngPath);
});
test('ChuoMain local M families stay source, month, model and train-number scoped',()=>{
  const base={positionLineId:'ChuoMain',
    sourceRailway:'odpt.Railway:JR-East.Chuo',
    trainOperator:'JR-East',serviceDate:'2026-11-04',
    trainType:'odpt.TrainType:JR-East.Local'};
  const good=(trainNumber,extra={})=>root.TrainNumberPngRanges.match(
    trainNumber,'ChuoMain',{...base,...extra});
  assert.equal(good('321M').model,'211系（長野地区）');
  assert.equal(good('640M').model,'E233系0番台');
  for(const n of ['366M','368M','639M','641M','640T','321T','garbage']){
    assert.equal(good(n),null,'unpublished or non-M number '+n);
  }
  assert.equal(good('321M',{trainType:'odpt.TrainType:JR-East.LimitedExpress'}),null);
  assert.equal(good('321M',{sourceRailway:'odpt.Railway:JR-East.Joban'}),null);
  assert.equal(good('640M',{trainOperator:'JR-Central'}),null);
  assert.equal(good('640M',{serviceDate:'2026-12-01'}),null);
  assert.equal(good('321M',{serviceDate:'2026-10-31'}),null);
  assert.equal(good('321M',{realtimeVehicleType:'E131系200番台（長野地区）'}),null);
  assert.equal(good('321M',{vehiclePlan:{
    status:'PLANNED_CANDIDATES',models:['211系（長野地区）','E131系200番台']
  }}),null);
  assert.equal(root.TrainNumberPngRanges.match('321M','ChuoRapid',base),null);
  assert.equal(root.TrainNumberPngRanges.match('640M','Joban',base),null);
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

test('2026-11-03 Itsukaichi 2149 uses full public number -> E233-0 marker PNG',()=>{
  const p=live({
    trainNumber:'2149',
    trainId:'planned-trip:2026-11-03|JR-East|odpt.Railway:JR-East.Itsukaichi|Itsukaichi|2149',
    positionLineId:'Itsukaichi',
    sourceRailway:'odpt.Railway:JR-East.Itsukaichi',
    railDirection:'odpt.RailDirection:Outbound',
    trainType:'odpt.TrainType:JR-East.Local'
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null);
  const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.ok(mapped);
  assert.equal(mapped.trainNumber,'2149');
  assert.equal(mapped.lineId,'Itsukaichi');
  assert.equal(mapped.model,'E233系0番台');
  assert.equal(mapped.representative,true);
  assert.match(mapped.pngPath,/JR東日本_E233系_0番台\.png$/);
  const spec=marker(p,'Itsukaichi');
  assert.equal(spec.kind,'vehicle');
  assert.equal(spec.planned,true);
  assert.equal(spec.compact,false);
  assert.equal(spec.iconSrc,mapped.pngPath);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
});
test('Itsukaichi 2149 SQL planned-trip and other confirmed plain numbers share the same PNG',()=>{
  for(const trainNumber of ['2148','2149','2249']){
    const p=sql({
      trainNumber,
      trainId:'planned-trip:2026-11-03|JR-East|Itsukaichi|'+trainNumber,
      positionLineId:'Itsukaichi',
      sourceRailway:'odpt.Railway:JR-East.Itsukaichi',
      trainType:'odpt.TrainType:JR-East.Local'
    });
    const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(mapped,trainNumber);
    assert.equal(mapped.model,'E233系0番台');
    assert.equal(marker(p,'Itsukaichi').iconSrc,mapped.pngPath);
  }
});
test('Itsukaichi keeps T/H commuter number range and excludes specials or unrelated railways',()=>{
  for(const n of ['434T','813H','1926H']){
    const p=live({
      trainNumber:n,positionLineId:'Itsukaichi',
      trainType:'odpt.TrainType:JR-East.Local'
    });
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p).model,'E233系0番台');
  }
  for(const n of ['7741','9270M','9351M','399','2500','2600T','2149M']){
    const p=live({
      trainNumber:n,positionLineId:'Itsukaichi',
      trainType:'odpt.TrainType:JR-East.Local'
    });
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,n);
  }
  assert.equal(root.TrainNumberPngRanges.match('2149','ChuoRapid'),null);
  assert.equal(root.TrainNumberPngRanges.match('2149','SaikyoKawagoe'),null);
  assert.equal(root.TrainNumberPngRanges.match('2149','Ome').model,'E233系0番台');
  assert.equal(root.TrainNumberPngRanges.match('1932T','ChuoRapid').model,'E233系0番台');
  assert.equal(root.TrainNumberPngRanges.match('277M','SaikyoKawagoe').model,'E233系7000番台');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({
    trainNumber:'2149',positionLineId:'Itsukaichi',
    trainType:'odpt.TrainType:JR-East.LimitedExpress'})),null);
});

test('2026 Yokohama 2221K matches full JR train number -> E233-6000 SVG PNG',()=>{
  const p=live({
    trainNumber:'2221K',
    trainId:'planned-trip:2026-11-03|JR-East|odpt.Railway:JR-East.Yokohama|Yokohama|2221K',
    positionLineId:'Yokohama',
    sourceRailway:'odpt.Railway:JR-East.Yokohama',
    railDirection:'odpt.RailDirection:Outbound',
    trainType:'odpt.TrainType:JR-East.Local'
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null);
  const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.ok(mapped,'2221K must resolve by full train NUMBER on Yokohama');
  assert.equal(mapped.trainNumber,'2221K');
  assert.equal(mapped.model,'E233系6000番台');
  assert.equal(mapped.representative,true);
  assert.equal(mapped.pngPath,'../images/列车/JR東日本/JR東日本_E233系_6000番台.png');
  const spec=marker(p,'Yokohama');
  assert.equal(spec.kind,'vehicle');
  assert.equal(spec.planned,true);
  assert.equal(spec.compact,false);
  assert.equal(spec.iconSrc,mapped.pngPath);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN','display default must not imply real formation');
});
test('Yokohama weekday/holiday and rapid K numbers use the same scoped full-number rule',()=>{
  for(const [number,trainType] of [
    ['415K','Local'],['2221K','Local'],['2419K','Local'],
    ['3937K','Rapid'],['4013K','Rapid'],['4747K','Rapid']
  ]){
    const p=live({trainNumber:number,
      positionLineId:'Yokohama',sourceRailway:'odpt.Railway:JR-East.Yokohama',
      trainType:'odpt.TrainType:JR-East.'+trainType});
    const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(mapped,number+' is a Yokohama full-number train');
    assert.equal(mapped.model,'E233系6000番台');
    assert.match(marker(p,'Yokohama').iconSrc,/JR東日本_E233系_6000番台\.png$/);
  }
});
test('SQL Yokohama 2221K uses E233-6000 as display-only image',()=>{
  const p=sql({trainNumber:'2221K',
    trainId:'planned-trip:2026-11-03|JR-East|Yokohama|2221K',
    positionLineId:'Yokohama',
    sourceRailway:'odpt.Railway:JR-East.Yokohama',
    trainType:'odpt.TrainType:JR-East.Local'});
  const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.ok(mapped);
  assert.equal(mapped.source,'train-number-range');
  assert.equal(marker(p,'Yokohama').iconSrc,mapped.pngPath);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
});
test('K suffix is line-scoped: Saikyo tail, Yokohama full and Negishi no blind reassignment',()=>{
  const holidayYokohama = {serviceDate:'2026-11-03',calendarType:'holiday',
    sourceRailway:'odpt.Railway:JR-East.Yokohama'};
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe').model,'E233系7000番台');
  assert.equal(root.TrainNumberPngRanges.match('1940K','Yokohama',holidayYokohama).model,'E233系6000番台');
  assert.equal(root.TrainNumberPngRanges.match('2221K','Yokohama',holidayYokohama).model,'E233系6000番台');
  assert.equal(root.TrainNumberPngRanges.match('2221K','SaikyoKawagoe').model,
    'E233系7000番台','the Saikyo tail interpretation is unchanged');
  assert.equal(root.TrainNumberPngRanges.match('2221K','Rinkai').model,
    'E233系7000番台','the Rinkai tail rule is unchanged');
  for(const line of ['KeihinTohoku','KeihinTohokuNegishi','ChuoRapid']){
    assert.equal(root.TrainNumberPngRanges.match('2221K',line),null,
      'scoped K train number must not reassign vehicles to '+line);
  }
  for(const n of ['399K','5000K','2221T','2221M','2221S','2149']){
    assert.equal(root.TrainNumberPngRanges.match(n,'Yokohama'),null,
      'invalid Yokohama number '+n+' must not map to the fleet');
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({
    trainNumber:'2221K',positionLineId:'Yokohama',
    displayLineId:'KeihinTohoku',
    sourceRailway:'odpt.Railway:JR-East.Yokohama'
  })),null,'do not attach Yokohama artwork across a display-line boundary');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({
    trainNumber:'2221K',positionLineId:'Yokohama',
    trainType:'odpt.TrainType:JR-East.LimitedExpress'
  })),null,'commuter K number should not overwrite a LimitedExpress record');
});

test('Tsurumi holiday train 2200 renders a planned E131-1000 PNG',()=>{
  const p=sql({
    trainNumber:'2200',
    trainId:'planned-trip:2026-11-03|JR-East|Tsurumi|2200',
    sourceRailway:'odpt.Railway:JR-East.Tsurumi',
    positionLineId:'Tsurumi',
    trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',
    positionSource:'train-timetable',
    calendarType:'holiday',
    serviceDate:'2026-11-03',
    vehiclePlan:{
      lineId:'Tsurumi',
      status:'FLEET_REFERENCE',
      models:['E131系1000番台'],
      evidenceRole:'route-fleet-reference'
    }
  });
  const png='../images/列车/JR東日本/JR東日本_E131系_1000番台.png';
  const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.ok(mapped,'2200 must have a scoped planned-image reference');
  assert.equal(mapped.model,'E131系1000番台');
  assert.equal(mapped.pngPath,png);
  const spec=marker(p,'Tsurumi');
  assert.equal(spec.kind,'vehicle');
  assert.equal(spec.planned,true);
  assert.equal(spec.compact,false);
  assert.equal(spec.iconSrc,png);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN','a planned image is not a physical carset');
  assert.equal(p.vehicleResolvedUpstream,false);
  assert.equal(marker(p,'Yokohama').kind,'unresolved','never borrow this image on another line');
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...p,displayLineId:'Tsurumi'},true).kind,
    'unresolved','PNG loading failure must keep the neutral location dot');

  for(const change of [
    {serviceDate:'2023-11-03'},
    {serviceDate:''},
    {trainOperator:'JR-Central'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {trainNumber:'2200B'},
    {trainNumber:'9999'}
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...p,...change}),null,
      'do not falsely map '+JSON.stringify(change));
  }
});

test('1252M Joban canonical / realtime has E531 planned PNG with strict evidence bounds',()=>{
  const planned='../images/列车/JR東日本/JR東日本_E531系.png';
  const position=sql({
    trainId:'canonical-sql-trip:2026-11-03:50188',
    trainNumber:'1252M',
    serviceDate:'2026-11-03',
    calendarType:'holiday',
    positionLineId:'JobanMain',
    sourceRailway:'odpt.Railway:JR-East.Joban',
    trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',
    vehiclePlan:{status:'PLANNED_CANDIDATES',lineId:'JobanMain',
      models:['E531系'],confirmed:false,evidenceRole:'source-single-type-candidate'}
  });
  const sqlArt=marker(position,'JobanMain');
  assert.equal(sqlArt.kind,'vehicle');
  assert.equal(sqlArt.iconSrc,planned);
  assert.equal(sqlArt.planned,true);
  assert.equal(sqlArt.compact,false);
  assert.equal(position.vehicleIdentityStatus,'UNKNOWN',
    'the SQL candidate is not observed physical stock');
  assert.equal(position.vehicleResolvedUpstream,false);

  const realtime=live({
    trainId:'canonical-sql-trip:2026-11-03:50188',
    trainNumber:'1252M',
    serviceDate:'2026-11-03',
    calendarType:'holiday',
    positionLineId:'Joban',
    sourceRailway:'odpt.Railway:JR-East.JobanRapid',
    trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Rapid'
  });
  const icon=marker(realtime,'Joban');
  assert.equal(icon.kind,'vehicle');
  assert.equal(icon.planned,true);
  assert.equal(icon.iconSrc,planned);
  assert.equal(realtime.vehicleIdentityStatus,'UNKNOWN');
  assert.equal(marker(realtime,'JobanMain').kind,'unresolved',
    'a Joban realtime location must not draw on an unverified display line');
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...realtime,displayLineId:'Joban'},true).kind,
    'unresolved','a failed reference PNG keeps the neutral realtime position dot');
  for(const invalid of [
    {serviceDate:'2026-12-01'},
    {serviceDate:'2026-10-31'},
    {serviceDate:''},
    {calendarType:'weekday'},
    {trainOperator:'Tobu'},
    {sourceRailway:'odpt.Railway:JR-East.JobanLocal'},
    {sourceRailway:'odpt.Railway:TokyoMetro.Joban'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {trainNumber:'1252H'},
    {trainNumber:'1253M'},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',models:['E231系0番台']}}
  ]){
    const altered={...realtime,...invalid};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(altered),null,
      'invalid canonical E531 reference '+JSON.stringify(invalid));
  }

  const migration=fs.readFileSync(
    'supabase/migrations/20261103223500_backfill_joban_main_to_rapid_canonical_vehicle_candidates.sql','utf8');
  assert.match(migration,/a\.line_key = 'JobanMain'/);
  assert.match(migration,/b\.line_key = 'Joban'/);
  assert.match(migration,/source_single_type_candidate/);
  assert.match(migration,/actual_vehicle_confirmed/);
  assert.match(migration,/ON CONFLICT \(timetable_id\) DO NOTHING/);
});

test('1257M verified Joban canonical model candidate renders a PLANNED E531 PNG',()=>{
  const icon='../images/列车/JR東日本/JR東日本_E531系.png';
  const trip='canonical-sql-trip:2026-11-03:174919';
  const p=sql({
    trainNumber:'1257M',trainId:trip,runningChainId:trip,
    canonicalTimetableId:174919,canonicalGroupEvidence:'verified_continuation',
    canonicalLineIds:['Joban','JobanMain'],
    plannedVehicleCandidateStatus:'source_single_type_candidate',
    plannedVehicleCandidates:['E531系'],
    sourceRailway:'odpt.Railway:JR-East.Joban',
    positionLineId:'JobanMain',
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-03',calendarType:'holiday'
  });
  const source=root.TrainVehicle.lookupVerifiedJobanCanonicalE531Png(p);
  assert.equal(source.model,'E531系');
  assert.equal(source.pngPath,icon);
  assert.equal(source.planned,true);
  assert.equal(marker(p,'JobanMain').iconSrc,icon);
  assert.equal(marker(p,'JobanMain').planned,true);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');

  const liveTrain=live({
    trainId:trip,trainNumber:'1257M',runningChainId:trip,
    canonicalTimetableId:'174919',
    runningChainEvidence:'VERIFIED_SQL_CANONICAL_REALTIME_STATION',
    canonicalPlannedVehicleReference:{
      source:'verified-canonical-sql-source-candidate',
      model:'E531系',canonicalTimetableId:'174919',
      serviceDate:'2026-11-03',trainNumber:'1257M',confirmed:false
    },
    sourceRailway:'odpt.Railway:JR-East.JobanRapid',
    positionLineId:'Joban',trainType:'odpt.TrainType:JR-East.Rapid',
    trainOperator:'JR-East',serviceDate:'2026-11-03',calendarType:'holiday'
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(liveTrain),null,
    'a bare 1257M suffix alone is not an E531 model rule');
  assert.equal(root.TrainVehicle.lookupVerifiedJobanCanonicalE531Png(liveTrain).pngPath,icon);
  assert.equal(marker(liveTrain,'Joban').iconSrc,icon);
  assert.equal(marker(liveTrain,'Joban').planned,true);
  assert.equal(marker(liveTrain,'JobanMain').kind,'unresolved');
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...liveTrain,displayLineId:'Joban'},true).kind,'unresolved',
    'failed PNG keeps neutral ODPT location');
  assert.equal(liveTrain.vehicleIdentityStatus,'UNKNOWN',
    'source candidate must not become physical stock');
  assert.equal(liveTrain.vehicleResolvedUpstream,false);

  for(const invalid of [
    {trainNumber:'1258M'},
    {runningChainId:''},
    {canonicalTimetableId:'174918'},
    {runningChainEvidence:'TIMETABLE_SEGMENT'},
    {serviceDate:'2027-04-01'},
    {serviceDate:''},
    {calendarType:''},
    {trainOperator:'TokyoMetro'},
    {positionLineId:'JobanLocal'},
    {sourceRailway:'odpt.Railway:TokyoMetro.JobanRapid'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {realtimeVehicleType:'E231系0番台'},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',models:['E231系0番台']}},
    {canonicalPlannedVehicleReference:null}
  ]){
    assert.equal(root.TrainVehicle.lookupVerifiedJobanCanonicalE531Png(
      {...liveTrain,...invalid}),null,
      'unverified E531 model candidate '+JSON.stringify(invalid));
  }
  for(const invalid of [
    {canonicalGroupEvidence:'source_only'},
    {plannedVehicleCandidateStatus:'official_model_family_plan'},
    {plannedVehicleCandidates:['E531系','E231系0番台']},
    {canonicalLineIds:['Joban']},
    {canonicalTimetableId:null}
  ]){
    assert.equal(root.TrainVehicle.lookupVerifiedJobanCanonicalE531Png(
      {...p,...invalid}),null,
      'SQL source E531 requires unambiguous verified continuation '+JSON.stringify(invalid));
  }
});

test('train-map page loads the current number PNG rules instead of stale cached v7',()=>{
  const page=fs.readFileSync('pages/trains.html','utf8');
  const rules=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const expected=rules.match(/version:"([^"]+)",match:match/);
  assert.ok(expected,'train-number rule module exposes a version');
  const script=page.match(/<script src="\.\.\/data\/timetables\/train-number-png-ranges\.js\?v=([^"]+)"\/?>/);
  assert.ok(script,'the train SVG page must load its number-to-PNG rules');
  assert.equal(script[1],expected[1],
    'change the page asset query whenever the train-number rule module changes');
  const garageAt=page.indexOf('vehicle-garage-png-map.js');
  const rulesAt=page.indexOf('train-number-png-ranges.js');
  const vehicleAt=page.indexOf('js/train-vehicle.js');
  const rendererAt=page.indexOf('js/trains-render.js');
  assert.ok(garageAt>=0 && garageAt<rulesAt && rulesAt<vehicleAt &&
    vehicleAt<rendererAt,'gallery, rules, selector and SVG renderer load in order');
});

test('Joban 2026-11 E231 H / E657 Hitachi-Tokiwa M official-number artwork',()=>{
  const e231='../images/列车/JR東日本/JR東日本_E231系_0番台_常磐快速線.png';
  const e657='../images/列车/JR東日本/JR東日本_E657系.png';
  const rapid=(number,overrides={})=>live({
    trainNumber:number,
    positionLineId:'Joban',sourceRailway:'odpt.Railway:JR-East.JobanRapid',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Rapid',
    serviceDate:'2026-11-03',calendarType:'holiday',...overrides
  });
  const express=(number,overrides={})=>live({
    trainNumber:number,
    positionLineId:'Joban',sourceRailway:'odpt.Railway:JR-East.JobanRapid',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.LimitedExpress',
    serviceDate:'2026-11-03',calendarType:'holiday',...overrides
  });
  assert.equal(root.JobanE231RapidNumberIndex.weekdayCount,154);
  assert.equal(root.JobanE231RapidNumberIndex.holidayCount,153);
  for(const n of ['430H','1030H','2491H']){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(rapid(n)).pngPath,e231);
    const rendered=marker(rapid(n),'Joban');
    assert.equal(rendered.kind,'vehicle');
    assert.equal(rendered.planned,true);
    assert.equal(rendered.iconSrc,e231);
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(
    rapid('2495H',{calendarType:'weekday'})).pngPath,e231);
  for(const n of ['1M','30M','51M','86M']){
    const p=express(n);
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p).pngPath,e657);
    assert.equal(marker(p,'Joban').iconSrc,e657);
    assert.equal(marker(p,'Joban').planned,true);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN',
      'published numbers never identify a particular carset');
    const main=express(n,{
      positionLineId:'JobanMain',sourceRailway:'odpt.Railway:JR-East.Joban'
    });
    assert.equal(marker(main,'JobanMain').iconSrc,e657);
  }
  for(const p of [
    rapid('1030H',{calendarType:'weekday'}),
    rapid('2495H',{calendarType:'holiday'}),
    rapid('999H'),rapid('1257M'),
    rapid('430H',{serviceDate:'2026-12-01'}),
    rapid('430H',{serviceDate:''}),
    rapid('430H',{calendarType:''}),
    rapid('430H',{positionLineId:'JobanMain'}),
    rapid('430H',{sourceRailway:'odpt.Railway:JR-East.JobanLocal'}),
    rapid('430H',{trainOperator:'TokyoMetro'}),
    rapid('430H',{trainType:'odpt.TrainType:JR-East.LimitedExpress'}),
    rapid('430H',{realtimeVehicleType:'E531系'}),
    rapid('430H',{vehiclePlan:{status:'PLANNED_MODEL',models:['E531系']}}),
    express('31M'),express('50M'),express('87M'),express('430H'),
    express('1M',{trainType:'odpt.TrainType:JR-East.Local'}),
    express('1M',{positionLineId:'JobanLocal'}),
    express('1M',{sourceRailway:'odpt.Railway:JR-East.JobanLocal'}),
    express('1M',{serviceDate:'2027-01-01'}),
    express('1M',{realtimeVehicleType:'E653系'}),
    express('1M',{vehiclePlan:{status:'PLANNED_MODEL',models:['E531系']}})
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'invalid service must not receive E231/E657 PNG: '+JSON.stringify(p));
  }
  const p=rapid('1030H');
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...p,displayLineId:'Joban'},true).kind,
    'unresolved','failed E231 PNG keeps the neutral location dot');
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...express('1M'),
    displayLineId:'Joban'},true).kind,'unresolved');
  const html=fs.readFileSync('pages/trains.html','utf8');
  const index=fs.readFileSync('data/timetables/joban-e231-h-202611-index.js','utf8');
  const indexVersion=index.match(/version:"([^"]+)"/);
  assert.ok(indexVersion,'snapshot must expose cache version');
  assert.ok(html.includes('joban-e231-h-202611-index.js?v='+indexVersion[1]));
  assert.ok(html.indexOf('joban-e231-h-202611-index.js') <
    html.indexOf('train-number-png-ranges.js'),
    'H set must load before the PNG selector');
});

test('Nambu 2319F official holiday train renders representative E233 PNG',()=>{
  const image='../images/列车/JR東日本/JR東日本_E233系_8000番台.png';
  const trainId='planned-trip:2026-11-03|JR-East|odpt.Railway%3AJR-East.Nambu|Nambu|2319F';
  const position=live({
    trainId,
    trainNumber:'2319F',positionLineId:'Nambu',
    sourceRailway:'odpt.Railway:JR-East.Nambu',trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-03',calendarType:'holiday',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  });
  const reference=root.TrainVehicle.lookupTrainNumberRangePng(position);
  assert.equal(reference.model,'E233系8000番台');
  assert.equal(reference.pngPath,image);
  assert.equal(reference.planned,true);
  const visual=marker(position,'Nambu');
  assert.equal(visual.kind,'vehicle');
  assert.equal(visual.iconSrc,image);
  assert.equal(visual.planned,true);
  assert.equal(visual.compact,false);
  assert.equal(position.vehicleIdentityStatus,'UNKNOWN',
    'an E233-8000 reference does not exclude E233-8500 actual workings');
  assert.equal(position.vehicleResolvedUpstream,false);
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...position,displayLineId:'Nambu'},true).kind,'unresolved',
    'a failed PNG must retain the neutral ODPT position marker');
  const rapid={...position,trainNumber:'4027F',
    trainType:'odpt.TrainType:JR-East.Rapid'};
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(rapid).pngPath,image);
  const planned=sql({
    trainId,trainNumber:'2319F',positionLineId:'Nambu',
    sourceRailway:'odpt.Railway:JR-East.Nambu',trainOperator:'',
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-03',calendarType:'holiday'
  });
  assert.equal(marker(planned,'Nambu').iconSrc,image,
    'a SQL position can use its exact JR East railway scope when operator is omitted');
  for(const changes of [
    {trainNumber:'2319M'},
    {trainNumber:'331F'},
    {trainNumber:'5000F'},
    {positionLineId:'NambuBranch'},
    {displayLineId:'Yokohama'},
    {sourceRailway:'odpt.Railway:JR-East.NambuBranch'},
    {sourceRailway:'odpt.Railway:JR-East.NambuHamakawasaki'},
    {sourceRailway:'odpt.Railway:TokyoMetro.Nambu'},
    {sourceRailway:''},
    {trainOperator:'JR-Central'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {trainType:''},
    {serviceDate:'2026-10-31'},
    {serviceDate:'2026-12-01'},
    {serviceDate:''},
    {realtimeVehicleType:'E127系'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E233系8500番台']}}
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(
      {...position,...changes}),null,
      'invalid Nambu representative artwork '+JSON.stringify(changes));
  }
});


test('JR East 2611 Keihin-Tohoku official index matches all four source calendars/directions',()=>{
  const index=root.JREastKeihin202611NumberIndex;
  assert.ok(index);
  const expected={
    'Weekday|Northbound':343,'Weekday|Southbound':343,
    'SaturdayHoliday|Northbound':287,'SaturdayHoliday|Southbound':290
  };
  assert.equal(index.version,'2026-11');
  let count=0;
  for(const [key,number] of Object.entries(expected)){
    const names=index.lists[key];
    assert.equal(names.length,number,key);
    assert.equal(new Set(names).size,number,key+' duplicates');
    count+=names.length;
  }
  assert.equal(count,1263);
  assert.equal(index.contains('411B',{calendarType:'weekday',railDirection:'Southbound'}),true);
  assert.equal(index.contains('411B',{calendarType:'weekday',railDirection:'Northbound'}),false);
  assert.equal(index.contains('818A',{calendarType:'weekday',railDirection:'Northbound'}),true);
  assert.equal(index.contains('818A',{calendarType:'holiday',railDirection:'Northbound'}),false);
  assert.equal(index.contains('2431B',{calendarType:'holiday',railDirection:'Southbound'}),true);
  assert.equal(index.contains('2431B',{calendarType:'weekday',railDirection:'Southbound'}),false);
  assert.equal(index.contains('4009K',{calendarType:'weekday',railDirection:'Northbound'}),true);
  assert.equal(index.contains('4009K',{calendarType:'holiday',railDirection:'Northbound'}),false);
  for(const n of ['411K','399B','2500B','841C','0B']){
    assert.equal(index.contains(n,{}),false,'no arbitrary-range number '+n);
  }
});
test('Keihin-Tohoku E233-1000 official membership is day-type and direction aware',()=>{
  const base=live({positionLineId:'KeihinTohoku',
    trainType:'odpt.TrainType:JR-East.Local',
    sourceRailway:'odpt.Railway:JR-East.KeihinTohokuNegishi'});
  const mapped=(number,extra={})=>root.TrainVehicle.lookupTrainNumberRangePng(
    {...base,trainNumber:number,...extra});
  assert.equal(mapped('411B',{calendarType:'weekday',railDirection:'Southbound'}).model,'E233系1000番台');
  assert.equal(mapped('411B',{calendarType:'weekday',railDirection:'Northbound'}),null);
  assert.equal(mapped('818A',{calendarType:'holiday',railDirection:'Northbound'}),null);
  assert.equal(mapped('818A',{calendarType:'weekday',railDirection:'Northbound'}).model,'E233系1000番台');
  assert.equal(mapped('2431B',{calendarType:'holiday',railDirection:'Southbound'}).model,'E233系1000番台');
  assert.equal(mapped('2431B',{calendarType:'weekday',railDirection:'Southbound'}),null);
  // Yokohama K through services use E233-6000, not the ABC E233-1000.
  assert.equal(mapped('4009K',{calendarType:'weekday',railDirection:'Northbound'}).model,'E233系6000番台');
  assert.equal(mapped('4009K',{calendarType:'holiday',railDirection:'Northbound'}),null);
  assert.equal(mapped('4747K',{calendarType:'holiday',railDirection:'Northbound'}).model,'E233系6000番台');
  assert.equal(mapped('516K',{calendarType:'weekday',railDirection:'Southbound'}).model,'E233系6000番台');
  for(const source of ['realtime-api','supabase-train-run','train-timetable']){
    const p={...base,trainNumber:'4009K',calendarType:'weekday',
      railDirection:'odpt.RailDirection:Northbound',
      positionSource:source,estimated:source!=='realtime-api'};
    const mappedK=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(mappedK.model,'E233系6000番台');
    assert.ok(mappedK.pngPath.includes('E233系_6000番台'));
    assert.equal(marker(p,'KeihinTohoku').kind,'vehicle');
  }
});
test('Keihin-Tohoku 411B is a full published 2026-11 number on live, SQL and timetable map markers',()=>{
  const image='../images/列车/JR東日本/JR東日本_E233系_1000番台.png';
  for(const positionSource of ['realtime-api','supabase-train-run','train-timetable']){
    const p=live({trainNumber:'411B',
      trainId:'odpt.Train:JR-East.KeihinTohokuNegishi.411B',
      positionLineId:'KeihinTohoku',
      sourceRailway:'odpt.Railway:JR-East.KeihinTohokuNegishi',
      trainOperator:positionSource==='supabase-train-run'?'':'JR-East',
      trainType:'odpt.TrainType:JR-East.Local',positionSource,
      estimated:positionSource!=='realtime-api'});
    const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(mapped,'411B '+positionSource+' must use published full train number');
    assert.equal(mapped.trainNumber,'411B');
    assert.equal(mapped.lineId,'KeihinTohoku');
    assert.equal(mapped.model,'E233系1000番台');
    assert.equal(mapped.pngPath,image);
    assert.equal(mapped.representative,true);
    assert.equal(mapped.source,'train-number-range');
    const svg=marker(p,'KeihinTohoku');
    assert.equal(svg.kind,'vehicle');
    assert.equal(svg.planned,true);
    assert.equal(svg.compact,false);
    assert.equal(svg.iconSrc,image);
    assert.equal(p.trainNumber,'411B','public train number is never rewritten');
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    assert.equal(p.vehiclePlan,undefined);
  }
});
test('Keihin-Tohoku A/B/C numbered services stay distinct from Yokohama K through services',()=>{
  const line='KeihinTohoku';
  const base=live({positionLineId:line,
    sourceRailway:'odpt.Railway:JR-East.KeihinTohokuNegishi',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local'});
  for(const [n,calendarType,direction] of [
    ['401A','holiday','Southbound'],['411B','holiday','Southbound'],
    ['463C','holiday','Southbound'],['950B','holiday','Northbound'],
    ['818A','weekday','Northbound'],['2431B','holiday','Southbound']
  ]){
    const p={...base,trainNumber:n,calendarType,
      railDirection:'odpt.RailDirection:'+direction};
    const selected=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(selected,'published Keihin-Tohoku ABC service '+n);
    assert.equal(selected.model,'E233系1000番台');
  }
  const rapid={...base,trainNumber:'950B',
    trainType:'odpt.TrainType:JR-East.Rapid'};
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(rapid).model,
    'E233系1000番台','northbound rapid train still uses the same family');
  for(const change of [
    {trainNumber:'411K'},
    {trainNumber:'399B'}, {trainNumber:'2500B'},
    {trainNumber:'411M'}, {trainNumber:'411'},
    {positionLineId:'Yokohama'}, {positionLineId:'Yamanote'},
    {sourceRailway:'odpt.Railway:JR-East.Yokohama'},
    {sourceRailway:'odpt.Railway:JR-East.Nambu'},
    {sourceRailway:''}, {trainOperator:'JR-Central'},
    {serviceDate:'2026-10-31'}, {serviceDate:'2026-12-01'},
    {serviceDate:''}, {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {trainType:''}, {realtimeVehicleType:'E233系6000番台'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E233系6000番台']}}
  ]){
    const wrong={...base,trainNumber:'411B',...change};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(wrong),null,
      'do not borrow E233-1000 by unrelated context '+JSON.stringify(change));
  }
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...base,trainNumber:'411B',displayLineId:line},true).kind,
    'unresolved','failed PNG retains neutral position marker');
});
test('November Ito official Odoriko train numbers share exact PNG across realtime and schedule',()=>{
  const cases=[
    ['3001M','E261系','JR東日本_E261系_サフィール踊り子.png'],
    ['3002M','E261系','JR東日本_E261系_サフィール踊り子.png'],
    ['3021M','E257系2000番台','JR東日本_E257系_2000番台.png'],
    ['3022M','E257系2000番台','JR東日本_E257系_2000番台.png'],
    ['3024M','E257系2000番台','JR東日本_E257系_2000番台.png'],
    ['3025M','E257系2000番台','JR東日本_E257系_2000番台.png'],
    ['3026M','E257系2000番台','JR東日本_E257系_2000番台.png'],
    ['3029M','E257系2000番台','JR東日本_E257系_2000番台.png'],
    ['3030M','E257系2000番台','JR東日本_E257系_2000番台.png'],
    ['3031M','E257系2000番台','JR東日本_E257系_2000番台.png']
  ];
  for(const [number,model,file] of cases){
    for(const source of ['realtime-api','supabase-train-run','train-timetable']){
      const p=live({trainNumber:number,
        trainId:'odpt.Train:JR-East.Ito.'+number,
        sourceRailway:'odpt.Railway:JR-East.Ito',
        positionLineId:'Ito',
        trainOperator:source==='supabase-train-run'?'':'JR-East',
        trainType:'odpt.TrainType:JR-East.LimitedExpress',
        positionSource:source,estimated:source!=='realtime-api'});
      const matched=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.ok(matched,number+' / '+source);
      assert.equal(matched.trainNumber,number);
      assert.equal(matched.model,model);
      assert.ok(matched.pngPath.endsWith(file));
      assert.equal(matched.planned,true);
      const display=marker(p,'Ito');
      assert.equal(display.kind,'vehicle');
      assert.equal(display.planned,true);
      assert.equal(display.iconSrc,matched.pngPath);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN','number never certifies a trainset');
      assert.equal(p.vehiclePlan,undefined);
    }
  }
});
test('Ito local mixed fleet and Shuzenji/seasonal expresses cannot acquire an invented exact model',()=>{
  const p=live({
    trainNumber:'3001M',positionLineId:'Ito',
    sourceRailway:'odpt.Railway:JR-East.Ito',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    trainOperator:'JR-East'
  });
  for(const change of [
    {trainNumber:'3003M'}, {trainNumber:'3023M'},
    {trainNumber:'4021M'}, {trainNumber:'8057M'},
    {trainNumber:'9067M'}, {trainNumber:'5637M',
      trainType:'odpt.TrainType:JR-East.Local'},
    {trainNumber:'1556E',trainType:'odpt.TrainType:JR-East.Local'},
    {trainNumber:'3001M',trainType:'odpt.TrainType:JR-East.Local'},
    {trainNumber:'3001M',trainType:''},
    {trainNumber:'3001M',positionLineId:'Tokaido'},
    {trainNumber:'3001M',sourceRailway:'odpt.Railway:JR-East.Tokaido'},
    {trainNumber:'3001M',trainOperator:'IzuKyuko'},
    {trainNumber:'3001M',serviceDate:'2026-10-31'},
    {trainNumber:'3001M',serviceDate:'2026-12-01'},
    {trainNumber:'3001M',realtimeVehicleType:'E257系2000番台'},
    {trainNumber:'3021M',vehiclePlan:{
      status:'PLANNED_MODEL',models:['E261系']}}
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...p,...change}),null,
      'Ito reference must reject '+JSON.stringify(change));
  }
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...p,displayLineId:'Ito'},true).kind,'unresolved');
});
test('Hachiko north 54 official D number family -> HB-E220 representative PNG on realtime and timetable',()=>{
  const image='../images/列车/JR東日本/JR東日本_HB-E220系.png';
  for(const source of ['realtime-api','supabase-train-run','train-timetable']){
    for(const trainNumber of ['220D','2282D','2248D','249D']){
      const p=live({trainNumber,trainId:'odpt.Train:JR-East.Hachiko.'+trainNumber,
        positionLineId:'Hachiko',
        sourceRailway:'odpt.Railway:JR-East.Hachiko',
        trainType:'odpt.TrainType:JR-East.Local',
        trainOperator:source==='supabase-train-run'?'':'JR-East',
        positionSource:source,estimated:source!=='realtime-api'});
      const m=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.ok(m,trainNumber+' '+source);
      assert.equal(m.trainNumber,trainNumber,'never rewrite official D train number');
      assert.equal(m.model,'HB-E220系','KiHa110 is retired on 2026-11 Hachiko');
      assert.equal(m.pngPath,image);
      const spec=marker(p,'Hachiko');
      assert.equal(spec.kind,'vehicle');
      assert.equal(spec.iconSrc,image);
      assert.equal(spec.planned,true);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    }
  }
});
test('Hachiko south E retains E231/209 mixed-fleet evidence and excludes Kawagoe H',()=>{
  const base=live({trainNumber:'461E',
    trainId:'planned-trip:2026-11-03|JR-East|Hachiko|461E',
    positionLineId:'Hachiko',sourceRailway:'odpt.Railway:JR-East.Hachiko',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local'});
  const img='../images/列车/JR東日本/JR東日本_E231系_3000番台.png';
  for(const n of ['461E','568E','2377E','4778E']){
    const p={...base,trainNumber:n};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p).pngPath,img);
    assert.equal(marker(p,'Hachiko').iconSrc,img);
  }
  for(const change of [
    {trainNumber:'460H'},{trainNumber:'460E'},{trainNumber:'250D'},
    {trainNumber:'219D'},{trainNumber:'2250D'},
    {trainNumber:'461D',trainType:'odpt.TrainType:JR-East.Local'},
    {positionLineId:'Kawagoe'}, {sourceRailway:'odpt.Railway:JR-East.Kawagoe'},
    {trainOperator:'JR-Central'}, {trainType:'odpt.TrainType:JR-East.Rapid'},
    {serviceDate:'2026-10-31'}, {serviceDate:'2026-12-01'},
    {realtimeVehicleType:'209系3500番台'},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',
      models:['E231系3000番台','209系3500番台']}}
  ]) {
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...base,...change}),null,
      'do not manufacture electric fleet identity '+JSON.stringify(change));
  }
  const north={...base,trainNumber:'220D'};
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...north,
    realtimeVehicleType:'キハ110系'}),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...north,
    vehiclePlan:{status:'PLANNED_MODEL',models:['キハ110系']}}),null);
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...north,displayLineId:'Hachiko'},true).kind,'unresolved');
});
test('JR 2611 Yamanote exact official G numbers by calendar and loop',()=>{
  const index=root.JREastYamanote202611NumberIndex;
  assert.ok(index,'official Yamanote 2611 index is loaded');
  for(const [k,count] of Object.entries({
    'Weekday|InnerLoop':255,
    'Weekday|OuterLoop':267,
    'SaturdayHoliday|InnerLoop':255,
    'SaturdayHoliday|OuterLoop':260
  })){
    assert.equal(index.lists[k].length,count,k);
    assert.equal(new Set(index.lists[k]).size,count,k+' unique full train numbers');
  }
  const cases=[
    ['360G','weekday','InnerLoop',true],
    ['360G','weekday','OuterLoop',false],
    ['301G','holiday','OuterLoop',true],
    ['301G','holiday','InnerLoop',false],
    ['2400G','holiday','InnerLoop',true],
    ['2400G','weekday','InnerLoop',false],
    ['2433G','weekday','OuterLoop',true],
    ['2433G','holiday','OuterLoop',false],
    ['2427G','holiday','OuterLoop',true],
    ['2427G','weekday','OuterLoop',false],
    ['2501G','holiday','OuterLoop',false]
  ];
  for(const [n,calendarType,direction,expected] of cases){
    const p=live({trainNumber:n,positionLineId:'Yamanote',
      sourceRailway:'odpt.Railway:JR-East.Yamanote',calendarType,
      railDirection:'odpt.RailDirection:'+direction,
      trainType:'odpt.TrainType:JR-East.Local'});
    assert.equal(index.contains(n,p),expected,n+' index '+calendarType+' '+direction);
    const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(Boolean(mapped),expected,n+' artwork '+calendarType+' '+direction);
    if(mapped)assert.equal(mapped.model,'E235系0番台（山手線）');
  }
  for(const positionSource of ['realtime-api','supabase-train-run','train-timetable']){
    const p=live({trainNumber:'360G',
      trainId:'odpt.Train:JR-East.Yamanote.360G',
      positionLineId:'Yamanote',sourceRailway:'odpt.Railway:JR-East.Yamanote',
      positionSource,estimated:positionSource!=='realtime-api',
      calendarType:'weekday',railDirection:'odpt.RailDirection:InnerLoop',
      trainType:'odpt.TrainType:JR-East.Local'});
    const image=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(image,positionSource);
    assert.equal(marker(p,'Yamanote').kind,'vehicle');
    assert.equal(marker(p,'Yamanote').iconSrc,image.pngPath);
  }
});
test('Yamanote E235-0 G-number family uses its own officially scoped PNG',()=>{
  const image='../images/列车/JR東日本/JR東日本_E235系_0番台.png';
  const examples=[
    ['301G','holiday'],['405G','weekday'],['360G','holiday'],
    ['1000G','weekday'],['2406G','weekday'],['2433G','weekday']
  ];
  for(const [trainNumber,calendarType] of examples){
    const p=live({trainNumber,trainId:'odpt.Train:JR-East.Yamanote.'+trainNumber,
      sourceRailway:'odpt.Railway:JR-East.Yamanote',
      positionLineId:'Yamanote',calendarType,
      trainType:'odpt.TrainType:JR-East.Local'});
    const selected=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(selected,trainNumber+' must match full Yamanote G number');
    assert.equal(selected.model,'E235系0番台（山手線）');
    assert.equal(selected.pngPath,image);
    const svg=marker(p,'Yamanote');
    assert.equal(svg.kind,'vehicle');
    assert.equal(svg.iconSrc,image);
    assert.equal(svg.planned,true,'number family is a representative display only');
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN',
      'the numbered run does not prove actual carset');
  }
  const scheduled=sql({
    trainNumber:'360G',trainId:'planned-trip:2026-11-03|JR-East|Yamanote|360G',
    sourceRailway:'odpt.Railway:JR-East.Yamanote',positionLineId:'Yamanote',
    trainOperator:'',trainType:'odpt.TrainType:JR-East.Local'
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(scheduled).pngPath,image,
    'missing SQL operator can use the exact JR-East Yamanote source railway');
  assert.equal(marker(scheduled,'Yamanote').iconSrc,image);
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...scheduled,displayLineId:'Yamanote'},true).kind,'unresolved',
    'a broken image must remain a neutral position marker');
});
test('Yamanote G train number range never leaks to a different line or service',()=>{
  const base=live({trainNumber:'1501G',
    sourceRailway:'odpt.Railway:JR-East.Yamanote',
    positionLineId:'Yamanote',
    trainType:'odpt.TrainType:JR-East.Local'});
  for(const changes of [
    {trainNumber:'300G'}, {trainNumber:'2434G'},
    {trainNumber:'2501G'}, {trainNumber:'1501H'},
    {trainNumber:'1501M'}, {trainNumber:'111G'},
    {trainNumber:'3G'}, {trainNumber:'1501'},
    {positionLineId:'KeihinTohoku'},
    {sourceRailway:'odpt.Railway:JR-East.KeihinTohoku'},
    {sourceRailway:''}, {trainOperator:'JR-West'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {trainType:''}, {serviceDate:'2019-11-03'},
    {serviceDate:'2026-10-31'}, {serviceDate:''},
    {realtimeVehicleType:'E231系500番台'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E231系500番台']}}
  ]){
    const wrong={...base,...changes};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(wrong),null,
      'Yamanote exact range rejects '+JSON.stringify(changes));
  }
  assert.equal(marker(base,'KeihinTohoku').kind,'unresolved',
    'the same train cannot borrow a Yamanote image on another display');
  assert.equal(root.TrainNumberPngRanges.match('1501G','ChuoRapid'),null);
  assert.equal(root.TrainNumberPngRanges.match('1501G','Yokosuka'),null);
  assert.equal(root.TrainNumberPngRanges.match('1501G','Yamanote',
    {...base,trainType:'odpt.TrainType:JR-East.Local'}).trainNumber,'1501G');
});

test('2026-11-04 Tsurumi 602/605/606 SQL positions omit operator but render scoped E131-1000 PNG',()=>{
  const png='../images/列车/JR東日本/JR東日本_E131系_1000番台.png';
  for(const [trainNumber,departure,terminal] of [
    ['602','Ogimachi','Tsurumi'],
    ['605','Tsurumi','Ogimachi'],
    ['606','Bentembashi','Tsurumi']
  ]){
    const p=sql({
      trainNumber,
      trainId:'planned-trip:2026-11-04|JR-East|odpt.Railway:JR-East.Tsurumi|Tsurumi|'+trainNumber,
      serviceDate:'2026-11-04',calendarType:'weekday',
      positionLineId:'Tsurumi',trainOperator:undefined,operator:undefined,
      sourceRailway:'odpt.Railway:JR-East.Tsurumi',
      trainType:'odpt.TrainType:JR-East.Local',
      positionSource:'supabase-train-run',estimated:true,
      destinationStation:terminal,fromStation:departure
    });
    assert.equal(p.trainOperator,undefined,'SQL estimator does not copy operator into planned position');
    const matched=root.TrainNumberPngRanges.match(trainNumber,'Tsurumi',p);
    assert.ok(matched,'Tsurumi '+trainNumber+' must match exact JR-East source URN');
    assert.equal(matched.model,'E131系1000番台');
    const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(mapped,trainNumber+' must resolve despite absent trainOperator');
    assert.equal(mapped.pngPath,png);
    assert.equal(mapped.representative,true);
    const spec=marker(p,'Tsurumi');
    assert.equal(spec.kind,'vehicle');
    assert.equal(spec.planned,true);
    assert.equal(spec.compact,false);
    assert.equal(spec.iconSrc,png);
    assert.equal(p.positionSource,'supabase-train-run');
    assert.equal(p.estimated,true);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
});
test('Tsurumi SQL source-operator fallback rejects ambiguous and foreign sources',()=>{
  const base=sql({
    trainNumber:'606',trainId:'planned-trip:2026-11-04|JR-East|Tsurumi|606',
    serviceDate:'2026-11-04',calendarType:'weekday',
    positionLineId:'Tsurumi',trainOperator:undefined,operator:undefined,
    sourceRailway:'odpt.Railway:JR-East.Tsurumi',
    trainType:'odpt.TrainType:JR-East.Local'
  });
  for(const bad of [
    {sourceRailway:''},
    {sourceRailway:'odpt.Railway:JR-East.Yokohama'},
    {sourceRailway:'odpt.Railway:JR-Central.Tsurumi'},
    {trainOperator:'JR-Central'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {serviceDate:'2023-11-04'},
    {serviceDate:''},
    {trainNumber:'606B'},
    {positionLineId:'Yokohama'},
    {displayLineId:'Yokohama'}
  ]){
    const p={...base,...bad};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'Tsurumi must reject '+JSON.stringify(bad));
  }
  assert.equal(root.TrainNumberPngRanges.match('2221K','Yokohama',{
    serviceDate:'2026-11-03',calendarType:'holiday',
    sourceRailway:'odpt.Railway:JR-East.Yokohama'}).model,'E233系6000番台');
  assert.equal(root.TrainNumberPngRanges.match('1932T','ChuoRapid').model,'E233系0番台');
});


test('Takasaki 211 exact 2026-11 M-number reference does not absorb shared fleets',()=>{
  const base=sql({positionLineId:'Takasaki',
    sourceRailway:'odpt.Railway:JR-East.Takasaki',
    trainNumber:'425M',trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-04',calendarType:'weekday',
    vehiclePlan:undefined});
  const expected='../images/列车/JR東日本/JR東日本_211系_湘南色.png';
  for(const n of ['425M','429M','521M','625M','725M']){
    const p={...base,trainNumber:n};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p)?.pngPath,expected,n);
    assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false).planned,true);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN','reference must not confirm actual carset');
  }
  for(const n of ['821M','1820E','2820Y','3001M','639H']){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...base,trainNumber:n}),null,n);
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,sourceRailway:'odpt.Railway:JR-East.Utsunomiya'}),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,serviceDate:'2026-12-01'}),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,vehiclePlan:{confirmed:true,models:['E233系3000番台']}}),null);
});
test('UtsunomiyaJR E131-600 exact numbers use the actual UI railway key',()=>{
  const base=sql({positionLineId:'UtsunomiyaJR',
    sourceRailway:'odpt.Railway:JR-East.Utsunomiya',
    trainNumber:'639M',trainType:'odpt.TrainType:JR-East.Local',
    calendarType:'weekday',serviceDate:'2026-11-04',
    vehiclePlan:undefined});
  const expected='../images/列车/JR東日本/JR東日本_E131系_600番台.png';
  assert.equal(root.VehicleGaragePngMap.matchModelPath('E131系600番台',expected,
    'UtsunomiyaJR'),true,'UI line key must match garage');
  for(const n of ['620M','623M','639M','698M','699M','2823M']){
    const p={...base,trainNumber:n};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p)?.pngPath,expected,n);
    assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false).planned,true);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
  for(const n of ['521M','1520E','2520Y','621M','631M']){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...base,trainNumber:n}),null,n);
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,positionLineId:'Takasaki'}),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,vehiclePlan:{confirmed:true,models:['E231系1000番台']}}),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainType:'odpt.TrainType:JR-East.LimitedExpress'}),null);
});


test('JR official 2611 Takasaki 211 M numbers include previously missing inbound and outbound services',()=>{
  const sqlLocal=(n,date='2026-11-04')=>sql({
    positionLineId:'Takasaki',sourceRailway:'odpt.Railway:JR-East.Takasaki',
    trainOperator:'JR-East',trainNumber:n,
    trainType:'odpt.TrainType:JR-East.Local',serviceDate:date,
    calendarType:date==='2026-11-07'?'holiday':'weekday',vehiclePlan:undefined
  });
  const png='../images/列车/JR東日本/JR東日本_211系_湘南色.png';
  const additional=["424M","426M","465M","468M","473M","474M","476M","477M","478M","481M","483M","522M","523M","535M","537M","540M","544M","546M","547M","620M","621M","622M","624M","626M","628M","630M","632M","638M","640M","642M","643M","647M","649M","655M","656M","657M","658M","659M","660M","661M","720M","729M","736M","742M","747M","748M","749M","750M","753M","754M","755M","756M","757M","758M"];
  for (const n of additional){
    for (const day of ['2026-11-04','2026-11-07']){
      const p=sqlLocal(n,day);
      const result=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.equal(result?.pngPath,png,n+' '+day);
      assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false)?.planned,true,n);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN',
        'reference PNG must not identify the actual physical carset');
    }
  }
  // These are through-trains, green-car services, limited expresses or
  // numbers from another route; an M suffix is never enough on its own.
  for(const n of ['821M','961M','1820E','2820Y','4001M','999M']){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(sqlLocal(n)),null,n);
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...sqlLocal('758M'),sourceRailway:'odpt.Railway:JR-East.Utsunomiya'}),null);
});
test('Utsunomiya E131-600 regional exact-number mapping remains isolated',()=>{
  const base=sql({
    positionLineId:'UtsunomiyaJR',
    sourceRailway:'odpt.Railway:JR-East.Utsunomiya',
    trainOperator:'JR-East',trainNumber:'620M',
    trainType:'odpt.TrainType:JR-East.Local',
    calendarType:'weekday',serviceDate:'2026-11-04',vehiclePlan:undefined
  });
  for(const n of ['620M','639M','641M','699M','2823M']){
    const p={...base,trainNumber:n};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p)?.model,'E131系600番台',n);
    assert.equal(root.TrainVehicle.selectMarkerArtwork(p,false)?.planned,true,n);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN',n);
  }
  // The similarly-numbered Takasaki train is not a Utsunomiya E131.
  for(const n of ['621M','631M','521M','1520E','2520Y']){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
      ...base,trainNumber:n}),null,n);
  }
});
