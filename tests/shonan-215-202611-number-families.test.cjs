'use strict';
/* 2026-11 E231-1000 / E233-3000 shared public numbers and retired 215.
 * Does NOT identify physical stock and must never invent a 215 live train.
 * node --test tests/shonan-215-202611-number-families.test.cjs
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
const sourceFile='data/timetables/jreast-shonan-mixed-number-index-202611.js';
for(const f of [
  'data/timetables/vehicle-garage-png-map.js',sourceFile,
  'data/timetables/train-number-png-ranges.js','js/train-vehicle.js'
])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const index=root.JREastShonanMixedNumberIndex202611;
assert.ok(index);
function p(line,number,kind,calendar='weekday',change={}){
  const railway=line==='TokaidoMain'?'Tokaido':
    line==='UtsunomiyaJR'?'Utsunomiya':line;
  return {
    trainId:'planned-trip:2026-11-03|JR-East|'+line+'|'+number,
    positionLineId:line,sourceRailway:'odpt.Railway:JR-East.'+railway,
    trainOperator:'JR-East',trainNumber:number,
    trainType:'odpt.TrainType:JR-East.'+kind,
    serviceDate:'2026-11-03',calendarType:calendar,
    positionSource:'supabase-train-run',estimated:true,
    vehicleIdentityStatus:'UNKNOWN',vehicleResolvedUpstream:false,
    ...change
  };
}
test('date/calendar/type/actual railway scoped mixed E233-3000 and E231-1000 public numbers',()=>{
  assert.equal(index.rows,38);
  const samples=[
    ['Tokaido','1820E','Local'],['TokaidoMain','1820E','Local'],
    ['UtsunomiyaJR','1520E','Local'],['UtsunomiyaJR','520M','Local'],
    ['UtsunomiyaJR','2683M','Local'],['Takasaki','1820E','Local'],
    ['UenoTokyo','1820E','Local'],
    ['ShonanShinjuku','2520Y','Local'],
    ['ShonanShinjuku','2820Y','Rapid'],
    ['Takasaki','4820Y','SpecialRapid'],
    ['Tokaido','2820Y','Rapid'],
    ['Ito','1556E','Local','holiday'],
    ['Yokosuka','2522Y','Local','holiday']
  ];
  samples.forEach(([line,num,kind,cal])=>{
    const sample=p(line,num,kind,cal||'weekday'), result=index.match(sample);
    assert.ok(result,line+' '+num+' should be sourced');
    assert.deepEqual(Array.from(result.models),['E231系1000番台','E233系3000番台']);
    assert.equal(result.trainNumber,num);
    assert.equal(result.status,'UNCONFIRMED_PLANNED_FLEET');
    assert.equal(result.authorizesPNG,false,'mixed fleet must not grant a carset image');
    assert.equal(result.physicalFormationConfirmed,false);
    assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(sample),null,
      'no E233-3000 exclusive range is authorized by this candidate index');
  });
  assert.ok(index.counts.Tokaido>500);
  assert.ok(index.counts.ShonanShinjuku>200);
});
test('deny single-model inference, calendar reuse and cross-source model borrowing',()=>{
  const base=p('Tokaido','1820E','Local');
  for(const change of [
    {positionLineId:'Joban'}, {displayLineId:'UenoTokyo'},
    {sourceRailway:'odpt.Railway:JR-East.UenoTokyo'},
    {sourceRailway:'odpt.Railway:JR-West.Tokaido'},
    {trainOperator:'JR-West'},
    {trainNumber:'1820F'}, {trainType:'odpt.TrainType:JR-East.LimitedExpress'},
    {serviceDate:'2026-12-01'}, {serviceDate:'2026-10-31'},
    {serviceDate:'2021-03-12'}, {serviceDate:''},
    {calendarType:'invalid',serviceId:''},
    {vehicleIdentityStatus:'EXACT'},
    {vehicleResolvedUpstream:true},
    {vehiclePlan:{status:'PLANNED_MODEL',models:['E259系']}}
  ])assert.equal(index.match({...base,...change}),null,JSON.stringify(change));
  for(const x of [
    p('Yokosuka','1005S','Local','holiday'),
    p('UenoTokyo','1257M','Local'),
    p('Tokaido','3071M','LimitedExpress'),
    p('ShonanShinjuku','9591M','Rapid','holiday'),
    // Utsunomiya-Kuroiso E131 600 family; Nikko through 2823M is E131.
    p('UtsunomiyaJR','620M','Local'),
    p('UtsunomiyaJR','632M','Local'),
    p('UtsunomiyaJR','699M','Local'),
    p('UtsunomiyaJR','2823M','Local'),
    p('UtsunomiyaJR','620M','Local','holiday')
  ])assert.equal(index.match(x),null,'no foreign or retired fleet claim');
});
test('historical 215 is bounded to 2020/2021 and seasonal service requires exact date proof',()=>{
  for(const n of ['3721M','3723M','3726M','3728M','3729M','3735M','3454M']){
    const result=index.historical215(n,'2020-04-01','weekday');
    assert.equal(result.model,'215系');
    assert.equal(result.historical,true);
    assert.equal(result.authorizesLivePNG,false);
    assert.equal(index.historical215(n,'2020-04-04','holiday'),null);
    assert.equal(index.historical215(n,'2021-03-13','weekday'),null);
    assert.equal(index.historical215(n,'2026-11-04','weekday'),null);
  }
  for(const n of ['9591M','9592M']){
    assert.equal(index.historical215(n,'2020-11-29','holiday'),null,
      'historical special number is insufficient without date verification');
    assert.equal(index.historical215(n,'2020-11-29','holiday',
      {operatingDateVerified:true}).model,'215系');
    assert.equal(index.historical215(n,'2026-11-29','holiday',
      {operatingDateVerified:true}),null);
  }
  for(const n of ['3722M','3724M','3730M','3452M','3456M']){
    assert.equal(index.historical215(n,'2020-04-01','weekday'),null,
      'the 2020 timetable assigns 185 trains to these services');
  }
});
test('SVG titles explain mixed fleet but do not hand out a fabricated PNG',()=>{
  const render=fs.readFileSync('js/trains-render.js','utf8');
  const begin=render.indexOf('  function _shonanFleetCandidatesLabel(');
  const end=render.indexOf('  // Display the timetable fleet mapping',begin);
  assert.ok(begin>=0&&end>begin);
  vm.runInContext(render.slice(begin,end),ctx,
    {filename:'js/trains-render.js:shonan-label'});
  const label=ctx._shonanFleetCandidatesLabel;
  const actual=p('Tokaido','1820E','Local');
  assert.match(label(actual,'Tokaido','ja'),/計画車種未確認.*E231系1000番台 \/ E233系3000番台/);
  assert.match(label(actual,'Tokaido','zh'),/计划车型未确认/);
  assert.equal(label(actual,'Takasaki','ja'),'',
    'candidate from Tokaido cannot jump to another displayed line');
  assert.equal(label(p('Tokaido','1820E','Local', 'weekday',
    {vehicleIdentityStatus:'EXACT'}),'Tokaido','ja'),'');
  assert.equal(label(p('Tokaido','3721M','Local'),'Tokaido','ja'),'');
  const art=root.TrainVehicle.selectMarkerArtwork(actual,false);
  assert.equal(art.kind,'unresolved',
    'candidate text alone does not authorize an E233 PNG');
  const html=fs.readFileSync('pages/trains.html','utf8');
  assert.ok(html.includes('jreast-shonan-mixed-number-index-202611.js?v='+hashFor(sourceFile)));
  assert.ok(html.indexOf('jreast-shonan-mixed-number-index-202611.js')<
    html.indexOf('js/trains-render.js'));
  // Renderer cache versions advance independently of the Shonan fleet
  // index: any dated asset version is valid, as long as it loads AFTER
  // the source index and never falls back to an unversioned stale script.
  assert.ok(html.includes('trains-render.js?v='+hashFor('js/trains-render.js')));
});

test('Takasaki and Utsunomiya render ONE planned fleet reference PNG, not two cars or a grey dot',()=>{
  const img='../images/列车/JR東日本/JR東日本_E233系3000番台.png';
  const base=p('Takasaki','826M','Local','weekday',{
    serviceDate:'2026-11-04',positionSource:'supabase-train-run'});
  const evidence=index.match(base);
  assert.ok(evidence);
  assert.equal(evidence.authorizesPNG,false,
    'fleet reference cannot establish an actual model');
  assert.equal(evidence.illustrativeNorthFleetOnly,true);
  assert.equal(evidence.illustrativeModel,'E233系3000番台');
  for(const [line,number,kind] of [
    ['Takasaki','826M','Local'],
    ['Takasaki','1820E','Local'],
    ['Takasaki','4820Y','SpecialRapid'],
    ['UtsunomiyaJR','1520E','Local'],
    ['UtsunomiyaJR','520M','Local'],
    ['UtsunomiyaJR','4520Y','Rapid']
  ]){
    for(const source of ['supabase-train-run','realtime-api']){
      const position=p(line,number,kind,'weekday',{
        serviceDate:'2026-11-04',positionSource:source,
        estimated:source!=='realtime-api'
      });
      assert.ok(index.match(position),'verified source number '+line+' '+number);
      const art=root.TrainVehicle.selectMarkerArtwork(position,false);
      assert.equal(art.kind,'vehicle',line+' '+number+' '+source);
      assert.equal(art.iconSrc,img);
      assert.equal(art.planned,true);
      assert.equal(art.representativeOnly,true);
      assert.equal(art.actualVehicleConfirmed,false);
      assert.equal(art.candidateAssets,undefined,
        'never render alternate trains side-by-side');
      assert.equal(position.vehicleIdentityStatus,'UNKNOWN');
      assert.equal(position.vehicleResolvedUpstream,false);
      assert.equal(position.vehicleType,undefined);
    }
  }
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(base),null,
    'mixed fleet still never grants a unique physical-model PNG');
  const bad=[
    {displayLineId:'UtsunomiyaJR'},
    {positionLineId:'ShonanShinjuku'},
    {serviceDate:'2026-12-01'},
    {calendarType:'holiday'},
    {sourceRailway:'odpt.Railway:JR-East.Utsunomiya'},
    {sourceRailway:'odpt.Railway:JR-West.Takasaki'},
    {trainOperator:'JR-Central'},
    {trainNumber:'9999E'},
    {vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true},
    {vehiclePlan:{confirmed:true,status:'PLANNED_MODEL',models:['E231系1000番台']}}
  ];
  for(const change of bad){
    const art=root.TrainVehicle.selectMarkerArtwork({...base,...change},false);
    assert.notEqual(art.iconSrc,img,'no unscoped fleet PNG '+JSON.stringify(change));
    assert.notEqual(art.kind,'candidate','no misleading double vehicle picture');
  }
  // Even if a generic two-model operation candidate is present, the
  // numbered north-Shonan display picks one strictly illustrative icon;
  // absent a scoped source number it falls back to a single neutral dot.
  const generalCandidates={
    vehicleResolutionLineId:'Takasaki',
    operationArtworkCandidates:[
      {vehicleType:'E231系1000番台',
       asset:'../images/列车/JR東日本/JR東日本_E231系_1000番台.png'},
      {vehicleType:'E233系3000番台',asset:img}
    ]
  };
  const single=root.TrainVehicle.selectMarkerArtwork({
    ...base,...generalCandidates},false);
  assert.equal(single.kind,'vehicle');
  assert.equal(single.iconSrc,img);
  const unknown=root.TrainVehicle.selectMarkerArtwork({
    ...base,...generalCandidates,trainNumber:'9999E'},false);
  assert.equal(unknown.kind,'unresolved',
    'unknown northern number must never render two side-by-side candidates');
  assert.equal(root.TrainVehicle.selectMarkerArtwork(base,true).kind,'unresolved',
    'failed PNG must retain the position as a neutral circle');
});
test('one train SVG component renders one reference image, never a tandem candidate',()=>{
  const position=p('Takasaki','826M','Local','weekday',{
    serviceDate:'2026-11-04',positionSource:'supabase-train-run'});
  const img='../images/列车/JR東日本/JR東日本_E233系3000番台.png';
  const render=fs.readFileSync('js/trains-render.js','utf8');
  const from=render.indexOf('  function _trainMarkerSpec(');
  const to=render.indexOf('  // Public identification boundary:',from);
  assert.ok(from>=0&&to>from);
  vm.runInContext(render.slice(from,to)+
    '\nthis.referenceSpec=_trainMarkerSpec;',ctx);
  const spec=ctx.referenceSpec(position,'planned-trip-826M','Takasaki');
  assert.equal(spec.kind,'vehicle');
  assert.equal(spec.iconSrc,img);
  assert.equal(spec.planned,true);
  assert.equal(spec.compact,false,'one illustrated fleet SVG image');
  assert.equal(spec.candidateAssets.length,0,'no extra vehicle images');
  const start=render.indexOf('  function _createTrainMarker(');
  const end=render.indexOf('  // TrainComponent is the sole public lifecycle',start);
  assert.ok(start>=0&&end>start);
  class FakeSvg {
    constructor(tag){this.tagName=tag;this.attrs={};this.children=[];this.parentNode=null;
      this.listeners={};this.isConnected=true;}
    setAttribute(n,v){this.attrs[n]=String(v)}
    setAttributeNS(ns,n,v){this.setAttribute(n,v)}
    getAttribute(n){return this.attrs[n]||''}
    removeAttribute(n){delete this.attrs[n]}
    addEventListener(n,fn){this.listeners[n]=fn}
    appendChild(c){this.children.push(c);c.parentNode=this;return c}
    insertBefore(c,d){let i=this.children.indexOf(d);this.children.splice(i,0,c);c.parentNode=this;}
    removeChild(c){this.children.splice(this.children.indexOf(c),1);c.parentNode=null;}
  }
  ctx.document={createElementNS(ns,tag){return new FakeSvg(tag)}};
  vm.runInContext(`
    function _trainMarkerTitle(p){return '列車番号 '+p.trainNumber+' | 計画車種未確認（E231系 / E233系）';}
    function _setTrainMarkerAccessibilityLabel(marker,s){marker.setAttribute('aria-label',s);}
    function _setTrainFormationAttribute(){}
    function _trainMarkerDomKind(spec){return spec&&spec.planned===true?'planned':(spec&&spec.kind||'unresolved');}
    function _trainUnitContainer(marker){return marker.parentNode&&marker.parentNode.getAttribute('data-train-unit-id')?marker.parentNode:null;}
    function _setTrainIconPosition(marker,x,y){marker.parentNode.setAttribute('transform','translate('+x+','+y+')');}
    function _resolveTrainLabelCollisions(){}
    function _rememberTrainArtworkFailure(){}
  `+render.slice(start,end)+'\nthis.makeSingleReferenceMarker=_createTrainMarker;',ctx);
  const marker=ctx.makeSingleReferenceMarker({isConnected:true},
    'http://www.w3.org/2000/svg','planned-trip-826M',spec,159.5,245,
    position,'Takasaki',false,'#008803',null);
  assert.equal(marker.tagName,'image');
  assert.equal(marker.children.length,0,'one SVG image, not a group of two');
  assert.equal(marker.getAttribute('href'),img);
  assert.equal(marker.getAttribute('data-train-artwork'),img);
  assert.equal(marker.getAttribute('data-marker-kind'),'planned');
  assert.equal(marker.getAttribute('data-marker-display'),'artwork');
  assert.equal(marker.getAttribute('data-marker-reference-only'),'true');
  assert.equal(marker.getAttribute('data-vehicle-candidate'),'');
  assert.equal(marker.parentNode.getAttribute('data-train-unit-id'),'planned-trip-826M');
  assert.equal(marker.parentNode.children.length,1,'one train unit, no extra formation');
  assert.equal(marker.parentNode.getAttribute('transform'),'translate(159.5,245)');
  assert.match(marker.getAttribute('aria-label'),/826M.*計画車種未確認/);
});
