'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/core/railway_data.json'), 'utf8'));

function load() {
  const events = [];
  const element = {
    innerHTML: '',
    classList: {add(){},toggle(){}},
    setAttribute(){},
    querySelectorAll(){return [];},
    dispatchEvent(event){events.push(event.detail);}
  };
  const document = {
    readyState:'loading',documentElement:{lang:'ja'},
    addEventListener(){},getElementById(){return element;}
  };
  const window = {
    currentLang:'ja', t:key => key==='filter.all'?'すべて':key,
    RuntimeConfig:{SERVICE_CORRIDOR_LINES:{UenoTokyo:true}},
    STATION_COORDS:Object.fromEntries(Object.entries(data.stations).filter(([,v])=>v.lat&&v.lng)
      .map(([id,v])=>[id,[v.lat,v.lng]]))
  };
  const context={window,document,navigator:{},console,
    CustomEvent:function(type,init){this.type=type;this.detail=init.detail;},
    tOp:op=>op,escapeHtml:op=>op};
  for(const script of ['js/common.js','js/line-presentation-service.js','js/data-state.js'])
    vm.runInNewContext(fs.readFileSync(path.join(root,script),'utf8'),context,{filename:script,timeout:10000});
  return {window,events,element};
}

test('line regions include genuine cross-area corridors, not distant homonymous stations',()=>{
  const {window}=load();
  const region=id=>Array.from(window.DataState.getLineRegions(data.lines[id]));
  assert.deepEqual(region('TohokuShinkansen'),['Tohoku','Kanto']);
  assert.deepEqual(region('HokkaidoShinkansen'),['Hokkaido','Tohoku']);
  assert.deepEqual(region('SanyoShinkansen'),['Kansai','Chugoku','Kyushu']);
  assert.deepEqual(region('TokaidoShinkansen'),['Kanto','Tokai','Kansai']);
  assert.deepEqual(region('SaninMain'),['Kansai','Chugoku']);
  assert.deepEqual(region('KansaiMain'),['Tokai','Kansai']);
  assert.equal(Object.values(data.lines).filter(line=>
    !window.DataState.getLineRegions(line).length).length,0);
});

test('a regional choice actually filters line cards, keeping the operator order',()=>{
  const {window}=load();
  const state=window.DataState;
  const kanto=state.filterLinesByRegion(data.lines,'Kanto');
  assert.ok(kanto.Yamanote && kanto.TohokuShinkansen);
  assert.ok(!kanto.SanyoShinkansen && !kanto.OsakaLoop);
  const kansai=state.filterLinesByRegion(data.lines,'Kansai');
  assert.ok(kansai.SanyoShinkansen && kansai.TokaidoShinkansen);
  assert.ok(!kansai.Yamanote);
  const tobukanto=state.filterLinesByRegionAndOperator(data.lines,'Kanto','Tobu');
  assert.ok(tobukanto.Tojo);
  assert.ok(Object.values(tobukanto).every(line=>line.operator==='Tobu'));
  assert.deepEqual(Array.from(state.getRegions()),['Hokkaido','Tohoku','Kanto',
    'KoshinHokuriku','Tokai','Kansai','Chugoku','Shikoku','Kyushu']);
  assert.deepEqual(Array.from(window.LinePresentationService.getDisplayOrder(data.lines,
    {includeServiceCorridors:true})).slice(
      window.LinePresentationService.getDisplayOrder(data.lines,{includeServiceCorridors:true}).indexOf('JobanMain'),
      window.LinePresentationService.getDisplayOrder(data.lines,{includeServiceCorridors:true}).indexOf('JobanMain')+3),
    ['JobanMain','UenoTokyo','ChuoMain']);
});

