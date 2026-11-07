'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const gallerySrc=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
const vehicleSrc=fs.readFileSync('js/train-vehicle.js','utf8');
const estimatorSrc=fs.readFileSync('js/train-position-estimator.js','utf8');
const renderSrc=fs.readFileSync('js/trains-render.js','utf8');
const html=fs.readFileSync('pages/trains.html','utf8');
const PNG='../images/列车/JR西日本/JR西日本_221系_N.png';
const OLD_PNG='../images/列车/JR西日本/JR西日本_221系_CHA.png';
const windowMock={};
new Function('window',gallerySrc)(windowMock);
const start=vehicleSrc.indexOf('    var osaka221Proof = p && p.sqlPublishedNumberFleetReference;');
const end=vehicleSrc.indexOf('    // 米坂線:',start);
assert.ok(start>0&&end>start,'renderer gate is found in the existing central selector');
const renderGate=new Function('p','contextLineId','identityConfirmed',
 'strongRealtimeEvidence','vehiclePlan','artworkFailed','window','isGalleryPng',
 vehicleSrc.slice(start,end)+'\nreturn null;');
function fixture(publicNumber,holiday,kind,stopCount) {
  const stops=Array.from({length:stopCount},(_,i)=>'station'+i);
  const number=publicNumber+(holiday?'H':'');
  return {
    trainNumber:number,displayTrainNumber:publicNumber,
    positionLineId:'OsakaHigashi',
    sourceRailway:'odpt.Railway:JR-West.OsakaHigashi',
    positionSource:'supabase-train-run',estimated:true,
    serviceDate:'2026-11-07',vehicleIdentityStatus:'UNKNOWN',
    vehicleResolvedUpstream:false,vehicleResolvedFromRealtime:false,
    actualVehicleConfirmed:false,vehicleFormationId:'',
    vehicleFormationCandidates:[],scheduledStopKeys:stops.slice(),
    plannedVehicleCandidateStatus:'unresolved-single-family',
    plannedVehicleCandidates:['221系'],
    vehiclePlan:{status:'FLEET_REFERENCE',models:['221系'],
       confirmed:false,referenceOnly:true},
    sqlPublishedNumberFleetReference:{
      source:'sql-jrwest-osaka-higashi-2611-source-family',
      lineId:'OsakaHigashi',sourceTrainNumber:number,
      historicalNumber:publicNumber,
      calendar:holiday?'odpt.Calendar:SaturdayHoliday':'odpt.Calendar:Weekday',
      publicTrainType:kind,sourceStopKeys:stops.slice(),
      candidateModels:['221系'],candidateAssets:[],
      referenceOnly:true,numberDateVerified:false,
      actualVehicleConfirmed:false,authorizesPNG:false
    }
  };
}
function select(p,extra) {
  const info=Object.assign({},p,extra||{});
  return renderGate(info,
    info.displayLineId||'OsakaHigashi',
    info.vehicleIdentityStatus==='EXACT',false,info.vehiclePlan,false,
    windowMock,path=>/^..\x2fimages\x2f列车\x2f.+\.png$/.test(path));
}
test('real 221 N PNG is registered for Osaka Higashi, while CHA is not selected',()=>{
  const gallery=windowMock.VehicleGaragePngMap;
  assert.equal(gallery.hasPng(PNG),true);
  assert.equal(gallery.matchModelPath('JR西日本221系（N）',PNG,'OsakaHigashi'),true);
  assert.equal(gallery.matchModelPath('JR西日本221系（CHA）',OLD_PNG,'OsakaHigashi'),false);
});
test('weekdays, holidays, short turns and 8-car direct rapid render 221 series illustration',()=>{
  for(const [n,holiday,kind,count] of [
    ['2402S',false,'Local',15],
    ['2402S',true,'Local',15],
    ['2535S',false,'Local',8],
    ['2101M',true,'DirectRapid',8],
    ['2110M',false,'DirectRapid',9]
  ]) {
    const p=fixture(n,holiday,kind,count),result=select(p);
    assert.ok(result,'expected a selector result for '+p.trainNumber);
    assert.equal(result.kind,'vehicle',p.trainNumber);
    assert.equal(result.iconSrc,PNG,p.trainNumber);
    assert.equal(result.planned,true,p.trainNumber);
    assert.equal(result.illustrative,true,p.trainNumber);
    assert.equal(result.representativeOnly,true,p.trainNumber);
    assert.equal(result.actualVehicleConfirmed,false,p.trainNumber);
  }
});
test('wrong number, railway, itinerary, asset family or date cannot obtain PNG',()=>{
  const good=fixture('2101M',true,'DirectRapid',8);
  for(const mutation of [
    p=>{p.displayTrainNumber='2101MH';},
    p=>{p.trainNumber='2103MH';},
    p=>{p.sourceRailway='odpt.Railway:JR-West.OsakaLoop';},
    p=>{p.serviceDate='2026-12-01';},
    p=>{p.scheduledStopKeys[3]='not-a-stop';},
    p=>{p.sqlPublishedNumberFleetReference.candidateModels=['207系'];},
    p=>{p.sqlPublishedNumberFleetReference.candidateAssets=[PNG];},
    p=>{p.sqlPublishedNumberFleetReference.authorizesPNG=true;},
    p=>{p.sqlPublishedNumberFleetReference.publicTrainType='LimitedExpress';},
    p=>{p.vehicleFormationId='NB801';},
    p=>{p.vehicleIdentityStatus='EXACT';},
    p=>{p.positionSource='realtime-api';},
    p=>{p.displayLineId='Nara';},
    p=>{p.trainNumber='7092MH';}
  ]){
    const p=JSON.parse(JSON.stringify(good));
    mutation(p);
    const result=select(p);
    assert.notEqual(result&&result.kind,'vehicle',
      'invalid source must not show 221 illustration: '+JSON.stringify(p));
  }
});
test('passenger model labels show series and cars, not a fake formation',()=>{
  const a=renderSrc.indexOf('    var osakaFleet=p.sqlPublishedNumberFleetReference;');
  const b=renderSrc.indexOf('    // 米坂線:',a);
  assert.ok(a>0&&b>a);
  const labelFn=new Function('p','lineId','lang','plan',
    renderSrc.slice(a,b)+'\nreturn "";');
  const local=fixture('2402S',false,'Local',15);
  const rapid=fixture('2101M',true,'DirectRapid',8);
  assert.match(labelFn(local,'OsakaHigashi','zh',local.vehiclePlan),/221系（6辆，实际编组未确认）/);
  assert.match(labelFn(rapid,'OsakaHigashi','ja',rapid.vehiclePlan),/221系（8両、実際の編成未確認）/);
});
test('estimator does not claim actual stock identity; HTML entrypoint refreshes asset URLs',()=>{
  assert.match(estimatorSrc,/status:"FLEET_REFERENCE",\s*models:osakaHigashiRef\.candidateModels\.slice\(\)/);
  assert.match(estimatorSrc,/var _osakaHigashiScoped=!!osakaHigashiScoped&&\s*vehResult\.identityStatus!=="EXACT"/);
  assert.match(estimatorSrc,/vehicleIconPath: \(_osakaHigashiScoped\|\|_saganoScoped/);
  assert.match(html,/vehicle-garage-png-map\.js\?v=41e136e01c89/);
  assert.match(html,/train-vehicle\.js\?v=1f2ee3ae6836/);
  assert.match(html,/train-position-estimator\.js\?v=1405296c8393/);
  assert.match(html,/trains-render\.js\?v=1f2aac20158f/);
});
