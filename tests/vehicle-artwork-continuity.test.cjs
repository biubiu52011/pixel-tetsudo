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

test('Keikyu owner codes and consist length never select a fleet PNG',()=>{
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const names=[
    '京浜急行電鉄_1000形_1200番台.png','京浜急行電鉄_1000形_1300番台.png',
    '京浜急行電鉄_1000形_1500番台.png','京浜急行電鉄_1000形_1800番台.png',
    '京浜急行電鉄_1500形.png','京浜急行電鉄_600形.png'
  ];
  for(const name of names)
    assert.equal(ranges.includes(name),false,name+' has no verified train-number mapping');

  // A Keikyu H operation code and a 4/6/8-car timetable entry identify
  // neither the exact model nor the 1000-series sub-type shown by the PNG.
  const keikyu1000=win.TrainVehicle.resolveCanonicalVehicle('京急1000形');
  assert.equal(keikyu1000?.asset||null,null,'planned 1200 artwork is not actual sub-type proof');
  assert.equal(keikyu1000?.plannedAsset,
    '../images/列车/京浜急行電鉄/京浜急行電鉄_1000形_1200番台.png');

  for(const name of ['京浜急行電鉄_1000形_1300番台.png',
    '京浜急行電鉄_1000形_1500番台.png','京浜急行電鉄_1000形_1800番台.png']){
    const path='../images/列车/京浜急行電鉄/'+name;
    const refs=win.VehicleGaragePngMap.findPath(path);
    assert.equal(refs.length,1,name+' must remain inventory-visible');
    assert.equal(refs[0].lineIds.length,0,name+' must remain outside runtime line scope');
    assert.equal(win.VehicleGaragePngMap.matchModelPath('京急1000形',path,'Keikyu'),false);
  }

  for(const [model,file] of [['京急1500形','京浜急行電鉄_1500形.png'],
    ['京急600形','京浜急行電鉄_600形.png']]){
    const ref=win.TrainVehicle.resolveCanonicalVehicle(model);
    const expected='../images/列车/京浜急行電鉄/'+file;
    assert.equal(ref?.asset,expected,model+' remains a valid canonical image');
  }
});

