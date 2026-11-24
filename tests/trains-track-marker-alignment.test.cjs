'use strict';
/* Regression: ordinary trains stay in opposite direction lanes around the painted centreline.
 * The same SVG unit still owns the artwork and its destination caption.
 * Run: node --test tests/trains-track-marker-alignment.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/trains-render.js'), 'utf8')
  .replace(/\r\n/g, '\n');
const layoutSource = fs.readFileSync(path.join(__dirname, '../js/train-track-layout.js'), 'utf8').replace(/\r\n/g, '\n');
const start = layoutSource.indexOf('/*\n * TrainTrackLayout');
assert.ok(start >= 0, 'TrainTrackLayout module must be present');
const window = {};
vm.runInNewContext(layoutSource.slice(start), {window, console}, {filename: 'train-track-layout.js'});
const layout = window.TrainTrackLayout;
assert.ok(layout && typeof layout.resolveAll === 'function');

const coords = [{x: 150, y: 40, stationId: 'A'}, {x: 150, y: 100, stationId: 'B'}];
function position(from, to, progress, id) {
  return {
    trainId: id,
    stationIndex: from,
    segmentToIndex: to,
    segmentProgress: progress,
    railDirection: from < to ? 'odpt.RailDirection:Outbound' : 'odpt.RailDirection:Inbound'
  };
}
const opts = {laneGap: 11, stackGap: 8, getDisplayMoveDir: () => null};
function place(p, geometry = {isLoop: false}, override = opts) {
  return layout.resolveAll([p], coords, geometry, 'Example', override)[0];
}

test('ordinary map preserves 11-unit up/down side lanes', () => {
  assert.match(source, /laneGap:\s*isLoop\s*\?\s*9\s*:\s*11/);
  assert.match(layoutSource, /opts\.laneGap\s*==\s*null\s*\?\s*DEFAULTS\.laneGap\s*:\s*opts\.laneGap/);
});

test('mobile left and dual station labels stay outside the train artwork lane', () => {
  // L3 uses a shared non-junction clearance rule. The mobile label edge
  // remains beyond the x-11 train lane and half of the 14-unit PNG.
  assert.match(source, /else if \(side === "left"\) \{[\s\S]*?tx = o\.x - \(isMobileView \? 20 : 10\)/);
  assert.match(source, /else if \(side === "dual"\) \{[\s\S]*?tx = o\.x - \(isMobileView \? 20 : 12\)/);
  assert.match(source, /if \(o\.junctionPlacement\) \{[\s\S]*?tx = o\.x \+ \(branchSide === "left" \? -\(isMobileView \? 20 : 12\) : \(isMobileView \? 20 : 12\)\)/);
  assert.ok(20 > 11 + 14 / 2);
});

test('up and down run in visually distinct lanes on each side', () => {
  const down = place(position(0, 1, 0.5, 'down'));
  const up = place(position(1, 0, 0.5, 'up'));
  assert.equal(down.x, 139);
  assert.equal(up.x, 161);
  assert.equal(down.y, 70);
  assert.equal(up.y, 70);
  assert.notEqual(down.lane, up.lane, 'source directions are not rewritten');
});

test('station clearance stays longitudinal within the correct direction lane', () => {
  const train = place(position(0, 1, 0, 'stopped'));
  assert.equal(train.x, 139);
  assert.equal(train.y, 58);
});

test('loop maps retain their existing 9-unit directional lanes', () => {
  const train = place(position(0, 1, 0.5, 'loop'), {isLoop: true},
    {...opts, laneGap: 9});
  assert.equal(train.x, 141);
  assert.equal(train.y, 70);
});

test('artwork and caption remain in a single moving SVG train unit', () => {
  assert.match(source, /unit\.setAttribute\('transform', 'translate\('/);
  assert.match(source, /unit\.appendChild\(marker\)/);
  assert.match(source, /if \(unit\) unit\.appendChild\(labelGroup\)/);
});

test('straight Shinkansen reserves a full centered destination lane, not a floating label',()=>{
  const g=fs.readFileSync(path.join(__dirname,'../js/trains-data.js'),'utf8');
  const a=g.indexOf('    var _extensionsForCorridor');
  const b=g.indexOf('    var _branchModes',a);
  const c=g.indexOf('      if (trainCorridor) {');
  const d=g.indexOf('      // 全线按统一 sp',c);
  assert.ok(a>=0&&b>a&&c>=0&&d>c);
  const select=new Function('lineId','isLoop','isSixShapedLoop','isSkytreeYFork',
    'branchLines','line','_fusionExtensionLines',g.slice(a,b)+'return trainCorridor;');
  const width=new Function('trainCorridor','stations','window','_measureRouteText',
    'mainCx','svgW',g.slice(c,d)+'return {mainCx,svgW};');
  const p=source.indexOf('  function _protectStaticStationInfoFromTrainCaptions(');
  const q=source.indexOf('  // The SVG badges are rebuilt',p);
  const protect=new Function(source.slice(p,q)+'return _protectStaticStationInfoFromTrainCaptions;')();
  for(const lineId of ['HokurikuShinkansen','AkitaShinkansen']){
    const corridor=select(lineId,false,false,false,[],{},()=>null);
    assert.ok(corridor);
    const frame=width(corridor,['黑部宇奈月温泉','东京','秋田'],
      {RailwayDB:{resolveStationName:x=>x}},(s,n)=>s.length*n,148.5,297);
    const x=frame.mainCx;
    const locs=layout.resolveAll([position(0,1,.5,'down'),position(1,0,.5,'up')],
      [{x,y:40},{x,y:100}],{},lineId,{...opts,laneGap:corridor.laneGap});
    assert.equal(Math.abs(locs[0].x-locs[1].x),2*corridor.laneGap);
    for(const scale of [.75,1,1.3]){
      const box=(x,y,width,height)=>({x:x*scale,y:y*scale,width:width*scale,height:height*scale});
      const station={getBoundingClientRect:()=>box(x-7,84,14,14)};
      const name={getBoundingClientRect:()=>box(0,84,x-corridor.stationClearance,16)};
      const svg={querySelector:s=>s==='.station-node-layer'?{querySelectorAll:()=>[station]}:
        s==='.station-info-layer'?{querySelectorAll:()=>[name]}:null,
        getBoundingClientRect:()=>box(0,0,frame.svgW,400)};
      const labels=locs.map(l=>({getBoundingClientRect:()=>box(l.x-corridor.captionWidth/2,
        l.y+15,corridor.captionWidth,14),setAttribute(k,v){this[k]=v;}}));
      assert.equal(protect({ownerSVGElement:svg},labels),0,lineId+' scale '+scale);
      assert.ok(labels.every(l=>l.display===undefined));
    }
  }
  assert.equal(select('ChuoRapid',false,false,false,[],{},()=>null),null);
  assert.equal(select('HokurikuShinkansen',false,false,false,[{}],{},()=>null),null);
  assert.equal(select('HokurikuShinkansen',false,false,false,[],{},()=>[{}]),null);
  assert.match(source,/geometry\.trainCorridor \? \{laneGap:geometry\.trainCorridor\.laneGap\}/);
});
