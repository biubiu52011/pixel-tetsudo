'use strict';
// SVG route colour and branch viewport regressions.
// Run: node --test tests/trains-svg-visual-contract.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const geometrySource = fs.readFileSync('js/trains-data.js', 'utf8');
const rendererSource = fs.readFileSync('js/trains-render.js', 'utf8');
const cssSource = fs.readFileSync('css/trains.css', 'utf8');

test('all constructed main, loop, fork, fusion and shared tracks use 60% stroke opacity', () => {
  const opacities = [...geometrySource.matchAll(/['"]stroke-opacity['"]:\s*([0-9.]+)/g)];
  assert.ok(opacities.length >= 11, 'all track classes must use one stroke-alpha contract');
  assert.ok(opacities.every(m => Number(m[1]) === 0.6));
  assert.doesNotMatch(geometrySource, /\bopacity:\s*(?:0\.5|0\.6|1\.0)\b/);
  const branches = [...rendererSource.matchAll(/setAttribute\("stroke-opacity", "0\.6"\)/g)];
  assert.equal(branches.length, 3, 'horizontal spur, bend, and vertical branch');
  assert.doesNotMatch(rendererSource, /setAttribute\("opacity", "(?:0\.5|0\.6)"\)/);
  assert.match(rendererSource, /stationNodeLayer/);
  assert.match(rendererSource, /stationInfoLayer/);
});

test('single branch width uses content needs, never an artificial 96px per branch', () => {
  assert.doesNotMatch(geometrySource, /GEOM\.BRANCH_COL_W\s*\*\s*branchLines\.length/);
  assert.equal(
    [...geometrySource.matchAll(/svgW = Math\.max\(_baseW, mainCx \+ 12 \+ _rightNeed \+ _rightPad\);/g)].length,
    2, 'single and multiple branches must use the measured right-side need'
  );
  assert.match(geometrySource, /_branchStubL/);
  assert.match(geometrySource, /branchGeom:\s*branchGeom/);
});


function createViewport(width) {
  const start=rendererSource.indexOf('  function _commitStaticRouteViewport(');
  const end=rendererSource.indexOf('  // Read-only contract diagnostic:',start);
  assert.ok(start>=0 && end>start);
  const context=vm.createContext({window:{
      innerWidth:width,TrainsConfig:{GEOM:{
        MOBILE_BREAKPOINT:640,TABLET_BREAKPOINT:900,MOBILE_RENDER_SCALE:1.45
      }}
    },_isMobileView:()=>width<=640});
  vm.runInContext(rendererSource.slice(start,end),context);
  return context._commitStaticRouteViewport;
}
function svg(wrapperWidth=344) {
  return {style:{},attrs:{},parentNode:{clientWidth:wrapperWidth},
    setAttribute(name,v){this.attrs[name]=v;}};
}
function runViewport(commit,width,branchLines=[],wrapperWidth=344) {
  const el=svg(wrapperWidth),geometry={svgW:1200,svgH:900,branchLines};
  const bounds=commit(el,{getBBox(){return {x:15,y:10,width,height:700};}},geometry);
  return {el,bounds,geometry};
}
test('Ito and ChuoSobuLocal have the same final physical mobile pixel scale',()=>{
  const lines=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8')).lines;
  assert.equal(lines.Ito.stations.length,6);
  assert.equal(lines.ChuoSobuLocal.stations.length,39);
  assert.equal(lines.Ito.type,lines.ChuoSobuLocal.type);
  const commit=createViewport(393),a=runViewport(commit,205),b=runViewport(commit,315);
  const x=parseFloat(a.el.style.width)/a.bounds.width;
  const y=parseFloat(b.el.style.width)/b.bounds.width;
  assert.ok(Math.abs(x-1.45) < 1e-9);
  assert.ok(Math.abs(y-1.45) < 1e-9);
  assert.equal(a.el.style.maxWidth,'none');
  assert.equal(b.el.style.maxWidth,'none');
  assert.equal(a.el.attrs['data-pt-render-scale'],'1.45');
  assert.equal(b.el.attrs['data-pt-render-scale'],'1.45');
  assert.equal(Math.round(14*x*10)/10,20.3);
  assert.equal(Math.round(16*y*10)/10,23.2);
});
test('mobile branch does not shrink its stations to fit the whole map',()=>{
  const a=runViewport(createViewport(393),900,[{id:'A'},{id:'B'}]);
  assert.equal(a.bounds.width,948);
  assert.equal(a.el.style.width,'1374.6px');
  assert.equal(a.el.style.maxWidth,'none');
  assert.equal(a.el.attrs['data-pt-min-scale'],'fixed-mobile');
});
test('tablet and desktop branch display retain their existing guards',()=>{
  const tablet=runViewport(createViewport(840),1200,[{id:'A'}],760);
  assert.equal(tablet.el.style.minWidth,'791px');
  assert.equal(tablet.el.style.maxWidth,'791px');
  const desktop=runViewport(createViewport(1200),1200,[{id:'A'}]);
  assert.equal(desktop.el.style.minWidth,'1061px');
  assert.equal(desktop.el.attrs['data-pt-min-scale'],'0.85');
});
test('six-shaped loop retains full-screen mode',()=>{
  const e=svg(),g={svgW:400,svgH:700,isSixShapedLoop:true,branchLines:[{id:'B'}]};
  createViewport(393)(e,{getBBox(){return {x:0,y:0,width:500,height:600};}},g);
  assert.equal(e.attrs['data-pt-min-scale'],'fit');
  assert.equal(e.style.width,undefined);
  assert.equal(e.style.maxWidth,undefined);
  assert.equal(e.style.minWidth,undefined);
});
test('invalid font metrics use stable fallback geometry and mobile scale',()=>{
  const el=svg(),g={svgW:297,svgH:700,branchLines:[]};
  createViewport(393)(el,{getBBox(){throw Error('font pending');}},g);
  assert.equal(el.attrs.viewBox,'0 0 297 700');
  assert.equal(el.style.width,'430.65px');
  assert.match(cssSource,/overflow-x: auto/);
});
test('ordinary segments share 45-unit spacing and local transfer exceptions',()=>{
  const lines=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8')).lines;
  const start=geometrySource.indexOf('    var ROW_H = window.StationInfoLayout.pitch');
  const end=geometrySource.indexOf('    // 获取支线。',start);
  assert.ok(start>=0&&end>start);
  for(const id of ['Ito','ChuoSobuLocal']){
    const stations=lines[id].stations;
    const transferMap={[stations[0]]:[{id:'busy'}]};
    const context=vm.createContext({
      stations,transferMap,throughChipMaxWidth:148,thrTopPad:0,thrBotPad:0,
      _isMobileView:()=>true,_throughChipHeight:()=>0,
      window:{StationInfoLayout:{pitch:18,reservedRows:items=>items.length?3:0}}
    });
    vm.runInContext(geometrySource.slice(start,end)+
      '\nthis.spacing=_spSeg;this.yAt=_yAt;',context);
    assert.equal(context.spacing[0],74);
    assert.equal(context.spacing[1],45);
    assert.equal(context.spacing[2],45);
    assert.equal(context.yAt(2)-context.yAt(1),45);
  }
});
test('runtime audit exposes measured scale and effective station sizes',()=>{
  assert.match(rendererSource,/actualCssPxPerUnit/);
  assert.match(rendererSource,/targetCssPxPerUnit/);
  assert.match(rendererSource,/stationCircleDiameterPx/);
  assert.match(rendererSource,/stationLabelFontPx/);
  assert.match(rendererSource,/winner - bounds\.x/);
});


function realMobilePredicate(width, screenWidth, screenHeight) {
  const begin=geometrySource.indexOf('var _isMobileView = typeof _isMobileView');
  const end=geometrySource.indexOf('var _geomKey =',begin);
  assert.ok(begin >= 0 && end > begin);
  const win={innerWidth:width,TrainsConfig:{GEOM:{MOBILE_BREAKPOINT:640}}};
  if (screenWidth != null) win.screen={width:screenWidth,height:screenHeight};
  const context=vm.createContext({window:win});
  vm.runInContext(geometrySource.slice(begin,end),context);
  return context._isMobileView();
}
test('portrait, landscape and narrow desktop share one phone geometry mode',()=>{
  assert.equal(realMobilePredicate(393,393,852),true);
  assert.equal(realMobilePredicate(844,393,852),true);
  assert.equal(realMobilePredicate(932,430,932),true);
  assert.equal(realMobilePredicate(640,1440,900),true);
  assert.equal(realMobilePredicate(641,1440,900),false);
  assert.equal(realMobilePredicate(820,820,1180),false);
  assert.equal(realMobilePredicate(1200,1200,800),false);
  assert.match(cssSource,/@media \(max-width: 640px\)/);
});
function scrollHelper() {
  const begin=rendererSource.indexOf('  function _centerStaticRouteScroll(');
  const end=rendererSource.indexOf('  // Read-only contract diagnostic:',begin);
  assert.ok(begin>=0 && end>begin);
  const context=vm.createContext({});
  vm.runInContext(rendererSource.slice(begin,end),context);
  return context._centerStaticRouteScroll;
}
test('rapid line switch never lets an outdated SVG animation frame pan the new map',()=>{
  const center=scrollHelper();
  const active={getAttribute(){return '1.45';}};
  const stale={getAttribute(){return '1.45';}};
  const el={scrollWidth:1200,clientWidth:344,scrollLeft:127,
    querySelector(){return active;}};
  const geom={stationCoords:[{x:400}],contentBounds:{x:0,width:900}};
  center(el,stale,geom);
  assert.equal(el.scrollLeft,127);
  center(el,active,geom);
  assert.equal(el.scrollLeft,Math.round(400*1.45-344/2));
});
test('branch map pans to its trunk rather than centering unrelated branch columns',()=>{
  const center=scrollHelper();
  const active={getAttribute(){return '1.45';}};
  const el={scrollWidth:1500,clientWidth:344,scrollLeft:0,querySelector(){return active;}};
  const geom={stationCoords:[{x:240},{x:240},{x:240},{x:110},{x:380}],
    contentBounds:{x:-350,width:1030}};
  center(el,active,geom);
  assert.equal(el.scrollLeft,Math.round((240+350)*1.45-344/2));
  geom.isSixShapedLoop=true;
  center(el,active,geom);
  assert.equal(el.scrollLeft,0);
  geom.isSixShapedLoop=false;
  el.scrollWidth=el.clientWidth;
  center(el,active,geom);
  assert.equal(el.scrollLeft,0);
});


test('one canonical JS layout configuration owns mobile breakpoints and SVG scale',()=>{
  const dataConfig=geometrySource.match(/window\.TrainsConfig\s*=\s*\{[\s\S]*?\n\};/);
  assert.ok(dataConfig);
  for(const [token,count] of [['MOBILE_BREAKPOINT',640],['TABLET_BREAKPOINT',900],['MOBILE_RENDER_SCALE',1.45]]){
    assert.match(dataConfig[0],new RegExp('\\b'+token+':\\s*'+String(count).replace('.','\\.')+'\\b'));
    const consumer=token==='MOBILE_BREAKPOINT' ? geometrySource : rendererSource;
    assert.match(consumer,new RegExp('TrainsConfig\\.GEOM\\.'+token));
  }
  assert.equal((geometrySource.match(/window\.TrainsConfig\s*=/g)||[]).length,1);
  assert.equal((rendererSource.match(/\bvar physicalScale\s*=/g)||[]).length,1);
  assert.doesNotMatch(rendererSource,/var physicalScale\s*=\s*1\.45\b/);
  assert.match(cssSource,/@media \(max-width: 640px\)/);
});

test('static SVG dimensions have one CSS owner and conditional mobile JS override',()=>{
  assert.equal((cssSource.match(/\.tp-map-wrap\s*>\s*svg\s*\{/g)||[]).length,2,
    'base SVG and six-shaped override selectors');
  assert.doesNotMatch(cssSource,/\.tp-map-wrap svg\s*\{/);
  assert.equal((cssSource.match(/padding:\s*6px;/g)||[]).length,1,
    'single mobile map padding declaration');
  assert.doesNotMatch(rendererSource,/svg\.style\.height\s*=/);
  assert.doesNotMatch(rendererSource,/svg\.style\.background\s*=/);
  assert.doesNotMatch(rendererSource,/svg\.style\.width\s*=\s*["']100%["']/);
  assert.match(cssSource,/\.tp-map-wrap\s*>\s*svg\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;/);
});

test('six-shaped loop cannot receive tablet width cap over its CSS fit template',()=>{
  const el=svg(344),geom={svgW:400,svgH:900,isSixShapedLoop:true,branchLines:[{id:'A'}]};
  createViewport(393)(el,{getBBox(){return{x:0,y:0,width:500,height:700};}},geom);
  assert.equal(el.style.width,undefined);
  assert.equal(el.style.maxWidth,undefined);
  assert.equal(el.style.minWidth,undefined);
  assert.equal(el.attrs['data-pt-max-scale'],undefined);
});