test('Enoden and Izu timetable numbers stay separate from vehicle PNG evidence',()=>{
  const names=[
    '江ノ島電鉄/江ノ島電鉄_1000形.png','江ノ島電鉄/江ノ島電鉄_10形.png',
    '江ノ島電鉄/江ノ島電鉄_2000形.png','江ノ島電鉄/江ノ島電鉄_20形.png',
    '江ノ島電鉄/江ノ島電鉄_300形.png','江ノ島電鉄/江ノ島電鉄_500形.png',
    '江ノ島電鉄/江ノ島電鉄_700形.png','伊豆箱根鉄道/伊豆箱根鉄道_1300系.png',
    '伊豆箱根鉄道/伊豆箱根鉄道_3000系.png','伊豆箱根鉄道/伊豆箱根鉄道_5000系.png',
    '伊豆箱根鉄道/伊豆箱根鉄道_7000系.png','伊豆急行/伊豆急行_8000系_黒排障器.png'
  ];
  const index=JSON.parse(fs.readFileSync(
    'data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
  const byPath=new Map(index.map(entry=>[entry.path,entry]));
  for(const name of names){
    const entry=byPath.get('images/列车/'+name);
    assert.ok(entry,name+' must remain in the audit index');
    assert.equal(entry.status,'no_verified_number_mapping',name);
    assert.deepEqual(entry.directNumberRules,[],name);
    assert.deepEqual(entry.runtimeNumberRosters,[],name);
    assert.deepEqual(entry.historicalNumberedSources,[],name);
  }

  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const rangeWin={};
  vm.runInNewContext(ranges,{window:rangeWin,console:quiet},{
    filename:'data/timetables/train-number-png-ranges.js'
  });
  const candidate=rangeWin.TrainNumberPngRanges.matchItoFleetCandidates({
    positionSource:'supabase-train-run',estimated:true,
    positionLineId:'Ito',displayLineId:'Ito',
    sourceRailway:'odpt.Railway:JR-East.Ito',serviceDate:'2026-11-22',
    trainType:'odpt.TrainType:Local',trainNumber:'1621M',
    vehicleResolvedFromRealtime:false,vehicleIdentityStatus:'UNKNOWN'
  });
  assert.equal(candidate.status,'UNCONFIRMED_PLANNED_FLEET');
  assert.equal(candidate.confirmed,false);
  assert.equal(candidate.source,'independent-20260314-working-reference');
  assert.equal(candidate.referencePng,
    '../images/列车/伊豆急行/伊豆急行_8000系_黒排障器.png');
  assert.equal(rangeWin.TrainNumberPngRanges.matchItoFleetCandidates({
    positionSource:'supabase-train-run',estimated:true,
    positionLineId:'Ito',displayLineId:'Ito',
    sourceRailway:'odpt.Railway:JR-East.Ito',serviceDate:'2026-12-01',
    trainType:'odpt.TrainType:Local',trainNumber:'1621M'
  }),null,'the March working reference cannot authorize another service month');

  for(const file of names.slice(7,11)){
    const path='../images/列车/'+file;
    const refs=win.VehicleGaragePngMap.findPath(path);
    assert.equal(refs.length,1,file+' must remain inventory-visible');
    assert.equal(refs[0].lineIds.length,0,file+' has no canonical runtime line scope');
  }
  const izukyu=win.TrainVehicle.resolveCanonicalVehicle('伊豆急行8000系');
  assert.equal(izukyu?.asset||null,null,'planned black-plow artwork is not physical vehicle proof');
  assert.equal(izukyu?.plannedAsset,
    '../images/列车/伊豆急行/伊豆急行_8000系_黒排障器.png');
});

test('Keio line scope and live car-type display never become persistent number bands',()=>{
  const names=[
    '京王電鉄_1000系.png','京王電鉄_7000系.png',
    '京王電鉄_8000系.png','京王電鉄_9000系.png'
  ];
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const index=JSON.parse(fs.readFileSync(
    'data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
  const byPath=new Map(index.map(entry=>[entry.path,entry]));
  for(const name of names){
    assert.equal(ranges.includes(name),false,name+' has no persistent number band');
    const entry=byPath.get('images/列车/京王電鉄/'+name);
    assert.ok(entry,name+' must remain in the audit index');
    assert.equal(entry.status,'no_verified_number_mapping',name);
    assert.deepEqual(entry.directNumberRules,[],name);
    assert.deepEqual(entry.runtimeNumberRosters,[],name);
    assert.deepEqual(entry.historicalNumberedSources,[],name);
  }

  // The official fleet guide limits 1000 series to Inokashira, but a line
  // identity alone cannot turn a current app car-type display into a reusable
  // service-number rule.
  const keio1000=win.TrainVehicle.resolveCanonicalVehicle('京王1000系');
  assert.equal(keio1000?.asset||null,null,'1000-series artwork remains planned-only');
  assert.equal(keio1000?.plannedAsset,
    '../images/列车/京王電鉄/京王電鉄_1000系.png');

  for(const [model,file] of [['京王7000系','京王電鉄_7000系.png'],
    ['京王8000系','京王電鉄_8000系.png'],
    ['京王9000系','京王電鉄_9000系.png']]){
    const ref=win.TrainVehicle.resolveCanonicalVehicle(model);
    assert.equal(ref?.asset,'../images/列车/京王電鉄/'+file,
      model+' stays a gallery identity, not number evidence');
  }
});

test('Ryutetsu and Choshi staged trip numbers never select a formation or livery PNG',()=>{
  const names=[
    '流鉄株式会社/流鉄株式会社_5000形_5001編成_さくら.png',
    '流鉄株式会社/流鉄株式会社_5000形_5002編成_流星.png',
    '流鉄株式会社/流鉄株式会社_5000形_5004編成_若葉.png',
    '流鉄株式会社/流鉄株式会社_5000形_5005編成_なの花.png',
    '銚子電鉄/銚子電鉄_2000形_2002編成_青色.png',
    '銚子電鉄/銚子電鉄_2000形_2002編成_銚電旧色復刻カラー_クハ2502側.png',
    '銚子電鉄/銚子電鉄_2000形_2002編成_銚電旧色復刻カラー.png',
    '銚子電鉄/銚子電鉄_2000形_2002編成_緑色.png',
    '銚子電鉄/銚子電鉄_22000形_22005編成_次郎右衛門.png',
    '銚子電鉄/銚子電鉄_22000形_22007編成_銚電グリーン.png',
    '銚子電鉄/銚子電鉄_3000形_3001編成_澪つくしカラー_クハ3501側.png',
    '銚子電鉄/銚子電鉄_3000形_3001編成_澪つくしカラー_デハ3001側.png',
    '銚子電鉄/銚子電鉄_3000形_3001編成_澪つくしカラー.png',
    '銚子電鉄/銚子電鉄_デキ3_黒色.png',
    '銚子電鉄/銚子電鉄_デキ3_赤色.png'
  ];
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const index=JSON.parse(fs.readFileSync(
    'data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
  const byPath=new Map(index.map(entry=>[entry.path,entry]));
  for(const name of names){
    assert.equal(ranges.includes(name.split('/').at(-1)),false,
      name+' has no persistent number band');
    const entry=byPath.get('images/列车/'+name);
    assert.ok(entry,name+' must remain in the audit index');
    assert.equal(entry.status,'no_verified_number_mapping',name);
    assert.deepEqual(entry.directNumberRules,[],name);
    assert.deepEqual(entry.runtimeNumberRosters,[],name);
    assert.deepEqual(entry.historicalNumberedSources,[],name);

    const refs=win.VehicleGaragePngMap.findPath('../images/列车/'+name);
    assert.equal(refs.length,1,name+' must remain inventory-visible');
    assert.equal(refs[0].canonicalImage,false,name+' stays review-only');
    assert.equal(refs[0].lineIds.length,0,name+' has no runtime line scope');
  }
});

test('Hakodate tram car numbers never become persistent service-number bands',()=>{
  const names=[
    'toq9002or.png',
    '函館市電_3000形_3001号車.png',
    '函館市電_3000形_3002号車.png',
    '函館市電_3000形.png',
    '函館市電_30形_39号車.png',
    '函館市電_500形.png',
    '函館市電_7000形.png',
    '函館市電_710形_広告車.png',
    '函館市電_710形.png',
    '函館市電_8000形_広告車.png',
    '函館市電_8000形.png',
    '函館市電_8100形_広告車.png',
    '函館市電_8100形.png',
    '函館市電_9600形_9601号車.png',
    '函館市電_9600形_9604号車.png',
    '函館市電_9600形_広告車.png',
    '函館市電_9600形.png'
  ];
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const index=JSON.parse(fs.readFileSync(
    'data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
  const byPath=new Map(index.map(entry=>[entry.path,entry]));
  for(const name of names){
    assert.equal(ranges.includes(name),false,name+' has no persistent number band');
    const entry=byPath.get('images/列车/函館市電/'+name);
    assert.ok(entry,name+' must remain in the audit index');
    assert.equal(entry.status,name==='toq9002or.png'
      ? 'quarantined_visual_identity' : 'no_verified_number_mapping',name);
    assert.deepEqual(entry.directNumberRules,[],name);
    assert.deepEqual(entry.runtimeNumberRosters,[],name);
    assert.deepEqual(entry.historicalNumberedSources,[],name);
  }

  const quarantined='../images/列车/函館市電/toq9002or.png';
  assert.equal(win.VehicleGaragePngMap.isQuarantinedPng(quarantined),true);
  const unknownRefs=win.VehicleGaragePngMap.findPath(quarantined);
  assert.equal(unknownRefs.length,1);
  assert.equal(unknownRefs[0].lineIds.length,0);

  for(const name of [
    '函館市電_710形_広告車.png',
    '函館市電_8000形_広告車.png',
    '函館市電_8100形_広告車.png',
    '函館市電_9600形_広告車.png'
  ]){
    const refs=win.VehicleGaragePngMap.findPath('../images/列车/函館市電/'+name);
    assert.equal(refs.length,1,name+' must remain inventory-visible');
    assert.equal(refs[0].canonicalImage,false,name+' stays review-only');
    assert.equal(refs[0].lineIds.length,0,name+' has no exact car identity or runtime line scope');
  }

  // Hakodate GTFS-RT vehicle_id is physical-car evidence. It can select an
  // exact car image transiently, but the same digits in trainNumber cannot.
  for(const [car,model,file] of [
    ['3001','函館市電3000形（3001号車）','函館市電_3000形_3001号車.png'],
    ['3002','函館市電3000形（3002号車）','函館市電_3000形_3002号車.png'],
    ['39','函館市電30形（39号車）','函館市電_30形_39号車.png'],
    ['8001','函館市電8000形','函館市電_8000形.png'],
    ['8101','函館市電8100形','函館市電_8100形.png'],
    ['9601','函館市電9600形（9601号車）','函館市電_9600形_9601号車.png'],
    ['9604','函館市電9600形（9604号車）','函館市電_9600形_9604号車.png'],
    ['9605','函館市電9600形','函館市電_9600形.png']
  ]){
    const result=win.TrainVehicle.resolve({
      operator:'HakodateCity',lineId:'Hakodate2',
      railway:'odpt.Railway:HakodateCity.Hakodate2',
      realtimeCarNumber:car,serviceDate:'2026-11-23',
      _realtimeVehicleResolution:true
    });
    assert.equal(result.identityStatus,'EXACT',car);
    assert.equal(result.name,model,car);
    assert.equal(result.iconPath,'../images/列车/函館市電/'+file,car);
  }
  for(const trainNumber of ['3001','8001','8101','9601','9604']){
    const serviceNumberOnly=win.TrainVehicle.resolve({
      operator:'HakodateCity',lineId:'Hakodate2',
      railway:'odpt.Railway:HakodateCity.Hakodate2',
      trainNumber,serviceDate:'2026-11-23'
    });
    assert.equal(serviceNumberOnly.identityStatus,'UNKNOWN',trainNumber);
    assert.equal(serviceNumberOnly.iconPath,'',trainNumber);
  }
});

test('urban monorail service numbers never invent a model, formation or livery',()=>{
  const tokyo=[
    '東京モノレール_10000形.png',
    '東京モノレール_1000形_1003編成.png',
    '東京モノレール_1000形_1004編成.png',
    '東京モノレール_1000形_青帯.png',
    '東京モノレール_1000形_赤帯.png',
    '東京モノレール_1000形_橙帯.png',
    '東京モノレール_2000形.png'
  ];
  const shonan=[
    ['5601','レッド'],['5603','ブルー'],['5605','グリーン'],
    ['5607','イエロー'],['5609','バイオレット'],
    ['5611','ブラック'],['5613','ピンク']
  ];
  const paths=tokyo.map(name=>'東京モノレール/'+name).concat(
    shonan.map(([formation,livery])=>
      `湘南モノレール/湘南モノレール_5000系_${formation}編成_${livery}.png`));
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const index=JSON.parse(fs.readFileSync(
    'data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
  const byPath=new Map(index.map(entry=>[entry.path,entry]));
  for(const path of paths){
    const file=path.split('/').at(-1);
    assert.equal(ranges.includes(file),false,file+' has no persistent number band');
    const entry=byPath.get('images/列车/'+path);
    assert.ok(entry,path+' must remain in the audit index');
    assert.equal(entry.status,'no_verified_number_mapping',path);
    assert.deepEqual(entry.directNumberRules,[],path);
    assert.deepEqual(entry.runtimeNumberRosters,[],path);
    assert.deepEqual(entry.historicalNumberedSources,[],path);

    const refs=win.VehicleGaragePngMap.findPath('../images/列车/'+path);
    assert.equal(refs.length,1,path+' must remain inventory-visible');
    const isGenericTokyo=/_(?:10000|2000)形\.png$/.test(path);
    assert.equal(refs[0].canonicalImage,isGenericTokyo,path);
  }

  // Every Tokyo timetable row currently carries the same three-model label.
  // It narrows the fleet but cannot choose one of the three illustrations.
  const tokyoCandidates=win.TrainVehicle.resolve({
    operator:'TokyoMonorail',lineId:'TokyoMonorail',
    timetableVehicleType:'1000形 / 2000形 / 10000形',
    serviceDate:'2026-11-23',trainNumber:'TMH001D'
  });
  assert.equal(tokyoCandidates.identityStatus,'NARROWED');
  assert.equal(tokyoCandidates.iconPath,'');
  for(const trainNumber of ['TMH001D','TMW222U']){
    const serviceNumberOnly=win.TrainVehicle.resolve({
      operator:'TokyoMonorail',lineId:'TokyoMonorail',
      serviceDate:'2026-11-23',trainNumber
    });
    assert.equal(serviceNumberOnly.identityStatus,'UNKNOWN',trainNumber);
    assert.equal(serviceNumberOnly.iconPath,'',trainNumber);
  }
  const exactTokyoModel=win.TrainVehicle.resolve({
    operator:'TokyoMonorail',lineId:'TokyoMonorail',
    timetableVehicleType:'10000形',serviceDate:'2026-11-23'
  });
  assert.equal(exactTokyoModel.identityStatus,'EXACT');
  assert.equal(exactTokyoModel.iconPath,
    '../images/列车/東京モノレール/東京モノレール_10000形.png');

  // The Shonan single-fleet plan establishes only the 5000-series model.
  // A formation PNG needs independent, mutually consistent formation evidence.
  const shonanModelOnly=win.TrainVehicle.resolve({
    operator:'ShonanMonorail',lineId:'ShonanMonorail',
    timetableVehicleType:'湘南モノレール5000系',serviceDate:'2026-11-23'
  });
  assert.equal(shonanModelOnly.identityStatus,'EXACT');
  assert.equal(shonanModelOnly.iconPath,'');
  for(const trainNumber of ['SM001','SM541']){
    const serviceNumberOnly=win.TrainVehicle.resolve({
      operator:'ShonanMonorail',lineId:'ShonanMonorail',
      serviceDate:'2026-11-23',trainNumber
    });
    assert.equal(serviceNumberOnly.identityStatus,'UNKNOWN',trainNumber);
    assert.equal(serviceNumberOnly.iconPath,'',trainNumber);
  }
  for(const [formation,livery] of shonan){
    const exactFormation=win.TrainVehicle.resolve({
      operator:'ShonanMonorail',lineId:'ShonanMonorail',
      realtimeVehicleType:'湘南モノレール5000系',
      formationId:formation,formationCandidates:[formation],
      serviceDate:'2026-11-23',_realtimeVehicleResolution:true
    });
    assert.equal(exactFormation.identityStatus,'EXACT',formation);
    assert.equal(exactFormation.iconPath,
      `../images/列车/湘南モノレール/湘南モノレール_5000系_${formation}編成_${livery}.png`,
      formation);
  }
});

test('urban transit service numbers never choose a mixed fleet or a review-only formation',()=>{
  const names=[
    'ゆりかもめ/ゆりかもめ_7300系.png',
    'ゆりかもめ/ゆりかもめ_7500系.png',
    '宇都宮ライトレール/宇都宮ライトレール_HU300形_ライトライン.png',
    '山万/山万_1000形_第1編成_こあら1号.png',
    '山万/山万_1000形_第2編成_こあら2号.png',
    '山万/山万_1000形_第3編成_こあら3号.png'
  ];
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const index=JSON.parse(fs.readFileSync(
    'data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
  const byPath=new Map(index.map(entry=>[entry.path,entry]));
  for(const name of names){
    const file=name.split('/').at(-1);
    assert.equal(ranges.includes(file),false,file+' has no persistent number band');
    assert.equal(fs.existsSync('images/列车/'+name),true,name+' must exist');
    const entry=byPath.get('images/列车/'+name);
    assert.ok(entry,name+' must remain in the audit index');
    assert.equal(entry.status,'no_verified_number_mapping',name);
    assert.deepEqual(entry.directNumberRules,[],name);
    assert.deepEqual(entry.runtimeNumberRosters,[],name);
    assert.deepEqual(entry.historicalNumberedSources,[],name);

    const refs=win.VehicleGaragePngMap.findPath('../images/列车/'+name);
    assert.equal(refs.length,1,name+' must remain inventory-visible');
    const isYurikamome=name.startsWith('ゆりかもめ/');
    assert.equal(refs[0].canonicalImage,isYurikamome,name);
    assert.deepEqual(Array.from(refs[0].lineIds),isYurikamome?['Yurikamome']:[],name);
  }

  // Current Yurikamome timetables carry no vehicle label. The operator's
  // present fleet has both series, so a service number cannot choose one.
  const mixed=win.TrainVehicle.resolve({
    operator:'Yurikamome',lineId:'Yurikamome',
    timetableVehicleType:'7300系 / 7500系',
    serviceDate:'2026-11-23',trainNumber:'504'
  });
  assert.equal(mixed.identityStatus,'NARROWED');
  assert.deepEqual(Array.from(mixed.candidates),
    ['ゆりかもめ7300系','ゆりかもめ7500系']);
  assert.equal(mixed.iconPath,'');
  for(const trainNumber of ['504','2430']){
    const numberOnly=win.TrainVehicle.resolve({
      operator:'Yurikamome',lineId:'Yurikamome',
      serviceDate:'2026-11-23',trainNumber
    });
    assert.equal(numberOnly.identityStatus,'UNKNOWN',trainNumber);
    assert.equal(numberOnly.iconPath,'',trainNumber);
  }
  for(const [model,file] of [
    ['ゆりかもめ7300系','ゆりかもめ_7300系.png'],
    ['ゆりかもめ7500系','ゆりかもめ_7500系.png']
  ]){
    const explicitModel=win.TrainVehicle.resolve({
      operator:'Yurikamome',lineId:'Yurikamome',
      timetableVehicleType:model,serviceDate:'2026-11-23'
    });
    assert.equal(explicitModel.identityStatus,'EXACT',model);
    assert.equal(explicitModel.iconPath,'../images/列车/ゆりかもめ/'+file,model);
  }

  // Utsunomiya's staged trips have no vehicle_kind and its HU300 artwork is
  // still review-only. Yamaman's three images are formation identities, but
  // neither a service number nor a bare model label identifies a formation.
  for(const ctx of [
    {operator:'UtsunomiyaLightRail',lineId:'UtsunomiyaLRT',trainNumber:'1'},
    {operator:'UtsunomiyaLightRail',lineId:'UtsunomiyaLRT',
      timetableVehicleType:'宇都宮ライトレールHU300形',trainNumber:'206'},
    {operator:'Yamaman',lineId:'YamamanYukarigaoka',trainNumber:'1'},
    {operator:'Yamaman',lineId:'YamamanYukarigaoka',
      realtimeVehicleType:'山万1000形',formationId:'第1編成',
      formationCandidates:['第1編成'],_realtimeVehicleResolution:true}
  ]){
    const result=win.TrainVehicle.resolve({...ctx,serviceDate:'2026-11-23'});
    assert.equal(result.identityStatus,'UNKNOWN',JSON.stringify(ctx));
    assert.equal(result.iconPath,'',JSON.stringify(ctx));
  }
});

test('remaining monorail service numbers never elevate fleet references or a formation image',()=>{
  const paths=[
    '多摩都市モノレール/多摩都市モノレール_1000系_1102編成_広告ラッピング対応車.png',
    '多摩都市モノレール/多摩都市モノレール_1000系_標準塗装.png',
    '千葉都市モノレール/千葉都市モノレール_0形.png',
    '千葉都市モノレール/千葉都市モノレール_1000形.png'
  ];
  const ranges=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');
  const index=JSON.parse(fs.readFileSync(
    'data/audits/png-to-train-number-index-2611.json','utf8')).pngIndex;
  const byPath=new Map(index.map(entry=>[entry.path,entry]));
  for(const path of paths){
    const file=path.split('/').at(-1);
    assert.equal(ranges.includes(file),false,file+' has no persistent number band');
    assert.equal(fs.existsSync('images/列车/'+path),true,path+' must exist');
    const entry=byPath.get('images/列车/'+path);
    assert.ok(entry,path+' must remain in the audit index');
    assert.equal(entry.status,'no_verified_number_mapping',path);
    assert.deepEqual(entry.directNumberRules,[],path);
    assert.deepEqual(entry.runtimeNumberRosters,[],path);
    assert.deepEqual(entry.historicalNumberedSources,[],path);

    const refs=win.VehicleGaragePngMap.findPath('../images/列车/'+path);
    assert.equal(refs.length,1,path+' must remain inventory-visible');
    assert.equal(refs[0].canonicalImage,!path.includes('1102編成'),path);
  }

  // Tama's official_single_fleet_plan is only a route-fleet reference. A
  // service number or the short source label cannot authorize either PNG.
  for(const trainNumber of ['1001','926']){
    const numberOnly=win.TrainVehicle.resolve({
      operator:'TamaMonorail',lineId:'TamaMonorail',trainNumber,
      serviceDate:'2026-11-23'
    });
    assert.equal(numberOnly.identityStatus,'UNKNOWN',trainNumber);
    assert.equal(numberOnly.iconPath,'',trainNumber);
  }
  const sourceLabel=win.TrainVehicle.resolve({
    operator:'TamaMonorail',lineId:'TamaMonorail',
    timetableVehicleType:'1000系',trainNumber:'1001',serviceDate:'2026-11-23'
  });
  assert.equal(sourceLabel.identityStatus,'UNKNOWN');
  assert.equal(sourceLabel.iconPath,'');
  const explicitTamaModel=win.TrainVehicle.resolve({
    operator:'TamaMonorail',lineId:'TamaMonorail',
    timetableVehicleType:'多摩都市モノレール1000系',serviceDate:'2026-11-23'
  });
  assert.equal(explicitTamaModel.identityStatus,'EXACT');
  assert.equal(explicitTamaModel.iconPath,
    '../images/列车/多摩都市モノレール/多摩都市モノレール_1000系_標準塗装.png');
  const tama1102=win.TrainVehicle.resolve({
    operator:'TamaMonorail',lineId:'TamaMonorail',
    realtimeVehicleType:'多摩都市モノレール1000系',
    formationId:'1102編成',formationCandidates:['1102編成'],
    _realtimeVehicleResolution:true,serviceDate:'2026-11-23'
  });
  assert.equal(tama1102.identityStatus,'EXACT');
  assert.equal(tama1102.iconPath,explicitTamaModel.iconPath,
    'formation evidence must not elevate the review-only 1102 artwork');

  // Current Chiba templates carry no vehicle label and the operator still
  // has both 0 and 1000 types, so CM numbers alone must remain neutral.
  for(const [line,trainNumber] of [
    ['ChibaMonorail1','CM1001'],['ChibaMonorail1','CM1487'],
    ['ChibaMonorail2','CM2001'],['ChibaMonorail2','CM2401']
  ]){
    const numberOnly=win.TrainVehicle.resolve({
      operator:'ChibaUrbanMonorail',lineId:line,trainNumber,
      serviceDate:'2026-11-23'
    });
    assert.equal(numberOnly.identityStatus,'UNKNOWN',trainNumber);
    assert.equal(numberOnly.iconPath,'',trainNumber);
  }
  for(const [line,model,file] of [
    ['ChibaMonorail1','千葉都市モノレール0形','千葉都市モノレール_0形.png'],
    ['ChibaMonorail2','千葉都市モノレール1000形','千葉都市モノレール_1000形.png']
  ]){
    const explicitModel=win.TrainVehicle.resolve({
      operator:'ChibaUrbanMonorail',lineId:line,
      timetableVehicleType:model,serviceDate:'2026-11-23'
    });
    assert.equal(explicitModel.identityStatus,'EXACT',model);
    assert.equal(explicitModel.iconPath,
      '../images/列车/千葉都市モノレール/'+file,model);
  }
});
