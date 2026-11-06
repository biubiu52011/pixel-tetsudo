'use strict';
// Position-only railway notifications may reuse geometry without scanning all
// lines; structural, language, font or viewport changes must never reuse it.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/trains-data.js', 'utf8');
const page = fs.readFileSync('js/trains-page.js', 'utf8');
const renderer = fs.readFileSync('js/trains-render.js', 'utf8');

function extract(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'geometry helper boundary missing: ' + start);
  return source.slice(a, b);
}
function setup() {
  const window = {currentLang:'ja',innerWidth:420,TrainsActiveSystemLineIds:['ChuoRapid']};
  const host = {clientWidth:390};
  const document = {querySelector(){return host;},fonts:{status:'loaded'}};
  const cache = {};
  const geomKey = id => id + '__m';
  const context = vm.createContext({
    window, document, GEOM:{BRANCH_COL_W:96},
    _isMobileView:() => true, _geomKey:geomKey, _routeGeometryCache:cache
  });
  vm.runInContext(extract('  function _computeLineHash(', '  function invalidateRouteGeometryCache(') +
    extract('  function _reuseGeometryForPositionSnapshot(', '  function computeRouteGeometry('),
    context);
  const line = {stations:['Tokyo','Kanda'],type:'straight',color:'#f80'};
  const geometry = {
    lineId:'ChuoRapid',staticRevision:17,
    lineHash:context._computeLineHash(line,'ChuoRapid',17)
  };
  cache[geomKey('ChuoRapid')] = geometry;
  return {window,document,host,cache,geomKey,context,line,geometry,
    reuse:()=>context._reuseGeometryForPositionSnapshot(line,'ChuoRapid',geometry)};
}

test('position-only refresh reuses the exact geometry object with no global scan', () => {
  const x=setup();
  assert.equal(x.reuse(),x.geometry);
  // The helper accepts a known revision: it does not call the network scanner.
  assert.doesNotMatch(extract('  function _reuseGeometryForPositionSnapshot(', '  function computeRouteGeometry('),
    /_staticNetworkSignature\(/);
  const compute = extract('  function computeRouteGeometry(', '    var stations = line.stations || []');
  assert.match(compute, /var reusable = previousGeometry && _reuseGeometryForPositionSnapshot/);
  assert.ok(compute.indexOf('if (reusable) return reusable;') < compute.indexOf('_staticNetworkSignature()'));
});

test('static inputs, layout and invalidation still force the full geometry path', () => {
  const x=setup();
  x.window.currentLang='en'; assert.equal(x.reuse(),null); x.window.currentLang='ja';
  x.host.clientWidth=320; assert.equal(x.reuse(),null); x.host.clientWidth=390;
  x.document.fonts.status='loading'; assert.equal(x.reuse(),null);
  x.document.fonts.status='loaded';
  x.line.stations.push('Akihabara'); assert.equal(x.reuse(),null); x.line.stations.pop();
  x.line.color='#0af'; assert.equal(x.reuse(),null); x.line.color='#f80';
  x.window.TrainsActiveSystemLineIds.push('Ome'); assert.equal(x.reuse(),null);
  x.window.TrainsActiveSystemLineIds.pop();
  delete x.cache[x.geomKey('ChuoRapid')]; assert.equal(x.reuse(),null);
});

test('only explicitly classified position snapshots opt into the faster path', () => {
  assert.match(page, /changes\.kind === "positions"/);
  assert.match(page, /\{ positionSnapshot: positionSnapshot \}/);
  assert.match(page, /var previousRevision = positionSnapshot/);
  assert.match(renderer, /renderOptions && renderOptions\.positionSnapshot === true/);
  assert.match(renderer, /computeRouteGeometry\(displayLine, lineId, positionGeometry\)/);
  assert.match(page, /window\.addEventListener\('pt:railway-ready',refreshVisibleMap\)/);
  assert.match(page, /document\.fonts\.ready\.then\(refreshVisibleMap\)/);
});
