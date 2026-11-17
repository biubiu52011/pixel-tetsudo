'use strict';
// Do not turn lookalike stock / special livery into an authorised train PNG.
// Same canonical through chain + date + full public number must not change art.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},quiet={debug(){},log(){},warn(){},error(){}};
for(const file of ['data/timetables/vehicle-garage-png-map.js','js/train-vehicle.js'])
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{window:win,Date,console:quiet},{filename:file});
test('distinct 9020, KiHa101 and Tadami revival artwork cannot borrow similar PNGs',()=>{
  const ids=[
    ['東急9020系','東急電鉄/東急電鉄_9000系.png','TokyuOimachi'],
    ['キハ101形（左沢線）','JR東日本/JR東日本_キハ110系（陸羽東・左沢）.png','Aterazawa'],
    ['キハ110系（只見線・キハ40系カラー）','JR東日本/JR東日本_キハ110系（只見線）.png','Tadami']
  ];
  for(const [model,asset,line] of ids){
    const ref=win.TrainVehicle.resolveCanonicalVehicle(model);
    assert.ok(ref,model+' remains discoverable');
    assert.equal(ref.asset||null,null);
    assert.equal(ref.plannedAsset||null,null);
    assert.equal(win.VehicleGaragePngMap.matchModelPath(model,'../images/列车/'+asset,line),false);
  }
  assert.equal(win.VehicleGaragePngMap.matchModelPath('東急9000系',
    '../images/列车/東急電鉄/東急電鉄_9000系.png','TokyuOimachi'),true);
});
const fusion=fs.readFileSync('js/data-fusion.js','utf8');
const start=fusion.indexOf('  function _markThroughArtworkConflicts(');
const end=fusion.indexOf('  function _rememberChainVehicle(',start);
assert.ok(start>=0&&end>start,'existing through-artwork gate missing');
const host={window:{TrainVehicle:{selectMarkerArtwork(p){
  return p.probePng?{kind:'vehicle',iconSrc:p.probePng}:{kind:'unresolved',iconSrc:''};
}}}};
vm.runInNewContext(fusion.slice(start,end)+'\nthis.check=_markThroughArtworkConflicts;',host);
const check=host.check;
function pos(rail,png,extras={}){
  return {runningChainId:'canonical-sql-trip:2026-11-17:42',
    trainNumber:'1234M',serviceDate:'2026-11-17',
    sourceRailway:'odpt.Railway:Test.'+rail,positionLineId:rail,
    probePng:png,...extras};
}
test('through service number unchanged, different PNG => both neutral-gated',()=>{
  const a=pos('A','../images/列车/A.png');
  const b=pos('B','../images/列车/B.png');
  assert.equal(check({A:[a],B:[b]}),1);
  assert.equal(a.vehicleArtworkConflict,true);
  assert.equal(b.vehicleArtworkConflict,true);
  const rendered=win.TrainVehicle.selectMarkerArtwork(a,false);
  assert.equal(rendered.kind,'unresolved');
  assert.equal(rendered.reason,'through-livery-conflict');
});
test('same through PNG, unrelated chains, distinct dates or missing art never fake conflict',()=>{
  const a=pos('A','same.png'),b=pos('B','same.png');
  assert.equal(check({A:[a],B:[b]}),0);
  assert.equal(a.vehicleArtworkConflict,false);
  assert.equal(b.vehicleArtworkConflict,false);
  assert.equal(check({A:[pos('A','A.png')],B:[pos('B','B.png',{runningChainId:'another'})]}),0);
  assert.equal(check({A:[pos('A','A.png')],B:[pos('B','B.png',{serviceDate:'2026-11-18'})]}),0);
  assert.equal(check({A:[pos('A','A.png')],B:[pos('B','')]}),0);
  assert.equal(check({A:[pos('A','A.png')],B:[pos('A','B.png')]}),0);
});
test('display redraw and SVG identity retain the same canonical scope',()=>{
  assert.match(fusion,/vehicleArtworkConflict','trainNumber'/);
  const page=fs.readFileSync('js/trains-page.js','utf8');
  const render=fs.readFileSync('js/trains-render.js','utf8');
  assert.match(page,/vehicleArtworkConflict === true/);
  assert.match(render,/earlier\.runningChainId === p\.runningChainId/);
  assert.match(render,/earlier\.trainNumber === p\.trainNumber/);
  assert.match(render,/earlier\.serviceDate === p\.serviceDate/);
  assert.match(render,/earlier\.sourceRailway !== p\.sourceRailway/);
});
