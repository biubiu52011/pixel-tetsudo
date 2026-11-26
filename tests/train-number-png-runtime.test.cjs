'use strict';
/* Train number -> approved PNG -> actual SVG marker.
 * Feed exactly the fields delivered by ODPT realtime and Supabase SQL.
 * A known MODEL is still PLANNED, never a claimed physical carset.
 * node --test tests/train-number-png-runtime.test.cjs
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const vm=require('node:vm');

function hashFor(file) {
  const bytes=Buffer.from(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),'utf8');
  return crypto.createHash('sha1').update('blob '+bytes.length+'\0')
    .update(bytes).digest('hex').slice(0,12);
}
const root={},ctx=vm.createContext({
  window:root,Date,console:{debug(){},warn(){},log(){},error(){}},
  _isTrainArtworkFailureActive(){return false}
});
for(const file of [
  'data/timetables/vehicle-garage-png-map.js',
  'data/timetables/nambu-branch-official.js',
  'data/timetables/joban-e231-h-index.js',
  'data/timetables/jreast-keihin-number-index.js',
  'data/timetables/jreast-yokohama-number-index.js',
  'data/timetables/jreast-yamanote-number-index.js',
  'data/timetables/jreast-regional-number-index.js',
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
test('BanetsuEast 2611 JR official D numbers: 35 all-day weekday/holiday KiHa110 reference PNGs',()=>{
  const png110='../images/列车/JR東日本/JR東日本_キハ110系.png';
  const up=["720D","1752D","722D","724D","728D","730D","732D","734D","736D","1754D","738D","740D","1756D","742D","744D","746D","748D","750D"];
  const down=["721D","723D","725D","727D","729D","1751D","731D","733D","735D","737D","741D","743D","745D","1753D","1755D","747D","749D"];
  assert.equal(up.length,18);
  assert.equal(down.length,17);
  assert.equal(new Set([...up,...down]).size,35);
  assert.equal(root.VehicleGaragePngMap.matchModelPath('キハ110系',png110,'BanetsuEast'),true);
  for(const [numbers,direction] of [[up,'Inbound'],[down,'Outbound']]){
    for(const [cal,date] of [['weekday','2026-11-05'],['holiday','2026-11-07']]){
      for(const no of numbers){
        const fields={
          trainId:'planned-trip:'+date+'|JR-East|odpt.Railway:JR-East.BanetsuEast|BanetsuEast|'+no,
          trainNumber:no,positionLineId:'BanetsuEast',
          sourceRailway:'odpt.Railway:JR-East.BanetsuEast',
          trainOperator:'JR-East',railDirection:'odpt.RailDirection:'+direction,
          trainType:'odpt.TrainType:JR-East.Local',
          calendarType:cal,serviceDate:date,plannedVehicleCandidates:['キハ110系'],
          vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
        };
        for(const create of [live,sql]){
          const p=create(fields);
          const chosen=root.TrainVehicle.lookupTrainNumberRangePng(p);
          assert.ok(chosen,no+'/'+cal+'/'+p.positionSource);
          assert.equal(chosen.model,'キハ110系');
          assert.equal(chosen.pngPath,png110);
          assert.equal(chosen.planned,true);
          const artwork=marker(p,'BanetsuEast');
          assert.equal(artwork.kind,'vehicle',no+'/'+cal);
          assert.equal(artwork.iconSrc,png110);
          assert.equal(artwork.planned,true);
          assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
          assert.equal(p.vehiclePlan,undefined);
        }
      }
    }
  }
  // SQL sources may supply the native service calendar without a normalized
  // calendarType or trainOperator; the precise railway URN remains required.
  const noOperator=sql({trainNumber:'720D',positionLineId:'BanetsuEast',
    sourceRailway:'odpt.Railway:JR-East.BanetsuEast',
    trainOperator:'',calendarType:'',serviceId:'odpt.Calendar:Weekday',
    serviceDate:'2026-11-05',railDirection:'odpt.RailDirection:Inbound',
    trainType:'odpt.TrainType:JR-East.Local'});
  assert.equal(marker(noOperator,'BanetsuEast').iconSrc,png110);
  const normal=live({trainNumber:'720D',positionLineId:'BanetsuEast',
    sourceRailway:'odpt.Railway:JR-East.BanetsuEast',
    trainOperator:'JR-East',serviceDate:'2026-11-05',
    calendarType:'weekday',railDirection:'odpt.RailDirection:Inbound',
    trainType:'odpt.TrainType:JR-East.Local',
    plannedVehicleCandidates:['キハ110系']});
  for(const changed of [
    {trainNumber:'726D'}, {trainNumber:'739D'},
    {trainNumber:'752D'}, {trainNumber:'1757D'},
    {trainNumber:'9730D'}, {trainNumber:'9737D'},
    {trainNumber:'720M'}, {trainNumber:'720'},
    {serviceDate:'2026-12-26'},{serviceDate:'2027-02-13'},
    {serviceDate:''},
    {positionLineId:'BanetsuWest'},{displayLineId:'BanetsuWest'},
    {sourceRailway:'odpt.Railway:JR-East.BanetsuWest'},
    {sourceRailway:''},{trainOperator:'JR-West'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {plannedVehicleCandidates:['キハE130系']},
    {realtimeVehicleType:'キハE130系'},
    {realtimeDerivedVehicleType:'E129系'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['キハE130系']}},
    {vehiclePlan:{status:'PLANNED_CANDIDATES',models:['キハ110系','キハ100系']}}
  ]){
    const p={...normal,...changed};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'BanetsuEast gallery cannot cross source/stock evidence: '+JSON.stringify(changed));
  }
  assert.equal(marker({...normal,displayLineId:'BanetsuWest'},'BanetsuWest').kind,'unresolved');
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...normal,displayLineId:'BanetsuEast'},true).kind,'unresolved');
});
test('BanetsuWest 2611 all 94 scheduled unique M and D stock references are calendar/direction scoped',()=>{
  const eUpLocal=["1222M","1224M","1226M","1228M","1230M","1232M","1234M","1236M","1238M","1240M","2226M"],eDownLocal=["1221M","1223M","1225M","1227M","1229M","1231M","1233M","1235M","1237M","1239M","2225M"];
  const eUpRapid=["3232M","3234M","3236M","3238M","3240M","3242M","3244M"],eDownRapid=["3231M","3233M","3235M","3237M","3239M","3241M","3243M"];
  const dUpGV=["220D","2224D","2226D","2228D","2230D","2232D","2236D","2238D","2240D","2242D","2244D","2246D","224D","2252D","230D","234D","236D","238D","240D","4252D"],dDownGV=["221D","2221D","2223D","2227D","2233D","2235D","2237D","2239D","2241D","2243D","2245D","2247D","2249D","227D","231D","233D","237D","241D","4253D","2229D"];
  const dUpKiha=["4250D","222D","226D","228D","4254D","232D","4256D","2248D","2250D"],dDownKiha=["223D","225D","4255D","229D","4257D","235D","239D","2251D","4259D"];
  const all=[...eUpLocal,...eDownLocal,...eUpRapid,...eDownRapid,
    ...dUpGV,...dDownGV,...dUpKiha,...dDownKiha];
  assert.equal(all.length,94);
  assert.equal(new Set(all).size,94);
  const groups=[
    [eUpLocal,'Inbound','Local','E721系','../images/列车/JR東日本/JR東日本_E721系_仙台地区.png'],
    [eDownLocal,'Outbound','Local','E721系','../images/列车/JR東日本/JR東日本_E721系_仙台地区.png'],
    [eUpRapid,'Inbound','Rapid','E721系','../images/列车/JR東日本/JR東日本_E721系_仙台地区.png'],
    [eDownRapid,'Outbound','Rapid','E721系','../images/列车/JR東日本/JR東日本_E721系_仙台地区.png'],
    [dUpGV,'Inbound','Local','GV-E400系','../images/列车/JR東日本/JR東日本_GV-E400系.png'],
    [dDownGV.filter(x=>!['2225D','2229D'].includes(x)),'Outbound','Local','GV-E400系','../images/列车/JR東日本/JR東日本_GV-E400系.png'],
    [['2225D','2229D'],'Outbound','Rapid','GV-E400系','../images/列车/JR東日本/JR東日本_GV-E400系.png'],
    [dUpKiha,'Inbound','Local','キハ110系','../images/列车/JR東日本/JR東日本_キハ110系.png'],
    [dDownKiha,'Outbound','Local','キハ110系','../images/列车/JR東日本/JR東日本_キハ110系.png']
  ];
  for(const [numbers,direction,type,model,png] of groups){
    assert.equal(root.VehicleGaragePngMap.matchModelPath(model,png,'BanetsuWest'),true,
      'pre-existing gallery art and scope required: '+model);
    for(const n of numbers) for(const cal of ['weekday','holiday']){
      const date=cal==='weekday'?'2026-11-05':'2026-11-07';
      for(const make of [live,sql]){
        const fields={
          trainNumber:n,positionLineId:'BanetsuWest',
          sourceRailway:'odpt.Railway:JR-East.BanetsuWest',
          trainOperator:'JR-East',serviceDate:date,calendarType:cal,
          railDirection:'odpt.RailDirection:'+direction,
          trainType:'odpt.TrainType:JR-East.'+type,
          plannedVehicleCandidates:n.endsWith('M')?['E721系']:
            ['GV-E400系','キハ110系'],vehicleIdentityStatus:'UNKNOWN',
          vehicleResolvedUpstream:false
        };
        const p=make(fields);
        const found=root.TrainVehicle.lookupTrainNumberRangePng(p);
        assert.ok(found,n+'/'+cal+'/'+p.positionSource);
        assert.equal(found.model,model,n);
        assert.equal(found.pngPath,png,n);
        const art=marker(p,'BanetsuWest');
        assert.equal(art.kind,'vehicle',n+'/'+cal);
        assert.equal(art.iconSrc,png,n);
        assert.equal(art.planned,true);
        assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
      }
    }
  }
  for(const n of ['2225D']){
    for(const day of ["2026-11-01","2026-11-03","2026-11-08","2026-11-15","2026-11-22","2026-11-23","2026-11-29"]){
      const p=sql({trainNumber:n,positionLineId:'BanetsuWest',
        sourceRailway:'odpt.Railway:JR-East.BanetsuWest',
        trainOperator:'JR-East',railDirection:'odpt.RailDirection:Outbound',
        trainType:'odpt.TrainType:JR-East.Rapid',calendarType:'holiday',
        serviceDate:day,plannedVehicleCandidates:['GV-E400系','キハ110系']});
      assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,n+' is OFF '+day);
    }
  }
  const sample=sql({trainNumber:'220D',positionLineId:'BanetsuWest',
    sourceRailway:'odpt.Railway:JR-East.BanetsuWest',trainOperator:'JR-East',
    railDirection:'odpt.RailDirection:Inbound',
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-05',calendarType:'weekday',
    plannedVehicleCandidates:['GV-E400系','キハ110系']});
  for(const bad of [
    {trainNumber:'242D'},{trainNumber:'4258D'},
    {trainNumber:'4001M'},{trainNumber:'2225M'},
    {sourceRailway:'odpt.Railway:JR-East.BanetsuEast'},
    {positionLineId:'BanetsuEast'},
    {displayLineId:'BanetsuEast'},
    {trainOperator:'JR-West'},
    {serviceDate:'2026-12-05'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {realtimeVehicleType:'キハ110系'},
    {plannedVehicleCandidates:['E721系']},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['キハ110系']}}
  ]){
    const p={...sample,...bad};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'BanetsuWest source/stock boundary '+JSON.stringify(bad));
  }
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...sample,displayLineId:'BanetsuWest'},true).kind,'unresolved');
});
test('BanetsuWest exact dated 2026-11 named stock respects quarantined DL DE10 art',()=>{
  const group=[
    {numbers:['9211D','9212D'],days:["2026-11-01","2026-11-02","2026-11-03","2026-11-07","2026-11-08","2026-11-14","2026-11-15","2026-11-21","2026-11-22","2026-11-23","2026-11-28","2026-11-29"],model:'キハ110系',png:'../images/列车/JR東日本/JR東日本_キハ110系.png',type:'LimitedExpress'},
    {numbers:['8226','8233'],days:["2026-11-03","2026-11-07","2026-11-14","2026-11-21"],model:'C57形（SLばんえつ物語）',png:'../images/列车/JR東日本/JR東日本_C57形_180号機_SLばんえつ物語.png',type:'Rapid'}
  ];
  for(const g of group) for(const day of g.days) for(const n of g.numbers){
    const dir=Number(n.match(/^\d+/)[0])%2?'Outbound':'Inbound';
    const pos=sql({trainNumber:n,positionLineId:'BanetsuWest',
      sourceRailway:'odpt.Railway:JR-East.BanetsuWest',trainOperator:'JR-East',
      railDirection:'odpt.RailDirection:'+dir,trainType:'odpt.TrainType:JR-East.'+g.type,
      calendarType:'holiday',serviceDate:day});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(pos)?.pngPath,g.png,n+'/'+day);
    assert.equal(marker(pos,'BanetsuWest').iconSrc,g.png,n+'/'+day);
    assert.equal(pos.vehicleIdentityStatus,'UNKNOWN');
  }
  const de10='../images/列车/JR東日本/JR東日本_DE10形_DLばんえつ物語.png';
  assert.equal(root.VehicleGaragePngMap.isQuarantinedPng(de10),true);
  for(const day of ["2026-11-01","2026-11-08","2026-11-15"]) for(const n of ['9226','9233']){
    const dir=Number(n)%2?'Outbound':'Inbound';
    const pos=sql({trainNumber:n,positionLineId:'BanetsuWest',
      sourceRailway:'odpt.Railway:JR-East.BanetsuWest',trainOperator:'JR-East',
      railDirection:'odpt.RailDirection:'+dir,trainType:'odpt.TrainType:JR-East.Rapid',
      calendarType:'holiday',serviceDate:day});
    assert.equal(root.TrainNumberPngRanges.match(n,'BanetsuWest',pos)?.pngPath,de10,n+'/'+day);
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(pos),null,n+'/'+day);
    assert.equal(marker(pos,'BanetsuWest').kind,'unresolved',n+'/'+day);
  }
  for(const [number,day,type] of [
    ['8216D','2026-11-01','Local'],['8217D','2026-11-01','Rapid'],
    ['9225D','2026-11-05','Rapid'],['9226D','2026-11-05','Rapid'],
    ['8226','2026-11-01','Rapid'],['8226','2026-11-22','Rapid'],
    ['8233','2026-11-08','Rapid'],['9226','2026-11-03','Rapid'],
    ['9233','2026-11-21','Rapid'],['9233','2026-12-05','Rapid'],
    ['9211D','2026-11-05','LimitedExpress'],['9212D','2026-11-05','LimitedExpress']
  ]){
    const p=sql({trainNumber:number,positionLineId:'BanetsuWest',
      sourceRailway:'odpt.Railway:JR-East.BanetsuWest',
      trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.'+type,
      railDirection:'odpt.RailDirection:'+(Number(number.match(/^\d+/)[0])%2?'Outbound':'Inbound'),
      serviceDate:day,calendarType:'holiday'});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      number+' '+day+' must stay unmapped');
  }
});
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
    trainType:'odpt.TrainType:JR-East.Local',railDirection:'odpt.RailDirection:Inbound'});
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
    sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
    trainType:'odpt.TrainType:JR-East.Local',railDirection:'odpt.RailDirection:Inbound'});
  assert.match(marker(p,'SaikyoKawagoe').iconSrc,/E233系_7000番台\.png$/);
});
test('K/F/S number tails select display PNG by scoped number ranges, without converting to operation IDs',()=>{
  const cases=[
    ['1938F','E233系7000番台'],
    ['1940S','E233系7000番台'],
    ['1976K','相鉄12000系'],
    ['1984K','東京臨海高速鉄道71-000形']
  ];
  for(const [number,model] of cases){
    const p=live({trainNumber:number,positionLineId:'SaikyoKawagoe',
      sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
      trainType:'odpt.TrainType:JR-East.Local',
      railDirection:'odpt.RailDirection:Inbound'
    });
    const chosen=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.ok(chosen,number+' must match the published number range');
    assert.equal(chosen.model,model);
    assert.equal(marker(p,'SaikyoKawagoe').kind,'vehicle');
  }
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe',{serviceDate:'2026-11-03'}).trainNumber,'1940K');
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

test('277M ODPT number is NOT proof of JR E233 ownership',()=>{
  const p=live({trainNumber:'277M',
    trainId:'odpt.Train:JR-East.SaikyoKawagoe.277M',
    positionLineId:'SaikyoKawagoe',
    sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
    trainType:'odpt.TrainType:JR-East.Local'});
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null);
  const rendered=marker(p,'SaikyoKawagoe');
  assert.equal(rendered.kind,'unresolved');
  assert.equal(rendered.iconSrc,'');
  assert.equal(rendered.compact,true);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
});
test('277M historical SQL without a physical-carset proof stays neutral',()=>{
  const p=sql({trainNumber:'277M',positionLineId:'SaikyoKawagoe',
    sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe'});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null);
  assert.equal(marker(p,'SaikyoKawagoe').kind,'unresolved');
  assert.equal(marker(p,'SaikyoKawagoe').iconSrc,'');
});
test('Sotetsu 1xx/2xx M are public service numbers, NOT E233 vs 12000 carset codes',()=>{
  for(const line of ['SaikyoKawagoe','SotetsuJRDirect']){
    for(const n of ['120M','137M','220M','277M','299M']){
      assert.equal(root.TrainNumberPngRanges.match(n,line),null,
        line+'/'+n+' may NOT select a single operator-owned fleet by M number');
    }
  }
  for(const n of ['119M','200M','219M','300M','277K']){
    assert.equal(root.TrainNumberPngRanges.match(n,'SotetsuJRDirect'),null);
  }
  assert.equal(root.TrainNumberPngRanges.match('277M','ChuoMain'),null);
  assert.equal(root.TrainNumberPngRanges.match('277M','Rinkai'),null);
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe',{serviceDate:'2026-11-03'}).model,
    'E233系7000番台','independent Saikyo K-series rule remains');
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
  assert.equal(root.TrainNumberPngRanges.match('400K','SaikyoKawagoe',{serviceDate:'2026-11-03'}).model,
    'E233系7000番台','existing Saikyo K-tail mapping must remain unchanged');
});
test('Karasuyama and Senseki-Tohoku public number PNG: published 2026-11 service only',()=>{
  const cases=[
    ['Karasuyama','321M','Local','EV-E301系','JR東日本_EV-E301系.png'],
    ['Karasuyama','346M','Local','EV-E301系','JR東日本_EV-E301系.png'],
    ['SensekiTohoku','5521D','Rapid','HB-E210系','JR東日本_HB-E210系.png'],
    ['SensekiTohoku','5530D','Rapid','HB-E210系','JR東日本_HB-E210系.png']
  ];
  for(const [line,number,type,model,pngFile] of cases){
    for(const source of ['realtime-api','supabase-train-run']){
      const p=live({
        trainNumber:number,trainId:'odpt.Train:JR-East.'+line+'.'+number,
        positionLineId:line,sourceRailway:'odpt.Railway:JR-East.'+line,
        trainOperator:'JR-East',
        railDirection:'odpt.RailDirection:'+
          (parseInt(number,10)%2?'Outbound':'Inbound'),
        trainType:'odpt.TrainType:JR-East.'+type,
        serviceDate:'2026-11-04',
        calendarType:line==='SensekiTohoku'?'holiday':'weekday',
        positionSource:source,estimated:source!=='realtime-api'
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
test('Kururi 2611: no fake realtime source PNG and no 29xxD bus-as-rail mapping',()=>{
  const base=live({
    trainNumber:'920D',positionLineId:'Kururi',
    sourceRailway:'odpt.Railway:JR-East.Kururi',
    trainOperator:'JR-East',railDirection:'odpt.RailDirection:Inbound',
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-04',calendarType:'weekday',
    plannedVehicleCandidates:['キハE130形100番台'],
    scheduledStopKeys:['Kururi','Tawarada','Obitsu','Shimogori','Makuta',
      'HigashiYokota','Yokota','HigashiKiyokawa','KazusaKiyokawa',
      'Gion','Kisarazu']
  });
  // No JR East realtime position API; the authoritative vehicle
  // illustration now requires the dated SQL number+open-route proof.
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(base),null);
  const proof={source:'sql-jreast-2611-number-roster',lineId:'Kururi',
    trainNumber:'920D',serviceDate:'2026-11-04',
    direction:'odpt.RailDirection:Inbound',calendar:'odpt.Calendar:Weekday',
    trainType:'odpt.TrainType:JR-East.Local',
    segmentKey:'kisarazu_kururi_rail',railScope:'open_rail_only',
    railwayFrom:'Kururi',railwayTo:'Kisarazu',
    model:'キハE130形100番台',
    pngReference:'../images/列车/JR東日本/JR東日本_キハE130系100番台.png',
    officialSourceUrl:'https://timetables.jreast.co.jp/2611/timetable-v/217u1.html',
    stopClockStatus:'historical_not_2611_verified',
    closedRailSection:'Kururi–KazusaKameyama',
    referenceOnly:true,actualVehicleConfirmed:false};
  const planned={...base,positionSource:'supabase-train-run',
    estimated:true,officialNumberVerified:true,
    sqlPublishedNumberFleetReference:proof};
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(planned)?.model,
    'キハE130形100番台');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...planned,positionSource:'realtime-api',estimated:false}),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...planned,trainNumber:'2941D'}),null);
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
    'Yahiko festival service does not run on ordinary November 4');
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
      serviceId:calendar==='weekday'?'odpt.Calendar:Weekday':'odpt.Calendar:SaturdayHoliday',
      ...(model==='東京メトロ15000系'?{realtimeVehicleType:model}:{})});
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
      trainType:'odpt.TrainType:TokyoMetro.Rapid',
      ...(num==='B485S'?{realtimeVehicleType:model}:{})});
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
    {realtimeVehicleType:'東京メトロ13000系'},
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
    trainType:'odpt.TrainType:JR-East.Rapid',railDirection:'odpt.RailDirection:Inbound'});
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
    trainType:'odpt.TrainType:JR-East.Rapid',railDirection:'odpt.RailDirection:Inbound'});
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
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe',{serviceDate:'2026-11-03'}).model,'E233系7000番台');
  assert.equal(root.TrainNumberPngRanges.match('277M','SaikyoKawagoe'),null);
});


test('ChuoMain 2611 SQL numbers: T/H E233 and M-only 211/E131 illustrated as ONE PNG',()=>{
  const e233='../images/列车/JR東日本/JR東日本_E233系_0番台.png';
  const n211='../images/列车/JR東日本/JR東日本_211系_長野色.png';
  for(const [trainNumber,type] of [
    ['640T','ChuoSpecialRapid'],['726H','Rapid'],
    ['1633T','CommuterRapid']]) {
    const p=sql({trainNumber,trainType:'odpt.TrainType:JR-East.'+type,
      calendarType:'weekday',serviceDate:'2026-11-04',
      plannedVehicleCandidates:['E233系0番台']});
    assert.equal(marker(p,'ChuoMain').iconSrc,e233,
      'the complete T/H train number carries E233 planned stock');
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
  for(const trainNumber of ['1249M','1323M','1325M']){
    const p=sql({trainNumber,serviceDate:'2026-11-04',
      trainType:'odpt.TrainType:JR-East.Local',
      plannedVehicleCandidates:['E233系0番台']});
    assert.equal(marker(p,'ChuoMain').iconSrc,e233);
  }
  for(const trainNumber of ['1230M','1450M','321M','520M']){
    const p=sql({trainNumber,serviceDate:'2026-11-04',
      trainType:'odpt.TrainType:JR-East.Local',
      plannedVehicleCandidates:['211系','E233系0番台']});
    const ref=root.TrainNumberPngRanges.matchChuoMainLocalReference(p);
    assert.ok(ref,trainNumber+' local must have a scoped reference');
    assert.equal(ref.confirmed,false);
    assert.equal(ref.authorizesPNG,false);
    assert.ok(ref.models.includes('E131系200番台'));
    assert.equal(marker(p,'ChuoMain').iconSrc,n211,
      'ONE representative train front, never a double cab');
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
  for(const change of [
    {serviceDate:'2026-12-01'}, {positionLineId:'ChuoRapid'},
    {sourceRailway:'odpt.Railway:JR-East.Yokohama'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {trainNumber:'9592M'}, {trainNumber:'2201M',
      trainType:'odpt.TrainType:JR-East.Rapid'},
    {realtimeVehicleType:'E131系200番台'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E233系0番台']}},
  ]) {
    const p=sql({trainNumber:'1230M',trainType:'odpt.TrainType:JR-East.Local',
      serviceDate:'2026-11-04',
      plannedVehicleCandidates:['211系','E233系0番台'],...change});
    assert.equal(root.TrainNumberPngRanges.matchChuoMainLocalReference(p),null,
      'unverified local reference rejected: '+JSON.stringify(change));
  }
  const foreign=sql({trainNumber:'1230M',positionLineId:'ChuoMain',
    displayLineId:'ChuoRapid',trainType:'odpt.TrainType:JR-East.Local',
    plannedVehicleCandidates:['211系','E233系0番台']});
  assert.equal(marker(foreign,'ChuoRapid').kind,'unresolved');
});
test('ChuoTatsuno 159M: quarantined E127-100 art stays out of ChuoMain SVG',()=>{
  const png127='../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png';
  const position=sql({
    trainId:'planned-trip:2026-11-05|JR-East|odpt.Railway:JR-East.ChuoTatsuno|ChuoTatsuno|159M|odpt.RailDirection:Outbound|odpt.Station:JR-East.Tatsuno|14:00|odpt.Station:JR-East.Shiojiri',
    trainNumber:'159M',serviceDate:'2026-11-05',calendarType:'weekday',
    positionLineId:'ChuoTatsuno',
    sourceRailway:'odpt.Railway:JR-East.ChuoTatsuno',
    railDirection:'odpt.RailDirection:Outbound',
    trainType:'odpt.TrainType:JR-East.Local',
    positionSource:'supabase-train-run',estimated:true,
    plannedVehicleCandidates:['211系','E127系100番台'],
    vehicleIdentityStatus:'UNKNOWN'
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(position),null);
  assert.equal(root.TrainNumberPngRanges.match('159M','ChuoMain',position),null);
  const identified=root.TrainNumberPngRanges.match('159M','ChuoTatsuno',position);
  assert.ok(identified);
  assert.equal(identified.model,'E127系100番台');
  assert.equal(identified.pngPath,png127);
  assert.equal(root.VehicleGaragePngMap.isQuarantinedPng(png127),true);
  assert.equal(root.VehicleGaragePngMap.matchModelPath('E127系100番台',png127,'ChuoTatsuno'),false);
  assert.equal(root.VehicleGaragePngMap.matchModelPath('E127系100番台',png127,'ChuoMain'),false);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...position,displayLineId:'ChuoMain'}),null);
  const spec=marker(position,'ChuoMain');
  assert.equal(spec.kind,'unresolved');
  assert.equal(spec.iconSrc,'');
  assert.equal(position.vehicleIdentityStatus,'UNKNOWN');
  const holiday={...position,serviceDate:'2026-11-07',calendarType:'holiday'};
  assert.equal(marker(holiday,'ChuoMain').kind,'unresolved');
  assert.equal(marker(position,'ChuoTatsuno').kind,'unresolved');
  for(const bad of [
    {trainNumber:'157M'},
    {serviceDate:'2026-12-05'},
    {railDirection:'odpt.RailDirection:Inbound'},
    {sourceRailway:'odpt.Railway:JR-East.ChuoMain'},
    {sourceRailway:'odpt.Railway:JR-East.Joban'},
    {trainOperator:'JR-Central'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {plannedVehicleCandidates:['211系']},
    {realtimeVehicleType:'211系'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['211系']}},
    {positionSource:'realtime-api',estimated:false},
    {positionLineId:'ChuoMain'},
    {displayLineId:'Oito'}
  ]){
    const modified={...position,...bad};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...modified,displayLineId:bad.displayLineId||'ChuoMain'}),null,
      'Tatsuno branch E127 may not escape its evidence: '+JSON.stringify(bad));
  }
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...position,displayLineId:'ChuoMain'},true).kind,'unresolved');
});

test('439M Otsuki 13:45 -> Matsumoto: planned-trip live train displays one 211 reference PNG',()=>{
  const png211='../images/列车/JR東日本/JR東日本_211系_長野色.png';
  const position=live({
    trainId:'planned-trip:2026-11-05|JR-East|odpt.Railway:JR-East.ChuoMain|ChuoMain|439M|odpt.RailDirection:Outbound|odpt.Station:JR-East.Chuo.Otsuki|13:45|odpt.Station:JR-East.Chuo.Matsumoto',
    trainNumber:'439M', serviceDate:'2026-11-05', calendarType:'weekday',
    sourceRailway:'odpt.Railway:JR-East.ChuoMain',
    railDirection:'odpt.RailDirection:Outbound',
    trainType:'odpt.TrainType:JR-East.Local',
    positionSource:'realtime-api',estimated:false,
    plannedVehicleCandidates:['211系','E233系0番台'],
    vehicleIdentityStatus:'UNKNOWN'
  });
  const reference=root.TrainVehicle.lookupTrainNumberRangePng(position);
  assert.ok(reference);
  assert.equal(reference.model,'211系（長野地区）');
  assert.equal(reference.pngPath,png211);
  assert.equal(reference.planned,true);
  const spec=marker(position,'ChuoMain');
  assert.equal(spec.kind,'vehicle');
  assert.equal(spec.iconSrc,png211);
  assert.equal(spec.planned,true);
  assert.equal(spec.compact,false);
  assert.equal(position.vehicleIdentityStatus,'UNKNOWN','a reference is not an observed carset');
  for(const source of ['supabase-train-run','train-timetable']){
    const estimated=sql({...position,positionSource:source,estimated:true});
    assert.equal(marker(estimated,'ChuoMain').iconSrc,png211,source);
  }
  const holiday=sql({...position,serviceDate:'2026-11-07',calendarType:'holiday',
    positionSource:'supabase-train-run',estimated:true});
  assert.equal(marker(holiday,'ChuoMain').iconSrc,png211);
  for(const change of [
    {trainNumber:'437M'}, {trainNumber:'440M'},
    {serviceDate:'2026-12-05'},
    {railDirection:'odpt.RailDirection:Inbound'},
    {sourceRailway:'odpt.Railway:JR-East.Joban'},
    {positionLineId:'ChuoRapid'},
    {trainOperator:'JR-Central'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {realtimeVehicleType:'E233系0番台'},
    {realtimeDerivedVehicleType:'E131系200番台'},
    {plannedVehicleCandidates:['E233系0番台']},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E233系0番台']}}
  ]){
    const modified={...position,...change};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(modified),null,
      '439M reference must not cross its evidence boundary: '+JSON.stringify(change));
  }
  assert.equal(marker({...position,displayLineId:'ChuoRapid'},'ChuoRapid').kind,'unresolved');
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...position,displayLineId:'ChuoMain'},true).kind,'unresolved');
});

test('1461M Takao 13:28 -> Otsuki: realtime-linked planned-trip renders one 211 stock REFERENCE',()=>{
  const path211='../images/列车/JR東日本/JR東日本_211系_長野色.png';
  const p=live({
    trainId:'planned-trip:2026-11-05|JR-East|odpt.Railway:JR-East.ChuoMain|ChuoMain|1461M',
    trainNumber:'1461M',serviceDate:'2026-11-05',calendarType:'weekday',
    sourceRailway:'odpt.Railway:JR-East.ChuoMain',
    railDirection:'odpt.RailDirection:Outbound',
    trainType:'odpt.TrainType:JR-East.Local',
    positionSource:'realtime-api',estimated:false,
    plannedVehicleCandidates:['211系','E233系0番台']
  });
  // Same-number 211 photographs are a dated fleet REFERENCE, not proof
  // of the specific Nov 5 formation or a new physical identity.
  assert.equal(root.TrainVehicle.lookupTrainNumberPng(p),null);
  const found=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.ok(found);
  assert.equal(found.model,'211系（長野地区）');
  assert.equal(found.pngPath,path211);
  assert.equal(found.planned,true);
  const spec=marker(p);
  assert.equal(spec.kind,'vehicle');
  assert.equal(spec.iconSrc,path211);
  assert.equal(spec.planned,true);
  assert.equal(spec.compact,false);
  assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  assert.equal(p.vehiclePlan,undefined);
  const holiday=live({...p,serviceDate:'2026-11-07',calendarType:'holiday'});
  assert.equal(marker(holiday).iconSrc,path211);
  assert.equal(root.TrainVehicle.selectMarkerArtwork({...p,displayLineId:'ChuoMain'},true).kind,'unresolved',
    'failed PNG must not be retried as an invented train front');
  for(const change of [
    {trainNumber:'1463M'},
    {serviceDate:'2026-12-05'},
    {railDirection:'odpt.RailDirection:Inbound'},
    {sourceRailway:'odpt.Railway:JR-East.Joban'},
    {positionLineId:'ChuoRapid'},
    {trainOperator:'JR-Central'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {realtimeVehicleType:'E233系0番台'},
    {realtimeVehicleType:'E131系200番台'},
    {plannedVehicleCandidates:['E233系0番台']},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E233系0番台']}}
  ]){
    const other={...p,...change};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(other),null,
      '1461M planned reference must not cross evidence boundary: '+JSON.stringify(change));
  }
  assert.equal(marker({...p,displayLineId:'ChuoRapid'},'ChuoRapid').kind,'unresolved',
    'the same train identifier cannot import ChuoMain PNG to ChuoRapid');
});

test('ChuoMain scoped references keep evidence-backed PNGs and unresolved stock remains neutral',()=>{
  const e353='../images/列车/JR東日本/JR東日本_E353系.png';
  const n211='../images/列车/JR東日本/JR東日本_211系_長野色.png';
  const hbe='../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png';
  const at=(trainNumber,trainType,models,date='2026-11-04',cal='weekday')=>
    sql({trainNumber,serviceDate:date,calendarType:cal,
      trainType:'odpt.TrainType:JR-East.'+trainType,
      plannedVehicleCandidates:models});
  for(const n of ['5102M','5135M','5159M','8091M']){
    const p=at(n,'LimitedExpress',[n==='8091M'?'E353系（信州）':'E353系']);
    assert.equal(marker(p).iconSrc,e353);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
  for(const n of ['9592M','9593M']){
    const p=at(n,'Local',['211系','E233系0番台'],'2026-11-07','holiday');
    assert.equal(root.TrainNumberPngRanges.matchChuoMainUnmappedReference(p),null,
      n+' is absent from the official 2611 number roster');
    assert.equal(marker(p).kind,'unresolved');
  }
  const rapid=at('2535M','Rapid',['211系','E233系0番台']);
  assert.equal(marker(rapid).iconSrc,n211);
  for(const n of ['9580D','9581D']){
    const p=at(n,'Rapid',['211系','E233系0番台'],'2026-11-07','holiday');
    const m=marker(p);
    assert.equal(m.kind,'vehicle');
    assert.equal(m.iconSrc,hbe);
    assert.equal(m.planned,true);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
  for(const n of ['2201M','2401M','3526M']){
    const p=at(n,'Rapid',['211系','E233系0番台']);
    const m=marker(p);
    assert.equal(m.kind,'unresolved');
    assert.equal(Object.hasOwn(m,'genericFront'),false,
      'unproven JR-Central/Iida through stock must not invent a train front');
    assert.equal(m.iconSrc,'');
  }
  for(const n of ['8084M','9086M','9093M']){
    const p=at(n,'LimitedExpress',['E353系（あずさ・かいじ）']);
    const m=marker(p);
    assert.equal(m.kind,'unresolved',
      'do not show an E353 for a seasonal train on an unverified date');
    assert.equal(m.iconSrc,'');
    assert.equal(Object.hasOwn(m,'genericFront'),false);
  }
  const outside=at('9580D','Rapid',['211系','E233系0番台']);
  assert.equal(marker(outside).kind,'unresolved');
  assert.equal(marker(outside).iconSrc,'');
  assert.equal(Object.hasOwn(marker(outside),'genericFront'),false);
  const wrongLine=at('5102M','LimitedExpress',['E353系']);
  assert.equal(marker(wrongLine,'ChuoRapid').kind,'unresolved');
  const wrongMonth=at('5102M','LimitedExpress',['E353系'],'2026-12-04');
  assert.equal(root.TrainNumberPngRanges.matchChuoMainUnmappedReference(wrongMonth),null);
  const badStock=at('5102M','LimitedExpress',['211系']);
  assert.equal(root.TrainNumberPngRanges.matchChuoMainUnmappedReference(badStock),null);
});
test('ChuoMain renderer never substitutes a synthetic front for missing or failed PNG',()=>{
  const unknown=sql({trainNumber:'2201M',serviceDate:'2026-11-04',
    trainType:'odpt.TrainType:JR-East.Rapid',
    plannedVehicleCandidates:['211系','E233系0番台']});
  const m=marker(unknown);
  assert.equal(m.kind,'unresolved');
  assert.equal(m.iconSrc,'');
  assert.equal(Object.hasOwn(m,'genericFront'),false);
  assert.doesNotMatch(render,/data-generic-train-front|train-fold-generic-front|🚆/);
  assert.match(render,/knownVehicle && !compact \? "image" : "circle"/);
  assert.match(render,/iconBox\.classList\.add\('unresolved'\)/);
  assert.match(render,/車種未確認/);
  assert.match(render,/compact:true\},[\s\S]*?marker\._displayX/,
    'failed PNG must immediately fall back inside the existing train unit');
});
test('regular 2026 Chuo special expresses map by whole M train number and LimitedExpress type',()=>{
  const cases=[
    ['1M','あずさ1号'],['29M','かいじ／あずさ'],
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
    live({trainNumber:'3107M',trainType:'odpt.TrainType:JR-East.LimitedExpress'})).model,'E353系');
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
  const numbers=[['509','holiday','2026-11-03'],['843','holiday','2026-11-03'],
    ['1103','holiday','2026-11-03'],['1705','holiday','2026-11-03'],
    ['2348','weekday','2026-11-16']];
  for(const [trainNumber,calendarType,serviceDate] of numbers){
    const p=live({trainNumber,calendarType,serviceDate,positionLineId:'Ome',
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
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({
    trainNumber:'2348',serviceDate:'2026-11-15',calendarType:'holiday',
    positionLineId:'Ome',sourceRailway:'odpt.Railway:JR-East.Ome',
    trainType:'odpt.TrainType:JR-East.Local'})),null,
    '2348 must not inherit the weekday Ome identity on holidays');
});
test('2026 Ome official T and H suffix numbers map directly to E233-0 PNG',()=>{
  for(const trainNumber of ['434T','405H','1378T','1906H','2386T']){
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
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe',{serviceDate:'2026-11-03'}).model,'E233系7000番台');
  assert.equal(root.TrainNumberPngRanges.match('277M','SaikyoKawagoe'),null);
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
test('Itsukaichi 2611 month and railway scope exclude Ome-only T/H train numbers',()=>{
  const base={serviceDate:'2026-11-03',calendarType:'holiday',
    sourceRailway:'odpt.Railway:JR-East.Itsukaichi',trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',
    positionLineId:'Itsukaichi'};
  for(const n of ['434T','813H','1906H','1926H']){
    const p=live({...base,trainNumber:n});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'Itsukaichi source has no evidenced T/H fleet: '+n);
  }
  for(const n of ['7741','9270M','9351M','399','2500','2600T','2149M']){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({...base,trainNumber:n})),null,n);
  }
  assert.equal(root.TrainNumberPngRanges.match('2149','ChuoRapid'),null);
  assert.equal(root.TrainNumberPngRanges.match('2149','SaikyoKawagoe'),null);
  assert.equal(root.TrainNumberPngRanges.match('2149','Ome',{
    ...base,sourceRailway:'odpt.Railway:JR-East.Ome'}),null);
  assert.equal(root.TrainNumberPngRanges.match('1932T','ChuoRapid').model,'E233系0番台');
  assert.equal(root.TrainNumberPngRanges.match('277M','SaikyoKawagoe'),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({
    ...base,trainNumber:'2149',trainType:'odpt.TrainType:JR-East.LimitedExpress'})),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({
    ...base,trainNumber:'2149',serviceDate:'2026-12-03'})),null);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({
    ...base,trainNumber:'2149',sourceRailway:'odpt.Railway:JR-East.Joban'})),null);
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
    sourceRailway:'odpt.Railway:JR-East.Yokohama',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local'};
  assert.equal(root.TrainNumberPngRanges.match('1940K','SaikyoKawagoe',{serviceDate:'2026-11-03'}).model,'E233系7000番台');
  assert.equal(root.TrainNumberPngRanges.match('1940K','Yokohama',holidayYokohama).model,'E233系6000番台');
  assert.equal(root.TrainNumberPngRanges.match('2221K','Yokohama',holidayYokohama).model,'E233系6000番台');
  assert.equal(root.TrainNumberPngRanges.match('2221K','SaikyoKawagoe',{serviceDate:'2026-11-03'}).model,
    'E233系7000番台','the Saikyo tail interpretation is unchanged');
  assert.equal(root.TrainNumberPngRanges.match('2221K','Rinkai',{serviceDate:'2026-11-03'}).model,
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
    {trainNumber:'2999B'},
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
  // The same canonical through-train must not borrow the E531 front when
  // two realtime labels disagree. Previously the first non-empty field won.
  assert.equal(root.TrainVehicle.lookupVerifiedJobanCanonicalE531Png({
    ...liveTrain,realtimeVehicleType:'E531系',
    realtimeDerivedVehicleType:'E531系'
  }).pngPath,icon,'agreeing independent labels preserve the E531 reference');
  for(const inconsistent of [
    {realtimeVehicleType:'E531系',realtimeDerivedVehicleType:'E231系0番台'},
    {realtimeVehicleType:'E231系0番台',realtimeDerivedVehicleType:'E531系'},
    {realtimeDerivedVehicleType:'E231系0番台'}
  ]){
    const conflicting={...liveTrain,...inconsistent};
    assert.equal(root.TrainVehicle.lookupVerifiedJobanCanonicalE531Png(
      conflicting),null,'conflicting realtime labels: '+JSON.stringify(inconsistent));
    assert.equal(marker(conflicting,'Joban').kind,'unresolved',
      'conflicting realtime labels cannot render the E531 PNG');
  }

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
  const script=page.match(/data-script-src="\.\.\/data\/timetables\/train-number-png-ranges\.js\?v=([0-9a-f]{12})"/);
  assert.ok(script,'the train SVG page must load its number-to-PNG rules');
  assert.equal(script[1],hashFor('data/timetables/train-number-png-ranges.js'),
    'the number-to-PNG script cache key must match its current file contents');
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
  const index=fs.readFileSync('data/timetables/joban-e231-h-index.js','utf8');
  const indexVersion=index.match(/version:"([^"]+)"/);
  assert.ok(indexVersion,'snapshot must expose cache version');
  assert.ok(html.includes('joban-e231-h-index.js?v='+hashFor('data/timetables/joban-e231-h-index.js')));
  assert.ok(html.indexOf('joban-e231-h-index.js') <
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
  const index=root.JREastKeihinNumberIndex;
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
  // These public E numbers do not tell us whether the day's carset is
  // E231-3000 or 209-3500. E231 is only the stable ONE-PNG illustration.
  for(const n of ['461E','568E','2377E','4778E']){
    const p={...base,trainNumber:n,estimated:true,
      positionSource:'supabase-train-run',
      plannedVehicleCandidates:['E231系3000番台','209系3500番台'],
      vehiclePlan:{status:'PLANNED_CANDIDATES',
        models:['E231系3000番台','209系3500番台']}};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null);
    assert.deepEqual(Array.from(
      root.TrainNumberPngRanges.matchHachikoSouthCandidates(p).models),
      ['E231系3000番台','209系3500番台']);
    const schematic = marker(p,'Hachiko');
    assert.equal(schematic.kind,'vehicle');
    assert.equal(schematic.iconSrc,
      '../images/列车/JR東日本/JR東日本_E231系_3000番台.png');
    assert.equal(schematic.planned,true,
      'single illustrative PNG must stay visibly unconfirmed');
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN',
      'a representative PNG may not identify the actual train');
    assert.equal(root.TrainNumberPngRanges.matchHachikoSouthCandidates(p)
      .authorizesPNG,false,'mixed-working E numbers do not authorize EXACT PNG');
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
  const index=root.JREastYamanoteNumberIndex;
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
    {trainNumber:'2998B'},
    {positionLineId:'Yokohama'},
    {displayLineId:'Yokohama'}
  ]){
    const p={...base,...bad};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'Tsurumi must reject '+JSON.stringify(bad));
  }
  assert.equal(root.TrainNumberPngRanges.match('2221K','Yokohama',{
    serviceDate:'2026-11-03',calendarType:'holiday',
    sourceRailway:'odpt.Railway:JR-East.Yokohama',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local'
  }).model,'E233系6000番台');
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

test('JR timetable serviceId restores scoped H and holiday M number PNGs',()=>{
  const rapid=sql({
    trainNumber:'430H',positionLineId:'Joban',
    sourceRailway:'odpt.Railway:JR-East.JobanRapid',
    trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Rapid',
    serviceDate:'2026-11-04',calendarType:'',
    serviceId:'odpt.Calendar:Weekday'
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(rapid)?.model,
    'E231系0番台（常磐快速線・LED）');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...rapid,serviceId:''
  }),null,'unknown calendar cannot select a calendar-specific H number');
  const holiday=sql({
    trainNumber:'1252M',positionLineId:'JobanMain',
    sourceRailway:'odpt.Railway:JR-East.Joban',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-03',calendarType:'',
    serviceId:'odpt.Calendar:SaturdayHoliday'
  });
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(holiday)?.model,'E531系');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...holiday,serviceId:'odpt.Calendar:Weekday'
  }),null,'holiday-only 1252M cannot borrow a weekday timetable');
});

test('JR Yokohama 2611 PNG requires original railway and commuter train type',()=>{
  const base=live({
    trainNumber:'2221K',positionLineId:'Yokohama',
    sourceRailway:'odpt.Railway:JR-East.Yokohama',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local',
    railDirection:'odpt.RailDirection:Outbound'
  });
  const expected='../images/列车/JR東日本/JR東日本_E233系_6000番台.png';
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(base)?.pngPath,expected);
  assert.equal(marker(base,'Yokohama').iconSrc,expected);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainOperator:'',operator:''
  })?.pngPath,expected,'exact JR source permits missing SQL operator');
  for(const edit of [
    {sourceRailway:''},
    {sourceRailway:'odpt.Railway:JR-East.KeihinTohokuNegishi'},
    {sourceRailway:'odpt.Railway:Keisei.Yokohama'},
    {trainOperator:'Keisei'},
    {trainType:''},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {serviceDate:'2026-12-01'}
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...base,...edit}),null,
      'do not borrow Yokohama-number PNG: '+JSON.stringify(edit));
  }
});

test('JR Nambu 2611 source direction protects even/odd public F numbers',()=>{
  const base=live({
    positionLineId:'Nambu',sourceRailway:'odpt.Railway:JR-East.Nambu',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local',
    calendarType:'holiday',serviceDate:'2026-11-03'
  });
  const path='../images/列车/JR東日本/JR東日本_E233系_8000番台.png';
  for(const [number,direction,expected] of [
    ['404F','Inbound',true],['404F','Outbound',false],
    ['2319F','Outbound',true],['2319F','Inbound',false]
  ]){
    const p={...base,trainNumber:number,
      railDirection:'odpt.RailDirection:'+direction};
    const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(Boolean(mapped),expected,number+' '+direction);
    if(expected)assert.equal(mapped.pngPath,path);
    else assert.equal(marker(p,'Nambu').kind,'unresolved');
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainNumber:'420F',calendarType:'weekday',
    railDirection:'Inbound'
  })?.pngPath,path,'weekday-only official 420F');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainNumber:'420F',calendarType:'holiday',
    railDirection:'Inbound'
  }),null,'holiday cannot borrow weekday-only 420F');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainNumber:'2319F',calendarType:'weekday',
    railDirection:'Outbound'
  }),null,'weekday cannot borrow holiday-only 2319F');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainNumber:'999F',calendarType:'holiday',
    railDirection:'Outbound'
  }),null,'a plausible but unpublished F number cannot show a fleet PNG');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainNumber:'2319F',railDirection:''
  })?.pngPath,path,'unknown direction must not be invented');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...base,trainNumber:'2319F',railDirection:'Outbound',
    sourceRailway:'odpt.Railway:JR-East.NambuBranch'
  }),null,'branch H numbers do not share mainline F stock references');
});

test('JR 2611 Tsurumi, UmiShibaura and Okawa official B numbers use scoped E131-1000 PNG',()=>{
  const png='../images/列车/JR東日本/JR東日本_E131系_1000番台.png';
  const source={
    Tsurumi:'odpt.Railway:JR-East.Tsurumi',
    TsurumiUmiShibaura:'odpt.Railway:JR-East.TsurumiUmiShibauraBranch',
    TsurumiOkawa:'odpt.Railway:JR-East.TsurumiOkawaBranch'
  };
  const make=(line,number,calendarType,direction)=>sql({
    trainNumber:number,positionLineId:line,sourceRailway:source[line],
    trainOperator:'',operator:'',
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:calendarType==='weekday'?'2026-11-04':'2026-11-07',
    calendarType,railDirection:'odpt.RailDirection:'+direction,
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  });
  for(const [line,number,calendarType,direction] of [
    ['Tsurumi','1005B','holiday','Outbound'],
    ['TsurumiUmiShibaura','1005B','holiday','Outbound'],
    ['Tsurumi','2200B','holiday','Inbound'],
    ['Tsurumi','713B','weekday','Outbound'],
    ['TsurumiOkawa','1709B','holiday','Outbound']
  ]){
    const p=make(line,number,calendarType,direction);
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p)?.pngPath,png,
      line+' '+number);
    assert.equal(marker(p,line).iconSrc,png);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN',
      'published train number does not identify an observed carset');
  }
  const holiday=make('Tsurumi','1005B','holiday','Outbound');
  for(const diff of [
    {calendarType:'weekday',serviceDate:'2026-11-04'},
    {railDirection:'odpt.RailDirection:Inbound'},
    {trainNumber:'2999B'},
    {sourceRailway:''},
    {sourceRailway:'odpt.Railway:JR-East.TsurumiUmiShibauraBranch'},
    {trainOperator:'Keisei'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {serviceDate:'2026-12-01'}
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...holiday,...diff}),null,
      'B-number PNG cannot borrow '+JSON.stringify(diff));
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...make('TsurumiOkawa','1005B','holiday','Outbound')
  }),null,'Tsurumi Okawa cannot borrow UmiShibaura-only B numbers');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...make('TsurumiUmiShibaura','1709B','holiday','Outbound')
  }),null,'UmiShibaura cannot borrow Okawa-only B numbers');
});

test('JR 2611 Tsurumi bare numbers match official timetable calendar and exact branch',()=>{
  const source={
    Tsurumi:'odpt.Railway:JR-East.Tsurumi',
    TsurumiOkawa:'odpt.Railway:JR-East.TsurumiOkawaBranch',
    TsurumiUmiShibaura:'odpt.Railway:JR-East.TsurumiUmiShibauraBranch'
  };
  const make=(line,n,cal,dir)=>sql({
    trainNumber:n,positionLineId:line,sourceRailway:source[line],
    trainOperator:'',operator:'',
    serviceDate:cal==='weekday'?'2026-11-04':'2026-11-07',
    calendarType:cal,
    railDirection:'odpt.RailDirection:'+dir,
    trainType:'odpt.TrainType:JR-East.Local',
    vehicleIdentityStatus:'UNKNOWN'
  });
  const png='../images/列车/JR東日本/JR東日本_E131系_1000番台.png';
  for(const [line,number,calendar,direction] of [
    ['Tsurumi','602','weekday','Inbound'],
    ['Tsurumi','605','holiday','Outbound'],
    ['Tsurumi','2200','holiday','Inbound'],
    ['TsurumiOkawa','704','holiday','Inbound'],
    ['TsurumiOkawa','712','weekday','Inbound'],
    ['TsurumiUmiShibaura','605','holiday','Outbound'],
    ['TsurumiUmiShibaura','2200','weekday','Inbound']
  ]){
    const position=make(line,number,calendar,direction);
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(position)?.pngPath,png,
      line+' '+number+' '+calendar);
    assert.equal(marker(position,line).iconSrc,png);
    assert.equal(position.vehicleIdentityStatus,'UNKNOWN',
      'this is a representative fleet image, not physical carset proof');
  }
  for(const [line,number,calendar,direction] of [
    ['Tsurumi','1200','holiday','Inbound'],
    ['Tsurumi','999','weekday','Outbound'],
    ['Tsurumi','602','weekday','Outbound'],
    ['TsurumiOkawa','704','weekday','Inbound'],
    ['TsurumiOkawa','712','holiday','Inbound'],
    ['TsurumiOkawa','602','weekday','Inbound'],
    ['TsurumiUmiShibaura','2200','holiday','Inbound'],
    ['TsurumiUmiShibaura','602','weekday','Inbound']
  ]){
    const position=make(line,number,calendar,direction);
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(position),null,
      line+' must reject unpublished '+number+' '+calendar+' '+direction);
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...make('Tsurumi','999','weekday','Outbound'),
    serviceDate:'2026-10-04'
  }),null,'the November official roster cannot authorize an October broad range');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...make('Tsurumi','602','weekday','Inbound'),
    serviceDate:''
  }),null,'no service date cannot bypass the official-month evidence guard');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...make('Tsurumi','602','weekday','Inbound'),
    calendarType:'',serviceId:'odpt.Calendar:Weekday'
  })?.pngPath,png,'SQL serviceId supplies calendar without a normalized calendarType');
});

test('JR 2611 Echigo 9630M Yahiko festival E129 reference respects nine operating dates',()=>{
  const base=sql({
    trainNumber:'9630M',positionLineId:'Echigo',
    sourceRailway:'odpt.Railway:JR-East.Echigo',
    trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',
    calendarType:'holiday',serviceDate:'2026-11-03',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  });
  const png='../images/列车/JR東日本/JR東日本_E129系.png';
  for(const date of [
    '2026-11-01','2026-11-03','2026-11-07',
    '2026-11-08','2026-11-14','2026-11-15',
    '2026-11-21','2026-11-22','2026-11-23'
  ]){
    const p={...base,serviceDate:date};
    const ref=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(ref?.pngPath,png,date+' official festival train');
    assert.equal(ref.representative,true,date);
    assert.equal(marker(p,'Echigo').iconSrc,png,date);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN',
      'E129 service stock is not a confirmed physical carset');
  }
  for(const date of [
    '2026-11-02','2026-11-04','2026-11-24',
    '2026-11-28','2026-11-30','2026-12-01'
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
      ...base,serviceDate:date
    }),null,'9630M not scheduled on '+date);
  }
  for(const changes of [
    {calendarType:'weekday'},
    {calendarType:'',serviceId:'odpt.Calendar:Weekday'},
    {sourceRailway:''},
    {sourceRailway:'odpt.Railway:JR-East.Yahiko'},
    {positionLineId:'Yahiko'},
    {trainOperator:'JR-Central'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {realtimeVehicleType:'E233系0番台'},
    {vehiclePlan:{confirmed:true,models:['E233系0番台']}},
    {trainNumber:'9631M'}
  ]){
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
      ...base,...changes
    }),null,'no false special service model '+JSON.stringify(changes));
  }
});

test('JR 2611 ChuoRapid T/H PNGs use indexed calendar and directional train-number evidence',()=>{
  const common={
    positionLineId:'ChuoRapid',
    sourceRailway:'odpt.Railway:JR-East.ChuoRapid',
    trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Rapid',
    serviceDate:'2026-11-04',calendarType:'weekday',
    railDirection:'odpt.RailDirection:Inbound',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  };
  const png='../images/列车/JR東日本/JR東日本_E233系_0番台.png';
  for(const [number,calendarType,direction] of [
    ['486T','weekday','Inbound'],['1926H','weekday','Inbound'],
    ['1932T','weekday','Inbound'],['1932T','holiday','Inbound'],
    ['2452T','weekday','Inbound'],['999T','holiday','Outbound'],
    ['402H','holiday','Inbound']
  ]){
    const p=live({...common,trainNumber:number,calendarType,
      serviceDate:calendarType==='weekday'?'2026-11-04':'2026-11-07',
      railDirection:'odpt.RailDirection:'+direction});
    const match=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(match?.pngPath,png,number+' '+calendarType+' '+direction);
    assert.equal(match.representative,true,'no physical formation inference');
    assert.equal(marker(p,'ChuoRapid').iconSrc,png);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
  }
  const weekday=live({...common,trainNumber:'2452T'});
  for(const modification of [
    {calendarType:'holiday',serviceDate:'2026-11-07'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainNumber:'999H',railDirection:'odpt.RailDirection:Outbound'},
    {trainNumber:'2600T'},
    {trainNumber:'1932M'},
    {sourceRailway:'odpt.Railway:JR-East.Ome'},
    {sourceRailway:'odpt.Railway:TokyoMetro.Tozai'},
    {trainOperator:'JR-West'},
    {trainType:'odpt.TrainType:JR-East.Local'},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'}
  ]){
    const p={...weekday,...modification};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'ChuoRapid must reject '+JSON.stringify(modification));
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(sql({
    ...common,trainNumber:'2452T',
    calendarType:'',serviceId:'odpt.Calendar:Weekday'
  }))?.pngPath,png,'planned SQL serviceId supplies the weekday calendar');
  assert.equal(root.TrainNumberPngRanges.match('1932T','ChuoRapid')?.model,
    'E233系0番台','legacy context-free number lookup remains available');
});

test('JR 2611 Musashino E-number reference uses exact calendar, direction and sourced stock label',()=>{
  const pngs={
    'E231系0番台（武蔵野線）':'../images/列车/JR東日本/JR東日本_E231系_0番台.png',
    '209系500番台（武蔵野線）':'../images/列车/JR東日本/JR東日本_209系_500番台_武藏野線.png'
  };
  const common={
    positionLineId:'Musashino',displayLineId:'Musashino',
    sourceRailway:'odpt.Railway:JR-East.Musashino',
    trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.Local',
    calendarType:'weekday',serviceDate:'2026-11-04',
    railDirection:'odpt.RailDirection:Inbound',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  };
  const fleetLabels=Object.keys(pngs);
  for(const [trainNumber,calendarType,railDirection] of [
    ['416E','weekday','Inbound'],
    ['445E','holiday','Outbound'],
    ['472E','holiday','Inbound'],
    ['408E','weekday','Inbound'],
    ['408E','holiday','Inbound'],
    ['2222E','weekday','Inbound'],
    ['2281E','holiday','Outbound']
  ]){
    for(const realtimeVehicleType of fleetLabels){
      const p=live({...common,trainNumber,calendarType,
        serviceDate:calendarType==='weekday'?'2026-11-04':'2026-11-07',
        railDirection:'odpt.RailDirection:'+railDirection,
        realtimeVehicleType});
      const icon=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.equal(icon?.model,realtimeVehicleType,trainNumber+' '+realtimeVehicleType);
      assert.equal(icon.pngPath,pngs[realtimeVehicleType]);
      assert.equal(icon.representative,true,'a model image is not an observed formation');
      assert.equal(marker(p,'Musashino').iconSrc,pngs[realtimeVehicleType]);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    }
  }
  const basic=sql({...common,trainNumber:'416E',realtimeVehicleType:''});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(basic),null,
    'the Musashino E number alone cannot choose E231 over 209');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...basic,vehiclePlan:{status:'PLANNED_CANDIDATES',
      models:fleetLabels}
  }),null,'multiple model candidates cannot authorize a unique PNG');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...basic,vehiclePlan:{status:'PLANNED_MODEL',
      models:['E231系0番台']}
  })?.pngPath,pngs['E231系0番台（武蔵野線）'],
  'explicit single-model SQL plan selects approved E231 gallery');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...basic,vehiclePlan:{status:'PLANNED_MODEL',
      models:['209系500番台']}
  })?.pngPath,pngs['209系500番台（武蔵野線）'],
  'explicit single-model SQL plan selects approved 209 gallery');
  for(const modification of [
    {trainNumber:'416E',calendarType:'holiday',serviceDate:'2026-11-07'},
    {trainNumber:'472E',calendarType:'weekday'},
    {trainNumber:'416E',railDirection:'odpt.RailDirection:Outbound'},
    {trainNumber:'999E'},
    {trainNumber:'2621M'},
    {trainNumber:'2753M'},
    {trainNumber:'9069M'},
    {sourceRailway:'odpt.Railway:JR-East.Keiyo'},
    {sourceRailway:''},
    {trainOperator:'JR-West'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {serviceDate:'2026-12-01'},
    {realtimeVehicleType:'E231系900番台'},
    {realtimeVehicleType:''},
    {realtimeVehicleType:'',vehiclePlan:{status:'PLANNED_CANDIDATES',
      models:['209系500番台']}},
    {realtimeVehicleType:'',vehiclePlan:{status:'PLANNED_MODEL',
      models:['E233系0番台']}}
  ]){
    const p=live({...common,trainNumber:'416E',
      realtimeVehicleType:'E231系0番台（武蔵野線）',...modification});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'Musashino must not guess or borrow: '+JSON.stringify(modification));
  }
  assert.equal(root.TrainNumberPngRanges.match('416E','Keiyo'),null);
});
test('JR 2611 NambuBranch H-number positions use an official line-scoped E127 reference PNG',()=>{
  const png='../images/列车/JR東日本/JR東日本_E127系_0番台_南武支線.png';
  const source='odpt.Railway:JR-East.NambuBranch';
  const base={
    positionLineId:'NambuBranch',displayLineId:'NambuBranch',
    trainOperator:'JR-East',sourceRailway:source,
    trainType:'odpt.TrainType:JR-East.Local',
    serviceDate:'2026-11-04',calendarType:'weekday',
    railDirection:'odpt.RailDirection:Inbound',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  };
  const index=root.NambuBranchOfficial;
  assert.equal(index.inboundCount,39);
  assert.equal(index.outboundCount,41);
  for(const [number,direction] of [
    ['500H','Inbound'],['700H','Inbound'],['702H','Inbound'],
    ['910H','Inbound'],['920H','Inbound'],['2210H','Inbound'],
    ['411H','Outbound'],['701H','Outbound'],['703H','Outbound'],
    ['921H','Outbound'],['2101H','Outbound'],['2211H','Outbound']
  ]){
    for(const [cal,date] of [
      ['weekday','2026-11-04'],['holiday','2026-11-07']
    ]){
      for(const create of [live,sql]){
        const p=create({...base,trainNumber:number,calendarType:cal,
          serviceDate:date,railDirection:'odpt.RailDirection:'+direction});
        const chosen=root.TrainVehicle.lookupTrainNumberRangePng(p);
        assert.equal(chosen?.pngPath,png,number+' '+cal+' '+p.positionSource);
        assert.equal(chosen.model,'E127系0番台（南武支線）');
        assert.equal(chosen.representative,true);
        const rendered=marker(p,'NambuBranch');
        assert.equal(rendered.kind,'vehicle');
        assert.equal(rendered.iconSrc,png,'actual SVG marker must contain branch PNG');
        assert.equal(rendered.planned,true,'E127 representative must remain a planned image');
        assert.equal(p.vehicleIdentityStatus,'UNKNOWN',
          'a published H number never proves physical E127 rather than 205');
      }
    }
  }
  const last=sql({...base,trainNumber:'2211H',
    railDirection:'odpt.RailDirection:Outbound',
    calendarType:'',serviceId:'odpt.Calendar:SaturdayHoliday'});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(last)?.pngPath,png,
    'SQL positions often carry calendar in serviceId rather than calendarType');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...last,serviceId:'',calendarType:''
  })?.pngPath,png,
  'unknown realtime calendar is safe because 2611 weekday and holiday H sets coincide');
  for(const mod of [
    {trainNumber:'999H'}, {trainNumber:'2212H'},
    {trainNumber:'2211F'}, {trainNumber:'2211'},
    {trainNumber:'2211H',railDirection:'odpt.RailDirection:Inbound'},
    {trainNumber:'700H',railDirection:'odpt.RailDirection:Outbound'},
    {sourceRailway:'odpt.Railway:JR-East.Nambu'},
    {sourceRailway:'odpt.Railway:TokyoMetro.NambuBranch'},
    {sourceRailway:''},
    {positionLineId:'Nambu',displayLineId:'Nambu'},
    {trainOperator:'JR-Central'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {calendarType:'nonexistent',serviceId:''},
    {serviceDate:'2026-10-31'},
    {serviceDate:'2026-12-01'},
    {realtimeVehicleType:'205系1000番台'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['205系1000番台']}}
  ]){
    const p=live({...base,trainNumber:'2211H',
      railDirection:'odpt.RailDirection:Outbound',...mod});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'do not borrow or claim incorrect branch PNG: '+JSON.stringify(mod));
  }
  assert.equal(root.TrainNumberPngRanges.match('700H','Nambu'),null,
    'H branch numbers never belong to F-numbered Nambu mainline');
});

test('Nambu combined map renders branch-projected 1300H PNG without cross-line leakage',()=>{
  // Reproduces the actual DOM: data-train-unit-id identifies NambuBranch
  // 1300H, but the passenger label signature uses the containing "Nambu"
  // map. The previous exact displayLineId===positionLineId check turned
  // the approved E127 reference into a compact unresolved circle.
  const png='../images/列车/JR東日本/JR東日本_E127系_0番台_南武支線.png';
  const trainId='planned-trip:2026-11-04|JR-East|odpt.Railway%3AJR-East.NambuBranch|NambuBranch|1300H|odpt.RailDirection%3AInbound|odpt.Station%3AJR-East.NambuBranch.Shitte|13%3A13|odpt.Station%3AJR-East.NambuBranch.HamaKawasaki|odpt.Station%3AJR-East.NambuBranch.HamaKawasaki';
  const branch=sql({
    trainId,trainNumber:'1300H',
    serviceDate:'2026-11-04',serviceId:'odpt.Calendar:Weekday',
    calendarType:'',trainType:'odpt.TrainType:JR-East.Local',
    railDirection:'odpt.RailDirection:Inbound',
    sourceRailway:'odpt.Railway:JR-East.NambuBranch',
    positionLineId:'NambuBranch',
    trainOperator:'JR-East',
    fusionLineId:'NambuBranch',fusionRole:'branch',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  });
  const source=marker(branch,'NambuBranch');
  const combined=marker(branch,'Nambu');
  assert.equal(source.iconSrc,png,'original source-line diagram still works');
  assert.equal(combined.kind,'vehicle',
    'branch-projected train on Nambu overview must not become unresolved');
  assert.equal(combined.iconSrc,png,'Nambu containing map uses source-line artwork');
  assert.equal(combined.planned,true);
  assert.equal(combined.compact,false,'render SVG <image>, not a neutral circle');
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
    ...branch,displayLineId:'Nambu'
  })?.pngPath,png,'source scope remains NambuBranch after projection');
  assert.equal(branch.vehicleIdentityStatus,'UNKNOWN',
    'planned E127 artwork must not claim an actual physical formation');
  for(const modification of [
    {fusionRole:'extension'},
    {fusionRole:'through-boundary'},
    {fusionRole:''},
    {fusionLineId:'Nambu'},
    {fusionLineId:'ChuoRapid'},
    {fusionLineId:''},
    {sourceRailway:'odpt.Railway:JR-East.Nambu'},
    {sourceRailway:'odpt.Railway:TokyoMetro.NambuBranch'},
    {sourceRailway:''},
    {positionLineId:'Nambu'},
    {positionLineId:'Yokohama'},
    {trainNumber:'1301H'},
    {trainNumber:'999H'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {trainOperator:'JR-West'},
    {serviceDate:'2026-12-01'},
    {realtimeVehicleType:'205系1000番台'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['205系1000番台']}}
  ]){
    const value={...branch,...modification};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
      ...value,displayLineId:'Nambu'
    }),null,'unauthorized branch artwork: '+JSON.stringify(modification));
    assert.notEqual(marker(value,'Nambu').iconSrc,png,
      'foreign or unverified Nambu overview must not borrow the E127 PNG');
  }
  for(const otherDisplay of ['Yokohama','Keiyo','NambuBranchOther']){
    assert.notEqual(marker(branch,otherDisplay).iconSrc,png,
      'source NambuBranch PNG cannot be projected to '+otherDisplay);
  }
});

test('Tokaido 3024M Odoriko 4 coupled at Atami renders approved E257-2000 on live and SQL positions',()=>{
  const img2000='../images/列车/JR東日本/JR東日本_E257系_2000番台.png';
  const img2500='../images/列车/JR東日本/JR東日本_E257系_2500番台.png';
  const uid='planned-trip:2026-11-04|JR-East|odpt.Railway%3AJR-East.Tokaido|Tokaido|3024M|odpt.RailDirection%3AInbound|odpt.Station%3AJR-East.Tokaido.Atami|13%3A32|odpt.Station%3AJR-East.Tokaido.Tokyo|odpt.Station%3AJR-East.Tokaido.Tokyo';
  const common={
    trainNumber:'3024M',trainId:uid,
    positionLineId:'Tokaido',
    sourceRailway:'odpt.Railway:JR-East.Tokaido',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    trainOperator:'JR-East',serviceDate:'2026-11-04',
    railDirection:'odpt.RailDirection:Inbound',
    destinationStation:'Tokyo',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  };
  // Official timetable is two numbered portions (3024M+4024M) coupling
  // at Atami. The observed single SVG position must stay ONE train-unit;
  // mapping an E257 model must never synthesize a separate 4024M unit.
  for(const [calendarType,serviceDate] of [
    ['weekday','2026-11-04'],['holiday','2026-11-07']
  ]){
    for(const create of [live,sql]){
      const p=create({...common,calendarType,serviceDate});
      const mapped=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.equal(mapped?.model,'E257系2000番台');
      assert.equal(mapped.pngPath,img2000);
      assert.equal(mapped.representative,true);
      const display=marker(p,'Tokaido');
      assert.equal(display.kind,'vehicle');
      assert.equal(display.iconSrc,img2000);
      assert.equal(display.compact,false);
      assert.equal(display.planned,true);
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    }
  }
  const sqlRun=sql({...common,calendarType:'',
    serviceId:'odpt.Calendar:Weekday',trainOperator:''});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(sqlRun)?.pngPath,
    img2000,'SQL source URN alone can verify JR East operator');
  // A separately sourced 4024M from the Shuzenji portion is the 5-car
  // E257-2500 reference, not a reason to overwrite 3024M's 9-car image.
  const attachment=live({...common,trainNumber:'4024M'});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(attachment)?.model,
    'E257系2500番台');
  assert.equal(marker(attachment,'Tokaido').iconSrc,img2500);
  for(const change of [
    {trainNumber:'4030M'},{trainNumber:'3094M'},
    {trainNumber:'3003M'},{trainNumber:'4025M'},
    {trainType:'odpt.TrainType:JR-East.Local'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {sourceRailway:'odpt.Railway:JR-East.Ito'},
    {sourceRailway:'odpt.Railway:JR-East.Yokosuka'},
    {sourceRailway:'odpt.Railway:JR-West.Tokaido'},
    {sourceRailway:''},{trainOperator:'JR-Central'},
    {positionLineId:'Yokosuka'},
    {positionLineId:'TokaidoMain'},
    {serviceDate:'2026-10-31'},
    {serviceDate:'2026-12-01'},
    {serviceDate:''},
    {realtimeVehicleType:'E257系500番台'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E257系2500番台']}}
  ]){
    const p=live({...common,calendarType:'weekday',...change});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'never borrow Odoriko 3024M reference: '+JSON.stringify(change));
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(
    {...attachment,railDirection:'odpt.RailDirection:Outbound'}),null,
  '4024M is published northbound, not arbitrary downbound');
  assert.equal(root.TrainVehicle.selectMarkerArtwork(
    {...common,calendarType:'weekday',displayLineId:'SobuRapid',
      positionSource:'realtime-api',estimated:false},false).kind,
    'unresolved','Tokaido Odoriko PNG cannot appear on a foreign line');
});

test('Agatsuma 2611 official all 28 local numbers display the 211 Takasaki reference PNG on the exact line',()=>{
  const png211='../images/列车/JR東日本/JR東日本_211系_湘南色.png';
  const inbound=["520M","522M","524M","526M","528M","530M","532M","534M","536M","538M","540M","542M","544M","546M"],outbound=["521M","523M","525M","527M","529M","531M","533M","535M","537M","539M","541M","543M","545M","547M"];
  for(const [numbers,direction] of [[inbound,'Inbound'],[outbound,'Outbound']]){
    for(const cal of ['weekday','holiday']){
      const date=cal==='weekday'?'2026-11-05':'2026-11-07';
      for(const trainNumber of numbers){
        const base={
          trainId:'planned-trip:2026-11-05|JR-East|odpt.Railway:JR-East.Agatsuma|Agatsuma|'+trainNumber,
          trainNumber,positionLineId:'Agatsuma',sourceRailway:'odpt.Railway:JR-East.Agatsuma',
          trainType:'odpt.TrainType:JR-East.Local',
          trainOperator:'JR-East',railDirection:'odpt.RailDirection:'+direction,
          calendarType:cal,serviceDate:date,
          plannedVehicleCandidates:['211系']
        };
        for(const create of [live,sql]){
          const p=create(base);
          const rule=root.TrainVehicle.lookupTrainNumberRangePng(p);
          assert.ok(rule,trainNumber+'/'+cal+'/'+p.positionSource);
          assert.equal(rule.model,'211系（高崎地区）');
          assert.equal(rule.pngPath,png211);
          const spec=marker(p,'Agatsuma');
          assert.equal(spec.kind,'vehicle');
          assert.equal(spec.iconSrc,png211);
          assert.equal(spec.planned,true);
          assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
        }
      }
    }
  }
  const noOperator=sql({trainNumber:'520M',positionLineId:'Agatsuma',
    sourceRailway:'odpt.Railway:JR-East.Agatsuma',
    trainOperator:'',railDirection:'odpt.RailDirection:Inbound',
    serviceDate:'2026-11-05',calendarType:'',serviceId:'odpt.Calendar:Weekday',
    trainType:'odpt.TrainType:JR-East.Local'});
  assert.equal(marker(noOperator,'Agatsuma').iconSrc,png211);
  const local=live({trainNumber:'520M',positionLineId:'Agatsuma',
    sourceRailway:'odpt.Railway:JR-East.Agatsuma',
    trainType:'odpt.TrainType:JR-East.Local',
    calendarType:'weekday',serviceDate:'2026-11-05',
    railDirection:'odpt.RailDirection:Inbound',plannedVehicleCandidates:['211系']});
  for(const bad of [
    {trainNumber:'548M'},{trainNumber:'549M'},{trainNumber:'3002M'},
    {positionLineId:'Takasaki'},{sourceRailway:'odpt.Railway:JR-East.Takasaki'},
    {sourceRailway:'odpt.Railway:JR-East.ChuoMain'},{trainOperator:'JR-West'},
    {serviceDate:'2026-12-05'}, {serviceDate:''},
    {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {plannedVehicleCandidates:['E231系1000番台']},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E231系1000番台']}},
    {realtimeVehicleType:'E233系3000番台'}
  ]){
    const p={...local,...bad};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'not a verified 211 Agatsuma service: '+JSON.stringify(bad));
  }
});
test('Agatsuma 2611 E257-5500 named expresses: regular, public holiday, dated specials only',()=>{
  const png257='../images/列车/JR東日本/JR東日本_E257系_5500番台.png';
  const base={positionLineId:'Agatsuma',sourceRailway:'odpt.Railway:JR-East.Agatsuma',
    trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.LimitedExpress',
    calendarType:'weekday',serviceDate:'2026-11-05',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false};
  function make(number,day,cal,source){
    return (source==='SQL'?sql:live)({...base,trainNumber:number,
      serviceDate:day,calendarType:cal,
      railDirection:'odpt.RailDirection:'+(Number(number.slice(0,-1))%2?'Outbound':'Inbound')});
  }
  for(const number of ['3001M','3002M','3003M','3004M']){
    for(const [day,cal] of [['2026-11-05','weekday'],['2026-11-07','holiday']]){
      for(const src of ['SQL','LIVE']){
        const p=make(number,day,cal,src);
        assert.equal(marker(p,'Agatsuma').iconSrc,png257,number+' '+day);
        assert.equal(marker(p,'Agatsuma').planned,true);
        assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
      }
    }
  }
  for(const [n,date,cal] of [
    ['4031M','2026-11-03','holiday'],['4034M','2026-11-07','holiday'],
    ['9071M','2026-11-12','weekday'],['9071M','2026-11-27','weekday'],
    ['9082M','2026-11-01','holiday'],['9082M','2026-11-23','holiday'],
    ['9083M','2026-11-07','holiday'],['9083M','2026-11-22','holiday']
  ]) for(const source of ['SQL','LIVE']) {
    const p=make(n,date,cal,source);
    assert.equal(marker(p,'Agatsuma').iconSrc,png257,n+' '+date+'/'+source);
  }
  for(const [n,date,cal] of [
    ['4031M','2026-11-05','weekday'],['4034M','2026-11-05','weekday'],
    ['9071M','2026-11-05','weekday'],['9071M','2026-11-14','holiday'],
    ['9082M','2026-11-07','holiday'],['9082M','2026-11-05','weekday'],
    ['9083M','2026-11-08','holiday'],['9083M','2026-11-05','weekday'],
    ['9052M','2026-11-23','holiday'],['9053M','2026-11-28','holiday'],
    ['9061M','2026-11-05','weekday'],['9062M','2026-11-05','weekday'],
    ['9072M','2026-11-05','weekday'],['9073M','2026-11-05','weekday'],
    ['9074M','2026-11-05','weekday'],['9094M','2026-11-05','weekday'],
    ['9095M','2026-11-05','weekday']
  ]){
    const p=make(n,date,cal,'SQL');
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      n+' is not running in November on '+date);
  }
  const good=make('3002M','2026-11-05','weekday','SQL');
  for(const bad of [
    {trainType:'odpt.TrainType:JR-East.Local'},
    {sourceRailway:'odpt.Railway:JR-East.Takasaki'},
    {positionLineId:'Takasaki'},
    {trainOperator:'JR-West'},{serviceDate:'2026-12-01'},
    {railDirection:'odpt.RailDirection:Outbound'},
    {realtimeVehicleType:'E261系'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E261系']}}
  ]){
    const p={...good,...bad};
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'express stock must remain source-scoped: '+JSON.stringify(bad));
  }
});
test('Takasaki 3002M Kusatsu-Shima 2 runs with one E257-5500 reference PNG, not mixed commuter stock',()=>{
  // 2026-11 JR East timetable: Kusatsu-Shima 2, Takasaki 14:06 ->
  // Ueno 15:26, E257-5500. Distinct from Ito 3002M = E261 Saphir.
  const image='../images/列车/JR東日本/JR東日本_E257系_5500番台.png';
  const trainId='planned-trip:2026-11-04|JR-East|odpt.Railway%3AJR-East.Takasaki|Takasaki|3002M|odpt.RailDirection%3AInbound|odpt.Station%3AJR-East.Takasaki.Takasaki|14%3A06|odpt.Station%3AJR-East.Takasaki.Ueno|odpt.Station%3AJR-East.Takasaki.Ueno';
  const base={
    trainId,trainNumber:'3002M',positionLineId:'Takasaki',
    sourceRailway:'odpt.Railway:JR-East.Takasaki',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    trainOperator:'JR-East',railDirection:'odpt.RailDirection:Inbound',
    serviceDate:'2026-11-04',calendarType:'weekday',
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false
  };
  for(const create of [live,sql]){
    const p=create(base);
    const chosen=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(chosen?.model,'E257系5500番台');
    assert.equal(chosen.pngPath,image);
    assert.equal(chosen.representative,true);
    const view=marker(p,'Takasaki');
    assert.equal(view.kind,'vehicle');
    assert.equal(view.compact,false,'draw one SVG image not a grey circle');
    assert.equal(view.iconSrc,image);
    assert.equal(view.planned,true);
    assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    assert.equal(p.vehicleFormationId,undefined);
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(sql({
    ...base,calendarType:'',serviceId:'odpt.Calendar:Weekday',
    trainOperator:''
  }))?.pngPath,image,'SQL calendar and operator fallback must work');
  const regular=['3001M','3002M','3003M','3004M'];
  for(const number of regular) {
    const direction=Number(number.replace('M',''))%2===0?'Inbound':'Outbound';
    for(const [calendarType,serviceDate] of [
      ['weekday','2026-11-04'],['holiday','2026-11-07']
    ]){
      const p=live({...base,trainNumber:number,calendarType,serviceDate,
        railDirection:'odpt.RailDirection:'+direction});
      assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p)?.pngPath,
        image,'all regular Kusatsu-Shima services: '+number+' '+calendarType);
      assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({...p,
        railDirection:'odpt.RailDirection:'+
          (direction==='Inbound'?'Outbound':'Inbound')}),null,
      'same public number does not run in the opposite direction');
    }
  }
  for(const [number,calendarType,correct] of [
    ['4031M','holiday',true],['4034M','holiday',true],
    ['4031M','weekday',false],['4034M','weekday',false],
    ['4001M','weekday',true],['4002M','weekday',true],
    ['4003M','weekday',true],['4004M','weekday',true],
    ['4005M','weekday',true],['4006M','weekday',true],
    ['4007M','weekday',true],['4008M','weekday',true],
    ['4009M','weekday',true],['4001M','holiday',false],
    ['4009M','holiday',false]
  ]){
    const direction=Number(number.replace('M',''))%2===0?'Inbound':'Outbound';
    const p=live({...base,trainNumber:number,calendarType,
      serviceDate:calendarType==='weekday'?'2026-11-04':'2026-11-07',
      railDirection:'odpt.RailDirection:'+direction});
    const found=root.TrainVehicle.lookupTrainNumberRangePng(p);
    assert.equal(Boolean(found),correct,number+' '+calendarType);
    if(found)assert.equal(found.pngPath,image);
  }
  for(const changes of [
    {trainNumber:'9999M'}, {trainNumber:'3005M'},
    {trainNumber:'3024M'}, {trainNumber:'4000M'},
    {trainType:'odpt.TrainType:JR-East.Local'},
    {trainType:'odpt.TrainType:JR-East.Rapid'},
    {trainType:''}, {railDirection:'odpt.RailDirection:Outbound'},
    {positionLineId:'Ito'},
    {positionLineId:'Tokaido'},
    {sourceRailway:'odpt.Railway:JR-East.Ito'},
    {sourceRailway:'odpt.Railway:JR-East.Tokaido'},
    {sourceRailway:'odpt.Railway:JR-East.Agatsuma'},
    {sourceRailway:''},
    {trainOperator:'JR-West'}, {serviceDate:'2026-12-01'},
    {serviceDate:'2026-10-31'},
    {realtimeVehicleType:'E261系'},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E231系1000番台']}}
  ]){
    const p=live({...base,...changes});
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p),null,
      'the Takasaki E257 stock cannot leak into other service: '+
      JSON.stringify(changes));
  }
  const ito=live({...base,positionLineId:'Ito',
    sourceRailway:'odpt.Railway:JR-East.Ito',trainNumber:'3002M'});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(ito)?.model,
    'E261系','same 3002M on Ito is Saphir, never Kusatsu-Shima');
  assert.equal(marker(ito,'Ito').kind,'vehicle');
  assert.equal(root.TrainVehicle.selectMarkerArtwork({
    ...base,displayLineId:'UtsunomiyaJR',
    positionSource:'realtime-api',estimated:false
  },false).kind,'unresolved','do not project a Takasaki-only E257 onto a foreign map');
});

test('Joban E657 official 2611 full numbers and dated Tokiwa exceptions resolve to one PNG only',()=>{
  const e657='../images/列车/JR東日本/JR東日本_E657系.png';
  const ctx={positionLineId:'Joban',displayLineId:'Joban',
    sourceRailway:'odpt.Railway:JR-East.Joban',trainOperator:'JR-East',
    trainType:'odpt.TrainType:JR-East.LimitedExpress',
    serviceDate:'2026-11-16',calendarType:'weekday',
    railDirection:'odpt.RailDirection:Outbound',
    positionSource:'realtime-api',estimated:false,
    vehicleIdentityStatus:'UNKNOWN'};
  const resolve=(number,details={})=>root.TrainVehicle.lookupTrainNumberRangePng({
    ...ctx,trainNumber:number,...details
  });
  const regular=[...Array.from({length:30},(_,i)=>i+1),
   ...Array.from({length:36},(_,i)=>i+51)];
  for(const n of regular){
    const num=n+'M';
    const dir=n%2===0?'Inbound':'Outbound';
    for(const [day,cal] of [['2026-11-16','weekday'],['2026-11-15','holiday']]){
      assert.equal(resolve(num,{serviceDate:day,calendarType:cal,
        railDirection:'odpt.RailDirection:'+dir})?.pngPath,e657,num+'/'+cal);
      assert.equal(resolve(num,{serviceDate:day,calendarType:cal,
        railDirection:'odpt.RailDirection:'+(dir==='Inbound'?'Outbound':'Inbound')}),null,
        num+': direction must not authorize E657');
    }
  }
  assert.equal(resolve('86M',{serviceDate:'2026-11-25',
    railDirection:'odpt.RailDirection:Inbound'}),null,
    'ordinary 86M is suspended on November 25');
  assert.equal(resolve('9086M',{serviceDate:'2026-11-25',
    railDirection:'odpt.RailDirection:Inbound'})?.pngPath,e657);
  assert.equal(resolve('9086M',{serviceDate:'2026-11-24',
    railDirection:'odpt.RailDirection:Inbound'}),null);
  assert.equal(resolve('9037M',{serviceDate:'2026-11-15',calendarType:'holiday'})?.pngPath,e657);
  assert.equal(resolve('9037M',{serviceDate:'2026-11-16',calendarType:'weekday'}),null);
  for(const n of ['31M','50M','87M','9033M','9067M']){
    assert.equal(resolve(n),null,n+': absent from verified 2611 E657 mappings');
  }
  for(const extra of [{serviceDate:'2026-12-01'},{serviceDate:''},
   {trainType:'odpt.TrainType:JR-East.Local'},
   {sourceRailway:'odpt.Railway:JR-East.JobanLocal'},
   {trainOperator:'TokyoMetro'}]){
    assert.equal(resolve('1M',extra),null,JSON.stringify(extra));
  }
  assert.equal(ctx.vehicleIdentityStatus,'UNKNOWN');
});

test('Ome 2611 calendar-specific membership never widens the publication month',()=>{
 for(const [number,date,calendar,exists] of [["843","2026-11-16","weekday",false],["843","2026-11-15","holiday",true],["1926H","2026-11-16","weekday",true],["1926H","2026-11-15","holiday",false]]){
   const p=live({trainNumber:number,serviceDate:date,calendarType:calendar,
     positionLineId:'Ome',sourceRailway:'odpt.Railway:JR-East.Ome',
     trainOperator:'JR-East',trainType:'odpt.TrainType:JR-East.Local'});
   const actual=root.TrainVehicle.lookupTrainNumberRangePng(p);
   assert.equal(!!actual,exists,number+'/'+date);
 }
});

test('mixed Tozai S still needs model proof; Rinkai 8x uses a date-free pool',()=>{
 const tozai={trainNumber:'B485S',positionLineId:'Tozai',
   sourceRailway:'odpt.Railway:TokyoMetro.Tozai',trainOperator:'TokyoMetro',
   serviceDate:'2026-11-04',calendarType:'weekday',
   trainType:'odpt.TrainType:TokyoMetro.Rapid'};
 assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live(tozai)),null);
 for(const model of ['東京メトロ15000系','東京メトロ07系','東京メトロ05系（4～7次車）','東京メトロ05系（8～13次車）']){
  const p=live({...tozai,realtimeVehicleType:model});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p)?.model,model);
 }
 const base={trainNumber:'1984K',positionLineId:'SaikyoKawagoe',
   sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
   trainType:'odpt.TrainType:JR-East.Local',
   railDirection:'odpt.RailDirection:Inbound'};
 for(const date of ['','2026-11-04','2026-12-04','2035-01-01']){
  const p=live({...base,serviceDate:date});
  const pooled=root.TrainVehicle.lookupTrainNumberRangePng(p);
  assert.equal(pooled?.model,'東京臨海高速鉄道71-000形',date);
  assert.equal(pooled?.illustrative,true,date);
  assert.equal(marker(p,'SaikyoKawagoe').iconSrc,pooled.pngPath,date);
 }
 for(const model of ['東京臨海高速鉄道70-000形','東京臨海高速鉄道71-000形']){
  const p=live({...base,serviceDate:'2035-01-01',realtimeVehicleType:model});
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(p)?.model,model);
 }
 assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({...base,
  realtimeVehicleType:'東京臨海高速鉄道70-000形',
  realtimeDerivedVehicleType:'東京臨海高速鉄道71-000形'})),null);
});
test('Tokyo Metro / Mita source-number rosters stay independent of staged Toei lines',()=>{
 // Identify the responsible source-scoped rules, not their insertion order.
 const lines=new Set(['Ginza','Marunouchi','MarunouchiBranch','Chiyoda',
   'ChiyodaBranch','Namboku','Yurakucho','Fukutoshin','Mita']);
 const rows=require('../tools/build-train-number-png-catalog.cjs').getRows().filter(r=>
   r.lineIds.length===1&&lines.has(r.lineIds[0])&&
   r.weekdayNumbers&&r.holidayNumbers&&r.validFrom==='2026-11-01'&&
   r.sourceRailways&&r.sourceRailways.some(x=>
     /^odpt\.Railway:(?:TokyoMetro|Toei)\./.test(x)));
 assert.equal(rows.length,13);
 for(const r of rows){
   const line=r.lineIds[0],num=r.weekdayNumbers[0];
   const p=live({trainNumber:num,positionLineId:line,displayLineId:line,
     sourceRailway:r.sourceRailways[0],trainOperator:r.operator,
     // live() 默认是JR特急；地下铁普通列车必须提供真实车种上下文。
     trainType:'odpt.TrainType:'+r.operator+'.Local',
     calendarType:'weekday',serviceDate:'2026-11-05',
     realtimeVehicleType:r.requireExplicitModelEvidence?r.model:''});
   assert.equal(root.TrainNumberPngRanges.match(num,line,p)?.model,r.model,line);
   assert.equal(root.VehicleGaragePngMap.matchModelPath(r.model,r.pngPath,line),true);
   if(line==='Chiyoda'||line==='ChiyodaBranch'){
     assert.equal(root.TrainNumberPngRanges.match(num,line,{
       ...p,trainType:'odpt.TrainType:JR-East.LimitedExpress'}),null,
       '不允许以普通列车番号为特急分配车型 '+line);
   }
   // 三田新版要求明确实时车主；此处旧测试未提供车主，仍须拒绝。
   assert.equal(root.TrainNumberPngRanges.match(num,line,{...p,serviceDate:'2026-12-05'}),null,line);
   assert.equal(root.TrainNumberPngRanges.match(num,line,{
     ...p,sourceRailway:'odpt.Railway:TokyoMetro.Tozai'}),null,line);
   if(r.requireExplicitModelEvidence){
     assert.equal(root.TrainNumberPngRanges.match(num,line,{
       ...p,realtimeVehicleType:'',vehiclePlan:null}),null,line);
     assert.equal(root.TrainNumberPngRanges.match(num,line,{
       ...p,realtimeVehicleType:'UNKNOWN_UNKNOWN'}),null,line);
   }
   const distinctWeekday=r.weekdayNumbers.find(n=>!r.holidayNumbers.includes(n));
   if(distinctWeekday)assert.equal(root.TrainNumberPngRanges.match(distinctWeekday,line,{
     ...p,calendarType:'holiday',serviceDate:'2026-11-07'}),null,line);
 }
 for(const line of ['Asakusa','Shinjuku','Oedo'])
   assert.equal(root.TrainNumberPngRanges.match('A1001',line,
     live({trainNumber:'A1001',positionLineId:line,
       sourceRailway:'odpt.Railway:Toei.'+line,trainOperator:'Toei',
       serviceDate:'2026-11-05',calendarType:'weekday'})),null);
});

test('Toei Asakusa/Shinjuku/Oedo staged numbers only authorize owner-scoped display PNGs',()=>{
  const {getRows}=require('../tools/build-train-number-png-catalog.cjs');
  const rr=getRows().filter(r=>r.sourceEvidence==='staged-tokyo-gtfs-20261112-unverified'&&
    ['Asakusa','Shinjuku','Oedo'].includes(r.lineIds[0]));
  assert.equal(rr.length,7);
  for(const r of rr){
    const line=r.lineIds[0],n=r.weekdayNumbers[0];
    const p=live({positionLineId:line,displayLineId:line,trainNumber:n,
      sourceRailway:r.sourceRailways[0],trainOwner:'odpt.Operator:Toei',
      trainOperator:'Toei',positionSource:'realtime-api',estimated:false,
      serviceDate:'2026-11-16',calendarType:'weekday',
      realtimeVehicleType:r.requireExplicitModelEvidence?r.model:''});
    assert.equal(root.TrainNumberPngRanges.match(n,line,p)?.pngPath,r.pngPath,line);
    assert.equal(root.VehicleGaragePngMap.matchModelPath(r.model,r.pngPath,line),true);
    for(const bad of [{trainOwner:'Keio'}, {trainOwner:''},
      {sourceRailway:'odpt.Railway:Toei.Mita'},
      {positionSource:'supabase-train-run',estimated:true},
      {serviceDate:'2026-10-31'}]){
      if(line==='Oedo'&&Object.prototype.hasOwnProperty.call(bad,'trainOwner')&&
         bad.trainOwner==='')continue; // source-only owner for standalone Oedo
      assert.equal(root.TrainNumberPngRanges.match(n,line,{...p,...bad}),null,
        'owner/date/source leak '+line);
    }
    if(r.requireExplicitModelEvidence){
      assert.equal(root.TrainNumberPngRanges.match(n,line,{
        ...p,realtimeVehicleType:'',vehiclePlan:null}),null,'unknown type '+line);
      assert.equal(root.TrainNumberPngRanges.match(n,line,{
        ...p,realtimeVehicleType:'other stock'}),null,'different model '+line);
    }
    const weekdayOnly=r.weekdayNumbers.find(x=>!r.holidayNumbers.includes(x));
    if(weekdayOnly)assert.equal(root.TrainNumberPngRanges.match(weekdayOnly,line,
      {...p,calendarType:'holiday',serviceDate:'2026-11-15'}),null,
      'non-listed holiday number '+line);
  }
  const a=rr.find(x=>x.lineIds[0]==='Asakusa'),split=a.holidayNumbers.find(x=>/TA$|TB$/.test(x));
  assert.ok(split,'A/B letter variants retained as distinct published numbers');
  const pa=live({positionLineId:'Asakusa',trainNumber:split,
    trainOwner:'Toei',sourceRailway:'odpt.Railway:Toei.Asakusa',
    trainOperator:'Toei',serviceDate:'2026-11-15',calendarType:'holiday'});
  assert.equal(root.TrainNumberPngRanges.match(split,'Asakusa',pa)?.model,'都営5500形');
  assert.equal(root.TrainNumberPngRanges.match(split,'Asakusa',
    {...pa,serviceDate:'2026-11-21'}),null,'new Asakusa timetable quarantine');
  const o=rr.find(x=>x.lineIds[0]==='Oedo'),n=o.weekdayNumbers[0];
  const po=live({positionLineId:'Oedo',trainNumber:n,
    trainOwner:'Toei',sourceRailway:'odpt.Railway:Toei.Oedo',
    trainOperator:'Toei',serviceDate:'2026-11-16',
    calendarType:'weekday',realtimeVehicleType:o.model});
  assert.equal(root.TrainNumberPngRanges.match(n+'1','Oedo',po),null,
    'official ODPT Oedo numbers omit terminal 1/2; never synthesize suffix');
  assert.equal(root.TrainNumberPngRanges.match(n+'2','Oedo',po),null);
});

test('Saikyo K/F/S reference numbers fail closed for foreign source and contradictory fleet evidence',()=>{
 const families=[
  ['1940K','E233系7000番台','SaikyoKawagoe'],
  ['1976K','相鉄12000系','SaikyoKawagoe'],
  ['1984K','東京臨海高速鉄道71-000形','SaikyoKawagoe']
 ];
 for(const [number,model,line] of families){
  const base={trainNumber:number,positionLineId:line,
   sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
   trainType:'odpt.TrainType:JR-East.Local',railDirection:'odpt.RailDirection:Inbound',
   serviceDate:'2026-11-16',realtimeVehicleType:model};
  assert.ok(root.TrainVehicle.lookupTrainNumberRangePng(live(base)),number);
  for(const invalid of [
   {sourceRailway:'odpt.Railway:JR-East.JobanLocal'},
   {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
   {realtimeVehicleType:'E231系800番台'},
   {vehiclePlan:{status:'PLANNED_MODEL',models:['E231系800番台']}}
  ]){
   assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(live({...base,...invalid})),null,
    number+': invalid '+JSON.stringify(invalid));
  }
 }
 const twr=live({trainNumber:'1984K',positionLineId:'Rinkai',
   sourceRailway:'odpt.Railway:TWR.Rinkai',trainType:'odpt.TrainType:TWR.Local',
   realtimeVehicleType:'東京臨海高速鉄道70-000形',railDirection:'odpt.RailDirection:Inbound',
   serviceDate:'2026-11-16'});
 assert.match(root.TrainVehicle.lookupTrainNumberRangePng(twr).pngPath,/70-000形\.png$/);
});

test('Toei ODPT live owner namespaces select PNG in the full rendering chain',()=>{
  const rr=require('../tools/build-train-number-png-catalog.cjs').getRows()
    .filter(r=>r.requireRealtimeToeiOwner===true);
  assert.equal(rr.length,7);
  for(const row of rr){
    const line=row.lineIds[0],number=row.weekdayNumbers[0];
    const raw=live({
      trainNumber:number,trainId:'odpt.Train:Toei.'+line+'.'+number,
      positionLineId:line,displayLineId:line,
      sourceRailway:'odpt.Railway:Toei.'+line,
      trainOperator:'odpt.Operator:Toei',
      trainOwner:'odpt.TrainOwner:Toei',
      serviceDate:'2026-11-16',calendarType:'weekday',
      realtimeVehicleType:row.requireExplicitModelEvidence?row.model:'',
      actualVehicleConfirmed:false
    });
    const chosen=root.TrainVehicle.lookupTrainNumberRangePng(raw);
    assert.equal(chosen?.pngPath,row.pngPath,number+' -> scoped source PNG');
    assert.equal(chosen?.representative,true);
    const svg=marker(raw,line);
    assert.equal(svg.kind,'vehicle',line+' SVG marker');
    assert.equal(svg.iconSrc,row.pngPath);
    assert.equal(svg.planned,true);
    assert.equal(raw.trainNumber,number,'never rewrite the public train number');
    assert.equal(raw.vehicleIdentityStatus,'UNKNOWN','no physical-carset confirmation');
    for(const owner of ['odpt.Operator:Toei','Toei']){
      assert.equal(root.TrainNumberPngRanges.match(number,line,
        {...raw,trainOwner:owner})?.pngPath,row.pngPath);
    }
    for(const owner of ['', 'odpt.TrainOwner:Keio','odpt.Operator:Keikyu']){
      if(line==='Oedo'&&owner==='')continue;
      assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
        ...raw,trainOwner:owner}),null,'foreign or missing owner '+line);
    }
    // Some legacy Toei realtime APIs provided only a bare numeric code.
    // It is NOT a source-verified crosswalk to the full GTFS timetable number.
    const numericCore=number.match(/^\d+/)?.[0];
    assert.ok(numericCore);
    assert.equal(root.TrainNumberPngRanges.match(numericCore,line,
      {...raw,trainNumber:numericCore}),null,
      'must not synthesize T / A / B or a vehicle from numeric core');
  }
  // Variant-specific 10-300 / 12-600 artwork requires sourced exact models.
  const representative=rr.find(r=>r.lineIds[0]==='Asakusa');
  const n=representative.weekdayNumbers[0];
  assert.equal(root.TrainNumberPngRanges.match(n,'Asakusa',live({
    trainNumber:n,positionLineId:'Asakusa',trainOperator:'Toei',
    trainOwner:'odpt.TrainOwner:Toei',
    sourceRailway:'odpt.Railway:Toei.Asakusa',serviceDate:'2026-11-16',
    calendarType:'weekday',realtimeVehicleType:'都営6500形'})),null);
  assert.equal(root.TrainNumberPngRanges.match(n,'Asakusa',live({
    trainNumber:n,positionLineId:'Asakusa',trainOperator:'Toei',
    trainOwner:'Toei',sourceRailway:'odpt.Railway:Toei.Asakusa',
    serviceDate:'2026-11-21',calendarType:'holiday'})),null);
});

test('Saikyo-Rinkai K/F/S comprehensive bands keep parity without dates',()=>{
 const checks=[
  ['1940K','SaikyoKawagoe','E233系7000番台'],
  ['1976K','SaikyoKawagoe','相鉄12000系'],
  ['1984K','SaikyoKawagoe','東京臨海高速鉄道71-000形']
 ];
 for(const [number,line,model] of checks){
  const base={sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
   trainType:'odpt.TrainType:JR-East.Local',
   railDirection:'odpt.RailDirection:Inbound'};
  for(const date of ['','2026-10-31','2026-11-16','2026-12-01','2035-02-01']){
   assert.equal(root.TrainNumberPngRanges.match(number,line,
    {...base,serviceDate:date})?.model,model,number+'/'+date);
  }
  assert.equal(root.TrainNumberPngRanges.match(number,line,{
   ...base,railDirection:'odpt.RailDirection:Outbound'}),null);
 }
 assert.equal(root.TrainNumberPngRanges.match('1941K','SaikyoKawagoe',{
  serviceDate:'2035-02-01',
  railDirection:'odpt.RailDirection:Inbound'}),null);
});
test('2026-11-16 Oedo without trainOwner is source-owned, not model-confirmed',()=>{
  // Source: official ODPT observation at 2026-11-16T00:07:43Z:
  // 48/48 full numbers observed, 48/48 without trainOwner or vehicleType.
  // Oedo has no foreign through service (Japanese Private Railway Association).
  const rules=require('../tools/build-train-number-png-catalog.cjs').getRows()
   .filter(x=>x.requireRealtimeToeiOwner&&x.lineIds[0]==='Oedo');
  assert.equal(rules.length,4);
  for(const row of rules){
    const n=row.weekdayNumbers[0];
    const position=live({trainNumber:n,positionLineId:'Oedo',displayLineId:'Oedo',
      sourceRailway:'odpt.Railway:Toei.Oedo',trainOperator:'odpt.Operator:Toei',
      trainOwner:'',serviceDate:'2026-11-16',calendarType:'weekday',
      realtimeVehicleType:row.model,actualVehicleConfirmed:false});
    const selected=root.TrainVehicle.lookupTrainNumberRangePng(position);
    assert.equal(selected?.pngPath,row.pngPath,'separate model evidence exists');
    assert.equal(marker(position,'Oedo').kind,'vehicle');
    assert.equal(position.vehicleIdentityStatus,'UNKNOWN');
    // In the REAL feed, model evidence is absent: one A/B train number
    // must not pick an arbitrary 12-000/12-600 PNG from the common pool.
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
      ...position,realtimeVehicleType:'',vehiclePlan:null}),null);
    assert.equal(root.TrainNumberPngRanges.match(n,'Oedo',{
      ...position,realtimeVehicleType:'',vehiclePlan:null}),null);
    for(const bad of [
      {trainOperator:'',trainOwner:''},
      {trainOperator:'Keio',trainOwner:''},
      {trainOwner:'odpt.TrainOwner:Keio'},
      {sourceRailway:'odpt.Railway:Toei.Asakusa'},
      {positionSource:'supabase-train-run',estimated:true}
    ])assert.equal(root.TrainVehicle.lookupTrainNumberRangePng({
      ...position,...bad}),null,'invalid standalone Oedo evidence');
  }
});


test('operation-number PNG candidates deduplicate by final path and reject conflicts',()=>{
 const originalRules=root.VEHICLE_FAMILY_RULES;
 const ctx={lineId:'OperationPngContract',operationCode:'01T'};
 const rule=vehicleType=>({
  networkKey:'OperationPngContract',codePattern:'01T',
  exactVehicleType:vehicleType,
  sourceUrl:'https://example.invalid/operation-png-contract'
 });
 const resolve=types=>{
  root.VEHICLE_FAMILY_RULES=types.map(rule);
  return root.TrainVehicle.resolveOperationPng(ctx);
 };
 try {
  const aliases=resolve(['都営5500形','東京都交通局5500形']);
  assert.ok(aliases);
  assert.equal(aliases.status,'EXACT');
  assert.equal(aliases.vehicleType,'都営5500形');
  assert.equal(aliases.asset,
   '../images/列车/都営地下鉄/都営地下鉄_5500形.png');
  assert.equal(aliases.mappings.length,1,
   'canonical aliases must not duplicate one PNG');

  const shared=resolve(['都営10-300形','都営10-300形（3次車以降）']);
  assert.ok(shared);
  assert.equal(shared.status,'NARROWED',
   'one PNG does not prove which of two distinct vehicle labels operated');
  assert.equal(shared.vehicleType,'');
  assert.equal(shared.asset,
   '../images/列车/都営地下鉄/都営地下鉄_10-300形_3次車以降.png');
  assert.equal(new Set(shared.mappings.map(x=>x.asset)).size,1);

  assert.equal(resolve(['都営5500形','都営10-300形']),null,
   'different eligible PNGs must fail closed');
  assert.equal(resolve(['都営10-300形','都営5500形']),null,
   'reversing rule order must not select a winner');
 }finally{
  root.VEHICLE_FAMILY_RULES=originalRules;
 }
});


test('last-mile number PNG candidates deduplicate identical paths and reject mixed-source alternatives',()=>{
 const choose=root.TrainVehicle.chooseUniqueNumberPng;
 const a={pngPath:'../images/列车/JR東日本/JR東日本_E353系.png',source:'published-number'};
 const same={pngPath:a.pngPath,source:'sql-number-reference'};
 const b={pngPath:'../images/列车/JR東日本/JR東日本_E233系.png',source:'number-band'};
 assert.equal(choose([]).candidate,null);
 assert.equal(choose([null,null]).conflict,false);
 assert.equal(choose([a]).candidate,a);
 assert.equal(choose([a,same]).candidate,a);
 assert.equal(choose([a,same]).conflict,false,'a duplicate path is not a conflict');
 assert.equal(choose([a,b]).candidate,null);
 assert.equal(choose([a,b]).conflict,true);
 assert.equal(choose([b,a]).conflict,true,'reversing source order cannot resolve a conflict');
 assert.equal(choose([a,b]).conflict,choose([b,a]).conflict);
});


test('JR-Central Shinkansen number sources reconcile by PNG without priority',()=>{
 const original=root.TrainNumberPngRanges;
 const centralPng='../images/列车/JR東海/JR東海_N700系.png';
 const westPng='../images/列车/JR西日本/JR西日本_N700系.png';
 const base=sql({
  trainId:'planned-trip:2026-11-03|JR-Central|TokaidoShinkansen|1A',
  trainNumber:'1A',positionLineId:'TokaidoShinkansen',
  sourceRailway:'odpt.Railway:JR-Central.TokaidoShinkansen',
  trainOperator:'JR-Central',serviceDate:'2026-11-03',
  calendarType:'holiday',
  trainType:'odpt.TrainType:JR-Central.Nozomi',
  sqlPlannedNumberPngPath:centralPng
 });
 const range=(model,pngPath)=>({
  ...original,match(){return {trainNumber:'1A',lineId:'TokaidoShinkansen',
   model,pngPath,source:'browser-number-band',
   planned:true,representative:true};}
 });
 try {
  root.TrainNumberPngRanges={...original,match(){return null;}};
  assert.equal(marker(base,'TokaidoShinkansen').iconSrc,centralPng,
   'the SQL-only path remains available');
  root.TrainNumberPngRanges=range('N700系（JR東海）',centralPng);
  assert.equal(marker(base,'TokaidoShinkansen').iconSrc,centralPng,
   'the same PNG from browser and SQL sources deduplicates');
  root.TrainNumberPngRanges=range('N700系（JR西日本）',westPng);
  const selectedConflict=
   root.TrainVehicle.selectMarkerArtwork(base,false);
  assert.equal(selectedConflict.reason,'conflicting-number-png-sources');
  const conflict=marker(base,'TokaidoShinkansen');
  assert.equal(conflict.kind,'unresolved');
  assert.equal(conflict.iconSrc,'');
  root.TrainNumberPngRanges=range('N700系（JR東海）',centralPng);
  const reversedInput={...base,sqlPlannedNumberPngPath:westPng};
  const reversedSelection=
   root.TrainVehicle.selectMarkerArtwork(reversedInput,false);
  assert.equal(reversedSelection.reason,'conflicting-number-png-sources');
  const reversed=marker(reversedInput,'TokaidoShinkansen');
  assert.equal(reversed.kind,'unresolved',
   'swapping which source carries each PNG cannot create a winner');
 }finally{
  root.TrainNumberPngRanges=original;
 }
});


test('generic band conflict survives other-number-source reconciliation',()=>{
 const original=root.TrainNumberPngRanges;
 try {
  root.TrainNumberPngRanges={...original,match:function(number,line,scope){
   if(typeof scope.onNumberPngConflict==='function')
    scope.onNumberPngConflict({lineId:line,trainNumber:number,pngPaths:['A','B']});
   return null;
  }};
  const pos=live({trainNumber:'1940K',positionLineId:'SaikyoKawagoe',
   sourceRailway:'odpt.Railway:JR-East.SaikyoKawagoe',
   trainType:'odpt.TrainType:JR-East.Local',
   railDirection:'odpt.RailDirection:Inbound',serviceDate:'2026-11-16'});
  const status={};
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(pos,status),null);
  assert.equal(status.conflict,true);
  const other={pngPath:'../images/列车/JR東日本/JR東日本_E353系.png'};
  const combined=root.TrainVehicle.chooseUniqueNumberPng([other],status.conflict);
  assert.equal(combined.candidate,null,'separate number picture cannot hide generic collision');
  assert.equal(combined.conflict,true);
  assert.equal(marker(pos,'SaikyoKawagoe').kind,'unresolved');
 }finally{
  root.TrainNumberPngRanges=original;
 }
});


test('operation-number PNG library preserves independently scoped rows before selection',()=>{
 const originalRules=root.VEHICLE_FAMILY_RULES;
 const rule=calendarType=>({
  networkKey:'OperationPngScopeContract',codePattern:'01T',
  operator:'Toei',exactVehicleType:'都営5500形',calendarType,
  sourceUrl:'https://example.invalid/operation-png-scope/'+calendarType
 });
 const resolve=calendarType=>root.TrainVehicle.resolveOperationPng({
  lineId:'OperationPngScopeContract',operationCode:'01T',
  operator:'Toei',calendarType
 });
 try {
  root.VEHICLE_FAMILY_RULES=[rule('weekday'),rule('holiday')];
  const rows=root.TrainVehicle.getOperationPngLibrary()
   .filter(x=>x.lineId==='OperationPngScopeContract');
  assert.equal(rows.length,2,
   'different calendar scopes must reach the final candidate selector');
  assert.equal(rows.map(x=>x.operator).join(','),'Toei,Toei',
   'family-rule operator guards must be retained');
  assert.ok(resolve('weekday'));
  assert.ok(resolve('holiday'),
   'a later holiday row cannot be erased by an earlier weekday row');
  assert.equal(root.TrainVehicle.resolveOperationPng({
   lineId:'OperationPngScopeContract',operationCode:'01T',
   operator:'Keio',calendarType:'weekday'
  }),null,'the retained operator guard rejects another operator');

  root.VEHICLE_FAMILY_RULES=[rule('holiday'),rule('weekday')];
  assert.ok(resolve('weekday'));
  assert.ok(resolve('holiday'),
   'reversing scoped rule order cannot change availability');
 }finally{
  root.VEHICLE_FAMILY_RULES=originalRules;
 }
});


test('GTFS labels with multiple eligible PNG series fail closed regardless of source order',()=>{
 const base={
  lineId:'ShonanShinjuku',
  railway:'odpt.Railway:JR-East.ShonanShinjuku',
  operator:'JR-East',trainNumber:'AMBIGUOUS-LABEL',
  serviceDate:'2026-11-17',vehicleEvidenceKind:'vehicle-label'
 };
 const fromLabel=label=>root.TrainVehicle.resolveRealtime({
  ...base,realtimeVehicleLabel:label
 }).vehicleResult;
 const e231=fromLabel('E231系1000番台');
 const e233=fromLabel('E233系3000番台');
 assert.equal(e231.name,'E231系1000番台');
 assert.equal(e233.name,'E233系3000番台');
 assert.notEqual(e231.iconPath,e233.iconPath,
  'both identities refer to different PNG artworks');
 for(const label of [
  'E231系1000番台 / E233系3000番台',
  'E233系3000番台 / E231系1000番台'
 ]) {
  const ambiguous=fromLabel(label);
  assert.equal(ambiguous.name,'',
   'multiple matched series cannot choose the first catalogue item');
  assert.equal(ambiguous.iconPath,'',
   'ambiguous labels cannot leak either vehicle PNG');
 }
 const separate=root.TrainVehicle.resolveRealtime({
  ...base,realtimeVehicleLabel:'E231系1000番台',
  gtfsVehicleLabel:'E233系3000番台'
 }).vehicleResult;
 assert.equal(separate.name,'',
  'conflicting label fields cannot be decided by field order');
 assert.equal(separate.iconPath,'');
});


test('physical-car resolvers collect conflicts instead of accepting the first source',()=>{
 const originalRoster=root.VEHICLE_CARSETS;
 const context={
  operator:'HakodateCity',lineId:'Hakodate2',
  railway:'odpt.Railway:HakodateCity.Hakodate2',
  realtimeCarNumber:'3001',serviceDate:'2026-11-19',
  _realtimeVehicleResolution:true
 };
 const roster=vehicleType=>[{
  operator:'HakodateCity',vehicle_type:vehicleType,
  carset_id:'3001F',cars:['3001'],snapshot_date:'2026-11-01',
  source_url:'https://example.invalid/hakodate-roster',status:'運用中'
 }];
 try {
  root.VEHICLE_CARSETS=roster('函館市電9600形');
  const conflict=root.TrainVehicle.resolve(context);
  assert.equal(conflict.name,'');
  assert.equal(conflict.identityStatus,'NARROWED');
  assert.equal(conflict.identityReason,'conflicting-physical-car-evidence');
  assert.equal(conflict.iconPath,'');
  assert.equal(conflict.physicalCarEvidenceConflict,true);
  assert.deepEqual(Array.from(conflict.physicalCarEvidenceCandidates).sort(),
   ['函館市電3000形（3001号車）','函館市電9600形'].sort(),
   'live-car and roster identities must both reach arbitration');

  root.VEHICLE_CARSETS=roster('函館市電3000形（3001号車）');
  const converged=root.TrainVehicle.resolve(context);
  assert.equal(converged.identityStatus,'EXACT');
  assert.equal(converged.physicalCarEvidenceConflict,false);
  assert.equal(converged.name,'函館市電3000形（3001号車）');
  assert.equal(converged.iconPath,
   '../images/列车/函館市電/函館市電_3000形_3001号車.png');
 }finally{
  root.VEHICLE_CARSETS=originalRoster;
 }
});
test('JR-06 Kuroshio 2069M cannot infer either 287 anniversary PNG from a bare public number',()=>{
  const special=[
    '../images/列车/JR西日本/JR西日本_287系_KRM.png',
    '../images/列车/JR西日本/JR西日本_287系_SKR.png'
  ];
  // Aug sightings are deliberately historical and mutually non-stationary.
  // A future service day or a second railway must not re-use them as carset evidence.
  for(const [date,calendarType] of [
    ['2026-08-22','holiday'],['2026-08-30','holiday'],
    ['2026-11-19','weekday'],['2027-08-30','weekday']
  ]) {
    for(const lineId of ['KiseiWest','Hanwa']) {
      const p=sql({
        trainNumber:'2069M',trainId:'planned-trip:'+date+'|JR-West|'+lineId+'|2069M',
        serviceDate:date,calendarType,
        positionLineId:lineId,displayLineId:lineId,
        sourceRailway:'odpt.Railway:JR-West.'+lineId,
        trainOperator:'JR-West',
        trainType:'odpt.TrainType:JR-West.LimitedExpress',
        railDirection:'odpt.RailDirection:Outbound',
        vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
        vehicleResolvedFromRealtime:false,actualVehicleConfirmed:false,
        vehicleFormationId:'',vehicleFormationCandidates:[],
        plannedVehicleCandidates:['287系']
      });
      const byNum=root.TrainVehicle.lookupTrainNumberRangePng(p);
      assert.equal(byNum,null,lineId+'/'+date+': no trusted static anniversary PNG range');
      const rendered=marker(p,lineId);
      assert.equal(rendered.kind,'unresolved',lineId+'/'+date+': must show neutral marker');
      assert.ok(!special.includes(rendered.iconSrc||''));
      assert.equal(p.vehicleIdentityStatus,'UNKNOWN');
    }
  }
});

test('JR-06 review-only canonical model labels never authorize a PNG or a false 2026 carset',()=>{
 const reviewed = [
  ['JR西日本223系（H2）','Hanwa','223系_H2'],
  ['JR西日本223系（H6）','Hanwa','223系_H6'],
  ['JR西日本223系（KAH）','Hanwa','223系_KAH'],
  ['JR西日本223系（KIL）','Hanwa','223系_KIL'],
  ['JR西日本223系（MORI）','Hanwa','223系_MORI'],
  ['JR西日本225系（V1）','Hanwa','225系_V1'],
  ['JR西日本225系','Hanwa','225系'],
  ['JR西日本227系（WK）','Hanwa','227系_WK'],
  ['JR西日本271系','Hanwa','271系'],
  ['JR西日本281系','Hanwa','281系'],
  ['JR西日本283系（K）','KiseiWest','283系_K'],
  ['JR西日本287系（K）','KiseiWest','287系_K'],
  ['JR西日本287系（KRM）','KiseiWest','287系_KRM'],
  ['JR西日本287系（SKR）','KiseiWest','287系_SKR'],
  ['JR西日本287系（V1）','KiseiWest','287系_V1']
 ];
 assert.equal(reviewed.length,15);
 for(const [name,line,filename] of reviewed){
   const png='../images/列车/JR西日本/JR西日本_'+filename+'.png';
   const identity=root.TrainVehicle.resolveCanonicalVehicle(name);
   assert.ok(identity,name+': model label remains searchable');
   assert.equal(identity.artworkReviewRequired,true,name+': review state retained');
   assert.equal(root.TrainIcons.resolveVehicleArtwork(name,'2026-11-19'),null,
     name+': exact model label alone must not authorize review image');
   const result=root.TrainVehicle.resolve({
     lineId:line,operator:'JR-West',trainNumber:'2069M',
     timetableVehicleType:name,serviceDate:'2026-11-19'
   });
   assert.equal(result.identityStatus,'EXACT',name+': known model name retained');
   assert.equal(result.iconPath,'',name+': no review artwork');
   for(const source of ['realtime-api','supabase-train-run']){
     const p={
       trainNumber:'2069M',trainId:'jr06-review-'+filename,
       serviceDate:'2026-11-19',calendarType:'weekday',
       sourceRailway:'odpt.Railway:JR-West.'+line,
       positionLineId:line,displayLineId:line,trainOperator:'JR-West',
       positionSource:source,estimated:source!=='realtime-api',
       trainType:'odpt.TrainType:JR-West.LimitedExpress',
       vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true,
       vehicleType:name,vehicleIconPath:png,
       vehicleResolution:{identityStatus:'EXACT',lineId:line,name,
         iconPath:png,sources:['timetable']}
     };
     const art=marker(p,line);
     assert.equal(art.kind,'unresolved',name+'/'+source+
       ': even a flattened upstream icon cannot bypass review');
     assert.equal(art.iconSrc||'','');
   }
 }
 // Approved art outside this batch must continue to resolve unchanged.
 assert.equal(root.TrainIcons.resolveVehicleArtwork('E353系','2026-11-19'),
   '../images/列车/JR東日本/JR東日本_E353系.png');
});

test('JR-06 review rows cannot be elevated by SQL artwork hydration',()=>{
 const name='JR西日本287系（KRM）';
 const p='images/列车/JR西日本/JR西日本_287系_KRM.png';
 root.TrainIcons.hydrateVerifiedArtworkCatalog([
   {image_path:p,vehicle_type:'287系',formation_id:'HC603',
    asset_status:'review',livery:'くろしお60周年'}
 ]);
 assert.equal(root.TrainIcons.resolveVehicleArtwork(name,'2026-11-19'),null);
 assert.equal(root.TrainIcons.resolveVehicleArtwork('JR西日本287系（HC603編成）','2026-11-19'),null);
});


test('JR-07 review-only identity cannot select any of 15 West Japan PNGs by exact model text or injected icon',()=>{
  const cases=[
    ["JR西日本287系","Fukuchiyama","287系"],
    ["JR西日本289系（G）","Fukuchiyama","289系_G"],
    ["JR西日本289系（K-INS）","Fukuchiyama","289系_K_INS"],
    ["JR西日本289系（KANI）","Fukuchiyama","289系_KANI"],
    ["JR西日本289系（KG）","Fukuchiyama","289系_KG"],
    ["JR西日本289系（K-KANI）","Fukuchiyama","289系_KKANI"],
    ["JR西日本289系（MHR）","Fukuchiyama","289系_MHR"],
    ["JR西日本289系（MHS）","Fukuchiyama","289系_MHS"],
    ["JR西日本323系（M）","OsakaLoop","323系_M"],
    ["JR西日本323系（OR）","OsakaLoop","323系_OR"],
    ["JR西日本681系（FT）","Kosei","681系_FT"],
    ["JR西日本683系（K）","Kosei","683系_K"],
    ["JR西日本683系（K4）","Kosei","683系_K4"],
    ["JR西日本683系（N）","Kosei","683系_N"],
    ["JR西日本683系（SRN）","Kosei","683系_SRN"]
  ];
  assert.equal(cases.length,15);
  for(const [name,line,stem] of cases){
    const record=root.TrainVehicle.resolveCanonicalVehicle(name);
    assert.ok(record&&record.artworkReviewRequired===true,name+' review flag');
    const file='../images/列车/JR西日本/JR西日本_'+stem+'.png';
    assert.equal(root.TrainIcons.resolveVehicleArtwork(name,'2026-11-19'),null,name);
    const resolved=root.TrainVehicle.resolve({lineId:line,operator:'JR-West',
      timetableVehicleType:name,serviceDate:'2026-11-19',trainNumber:'2069M'});
    assert.equal(resolved.identityStatus,'EXACT',name+': retain model identity');
    assert.equal(resolved.iconPath,'',name+': no review-only art');
    for(const source of ['realtime-api','supabase-train-run']){
      const p={trainNumber:'2069M',serviceDate:'2026-11-19',calendarType:'weekday',
        positionLineId:line,displayLineId:line,sourceRailway:'odpt.Railway:JR-West.'+line,
        trainOperator:'JR-West',positionSource:source,estimated:source!=='realtime-api',
        vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true,
        vehicleType:name,vehicleIconPath:file,
        vehicleResolution:{identityStatus:'EXACT',lineId:line,name,iconPath:file,sources:['timetable']}};
      const actual=marker(p,line);
      assert.equal(actual.kind,'unresolved',name+'/'+source+': review-only PNG was exposed');
      assert.equal(actual.iconSrc||'','');
    }
  }
  assert.equal(root.TrainIcons.resolveVehicleArtwork('E353系','2026-11-19'),
    '../images/列车/JR東日本/JR東日本_E353系.png');
});
test('JR-07 generic 323-series evidence remains generic, never coerced into OR or M variant',()=>{
 const normal=['323系','323系（大阪環状線）','JR西日本323系'];
 const variants=['JR西日本323系（M）','JR西日本323系（OR）'];
 for(const line of ['OsakaLoop','Yumesaki']){
   for(const name of normal){
     const p=root.TrainVehicle.resolve({
       lineId:line,operator:'JR-West',trainNumber:'1710',
       serviceDate:'2026-11-20',timetableVehicleType:name
     });
     assert.equal(p.identityStatus,'EXACT',line+': '+name);
     assert.equal(p.name,'JR西日本323系',line+': generic must stay generic');
     assert.equal(p.iconPath,'',line+': no unauthorized M/OR artwork');
     const rec=root.TrainVehicle.resolveCanonicalVehicle('JR西日本323系');
     assert.ok(rec&&rec.candidateOnly===true);
     assert.equal(rec.asset||null,null);
   }
 }
 for(const name of variants){
   const p=root.TrainVehicle.resolve({
     lineId:'OsakaLoop',operator:'JR-West',trainNumber:'1710',
     serviceDate:'2026-11-20',timetableVehicleType:name
   });
   assert.equal(p.identityStatus,'EXACT');
   assert.equal(p.name,name);
   assert.equal(p.iconPath,'',name+': explicit review-only variant still lacks approved art');
 }
 for(const name of [...normal,...variants]){
   const p=root.TrainVehicle.resolve({
     lineId:'Hanwa',operator:'JR-West',trainNumber:'1710',
     serviceDate:'2026-11-20',timetableVehicleType:name
   });
   assert.equal(p.identityStatus,'UNKNOWN',name+': Osaka fleet cannot leak into Hanwa');
   assert.equal(p.iconPath,'');
 }
});

test('JR-07 generic 289 model never selects one of seven review-only paint variants',()=>{
 const variants=['G','K-INS','KANI','KG','K-KANI','MHR','MHS'];
 const generic=root.TrainVehicle.resolveCanonicalVehicle('289系');
 assert.ok(generic&&generic.candidateOnly===true);
 assert.equal(generic.displayName,'JR西日本289系');
 assert.equal(generic.asset||null,null);
 for(const line of ['Fukuchiyama','SaninMain','KiseiWest']){
   for(const name of ['289系','JR西日本289系']){
     const result=root.TrainVehicle.resolve({
       lineId:line,operator:'JR-West',timetableVehicleType:name,
       serviceDate:'2026-11-20',trainNumber:'3028M'
     });
     assert.equal(result.identityStatus,'EXACT',line+'/'+name);
     assert.equal(result.name,'JR西日本289系');
     assert.equal(result.iconPath,'');
   }
   for(const type of variants){
     const name='JR西日本289系（'+type+'）';
     const result=root.TrainVehicle.resolve({
       lineId:line,operator:'JR-West',timetableVehicleType:name,
       serviceDate:'2026-11-20',trainNumber:'3028M'
     });
     assert.equal(result.name,name);
     assert.equal(result.iconPath,'',name+' must remain review-only');
   }
 }
 for(const name of ['289系','JR西日本289系']){
   const result=root.TrainVehicle.resolve({
     lineId:'OsakaLoop',operator:'JR-West',timetableVehicleType:name,
     serviceDate:'2026-11-20',trainNumber:'3028M'
   });
   assert.equal(result.identityStatus,'UNKNOWN');
   assert.equal(result.iconPath,'');
 }
});

test('all trains.html lazy script attributes stay quoted and TrainVehicle cache key matches blob',()=>{
 const html=fs.readFileSync('pages/trains.html','utf8');
 const lazy=html.split('\n').filter(line=>line.includes('data-script-src='));
 assert.ok(lazy.length>0);
 for(const line of lazy)
   assert.match(line,/data-script-src="[^"]+"(?:\s|>)/,line);
 const matches=lazy.filter(line=>line.includes('../js/train-vehicle.js?v='));
 assert.equal(matches.length,1);
 assert.match(matches[0],new RegExp('data-script-src="../js/train-vehicle\\.js\\?v='+
   hashFor('js/train-vehicle.js')+'"'));
});

test('JR-08 canonical review gate rejects 13 not-yet-authorized JR-West artwork paths',()=>{
 const cases=[["N700系7000番台（JR西日本）","SanyoShinkansen","N700系_7000番台"],["JR西日本683系","Kosei","683系"],["JR西日本キハ35系","SaninMain","キハ35系"],["JR西日本キハ40系（AMTC）","SaninMain","キハ40系_AMTC"],["JR西日本キハ40系（ETS）","SaninMain","キハ40系_ETS"],["JR西日本キハ40系（JBEL）","SaninMain","キハ40系_JBEL"],["JR西日本キハ40系（JNRN）","SaninMain","キハ40系_JNRN"],["JR西日本キハ40系（OOG）","SaninMain","キハ40系_OOG"],["JR西日本キハ40系（OOR）","SaninMain","キハ40系_OOR"],["JR西日本キハ40系（UYM）","SaninMain","キハ40系_UYM"],["JR西日本キハ41系","Bantan","キハ41系"],["JR西日本キハ47系（SAK）","SaninMain","キハ47系_SAK"],["JR西日本キハ87系","SaninMain","キハ87系"]];
 assert.equal(cases.length,13);
 for(const [name,line,stem] of cases){
   const record=root.TrainVehicle.resolveCanonicalVehicle(name);
   assert.ok(record&&record.artworkReviewRequired===true,name+': preserve review gate');
   const path='../images/列车/JR西日本/JR西日本_'+stem+'.png';
   assert.equal(root.TrainIcons.resolveVehicleArtwork(name,'2026-11-20'),null,
     name+': model name without image/formation evidence must not authorize PNG');
   for(const src of ['realtime-api','supabase-train-run']){
     const p={trainNumber:'9999M',serviceDate:'2026-11-20',
       calendarType:'weekday',positionLineId:line,displayLineId:line,
       sourceRailway:'odpt.Railway:JR-West.'+line,
       trainOperator:'JR-West',positionSource:src,estimated:src!=='realtime-api',
       vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true,
       vehicleType:name,vehicleIconPath:path,
       vehicleResolution:{identityStatus:'EXACT',lineId:line,name,
         iconPath:path,sources:['timetable']}};
     const actual=marker(p,line);
     assert.notEqual(actual.iconSrc,path,name+'/'+src+': pending image cannot bypass gate');
   }
 }
});
test('JR-07 generic 681 model cannot borrow FT or 683 review-only art on Kosei and Kyoto lines',()=>{
 for(const line of ['Kosei','TokaidoKansai']){
   for(const name of ['681系','JR西日本681系']){
     const r=root.TrainVehicle.resolve({
       lineId:line,operator:'JR-West',trainNumber:'4050M',
       timetableVehicleType:name,serviceDate:'2026-11-20'
     });
     assert.equal(r.identityStatus,'EXACT',name+'/'+line);
     assert.equal(r.name,'JR西日本681系',name+'/'+line);
     assert.equal(r.iconPath,'',name+'/'+line);
   }
   const generic=root.TrainVehicle.resolveCanonicalVehicle('681系');
   assert.equal(generic.displayName,'JR西日本681系');
   assert.equal(generic.candidateOnly,true);
   assert.equal(generic.asset||null,null);
   assert.equal(generic.evidenceSource,
     'https://www.westjr.co.jp/company/business/material/pdf/list_rolling_stock.pdf');
   for(const name of ['JR西日本681系（FT）','JR西日本683系','JR西日本683系（K）',
       'JR西日本683系（K4）','JR西日本683系（N）','JR西日本683系（SRN）']){
     const r=root.TrainVehicle.resolve({
       lineId:line,operator:'JR-West',trainNumber:'4050M',
       timetableVehicleType:name,serviceDate:'2026-11-20'
     });
     assert.equal(r.identityStatus,'EXACT',name+'/'+line);
     assert.equal(r.name,name,'model and special variant names are distinct');
     assert.equal(r.iconPath,'',name+' currently has no approved artwork');
   }
 }
 for(const line of ['Fukuchiyama','OsakaLoop','Hanwa']){
   for(const name of ['681系','JR西日本681系','JR西日本681系（FT）']){
     const r=root.TrainVehicle.resolve({
       lineId:line,operator:'JR-West',trainNumber:'4050M',
       timetableVehicleType:name,serviceDate:'2026-11-20'
     });
     assert.equal(r.identityStatus,'UNKNOWN',name+'/'+line);
     assert.equal(r.iconPath,'');
   }
 }
});

test('P-02 Tokyu review-only images stay unselectable while approved 6020 stays available',()=>{
  const review=[
    ['東急5000系','東急5000系','東急電鉄_5000系_従来デザイン.png','TokyuDenEn'],
    ['東急6000系','東急6000系','東急電鉄_6000系.png','TokyuOimachi'],
    ['東急9000系','東急9000系','東急電鉄_9000系.png','TokyuOimachi']
  ];
  const map=root.VehicleGaragePngMap;
  for(const [identity,model,file,line] of review){
    const rec=root.TrainVehicle.resolveCanonicalVehicle(identity);
    assert.ok(rec,identity+': canonical model identity retained');
    assert.equal(rec.artworkReviewRequired,true,identity+': review gate');
    assert.equal(root.TrainIcons.resolveVehicleArtwork(identity,'2026-11-21'),null,
      identity+': model label alone cannot publish review PNG');
    const path='../images/列车/東急電鉄/'+file;
    assert.equal(map.hasPng(path),true);
    assert.equal(map.matchModelPath(model,path,line),false,
      identity+': garage cannot bypass review gate');
  }
  const other=[
    ['東急5000系','東急電鉄_5000系_リニューアル車.png','TokyuDenEn'],
    ['图库待审・東急電鉄・東急電鉄_6020系_追加','東急電鉄_6020系_追加.png','TokyuOimachi']
  ];
  for(const [model,file,line] of other){
    const path='../images/列车/東急電鉄/'+file;
    assert.equal(map.hasPng(path),true);
    assert.equal(map.matchModelPath(model,path,line),false);
  }
  assert.equal(map.matchModelPath('東急6020系',
    '../images/列车/東急電鉄/東急電鉄_6020系.png','TokyuOimachi'),true,
    'approved base artwork must remain accessible');
});

test('P-03 Tobu 250 artwork in review scope cannot be selected from model label',()=>{
  const model='東武250型';
  const p='../images/列车/東武鉄道/東武鉄道_200型_250番台.png';
  const rec=root.TrainVehicle.resolveCanonicalVehicle(model);
  assert.ok(rec,'Tobu 250 identity preserved');
  assert.equal(rec.artworkReviewRequired,true);
  assert.equal(root.TrainIcons.resolveVehicleArtwork(model,'2026-11-21'),null);
  assert.equal(root.VehicleGaragePngMap.hasPng(p),true);
  assert.equal(root.VehicleGaragePngMap.matchModelPath(model,p,'TobuIsesaki'),false);
});

test('浅草线11月24日官方名册逐号回放，仅实时都营车主可获得5500形参考图',()=>{
 const r=root.TrainNumberPngRanges.toeiAsakusaOfficialRoster;
 assert.equal(r.weekday.length,190);assert.equal(r.holiday.length,182);
 assert.equal(new Set([...r.weekday,...r.holiday]).size,344);
 assert.equal(crypto.createHash('sha256').update(r.weekday.join(' ')).digest('hex'),'c90391b5496969f3205bee54b388ecf87aa6921cd5481668a7de372eba4b7e83');
 assert.equal(crypto.createHash('sha256').update(r.holiday.join(' ')).digest('hex'),'637b638b6a3c5b0cf2b99b2a71e2507d5565177d1eefa5f7487ecc8dda005f8d');
 const p=(n,cal,mods={})=>live({trainNumber:n,positionLineId:'Asakusa',displayLineId:'Asakusa',
  trainOwner:'odpt.TrainOwner:Toei',trainOperator:'Toei',sourceRailway:'odpt.Railway:Toei.Asakusa',
  serviceDate:cal==='weekday'?'2026-11-26':'2026-11-29',calendarType:cal,...mods});
 for(const cal of ['weekday','holiday'])for(const n of r[cal]){
  const m=root.TrainNumberPngRanges.match(n,'Asakusa',p(n,cal));
  assert.equal(m?.model,'都営5500形',cal+n);
  assert.equal(m.referenceOnly,true);assert.equal(m.actualVehicleConfirmed,false);
  assert.equal(m.sourceRevisionDate,'2026-11-24');
  const other=cal==='weekday'?'holiday':'weekday';
  if(!r[other].includes(n))assert.equal(root.TrainNumberPngRanges.match(n,'Asakusa',p(n,other)),null,n);
 }
 for(const mods of [{trainOwner:'Keikyu'},{trainOwner:''},{trainOperator:'Keisei'},
  {sourceRailway:'odpt.Railway:Toei.Mita'},{positionLineId:'Mita'},{displayLineId:'Mita'},
  {estimated:true},{positionSource:'supabase-train-run'},{serviceDate:'2026-11-23'},
  {calendarType:'unknown'},{vehicleIdentityStatus:'EXACT'},{vehicleResolvedUpstream:true},
  {realtimeVehicleType:'京急1000形'},{plannedVehicleCandidates:['京急1000形']}])
   assert.equal(root.TrainNumberPngRanges.match('1300T','Asakusa',p('1300T','weekday',mods)),null,JSON.stringify(mods));
 for(const n of ['1008T','1327T','1300H','1300','9999T'])
  assert.equal(root.TrainNumberPngRanges.match(n,'Asakusa',p(n,'weekday')),null,n);
 assert.equal(root.TrainNumberPngRanges.match('1327Ta','Asakusa',p('1327Ta','weekday'))?.model,'都営5500形');
 assert.equal(root.TrainNumberPngRanges.match('1300T','Asakusa',p('1300T','weekday',{calendarType:'',serviceDate:'2026-12-01'}))?.referenceOnly,true);
});

test('都营混合车型官方逐号对账，实时车主与具体车型双重约束',()=>{
 const {getRows}=require('../tools/build-train-number-png-catalog.cjs');
 const ev=root.TrainNumberPngRanges.toeiMixedOfficialEvidence;
 const rules=getRows().filter(r=>r.operator==='Toei'&&r.requireExplicitModelEvidence&&
  Object.hasOwn(ev.lines,r.lineIds[0])&&r.weekdayNumbers&&r.holidayNumbers);
 assert.equal(rules.length,8);
 for(const r of rules){
  const line=r.lineIds[0],e=ev.lines[line];
  assert.equal(new Set([...r.weekdayNumbers,...r.holidayNumbers]).size,e.union);
  for(const cal of ['weekday','holiday']){
   const numbers=r[cal+'Numbers'],other=cal==='weekday'?'holiday':'weekday';
   assert.equal(numbers.length,e[cal][0]);
   assert.equal(crypto.createHash('sha256').update([...numbers].sort().join(' ')).digest('hex'),e[cal][1],line+' official roster hash');
   const p=(n,mods={})=>live({trainNumber:n,positionLineId:line,displayLineId:line,
     sourceRailway:'odpt.Railway:Toei.'+line,trainOperator:'Toei',
     trainOwner:line==='Oedo'?'':'odpt.TrainOwner:Toei',
     realtimeVehicleType:r.model,serviceDate:cal==='weekday'?'2026-12-01':'2026-12-06',
     calendarType:cal,...mods});
   for(const n of numbers){
    const m=root.TrainNumberPngRanges.match(n,line,p(n));
    assert.equal(m?.pngPath,r.pngPath,line+' '+n);
    assert.equal(m.referenceOnly,true);assert.equal(m.actualVehicleConfirmed,false);
    if(!r[other+'Numbers'].includes(n))
     assert.equal(root.TrainNumberPngRanges.match(n,line,p(n,{calendarType:other})),null,line+' wrong calendar '+n);
   }
   const n=numbers[0];
   for(const bad of [{trainOwner:'Keio'},{trainOperator:'Keio'},{sourceRailway:'odpt.Railway:Toei.Asakusa'},
    {positionLineId:'Asakusa'},{displayLineId:'Asakusa'},{estimated:true},{positionSource:'supabase-train-run'},
    {vehicleIdentityStatus:'EXACT'},{actualVehicleConfirmed:true},{vehicleResolvedUpstream:true},
    {calendarType:'unknown'},{realtimeVehicleType:''},{realtimeDerivedVehicleType:'foreign-model'},
    {plannedVehicleCandidates:['foreign-model']},{vehiclePlan:{status:'PLANNED_MODEL',models:[r.model,'foreign-model']}}])
     assert.equal(root.TrainNumberPngRanges.match(n,line,p(n,bad)),null,line+' '+JSON.stringify(bad));
   if(line!=='Oedo')assert.equal(root.TrainNumberPngRanges.match(n,line,p(n,{trainOwner:''})),null,line);
   if(line==='Oedo')for(const tail of ['1','2'])
    assert.equal(root.TrainNumberPngRanges.match(n+tail,line,p(n+tail)),null,line+' no synthetic suffix');
   if(line==='Mita')assert.equal(root.TrainNumberPngRanges.match(n,line,p(n,{serviceDate:'2026-11-16',trainOwner:'Tokyu'})),null,'historical Mita foreign-owner conflict');
   if(line==='Shinjuku'||line==='Oedo'){
    const generic=line==='Shinjuku'?'都営10-300形':r.model.split('（')[0];
    assert.equal(root.TrainNumberPngRanges.match(n,line,p(n,{realtimeVehicleType:generic})),null,'generic label never picks batch');
   }
  }
 }
});

test('physical shared-track marker preserves original source-approved PNG and rejects forged projection',()=>{
 const data=fs.readFileSync('js/trains-data.js','utf8');
 const a=data.indexOf('  var _SHARED_TRACK_SECTIONS = ['),b=data.indexOf('  // 支线 junction',a),e=data.indexOf('  window.SharedTrackPairs = {');
 assert.ok(a>=0&&b>a&&e>=0);
 root.UNIFIED_LINES=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8')).lines;
 vm.runInContext(data.slice(a,b)+data.slice(e),ctx);
 const shared=root.SharedTrackPairs;
 const p=live({trainNumber:'1020T',positionLineId:'Mita',displayLineId:'Mita',
  sourceRailway:'odpt.Railway:Toei.Mita',trainOperator:'Toei',trainOwner:'odpt.TrainOwner:Toei',
  realtimeVehicleType:'都営6500形',serviceDate:'2026-11-26',calendarType:'weekday',
  stationIndex:0,stationId:'Meguro',sourceFromStation:'Meguro',sourceToStation:'Shirokanedai',
  segmentToIndex:null,segmentProgress:0,railDirection:'Outbound'});
 const raw=root.TrainVehicle.selectMarkerArtwork(p,false);
 assert.equal(raw.kind,'vehicle');
 assert.ok(raw.iconSrc.endsWith('都営地下鉄_6500形.png'));
 const q=shared.projectPosition('Namboku','Mita',p);
 assert.ok(q);assert.equal(q.positionLineId,'Mita');
 const projected=marker(q,'Namboku');
 assert.equal(projected.kind,'vehicle');assert.equal(projected.iconSrc,raw.iconSrc);
 assert.equal(projected.planned,true);
 assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(q)?.pngPath,raw.iconSrc);
 assert.equal(marker({...q,trainOwner:'Tokyu'},'Namboku').kind,'unresolved');
 assert.equal(marker({...q,vehicleArtworkConflict:true},'Namboku').kind,'unresolved');
 assert.equal(marker({...q,stationIndex:7},'Namboku').kind,'unresolved');
 assert.equal(marker({...q,sourceToStation:'Mita'},'Namboku').kind,'unresolved');
 assert.equal(marker(q,'Chiyoda').kind,'unresolved');
 assert.equal(root.TrainVehicle.selectMarkerArtwork(q,true).kind,'unresolved');
 assert.equal(marker({...p,displayLineId:'Namboku'},'Namboku').kind,'unresolved','mere display id cannot borrow source PNG');
 delete root.SharedTrackPairs;delete root.UNIFIED_LINES;
});
