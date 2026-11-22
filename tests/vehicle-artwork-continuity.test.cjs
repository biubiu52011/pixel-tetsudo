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
  // P-02: 9000 artwork remains an asset under review, not an approved
  // visual reference merely because the genuine model is known.
  assert.equal(win.VehicleGaragePngMap.matchModelPath('東急9000系',
    '../images/列车/東急電鉄/東急電鉄_9000系.png','TokyuOimachi'),false);
  assert.equal(win.TrainVehicle.resolveCanonicalVehicle('東急9000系').artworkReviewRequired,true);
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
  // Negative scenarios must not inherit the deliberately different art
  // from the prior test poll; each is a fresh, unrelated snapshot.
  assert.equal(newChecker().check({A:[pos('A','A.png')],B:[pos('B','B.png',{runningChainId:'another'})]}),0);
  assert.equal(newChecker().check({A:[pos('A','A.png')],B:[pos('B','B.png',{serviceDate:'2026-11-18'})]}),0);
  assert.equal(newChecker().check({A:[pos('A','A.png')],B:[pos('B','')]}),0);
  assert.equal(newChecker().check({A:[pos('A','A.png')],B:[pos('A','B.png')]}),0);
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
// Durable guard tests for reviewed artwork; audit results live in Notion,
// not in a separate dated script for each PNG batch.
test('unverified Seibu special liveries and L00 formations cannot become generic defaults',()=>{
  const gallery=fs.readFileSync('js/train-vehicle.js','utf8');
  const garage=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
  const tok=gallery.match(/\{ id: "artwork-inventory-222"[^\n]+/);
  const twoTone=gallery.match(/\{ id: "artwork-inventory-220"[^\n]+/);
  const l00=gallery.match(/"remaining-fleet-extra-6": \{[^\n]+/);
  const first=gallery.match(/\{ id: "artwork-inventory-227"[^\n]+/);
  const second=gallery.match(/\{ id: "seibu-l00-second-formation-review"[^\n]+/);
  for(const [entry,label] of [[tok,'Tokiiro'],[twoTone,'Seibu two-tone'],
    [l00,'L00 generic'],[first,'L00 first formation'],[second,'L00 second formation']])
    assert.ok(entry?.[0],label+' missing');
  assert.match(tok[0],/future-model-unverified/);
  assert.match(tok[0],/asset: null/);
  assert.match(twoTone[0],/model-label-conflict/);
  assert.match(twoTone[0],/asset: null/);
  assert.match(l00[0],/"asset":null/);
  assert.match(l00[0],/"plannedAsset":null/);
  assert.match(first[0],/formation-specific-review/);
  assert.match(second[0],/future-formation-specific-review/);
  for(const file of ['西武鉄道_L00系_れおけい.png',
    '西武鉄道_L00系_第1編成_埼玉西武ライオンズ.png']){
    const png='../images/列车/西武鉄道/'+file;
    assert.equal(win.VehicleGaragePngMap.matchModelPath('西武L00系',png,'SeibuYamaguchi'),false);
  }
  assert.match(garage,/"artwork-inventory-222":true/);
  assert.match(garage,/"artwork-inventory-220":true/);
  assert.match(garage,/"seibu-l00-second-formation-review":true/);
});

test('Fujikyu number references do not infer alternate vehicle faces or liveries',()=>{
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  for(const file of ['富士急行_8000系_フジサン特急_顔B.png',
    '富士急行_8500系_富士山ビュー特急_赤色.png',
    '富士急行_8500系_富士山ビュー特急_茶色.png']){
    assert.equal(ranges.includes(file),false,file+' is not numbered-livery proof');
  }
  assert.match(ranges,/does not select face A\/B, a formation number, or today's actual car/);
});

test('byte-identical Sotetsu model aliases stay quarantined from number-to-PNG matching',()=>{
  const crypto=require('node:crypto');
  const names=['相模鉄道_20000系_YOKOHAMA_NAVYBLUE.png','相模鉄道_21000系.png'];
  const bytes=names.map(n=>fs.readFileSync('images/列车/相模鉄道/'+n));
  const hashes=bytes.map(b=>crypto.createHash('sha256').update(b).digest('hex'));
  assert.equal(hashes[0],hashes[1],'duplicate model aliases unexpectedly diverged');
  const source=fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8');
  for(const name of names){
    assert.equal(win.VehicleGaragePngMap.isQuarantinedPng('../images/列车/相模鉄道/'+name),true,name);
    assert.ok(source.includes(name),name+' must remain registered');
  }
});

test('Sotetsu livery and formation artwork require explicit number evidence',()=>{
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const names=[
    '相模鉄道_9000系_YOKOHAMA_NAVYBLUE.png',
    '相模鉄道_9000系_旧塗装.png',
    '相模鉄道_相模鉄道8000系（sote8006）.png'
  ];
  for(const name of names)
    assert.equal(ranges.includes(name),false,name+' has no verified train-number mapping');

  const ybn=win.TrainVehicle.resolveCanonicalVehicle('相鉄9000系');
  assert.equal(ybn?.asset||null,null,'planned fleet artwork is not actual vehicle proof');
  assert.equal(ybn?.plannedAsset,
    '../images/列车/相模鉄道/相模鉄道_9000系_YOKOHAMA_NAVYBLUE.png');
  assert.equal(win.VehicleGaragePngMap.matchModelPath('相鉄9000系',
    '../images/列车/相模鉄道/相模鉄道_9000系_旧塗装.png','SotetsuMain'),false);
  assert.equal(win.VehicleGaragePngMap.matchModelPath('相鉄8000系',
    '../images/列车/相模鉄道/相模鉄道_相模鉄道8000系（sote8006）.png','SotetsuMain'),false);
});

test('Keisei and Chiba New Town fleet artwork never implies an operating number',()=>{
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const names=[
    '京成電鉄_3000形.png','京成電鉄_3100形.png','京成電鉄_3200形.png',
    '京成電鉄_3400形.png','京成電鉄_3500形更新車.png','京成電鉄_3600形.png',
    '京成電鉄_3700形.png','京成電鉄_80000形.png','京成電鉄_8800形.png',
    '京成電鉄_8900形.png','千葉ニュータウン鉄道_9100形.png',
    '千葉ニュータウン鉄道_9200形.png','千葉ニュータウン鉄道_9800形.png'
  ];
  for(const name of names)
    assert.equal(ranges.includes(name),false,name+' has no verified train-number mapping');

  const plannedOnly=[
    ['京成3200形','京成電鉄_3200形.png'],
    ['京成3500形（更新車）','京成電鉄_3500形更新車.png'],
    ['京成3600形','京成電鉄_3600形.png'],
    ['京成80000形','京成電鉄_80000形.png'],
    ['京成8800形','京成電鉄_8800形.png'],
    ['京成8900形','京成電鉄_8900形.png']
  ];
  for(const [model,file] of plannedOnly){
    const ref=win.TrainVehicle.resolveCanonicalVehicle(model);
    assert.equal(ref?.asset||null,null,model+' is not physical vehicle proof');
    assert.equal(ref?.plannedAsset,'../images/列车/京成電鉄/'+file);
  }
});

test('Odakyu and Hakone artwork require service-scoped vehicle evidence',()=>{
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const names=[
    '小田急電鉄_1000形_標準色.png','小田急電鉄_2000形_標準色.png',
    '小田急電鉄_30000形_EXE.png','小田急電鉄_30000形_EXEα.png',
    '小田急電鉄_3000形_標準色.png','小田急電鉄_5000形_標準色.png',
    '小田急電鉄_8000形_標準色_更新車.png','小田急電鉄_8000形_標準色_未更新車.png',
    '小田急箱根_1000形.png','小田急箱根_2000形.png','小田急箱根_3000・3100形.png'
  ];
  for(const name of names)
    assert.equal(ranges.includes(name),false,name+' has no verified train-number mapping');

  // The public Romancecar code E covers both EXE variants, so it cannot
  // select either distinct image without service-date vehicle evidence.
  const exe=win.TrainVehicle.resolveCanonicalVehicle('小田急30000形（EXE）');
  const exea=win.TrainVehicle.resolveCanonicalVehicle('小田急30000形（EXEα）');
  assert.notEqual(exe?.asset,exea?.asset);

  const odakyu8000=win.TrainVehicle.resolveCanonicalVehicle('小田急8000形');
  assert.equal(odakyu8000?.asset||null,null,'planned updated artwork is not actual livery proof');
  assert.equal(odakyu8000?.plannedAsset,
    '../images/列车/小田急電鉄/小田急電鉄_8000形_標準色_更新車.png');
  assert.equal(win.VehicleGaragePngMap.matchModelPath('小田急8000形',
    '../images/列车/小田急電鉄/小田急電鉄_8000形_標準色_未更新車.png','Odawara'),false);

  for(const name of ['小田急箱根_1000形.png','小田急箱根_2000形.png','小田急箱根_3000・3100形.png']){
    const path='../images/列车/小田急箱根/'+name;
    const refs=win.VehicleGaragePngMap.findPath(path);
    assert.equal(refs.length,1,name+' must remain inventory-visible');
    assert.equal(refs[0].lineIds.length,0,name+' must remain outside runtime line scope');
  }
});
