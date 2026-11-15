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

function createViewport(innerWidth) {
  const start = rendererSource.indexOf('  function _commitStaticRouteViewport(');
  const end = rendererSource.indexOf('  // Read-only contract diagnostic:', start);
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext(innerWidth == null ? {} : {window:{innerWidth}});
  vm.runInContext(rendererSource.slice(start, end), context);
  return context._commitStaticRouteViewport;
}
function createSvg(wrapperWidth) {
  return {attrs:{},style:{},
    parentNode:wrapperWidth == null ? null : {clientWidth:wrapperWidth},
    setAttribute(name,value){this.attrs[name]=value;}};
}

test('viewport trims unused geometry while retaining static label bounds', () => {
  const svg = createSvg(), commit = createViewport();
  const geometry = {svgW:900,svgH:1200,branchLines:[{id:'Branch'}]};
  const bounds = commit(svg, {getBBox(){return {x:40,y:10,width:220,height:500};}}, geometry);
  assert.equal(svg.attrs.viewBox,'16 -18 268 556');
  assert.equal(svg.attrs['data-pt-viewport-source'],'static-route');
  assert.equal(svg.attrs['data-pt-min-scale'],'0.85');
  assert.equal(svg.style.minWidth,'228px');
  assert.equal(bounds.width,268);
  assert.equal(bounds,geometry.contentBounds);
});

test('portrait mobile caps wide-branch scrolling to 12% of available width', () => {
  const commit = createViewport(393), svg = createSvg(344);
  const geom = {svgW:1100,svgH:1800,branchLines:[{id:'BranchA'},{id:'BranchB'}]};
  const bounds = commit(svg,{getBBox(){return {x:0,y:10,width:900,height:700};}},geom);
  assert.equal(bounds.width,948);
  assert.equal(svg.style.minWidth,'386px');
  assert.equal(svg.attrs['data-pt-min-scale'],'mobile-capped');
  assert.equal(svg.attrs.viewBox,'-24 -18 948 756');
});

test('mobile landscape uses the same small overflow cap', () => {
  const commit = createViewport(840), svg = createSvg(760);
  commit(svg,{getBBox(){return {x:0,y:0,width:1200,height:800};}},
    {svgW:1300,svgH:900,branchLines:[{id:'Branch'}]});
  assert.equal(svg.style.minWidth,'852px');
});

test('desktop keeps the readable 85% branch minimum', () => {
  const commit = createViewport(1200), svg = createSvg(900);
  commit(svg,{getBBox(){return {x:0,y:0,width:1200,height:800};}},
    {svgW:1300,svgH:900,branchLines:[{id:'Branch'}]});
  assert.equal(svg.style.minWidth,'1061px');
  assert.equal(svg.attrs['data-pt-min-scale'],'0.85');
});

test('non-branch maps stay fully responsive and invalid metrics use geometry fallback', () => {
  const commit = createViewport(), svg = createSvg();
  const g = {svgW:297,svgH:700,branchLines:[]};
  commit(svg,{getBBox(){throw Error('font not ready');}},g);
  assert.equal(svg.attrs.viewBox,'0 0 297 700');
  assert.equal(svg.attrs['data-pt-min-scale'],'fit');
  assert.equal(svg.style.minWidth,undefined);
  assert.match(cssSource,/overflow-x: auto/);
  assert.match(cssSource,/-webkit-overflow-scrolling: touch/);
});

test('minimum branch width never forces the six-shaped loop into scrolling', () => {
  const commit = createViewport(), svg = createSvg();
  const geom = {svgW:400,svgH:1000,isSixShapedLoop:true,
    branchLines:[{id:'IgnoredSixTail'}]};
  commit(svg,{getBBox(){return {x:0,y:0,width:500,height:800};}},geom);
  assert.equal(svg.attrs['data-pt-min-scale'],'fit');
  assert.equal(svg.style.minWidth,undefined);
});