test('filter renders at most two levels, and region switches reset company selection',()=>{
  const {window,element,events}=load();
  const filter=window.OperatorFilterBar.create(element);
  filter.render(data.lines);
  assert.equal((element.innerHTML.match(/class="rs-filter-level /g)||[]).length,1);
  assert.ok(element.innerHTML.includes('data-region="Kanto"'));
  assert.ok(!element.innerHTML.includes('data-operator="JR-East"'));
  filter.setRegion('Kanto',true);
  assert.equal((element.innerHTML.match(/class="rs-filter-level /g)||[]).length,2);
  assert.ok(element.innerHTML.includes('data-operator="Tobu"'));
  assert.ok(!element.innerHTML.includes('data-operator="JR-Hokkaido"'));
  filter.setSelected('Tobu',true);
  assert.equal(filter.getSelected(),'Tobu');
  filter.setRegion('Kansai',true);
  assert.equal(filter.getSelected(),null);
  assert.ok(element.innerHTML.includes('data-operator="JR-West"'));
  assert.ok(!element.innerHTML.includes('data-operator="Tobu"'));
  filter.setRegion(null,true);
  assert.equal((element.innerHTML.match(/class="rs-filter-level /g)||[]).length,1);
  assert.equal(filter.getRegion(),null);
  assert.deepEqual(JSON.parse(JSON.stringify(events)),[
    {region:'Kanto',operator:null},{region:'Kanto',operator:'Tobu'},
    {region:'Kansai',operator:null},{region:null,operator:null}
  ]);
});

test('cached filter restores a removed control tree in the lightweight DOM',()=>{
  const {window,element}=load();
  const filter=window.OperatorFilterBar.create(element);
  filter.render(data.lines);
  filter.setRegion('Kanto',false);
  filter.setSelected('Tobu',false);
  assert.equal(filter.getRegion(),'Kanto');
  assert.equal(filter.getSelected(),'Tobu');

  // This host intentionally does not implement querySelector(), matching
  // CI's lightweight element and guarding against the prior TypeError.
  assert.equal(typeof element.querySelector,'undefined');
  element.innerHTML='';
  assert.doesNotThrow(()=>filter.render(data.lines));
  assert.ok(element.innerHTML.includes('data-region="Kanto"'));
  assert.ok(element.innerHTML.includes('data-operator="Tobu"'));
  assert.match(element.innerHTML,/class="rs-filter-btn active" data-operator="Tobu"/);
  assert.equal(filter.getSelected(),'Tobu');
});

test('both pages consume the shared region and operator filter state',()=>{
  const trains=fs.readFileSync(path.join(root,'js/trains-page.js'),'utf8');
  const realtime=fs.readFileSync(path.join(root,'js/realtime-view.js'),'utf8');
  for(const script of [trains,realtime]){
    assert.match(script,/filterLinesByRegionAndOperator|filterLinesByRegion\(/);
    assert.match(script,/e\.detail && e\.detail\.region|event\.detail && event\.detail\.region/);
  }
  const styles=fs.readFileSync(path.join(root,'css/ux-refinements.css'),'utf8');
  assert.match(styles,/\.rs-region-filter \.rs-filter-level/);
  const layout=styles.slice(styles.indexOf('/* Compact shared two-tier railway filter: region -> operator. */'));
  assert.match(layout,/\.rs-region-filter \.rs-filter-level\s*\{[\s\S]*?display:grid;/);
  assert.match(layout,/grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,112px\),1fr\)\)/);
  assert.match(layout,/\.rs-region-filter \.rs-company-level\s*\{[\s\S]*?minmax\(min\(100%,140px\),1fr\)/);
  assert.match(layout,/\.rs-region-filter \.rs-region-level\s*\{[\s\S]*?repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(layout,/\.rs-region-filter \.rs-company-level\s*\{[\s\S]*?repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(layout,/grid-column:1 \/ -1/);
  assert.doesNotMatch(layout,/overflow-x\s*:\s*auto|scroll-snap|flex-wrap\s*:\s*nowrap/);
});

test('region membership caches unchanged routes but invalidates coordinate replacement',()=>{
  const {window}=load();
  const example={operator:'TestRail',stations:['SampleStop']};
  window.STATION_COORDS={SampleStop:[35.68,139.76]};
  assert.deepEqual(Array.from(window.DataState.getLineRegions(example)),['Kanto']);
  const cached=window.DataState.getLineRegions(example);
  cached.push('Kyushu');
  assert.deepEqual(Array.from(window.DataState.getLineRegions({
    operator:'TestRail',stations:['SampleStop'],status:'delayed'
  })),['Kanto'],'live status and cloned route objects share membership cache');
  window.STATION_COORDS={SampleStop:[34.70,135.50]};
  assert.deepEqual(Array.from(window.DataState.getLineRegions(example)),['Kansai']);
});

test('regional filters retain shared structure and fast operator visibility',()=>{
  const state=fs.readFileSync(path.join(root,'js/data-state.js'),'utf8');
  const trains=fs.readFileSync(path.join(root,'js/trains-page.js'),'utf8');
  const realtime=fs.readFileSync(path.join(root,'js/realtime-view.js'),'utf8');
  assert.match(state,/var _regionCache = new Map\(\)/);
  assert.match(state,/lastRegionLabelsSignature===regionLabelsSignature/);
  assert.match(trains,/_renderedOverviewSnapshot===allLines/);
  assert.doesNotMatch(trains, /\[null\]\.concat\(overviewOperators\(allLines\)\)/);
  assert.match(realtime,/setOperatorVisibility\(container,_selectedOperator\)/);
  assert.match(realtime,/recordRenderedStatusSignatures\(regionLines\)/);
  assert.match(realtime,/var regionLines = window\.DataState\.filterLinesByRegion\(linesObj, _selectedRegion\)/);
});
