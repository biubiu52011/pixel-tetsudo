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
const start=fusion.indexOf('  // Ephemeral illustration history for the EXISTING canonical running chain.');
const end=fusion.indexOf('  function _rememberChainVehicle(',start);
assert.ok(start>=0&&end>start,'existing through-artwork gate missing');
function newChecker(initialTime=Date.now()){
  let now=initialTime;
  const host={Date:{now:()=>now},window:{TrainVehicle:{selectMarkerArtwork(p){
    return p.probePng?{kind:'vehicle',iconSrc:p.probePng}:{kind:'unresolved',iconSrc:''};
  }}}};
  vm.runInNewContext(fusion.slice(start,end)+'\nthis.check=_markThroughArtworkConflicts;',host);
  return {check:host.check,advance(ms){now+=ms}};
}
function pos(rail,png,extras={}){
  return {runningChainId:'canonical-sql-trip:2026-11-17:42',
    trainNumber:'1234M',serviceDate:'2026-11-17',
    sourceRailway:'odpt.Railway:Test.'+rail,positionLineId:rail,
    probePng:png,...extras};
}
test('through service number unchanged, different PNG => both neutral-gated',()=>{
  const {check}=newChecker();
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
  const {check}=newChecker();
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

test('successive polls of one canonical through train never swap unverified PNG',()=>{
  const {check}=newChecker();
  const first=pos('A','../images/列车/A.png');
  assert.equal(check({A:[first]}),0);
  const next=pos('B','../images/列车/B.png');
  assert.equal(check({B:[next]}),1);
  assert.equal(next.vehicleArtworkConflict,true);
  assert.equal(win.TrainVehicle.selectMarkerArtwork(next,false).kind,'unresolved');
  const again=pos('B','../images/列车/B.png');
  assert.equal(check({B:[again]}),1);
  assert.equal(again.vehicleArtworkConflict,true);
});
test('through PNG history requires same chain, service date and full public number',()=>{
  const {check}=newChecker();
  assert.equal(check({A:[pos('A','A.png')]}),0);
  for(const [title,extra] of [
    ['chain',{runningChainId:'a-different-chain'}],
    ['date',{serviceDate:'2026-11-18'}],
    ['number',{trainNumber:'5678M'}]
  ]){
    const other=pos('B','B.png',extra);
    assert.equal(check({B:[other]}),0,title);
    assert.equal(other.vehicleArtworkConflict,false,title);
  }
});
test('same artwork through two railways and verified physical stock updates are safe',()=>{
  const {check}=newChecker();
  assert.equal(check({A:[pos('A','A.png')]}),0);
  const same=pos('B','A.png');
  assert.equal(check({B:[same]}),0);
  const observed=pos('B','B.png',{
    vehicleIdentityStatus:'EXACT',vehicleResolvedFromRealtime:true,
    vehicleResolution:{sources:['official-realtime-car-number']}
  });
  assert.equal(check({B:[observed]}),0);
  assert.equal(observed.vehicleArtworkConflict,false);
});
test('expired visual history cannot contaminate a recycled train chain',()=>{
  const {check,advance}=newChecker(1000);
  assert.equal(check({A:[pos('A','A.png')]}),0);
  advance(31*60*1000);
  const recycled=pos('B','B.png');
  assert.equal(check({B:[recycled]}),0);
  assert.equal(recycled.vehicleArtworkConflict,false);
});
test('generic model names no longer authorize a specific variant or livery',()=>{
  const examples=[
    ['JR西日本223系6000番台','JR西日本/JR西日本_223系_H6.png','Fukuchiyama'],
    ['横浜市営3000形','横浜市交通局/横浜市交通局_3000V形.png','YokohamaBlue'],
    ['埼玉新都市交通2000系','埼玉新都市交通/埼玉新都市交通_2000系_01編成_レッドパープル.png','NewShuttle'],
    ['小田急30000形','小田急電鉄/小田急電鉄_30000形_EXEα.png','Odawara'],
    ['都電9000形','都営地下鉄/都営地下鉄_9000形_9001号車_赤色.png','Arakawa']
  ];
  for(const [name,png,line] of examples){
    assert.equal(win.TrainVehicle.resolveCanonicalVehicle(name)?.plannedAsset||null,null);
    assert.equal(win.VehicleGaragePngMap.matchModelPath(name,'../images/列车/'+png,line),false);
  }
  assert.equal(win.VehicleGaragePngMap.matchModelPath('小田急30000形（EXEα）',
    '../images/列车/小田急電鉄/小田急電鉄_30000形_EXEα.png','Odawara'),true);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('埼玉新都市交通2000系（01編成）',
    '../images/列车/埼玉新都市交通/埼玉新都市交通_2000系_01編成_レッドパープル.png','NewShuttle'),true);
});


test('actual SVG image node becomes a neutral circle, never the other PNG, on a through boundary',()=>{
  const renderer=fs.readFileSync('js/trains-render.js','utf8');
  const a=renderer.indexOf('  function _guardThroughArtworkTransition(');
  const b=renderer.indexOf('  // TrainComponent is the sole public lifecycle',a);
  assert.ok(a>=0&&b>a,'SVG icon lifecycle moved');
  const node=tag=>{
    const attrs=Object.create(null);
    return {tagName:tag,children:[],attrs,parentNode:null,
      getAttribute:k=>attrs[k]??null,
      setAttribute(k,v){attrs[k]=String(v)},
      setAttributeNS(_ns,k,v){attrs[k]=String(v)},
      removeAttribute(k){delete attrs[k]},
      addEventListener(){},
      appendChild(child){this.children.push(child);child.parentNode=this}};
  };
  const host={document:{createElementNS:(_ns,tag)=>node(tag)},
    _trainArtworkRequestUrl:path=>path,
    _trainMarkerAccessibleDescription:()=>"",
    _setTrainMarkerAccessibilityLabel(){},
    _syncTrainMarkerIllustrationStatus(){},
    _setTrainFormationAttribute(){},
    _trainMarkerDomKind:spec=>spec.kind,
    _setTrainIconPosition(){},
    console:{debug(){}}
  };
  vm.runInNewContext(renderer.slice(a,b)+
    '\nthis.guard=_guardThroughArtworkTransition;this.create=_createTrainMarker;',host);
  const uid='canonical-service-2026-11-17';
  const before=pos('A','A.png'),after=pos('B','B.png');
  const first=host.create({},'http://www.w3.org/2000/svg',uid,
    {kind:'vehicle',iconSrc:'A.png'},10,10,before,'A',false,'',null);
  assert.equal(first.tagName,'image');
  assert.equal(first.getAttribute('href'),'A.png');
  const guarded=host.guard(first,after,{kind:'vehicle',iconSrc:'B.png'});
  assert.equal(guarded.kind,'unresolved');
  assert.equal(guarded.unresolvedReason,'through-livery-conflict');
  const second=host.create({},'http://www.w3.org/2000/svg',uid,
    guarded,20,10,after,'B',false,'',null);
  assert.equal(second.tagName,'circle');
  assert.equal(second.getAttribute('href'),null);
  assert.equal(first.getAttribute('href'),'A.png','must never repaint existing image to the wrong PNG');
  assert.equal(first.getAttribute('data-train-id'),second.getAttribute('data-train-id'));
  const observed={...after,vehicleIdentityStatus:'EXACT',
    vehicleResolvedFromRealtime:true,
    vehicleResolution:{sources:['roster-physical-id']}};
  assert.equal(host.guard(first,observed,{kind:'vehicle',iconSrc:'B.png'}).kind,'vehicle');
  assert.equal(host.guard(first,{...after,trainNumber:'9012M'},
    {kind:'vehicle',iconSrc:'B.png'}).kind,'vehicle',
    'a different public train number is not the same physical service');
});
