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


function commitViewport(geometry, box={x:20,y:10,width:400,height:600}) {
  const start=rendererSource.indexOf('  function _commitStaticRouteViewport(');
  const end=rendererSource.indexOf('  // Read-only contract diagnostic:',start);
  assert.ok(start>=0&&end>start);
  const env=vm.createContext({});
  vm.runInContext(rendererSource.slice(start,end),env);
  const svg={attrs:{},style:{},setAttribute(k,v){this.attrs[k]=v;}};
  const bounds=env._commitStaticRouteViewport(svg,{getBBox(){return box;}},geometry);
  return {svg,bounds,geometry};
}
test('viewBox has a fixed width and origin; only route height may change',()=>{
  const a=commitViewport({svgW:420,svgH:700,canvasScale:0.8,canvasOffsetX:24,canvasOffsetY:24});
  const b=commitViewport({svgW:420,svgH:2200,canvasScale:0.8,canvasOffsetX:24,canvasOffsetY:24},
    {x:-300,y:-80,width:1500,height:2400});
  assert.equal(a.svg.attrs.viewBox,'0 0 420 700');
  assert.equal(b.svg.attrs.viewBox,'0 0 420 2200');
  assert.ok(b.geometry.canvasOverflow.left>0);
  assert.ok(b.geometry.canvasOverflow.right>0);
  assert.equal(a.svg.attrs['data-pt-canvas-fit'],'fixed-width-route-height');
  assert.equal(a.svg.style.width,undefined);
  assert.equal(b.svg.style.minWidth,undefined);
});
test('six-shaped loop uses the same static canvas even when font metrics are unavailable',()=>{
  const route={svgW:420,svgH:2300,isSixShapedLoop:true};
  const result=commitViewport(route,{x:0,y:0,width:300,height:1800});
  assert.equal(result.svg.attrs.viewBox,'0 0 420 2300');
  const a=rendererSource.indexOf('  function _commitStaticRouteViewport(');
  const b=rendererSource.indexOf('  // Read-only contract diagnostic:',a);
  const env=vm.createContext({});
  vm.runInContext(rendererSource.slice(a,b),env);
  const svg={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  env._commitStaticRouteViewport(svg,{getBBox(){throw Error('font pending');}},route);
  assert.equal(svg.attrs.viewBox,'0 0 420 2300');
  assert.equal(route.canvasOverflow,null);
});
test('ordinary routes use one safe spacing value, even after transfer-heavy stations',()=>{
  const lines=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8')).lines;
  const start=geometrySource.indexOf('    var ROW_H = window.StationInfoLayout.pitch');
  const end=geometrySource.indexOf('    // 获取支线。',start);
  assert.ok(start>=0&&end>start);
  for(const id of ['Ito','ChuoSobuLocal']){
    const stations=lines[id].stations;
    const transferMap={[stations[0]]:[{id:'busy'}]};
    const context=vm.createContext({
      stations,transferMap,throughChipMaxWidth:148,thrTopPad:0,thrBotPad:0,
      isSkytreeYFork:false,
      _isMobileView:()=>true,_throughChipHeight:()=>0,
      window:{StationInfoLayout:{pitch:18,reservedRows:items=>items.length?3:0}}
    });
    vm.runInContext(geometrySource.slice(start,end)+
      '\nthis.spacing=sp;this.yAt=_yAt;',context);
    assert.equal(context.spacing,74);
    for(let i=1;i<stations.length;i++){
      assert.equal(context.yAt(i)-context.yAt(i-1),74,id+' interval '+i);
    }
  }
});
test('branch clearance is shared globally, not inserted beside the junction',()=>{
  assert.doesNotMatch(geometrySource,/_spSeg/);
  assert.match(geometrySource,/sp = Math.max\(sp, clearance, Math.ceil\(pitch\)\)/);
  assert.match(geometrySource,/branchLayouts\[id\]\.pitch = sp/);
  assert.match(geometrySource,/_branchStubR = Math.max\(GEOM.BRANCH_STUB, sp\)/);
  assert.match(geometrySource,/var _forkFirstGap = sp/);
  assert.match(geometrySource,/var _forkSecondGap = sp/);
});
test('two-column loops and Oedo tail reuse a shared vertical station step',()=>{
  assert.match(geometrySource,/var _columnCount = Math.max\(_rightCount, _leftCount\)/);
  assert.match(geometrySource,/\(_columnCount - _rightCount\) \/ 2/);
  assert.match(geometrySource,/\(_columnCount - _leftCount\) \/ 2/);
  assert.match(geometrySource,/loopRectH = _uniform6Step \* _halfN/);
  assert.match(geometrySource,/var tailStep = tailCount > 0 \? _uniform6Step : 0/);
});
test('SVG audit reports fixed frame, CSS scale and overflow',()=>{
  assert.match(rendererSource,/fixedCanvasWidth/);
  assert.match(rendererSource,/actualCssPxPerUnit/);
  assert.match(rendererSource,/staticCanvasOverflow/);
  assert.match(rendererSource,/stationCircleDiameterPx/);
  assert.match(rendererSource,/stationLabelFontPx/);
  assert.doesNotMatch(rendererSource,/winner - bounds\.x/);
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
test('browser owns native pinch zoom over the map, not an SVG camera',()=>{
  const html=fs.readFileSync('pages/trains.html', 'utf8');
  assert.match(html, /name="viewport"[\s\S]*?content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1|train-map-gestures\.js/i);
  assert.doesNotMatch(rendererSource, /TrainMapGestures|_disposeTrainMapGestures/);
  assert.match(cssSource, /\.tp-map-wrap\s*\{[^}]*touch-action:\s*auto/);
  assert.match(cssSource, /\.tp-map-wrap\s*>\s*svg\s*\{[^}]*touch-action:\s*auto/);
  assert.doesNotMatch(cssSource, /touch-action:\s*(?:none|pan-y)/);
});
test('static train and route layers always use the same layout transform',()=>{
  assert.ok(rendererSource.includes('staticLayer.setAttribute("transform", geometry.canvasTransform)'));
  assert.ok(rendererSource.includes('trainLayer.setAttribute("transform", geometry.canvasTransform)'));
  assert.ok(rendererSource.includes('trainLayer.getScreenCTM()'));
  assert.doesNotMatch(rendererSource,/_centerStaticRouteScroll/);
  assert.doesNotMatch(rendererSource,/el\.scrollLeft\s*=/);
});
test('one geometry config owns the fixed viewBox width and route-derived height',()=>{
  assert.match(geometrySource,/CANVAS_WIDTH:\s*420/);
  assert.match(geometrySource,/CANVAS_GUTTER:\s*24/);
  assert.match(geometrySource,/CANVAS_MAX_CONTENT_SCALE:\s*1\.2/);
  assert.ok(geometrySource.includes('svgW = GEOM.CANVAS_WIDTH'));
  assert.ok(geometrySource.includes('svgH = Math.ceil(layoutHeight * contentScale'));
  assert.ok(geometrySource.includes('canvasTransform: canvasTransform'));
  assert.doesNotMatch(geometrySource,/MOBILE_RENDER_SCALE/);
  assert.equal((geometrySource.match(/window\.TrainsConfig\s*=/g)||[]).length,1);
});
test('responsive CSS fits fixed frame; no horizontal pan or JS width override',()=>{
  assert.equal((cssSource.match(/\.tp-map-wrap\s*>\s*svg\s*\{/g)||[]).length,1);
  assert.doesNotMatch(cssSource,/overflow-x:\s*auto/);
  assert.match(cssSource,/overflow-x:\s*clip/);
  assert.match(cssSource,/touch-action:\s*auto/);
  assert.match(cssSource,/\.tp-map-wrap\s*>\s*svg\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;/);
  assert.doesNotMatch(rendererSource,/svg\.style\.(?:height|width|minWidth|maxWidth)\s*=/);
});

test('walking-transfer arrows point outside the SVG railway on all four sides',()=>{
  const a=rendererSource.indexOf('  function _outwardWalkTransferArrow(');
  const b=rendererSource.indexOf('  function _renderStationNode(',a);
  assert.ok(a>=0&&b>a,'outward walking arrow helper exists');
  const env=vm.createContext({});
  vm.runInContext(rendererSource.slice(a,b),env);
  const arrow=env._outwardWalkTransferArrow;
  assert.equal(arrow('end','dual',128,160),'←','left-side walking transfer');
  assert.equal(arrow('start','right',190,160),'→','right-side walking transfer');
  assert.equal(arrow('middle','top',160,160),'↑','upper-side walking transfer');
  assert.equal(arrow('middle','bottom',160,160),'↓','lower-side walking transfer');
  assert.equal(arrow('middle','dual',150,160),'←','middle-aligned left fallback');
  assert.equal(arrow('middle','dual',170,160),'→','middle-aligned right fallback');
  assert.match(rendererSource,/var isWalk = parts\.some\(function\(p\) \{ return p\.item\.type === "out"; \}\)/);
  assert.match(rendererSource,/extraLabel\.textContent = isWalk\s*\? entry\.extra\.replace\(/);
  // No change to canonical destination, badge width or transfer listing:
  // only the rendered leading arrow may change.
  assert.match(geometrySource,/var extra = group\.dest \? "→ " \+ group\.dest : ""/);
});
