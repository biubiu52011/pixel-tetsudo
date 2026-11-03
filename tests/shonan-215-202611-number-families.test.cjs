'use strict';
/* 2026-11 E231-1000 / E233-3000 shared public numbers and retired 215.
 * Does NOT identify physical stock and must never invent a 215 live train.
 * node --test tests/shonan-215-202611-number-families.test.cjs
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
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
  assert.ok(html.includes('jreast-shonan-mixed-number-index-202611.js?v='+index.version));
  assert.ok(html.indexOf('jreast-shonan-mixed-number-index-202611.js')<
    html.indexOf('js/trains-render.js'));
  // Renderer cache versions advance independently of the Shonan fleet
  // index: any dated asset version is valid, as long as it loads AFTER
  // the source index and never falls back to an unversioned stale script.
  assert.match(html,/trains-render\.js\?v=20261104-[^"' ]+/);
});

test('Takasaki 826M is an official 06:54 Kagohara -> 08:12 Ueno mixed fleet, not an unknown number',()=>{
  const position=p('Takasaki','826M','Local','weekday',{
    serviceDate:'2026-11-04',positionSource:'supabase-train-run'});
  const info=index.match(position);
  assert.ok(info);
  assert.equal(info.trainNumber,'826M');
  assert.equal(info.status,'UNCONFIRMED_PLANNED_FLEET');
  const artwork=root.TrainVehicle.selectMarkerArtwork(position,false);
  assert.equal(artwork.kind,'candidate');
  assert.equal(artwork.planned,false);
  assert.equal(artwork.physicalFormationConfirmed,false);
  assert.deepEqual(Array.from(artwork.candidateAssets),[
    '../images/列车/JR東日本/JR東日本_E231系_1000番台.png',
    '../images/列车/JR東日本/JR東日本_E233系3000番台.png']);
  assert.equal(root.TrainVehicle.lookupTrainNumberRangePng(position),null,
    'a mixed fleet must never turn into a single model range');
  assert.equal(position.vehicleIdentityStatus,'UNKNOWN');
  // Supabase and realtime can display the same source-scoped candidates,
  // but a different display line or date must not borrow the PNGs.
  assert.equal(root.TrainVehicle.selectMarkerArtwork({
    ...position,positionSource:'realtime-api'} ,false).kind,'candidate');
  for (const changed of [
    {displayLineId:'UtsunomiyaJR'},
    {positionLineId:'ShonanShinjuku'},
    {serviceDate:'2026-12-01'},
    {calendarType:'holiday'},
    {sourceRailway:'odpt.Railway:JR-East.Utsunomiya'},
    {vehicleIdentityStatus:'EXACT',vehicleResolvedUpstream:true},
    {vehiclePlan:{confirmed:true,status:'PLANNED_MODEL',models:['E231系1000番台']}},
  ]) {
    assert.notEqual(root.TrainVehicle.selectMarkerArtwork({
      ...position,...changed},false).kind,'candidate',JSON.stringify(changed));
  }
  assert.equal(root.TrainVehicle.selectMarkerArtwork(position,true).kind,'unresolved',
    'broken gallery artwork must fall back to a neutral location marker');
});
test('one SVG component renders two existing candidate PNGs without changing 826M or train ID',()=>{
  const position=p('Takasaki','826M','Local','weekday',{
    serviceDate:'2026-11-04',positionSource:'supabase-train-run'});
  const render=fs.readFileSync('js/trains-render.js','utf8');
  const from=render.indexOf('  function _trainMarkerSpec(');
  const to=render.indexOf('  // Public identification boundary:',from);
  assert.ok(from>=0&&to>from);
  vm.runInContext(render.slice(from,to)+
    '\nthis.pairedSpec=_trainMarkerSpec;',ctx);
  const spec=ctx.pairedSpec(position,'planned-trip-826M','Takasaki');
  assert.equal(spec.kind,'candidate');
  assert.equal(spec.compact,false,'two PNGs, not a grey circle');
  assert.equal(spec.candidateAssets.length,2);
  // The browser creates two <image> children inside a single keyed <g>.
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
    function _trainMarkerTitle(p){return '列車番号 '+p.trainNumber+' | 計画車種未確認';}
    function _setTrainMarkerAccessibilityLabel(marker,s){marker.setAttribute('aria-label',s);}
    function _setTrainFormationAttribute(){}
    function _trainUnitContainer(marker){return marker.parentNode&&marker.parentNode.getAttribute('data-train-unit-id')?marker.parentNode:null;}
    function _setTrainIconPosition(marker,x,y){marker.parentNode.setAttribute('transform','translate('+x+','+y+')');}
    function _resolveTrainLabelCollisions(){}
    function _rememberTrainArtworkFailure(){}
  `+render.slice(start,end)+'\nthis.makePairedMarker=_createTrainMarker;',ctx);
  const marker=ctx.makePairedMarker({isConnected:true},
    'http://www.w3.org/2000/svg','planned-trip-826M',spec,159.5,245,
    position,'Takasaki',false,'#008803',null);
  assert.equal(marker.tagName,'g');
  assert.equal(marker.children.length,2);
  assert.ok(marker.children.every(child=>child.tagName==='image'));
  assert.equal(marker.getAttribute('data-marker-kind'),'candidate');
  assert.equal(marker.getAttribute('data-marker-display'),'artwork');
  assert.equal(marker.getAttribute('data-vehicle-unresolved'),'true');
  assert.equal(marker.parentNode.getAttribute('data-train-unit-id'),'planned-trip-826M');
  assert.equal(marker.parentNode.children.length,1,'no duplicate train position');
  assert.equal(marker.parentNode.getAttribute('transform'),'translate(159.5,245)');
  assert.match(marker.getAttribute('aria-label'),/826M.*計画車種未確認/);
});
