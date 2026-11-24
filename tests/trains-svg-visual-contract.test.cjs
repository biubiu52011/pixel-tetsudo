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
    assert.equal(context.spacing,85);
    for(let i=1;i<stations.length;i++){
      assert.equal(context.yAt(i)-context.yAt(i-1),85,id+' interval '+i);
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
  assert.match(rendererSource,/extraLabel\.textContent = leftGrid\s*\? entry\.extra\.replace\(/);
  // Neither station identity nor the measured total width changes.
  // Direction and visual order are presentation-only.
  assert.match(geometrySource,/var extra = group\.dest \? "→ " \+ group\.dest : ""/);
});

test('unlike-name transfers render outer destination, arrow, then inside badges',()=>{
  const start=rendererSource.indexOf('  function _outwardWalkTransferArrow(');
  const end=rendererSource.indexOf('  function _isRealtimePositionFresh(',start);
  assert.ok(start>=0&&end>start);
  function makeNode(tag){
    return {tag,attrs:{},children:[],setAttribute(k,v){this.attrs[k]=String(v);},
      appendChild(child){this.children.push(child);return child;},textContent:''};
  }
  function render(side,mode,extra,anchor) {
    const node=makeNode('g'), info=makeNode('g');
    const item={type:mode,toStation:'Ueno',name:'JK',color:'#478',lineId:'Test'};
    const parts=[{item,label:'JK',badgeWidth:16}];
    const entry={item,badges:parts,badgeWidth:16,extra,width:114,
      slots:[{part:parts[0],row:0,col:0}]};
    const window={currentLang:'zh',
      StationInfoLayout:{icon:16,gap:2,pitch:18,
        fontSizes:{badge:{mobile:10,desktop:9},extra:{mobile:9,desktop:8}},
        textColor:()=> '#fff',
        plan:()=>({shown:[entry],rows:1,gridWidth:70,perRow:4,
          rowUsed:[1,0,0,0],colOffsets:[0,18,36,54],
          colWidths:[16,16,16,16]})},
      ThroughChip:{badgeText:()=> 'JK',normalize:()=>[],layoutGroup:()=>[],layoutRow:()=>[]},
      RailwayDB:{resolveStationName:name=>name}};
    const document={createElementNS:(_ns,tag)=>makeNode(tag)};
    const env=vm.createContext({window,document});
    vm.runInContext(rendererSource.slice(start,end),env);
    env._renderStationNode({nodes:node,info},'http://www.w3.org/2000/svg',
      {stationId:'Keisei-Ueno',x:200,y:90,side,color:'#369',
       svgW:460,svgH:600,isMobileView:true,geometry:{},transferMap:{'Keisei-Ueno':[item]},
       rS:()=> '京成上野',tx:side==='left'?180:220,ty:90,
       anchor,labelRegistry:null,si:0});
    const flat=(n)=>[n,...n.children.flatMap(flat)];
    const all=flat(info);
    return {texts:all.filter(n=>n.tag==='text'),rects:all.filter(n=>n.tag==='rect'),all};
  }
  const left=render('left','out','→ 上野 · 步行','end');
  const leftLabel=left.texts.find(n=>n.textContent.includes('上野'));
  const leftBadge=left.rects[0];
  assert.equal(leftLabel.textContent,'上野 · 步行 ←');
  assert.equal(Number(leftBadge.attrs.x)-Number(leftLabel.attrs.x),3,
    'one left-side icon: the arrow must be exactly 3 layout units from the badge, not four empty columns away');
  assert.ok(Number(leftBadge.attrs.x)<200,'icon remains on the railway-facing side');
  assert.ok(left.all.some(n=>n.attrs['data-transfer-mode']==='walk'));
  const nonWalk=render('left','in','→ 町屋站前','end');
  assert.equal(nonWalk.texts.find(n=>n.textContent.includes('町屋')).textContent,'町屋站前 ←',
    'different named station still points outward when source says in');
  assert.equal(Number(nonWalk.rects[0].attrs.x)-
    Number(nonWalk.texts.find(n=>n.textContent.includes('町屋')).attrs.x),3);
  const right=render('right','out','→ 牛田 · 步行','start');
  assert.equal(right.texts.find(n=>n.textContent.includes('牛田')).textContent,'→ 牛田 · 步行');
  assert.equal(Number(right.texts.find(n=>n.textContent.includes('牛田')).attrs.x)-
    Number(right.rects[0].attrs.x)-16,3,
    'one right-side icon: the arrow must sit just 3 units beyond the icon');
});

test('the physical transfer grid has four columns and four rows',()=>{
  assert.match(geometrySource,/var columns = 4, cap = maxRows\(\)/);
  assert.match(geometrySource,/function maxRows\(\) \{ return 4; \}/);
  assert.match(rendererSource,/data-badge-grid", "4x4"/);
  assert.match(rendererSource,/var by = iy0 \+ slot\.row \* window\.StationInfoLayout\.pitch/);
});

test('station name and near-track icon edge share the same outer annotation baseline',()=>{
  const start=rendererSource.indexOf('  function _outwardWalkTransferArrow(');
  const end=rendererSource.indexOf('  function _isRealtimePositionFresh(',start);
  assert.ok(start>=0&&end>start);
  const create=tag=>({tag,attrs:{},children:[],textContent:'',
    setAttribute(k,v){this.attrs[k]=String(v);},
    appendChild(child){this.children.push(child);return child;}});
  const flatten=n=>[n,...n.children.flatMap(flatten)];
  function paint(side,count){
    const info=create('g'),nodes=create('g');
    const icons=Array.from({length:count},(_,i)=>{
      const item={lineId:'X'+i,name:'X'+i,image:'x'+i+'.png',
        type:'out',toStation:'Ueno'};
      return {item,label:'X'+i,badgeWidth:i===count-1?16:16};
    });
    const slots=icons.map((part,i)=>({part,row:Math.floor(i/4),col:i%4}));
    const rowUsed=[Math.min(count,4),Math.max(0,count-4),0,0];
    const entry={item:icons[0].item,badges:icons,slots,extra:'→ 上野 · 步行'};
    const window={currentLang:'zh',
      StationInfoLayout:{icon:16,gap:2,pitch:18,fontSizes:{
        badge:{mobile:10,desktop:9},extra:{mobile:9,desktop:8}
      },textColor:()=> '#fff',
      plan:()=>({shown:[entry],rows:Math.ceil(count/4),gridWidth:70,
        colOffsets:[0,18,36,54],colWidths:[16,16,16,16],rowUsed,perRow:4})},
      ThroughChip:{badgeText:()=> 'X',normalize:()=>[],layoutRow:()=>[],layoutGroup:()=>[]},
      RailwayDB:{resolveStationName:id=>id}};
    const context=vm.createContext({window,document:{createElementNS:(_ns,tag)=>create(tag)}});
    vm.runInContext(rendererSource.slice(start,end),context);
    context._renderStationNode({nodes,info},'svg',{
      stationId:'Keisei-Ueno',x:200,y:120,side,
      color:'#369',svgW:420,svgH:500,isMobileView:true,geometry:{},
      transferMap:{'Keisei-Ueno':[icons[0].item]},
      rS:()=> '京成上野',si:0
    });
    const all=flatten(info),name=all.find(n=>n.attrs['data-station-label']==='Keisei-Ueno');
    const group=all.find(n=>n.attrs['data-badge-grid']==='4x4');
    const badges=all.filter(n=>n.tag==='image');
    const caption=all.find(n=>n.tag==='text'&&n.textContent.includes('上野'));
    assert.ok(name&&group&&caption);
    assert.equal(group.attrs['data-alignment-reference'],'station-label-edge');
    assert.equal(Number(group.attrs['data-reference-x']),Number(name.attrs.x));
    assert.equal(badges.length,count);
    const nameEdge=Number(name.attrs.x);
    if(side==='left'){
      const nearestEdge=Math.max(...badges.map(n=>Number(n.attrs.x)+Number(n.attrs.width)));
      const outEdge=Math.min(...badges.map(n=>Number(n.attrs.x)));
      assert.equal(nearestEdge,nameEdge,'left-side icons align with station-name right edge');
      assert.equal(outEdge-Number(caption.attrs.x),3,'caption touches actual outermost icon');
      assert.equal(caption.attrs['text-anchor'],'end');
      assert.equal(caption.textContent,'上野 · 步行 ←');
    } else {
      const nearestEdge=Math.min(...badges.map(n=>Number(n.attrs.x)));
      const outEdge=Math.max(...badges.map(n=>Number(n.attrs.x)+Number(n.attrs.width)));
      assert.equal(nearestEdge,nameEdge,'right-side icons align with station-name left edge');
      assert.equal(Number(caption.attrs.x)-outEdge,3,'caption touches actual outermost icon');
      assert.equal(caption.attrs['text-anchor'],'start');
      assert.equal(caption.textContent,'→ 上野 · 步行');
    }
  }
  for(const count of [1,2,7]){
    paint('left',count);
    paint('right',count);
  }
});

test('Machiya station and Machiya-Ekimae icons mirror on separate aligned rows',()=>{
  const start=rendererSource.indexOf('  function _outwardWalkTransferArrow(');
  const end=rendererSource.indexOf('  function _isRealtimePositionFresh(',start);
  const ls=geometrySource.indexOf('window.StationInfoLayout = (function() {');
  const le=geometrySource.indexOf('})();',ls);
  assert.ok(start>=0&&end>start&&ls>=0&&le>ls);
  function node(tag){return {tag,attrs:{},children:[],textContent:'',
    setAttribute(k,v){this.attrs[k]=String(v);},
    appendChild(child){this.children.push(child);return child;}};}
  const flatten=n=>[n,...n.children.flatMap(flatten)];
  // Keisei canonical: Arakawa SA connects to Machiya-Ekimae,
  // while Chiyoda C connects to Machiya under its own station ID.
  const lines=[
    {lineId:'SA',name:'SA',image:'SA.png',toStation:'Machiya_Eki_Mae',type:'in'},
    {lineId:'C',name:'C',image:'C.png',type:'in'}];
  for(const side of ['left','right']){
    const root=node('g');
    const window={currentLang:'ja',
      RailwayDB:{resolveStationName:s=>s==='Machiya_Eki_Mae'?'町屋駅前':s},
      ThroughChip:{badgeText:p=>p.name,measureWidth:(s,f)=>String(s).length*f,
        normalize:()=>[],layoutGroup:()=>[],layoutRow:()=>[]}};
    const ctx=vm.createContext({window,document:{createElementNS:(_n,tag)=>node(tag)},
      _losGroupKey:()=>''});
    vm.runInContext(geometrySource.slice(ls,le+5)+
      '\n'+rendererSource.slice(start,end),ctx);
    ctx._renderStationNode({info:root,nodes:node('g')},'svg',{
      stationId:'Machiya',x:220,y:100,side,si:0,color:'#378',geometry:{},
      svgW:440,svgH:600,isMobileView:true,
      transferMap:{Machiya:lines},rS:()=> '町屋'
    });
    const all=flatten(root);
    const name=all.find(n=>n.attrs['data-station-label']==='Machiya');
    const icons=all.filter(n=>n.tag==='image');
    const destination=all.find(n=>n.tag==='text'&&n.textContent.includes('町屋駅前'));
    assert.ok(name&&destination);assert.equal(icons.length,2);
    assert.equal(icons[0].attrs.y,icons[1].attrs.y,
      'SA and C stay on one row even with different canonical station IDs');
    assert.equal(Number(icons[0].attrs.y)-Number(name.attrs.y),14);
    const edge=side==='left'
      ? Math.max(...icons.map(n=>Number(n.attrs.x)+Number(n.attrs.width)))
      : Math.min(...icons.map(n=>Number(n.attrs.x)));
    assert.equal(edge,Number(name.attrs.x),'main name/icon block align');
    const other=side==='left'
      ? Math.min(...icons.map(n=>Number(n.attrs.x)))
      : Math.max(...icons.map(n=>Number(n.attrs.x)+Number(n.attrs.width)));
    assert.equal(Math.abs(other-Number(destination.attrs.x)),3);
    assert.equal(destination.textContent,side==='left'?'町屋駅前 ←':'→ 町屋駅前');
    assert.equal(destination.attrs['text-anchor'],side==='left'?'end':'start');
    assert.equal(Number(destination.attrs.y)-Number(icons[0].attrs.y),8);
  }
});

test('four-wide grouping, named destinations and overflow share one spacing model',()=>{
  const begin=geometrySource.indexOf('window.StationInfoLayout = (function() {');
  const end=geometrySource.indexOf('})();',begin);
  const context=vm.createContext({window:{currentLang:'ja',
    RailwayDB:{resolveStationName:id=>({Other:'乗換先'})[id]||id},
    ThroughChip:{measureWidth:(s,f)=>String(s).length*f}},_losGroupKey:()=>null});
  vm.runInContext(geometrySource.slice(begin,end+5),context);
  const model=context.window.StationInfoLayout;
  for(const count of [0,1,2,3,4,5,7,12,16,19]){
    const items=Array.from({length:count},(_,i)=>({
      lineId:'L'+i,image:'img'+i+'.svg',name:'L'+i}));
    const actual=model.plan(items,'Test','テスト',true).rows;
    const reserve=model.reservedRows(items,'Test','テスト',true);
    assert.equal(reserve,actual,'same 4x4 layout for '+count+' badge items');
  }
  const four=Array.from({length:4},(_,i)=>({lineId:'X'+i,image:'X'+i+'.svg'}));
  assert.equal(model.reservedRows(four,'Test','テスト',true),1,
    'four badges share one row instead of four station-pitch rows');
  const named=[{lineId:'A',image:'A.png',toStation:'Other',type:'out'},
    {lineId:'B',image:'B.png',toStation:'Other',type:'out'}];
  assert.equal(model.reservedRows(named,'Test','テスト',true),1);
});

test('post-render content fit contains long left and right alias labels and moves trains together',()=>{
  const start=rendererSource.indexOf('  function _fitStaticRouteContent(');
  const end=rendererSource.indexOf('  // The SVG is a static frame',start);
  assert.ok(start>=0&&end>start);
  const env=vm.createContext({});
  vm.runInContext(rendererSource.slice(start,end),env);
  function object(){return {attrs:{},setAttribute(k,v){this.attrs[k]=String(v);}};}
  const svg=object(),rail=object(),trains=object();
  rail.getBBox=()=>({x:-140,y:-12,width:660,height:1130});
  const geometry={svgW:420,svgH:1250,layoutWidth:225,layoutHeight:1000,
    canvasScale:1.2,canvasOffsetX:75,canvasOffsetY:24,
    canvasTransform:'translate(75 24) scale(1.2)'};
  assert.equal(env._fitStaticRouteContent(svg,rail,trains,geometry),true);
  assert.equal(rail.attrs.transform,trains.attrs.transform,
    'train positions follow the same transform as the static railway');
  assert.equal(svg.attrs.viewBox,'0 0 420 '+geometry.svgH);
  const left=geometry.canvasOffsetX-140*geometry.canvasScale;
  const right=geometry.canvasOffsetX+520*geometry.canvasScale;
  assert.ok(left>=23.9&&right<=396.1,'both sides fit within the 24-unit gutter');
  assert.ok(geometry.canvasScale<1.2);
  assert.ok(geometry.svgH>=geometry.canvasOffsetY+(1118)*geometry.canvasScale);
});

test('horizontal left and right branches keep name first and icons below with outward aliases',()=>{
  const begin=rendererSource.indexOf('  function _outwardWalkTransferArrow(');
  const end=rendererSource.indexOf('  function _isRealtimePositionFresh(',begin);
  const lBegin=geometrySource.indexOf('window.StationInfoLayout = (function() {');
  const lEnd=geometrySource.indexOf('})();',lBegin);
  assert.ok(begin>=0&&end>begin&&lBegin>=0&&lEnd>lBegin);
  function node(tag){return {tag,attrs:{},children:[],textContent:'',
    setAttribute(k,v){this.attrs[k]=String(v);},
    appendChild(c){this.children.push(c);return c;}};}
  const flat=n=>[n,...n.children.flatMap(flat)];
  for(const side of ['left','right']){
    const root=node('g'),window={currentLang:'zh',
      RailwayDB:{resolveStationName:s=>s==='Target'?'换乘站':s},
      ThroughChip:{badgeText:x=>x.name,measureWidth:(s,font)=>String(s).length*font,
        normalize:()=>[],layoutGroup:()=>[],layoutRow:()=>[]}};
    const ctx=vm.createContext({window,document:{createElementNS:(_ns,t)=>node(t)},
      _losGroupKey:()=>null});
    vm.runInContext(geometrySource.slice(lBegin,lEnd+5)+
      '\n'+rendererSource.slice(begin,end),ctx);
    ctx._renderStationNode({info:root,nodes:node('g')},'svg',{
      stationId:'Test',si:0,x:200,y:100,side,geometry:{},
      svgW:420,svgH:600,color:'#777',isMobileView:true,
      labelLines:['主站名'],horizontalBranch:true,labelAbove:true,
      tx:200,ty:60,anchor:'middle',rS:()=> '主站名',
      transferMap:{Test:[{lineId:'M',name:'M',image:'M.png',
        toStation:'Target',type:'out'}]}});
    const painted=flat(root);
    const main=painted.find(x=>x.attrs['data-station-label']==='Test');
    const img=painted.find(x=>x.tag==='image');
    const text=painted.find(x=>x.tag==='text'&&x.textContent.includes('换乘站'));
    const title=painted.find(x=>x.tag==='title');
    assert.ok(main&&img&&text&&title);
    assert.equal(Number(img.attrs.y)-Number(main.attrs.y),14);
    assert.equal(Number(img.attrs.y)+16<100,true,
      'horizontal branch title and icons remain above the track');
    assert.equal(text.textContent,side==='left'?'换乘站 · 步行 ←':'→ 换乘站 · 步行');
    assert.match(title.textContent,/步行/,'accessible title follows current language');
    assert.ok(title.textContent.includes(side==='left'?'←':'→'));
    const textEdge=side==='left'
      ? Number(img.attrs.x)+Number(img.attrs.width)
      : Number(img.attrs.x);
    assert.ok(Math.abs(textEdge-Number(main.attrs.x))>1,
      'center anchored branch uses measured station-name edge rather than center');
  }
});

test('long outward aliases compress horizontally without changing station-center pitch',()=>{
  const start=rendererSource.indexOf('  function _fitStaticRouteContent(');
  const end=rendererSource.indexOf('  // The SVG is a static frame',start);
  assert.ok(start>=0&&end>start);
  const env=vm.createContext({});
  vm.runInContext(rendererSource.slice(start,end),env);
  const node=attrs=>({attrs:{...attrs},getAttribute(k){return this.attrs[k]??null;},
    setAttribute(k,v){this.attrs[k]=String(v);}});
  const left=node({x:'35','text-anchor':'end'});
  const right=node({x:'250','text-anchor':'start'});
  const labelWidth=label=>Number(label.getAttribute('textLength'))||
    (label===left?75:70);
  left.getBBox=()=>({x:35-labelWidth(left),y:60,width:labelWidth(left),height:12});
  right.getBBox=()=>({x:250,y:90,width:labelWidth(right),height:12});
  const layer=node({});
  layer.querySelectorAll=()=>[left,right];
  layer.getBBox=()=>{
    const l=left.getBBox(),r=right.getBBox();
    const x=Math.min(20,l.x,r.x),endX=Math.max(280,l.x+l.width,r.x+r.width);
    return {x,y:0,width:endX-x,height:700};
  };
  const svg=node({}),trains=node({});
  const geom={svgW:420,svgH:900,layoutWidth:297,layoutHeight:700,
    canvasScale:1.2,baseCanvasScale:1.2,canvasOffsetX:31.8,canvasOffsetY:24};
  env._fitStaticRouteContent(svg,layer,trains,geom);
  assert.equal(geom.canvasScale,1.2,'long aliases cannot zoom the whole route');
  assert.equal(geom.canvasFitReason,'stable-pitch');
  assert.equal(layer.attrs.transform,trains.attrs.transform);
  assert.ok(Number(left.attrs.textLength)<75||Number(right.attrs.textLength)<70,
    'shrink only outer alias glyph width; keep full station name and arrow');
  const original=geom.canvasScale;
  env._fitStaticRouteContent(svg,layer,trains,geom);
  assert.equal(geom.canvasScale,original,'repeated redraws do not accumulate shrink');
  assert.equal(svg.attrs.viewBox,'0 0 420 '+geom.svgH);
});

test('uniform route scale is an immutable geometry input and viewport fit reports fallback',()=>{
  assert.match(geometrySource,/baseCanvasScale: contentScale/);
  assert.match(rendererSource,/geometry\.baseCanvasScale \|\| geometry\.canvasScale/);
  assert.match(rendererSource,/text\.station-transfer-destination/);
  assert.match(rendererSource,/lengthAdjust", "spacingAndGlyphs"/);
  assert.match(rendererSource,/canvasFitReason: geometry\.canvasFitReason/);
});

test('Keisei-Ueno 4x4 interchange and Machiya have safe uniform station pitch',()=>{
  const start=geometrySource.indexOf('    var ROW_H = window.StationInfoLayout.pitch');
  const end=geometrySource.indexOf('    // 获取支线。',start);
  assert.ok(start>=0&&end>start);
  const stations=['Keisei-Ueno','Nippori','Shin-Mikawashima','Machiya',
    'Senju-Ohashi','Keisei-Sekiya'];
  for(const rows of [1,2,3,4]){
    const map={'Keisei-Ueno':Array.from({length:rows*4},
      (_,i)=>({lineId:'T'+i}))};
    const context=vm.createContext({
      stations,transferMap:map,throughChipMaxWidth:148,thrTopPad:0,thrBotPad:0,
      isSkytreeYFork:false,
      _isMobileView:()=>true,_throughChipHeight:()=>0,
      window:{StationInfoLayout:{pitch:18,reservedRows:items=>
        items.length?Math.ceil(items.length/4):0}}
    });
    vm.runInContext(geometrySource.slice(start,end)+
      '\nthis.spacing=sp;this.yAt=_yAt;',context);
    const iconBottom=14+(rows-1)*18+16;
    const nextNameTop=context.spacing-9;
    assert.ok(nextNameTop-iconBottom>=9.9,
      '4x4 badge row '+rows+' must clear next station name by at least 10 units');
    for(let i=1;i<stations.length;i++)
      assert.equal(context.yAt(i)-context.yAt(i-1),context.spacing);
  }
});

test('moving train captions yield to permanent names and interchange badges',()=>{
  const start=rendererSource.indexOf('  function _trainStaticScreenBounds(');
  const end=rendererSource.indexOf('  // The SVG badges are rebuilt',start);
  assert.ok(start>=0&&end>start);
  const ctx=vm.createContext({_trainUnitContainer:node=>node&&node.parentNode});
  vm.runInContext(rendererSource.slice(start,end),ctx);
  const protectedText={getBoundingClientRect:()=>({
    x:100,y:100,width:80,height:24})};
  const stationLayer={querySelectorAll:()=>[protectedText]};
  const svg={getAttribute:()=> 'loaded',
    getBoundingClientRect:()=>({x:0,y:0,width:420,height:800}),
    querySelector:s=>s==='.station-info-layer'?stationLayer:null};
  const train={ownerSVGElement:svg};
  const near={attrs:{},getBoundingClientRect:()=>({
    x:140,y:110,width:60,height:16}),
    setAttribute(k,v){this.attrs[k]=v;}};
  const far={attrs:{},getBoundingClientRect:()=>({
    x:250,y:200,width:40,height:16}),
    setAttribute(k,v){this.attrs[k]=v;}};
  assert.equal(ctx._protectStaticStationInfoFromTrainCaptions(train,[near,far]),1);
  assert.equal(near.attrs.display,'none');
  assert.equal(far.attrs.display,undefined);
  assert.equal(ctx._protectStaticStationInfoFromTrainCaptions(train,[near,far]),1,
    'reuse static glyph bounds in the unchanged viewport');
  assert.match(rendererSource,/_protectStaticStationInfoFromTrainCaptions\(trainLayer, labels, markerById\)/);
});

test('Keisei Machiya canonical SA and C fit one row and keep other aliases distinct',()=>{
  const start=geometrySource.indexOf('window.StationInfoLayout = (function() {');
  const end=geometrySource.indexOf('})();',start);
  assert.ok(start>=0&&end>start);
  const env=vm.createContext({window:{currentLang:'ja',
    RailwayDB:{resolveStationName:id=>id==='Machiya_Eki_Mae'?'町屋駅前':id},
    ThroughChip:{measureWidth:(s,font)=>String(s).length*font}},
    _losGroupKey:()=>null});
  vm.runInContext(geometrySource.slice(start,end+5),env);
  const railway=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
  const items=railway.lines.Keisei.transferStations
    .filter(t=>t.station==='Machiya')
    .map(t=>({lineId:t.lineId,name:t.lineId==='Arakawa'?'SA':'C',
      image:t.lineId+'.png',toStation:t.toStation||'',type:t.type||'in'}));
  assert.equal(items.length,2);
  const plan=env.window.StationInfoLayout.plan(items,'Machiya','町屋',true);
  assert.equal(plan.rows,1,'one alias plus normal connection is one row');
  assert.equal(plan.shown.length,2,'each canonical service identity remains');
  assert.equal(plan.shown.filter(group=>group.extra).length,1);
  assert.deepEqual(Array.from(plan.shown.flatMap(group=>
    group.slots.map(slot=>[slot.row,slot.col]))),[[0,0],[0,1]]);
  assert.equal(env.window.StationInfoLayout.reservedRows(items,'Machiya','町屋',true),1);
  const unrelated=[
    {lineId:'A',image:'A.png',toStation:'Other1'},
    {lineId:'B',image:'B.png',toStation:'Other2'}];
  assert.equal(env.window.StationInfoLayout.plan(unrelated,'Hub','Hub',true).rows,2,
    'two distinct named destinations still reserve separate rows');
});

test('Saikyo Shinjuku 11 services fill 4+4+3, without isolating Seibu-Shinjuku SS',()=>{
  const source=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
  const canonical=source.lines.SaikyoKawagoe.transferStations
    .filter(t=>t.station==='Shinjuku')
    .map(t=>({lineId:t.lineId,image:t.lineId+'.png',
      name:t.lineId,toStation:t.toStation||'',type:t.type||'in'}));
  const reverse=source.lines.SeibuShinjuku.transferStations.find(t=>
    t.lineId==='SaikyoKawagoe'&&t.toStation==='Shinjuku');
  assert.ok(reverse,'Saikyo Shinjuku has a walking interchange with Seibu-Shinjuku');
  canonical.push({lineId:'SeibuShinjuku',name:'SS',
    image:'seibu.png',toStation:reverse.station,type:'out'});
  assert.equal(canonical.length,11);
  const layoutStart=geometrySource.indexOf('window.StationInfoLayout = (function() {');
  const layoutEnd=geometrySource.indexOf('})();',layoutStart);
  const context=vm.createContext({window:{currentLang:'ja',
    RailwayDB:{resolveStationName:id=>id==='Seibu-Shinjuku'?'西武新宿':id},
    ThroughChip:{measureWidth:(s,font)=>String(s).length*font}},
    _losGroupKey:()=>null});
  vm.runInContext(geometrySource.slice(layoutStart,layoutEnd+5),context);
  const layout=context.window.StationInfoLayout;
  const plan=layout.plan(canonical,'Shinjuku','新宿',true);
  assert.equal(plan.rows,3,'11 transfer icons must occupy 4+4+3, not 1+4+4+2');
  assert.deepEqual(Array.from(plan.rowUsed.slice(0,3)),[4,4,3]);
  const firstRow=plan.shown.flatMap(e=>e.slots)
    .filter(slot=>slot.row===0);
  assert.equal(firstRow.length,4);
  assert.ok(firstRow.some(slot=>slot.part.item.lineId==='SeibuShinjuku'));
  assert.equal(plan.moreText,'');
  assert.equal(layout.reservedRows(canonical,'Shinjuku','新宿',true),3);
});

test('named caption remains outside real row after ordinary transfers fill it',()=>{
  const ls=geometrySource.indexOf('window.StationInfoLayout = (function() {');
  const le=geometrySource.indexOf('})();',ls);
  const rs=rendererSource.indexOf('  function _outwardWalkTransferArrow(');
  const re=rendererSource.indexOf('  function _isRealtimePositionFresh(',rs);
  assert.ok(ls>=0&&le>ls&&rs>=0&&re>rs);
  function node(tag){return{tag,attrs:{},textContent:'',children:[],
    setAttribute(k,v){this.attrs[k]=String(v);},
    appendChild(c){this.children.push(c);return c;}};}
  const flat=n=>[n,...n.children.flatMap(flat)];
  const canonical=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
  const items=canonical.lines.SaikyoKawagoe.transferStations
    .filter(t=>t.station==='Shinjuku')
    .map(t=>({lineId:t.lineId,name:t.lineId,image:t.lineId+'.png',type:'in'}));
  items.push({lineId:'SeibuShinjuku',name:'SS',image:'SS.png',
    toStation:'Seibu-Shinjuku',type:'out'});
  for(const side of ['left','right']){
    const root=node('g'),w={currentLang:'ja',
      RailwayDB:{resolveStationName:id=>id==='Seibu-Shinjuku'?'西武新宿':id},
      ThroughChip:{measureWidth:(s,f)=>String(s).length*f,
        badgeText:i=>i.name,normalize:()=>[],layoutGroup:()=>[],layoutRow:()=>[]}};
    const ctx=vm.createContext({window:w,document:{createElementNS:(_ns,tag)=>node(tag)},
      _losGroupKey:()=>null});
    vm.runInContext(geometrySource.slice(ls,le+5)+
      '\n'+rendererSource.slice(rs,re),ctx);
    ctx._renderStationNode({nodes:node('g'),info:root},'svg',{
      stationId:'Shinjuku',x:220,y:200,side,si:0,color:'#0ac',geometry:{},
      svgW:440,svgH:800,isMobileView:true,
      transferMap:{Shinjuku:items},rS:()=> '新宿'
    });
    const all=flat(root),images=all.filter(n=>n.tag==='image');
    assert.equal(images.length,11);
    const counts=new Map();
    images.forEach(icon=>counts.set(icon.attrs.y,(counts.get(icon.attrs.y)||0)+1));
    assert.deepEqual(Array.from(counts.values()),[4,4,3]);
    const dest=all.find(n=>n.tag==='text'&&n.textContent.includes('西武新宿'));
    assert.ok(dest);
    const row=images.filter(n=>n.attrs.y===images[0].attrs.y);
    const edge=side==='left'
      ? Math.min(...row.map(n=>Number(n.attrs.x)))
      : Math.max(...row.map(n=>Number(n.attrs.x)+Number(n.attrs.width)));
    assert.equal(Math.abs(edge-Number(dest.attrs.x)),3,
      'named caption must stay outside every icon in its 4-column row');
    assert.equal(dest.textContent,side==='left'?'西武新宿 · 徒歩 ←':'→ 西武新宿 · 徒歩');
  }
});

test('two named destinations reuse ordinary icon slots before starting another caption row',()=>{
  const start=geometrySource.indexOf('window.StationInfoLayout = (function() {');
  const end=geometrySource.indexOf('})();',start);
  assert.ok(start>=0&&end>start);
  const ctx=vm.createContext({window:{currentLang:'ja',
    RailwayDB:{resolveStationName:id=>id},
    ThroughChip:{measureWidth:(s,font)=>String(s).length*font}},
    _losGroupKey:()=>null});
  vm.runInContext(geometrySource.slice(start,end+5),ctx);
  const icons=[
    {lineId:'A',image:'a.png',toStation:'Target-A',type:'out'},
    {lineId:'B',image:'b.png',toStation:'Target-B',type:'out'},
    ...Array.from({length:6},(_,i)=>({lineId:'N'+i,image:'n'+i+'.png'}))
  ];
  const plan=ctx.window.StationInfoLayout.plan(icons,'Hub','Hub',true);
  assert.equal(plan.rows,2);
  assert.deepEqual(Array.from(plan.rowUsed.slice(0,2)),[4,4]);
  const captions=plan.shown.filter(g=>!!g.extra);
  assert.equal(captions.length,2);
  assert.equal(captions[0].slots[0].row,0);
  assert.equal(captions[1].slots[0].row,1);
});

test('train captions also avoid permanent station circles',()=>{
  const start=rendererSource.indexOf('  function _trainStaticScreenBounds(');
  const end=rendererSource.indexOf('  // The SVG badges are rebuilt',start);
  assert.ok(start>=0&&end>start);
  const env=vm.createContext({_trainUnitContainer:node=>node&&node.parentNode});
  vm.runInContext(rendererSource.slice(start,end),env);
  const info={querySelectorAll:()=>[]};
  const circle={getBoundingClientRect:()=>({x:100,y:100,width:30,height:30})};
  const stationNodes={querySelectorAll:()=>[circle]};
  const svg={
    getAttribute:()=> 'loaded',
    getBoundingClientRect:()=>({x:0,y:0,width:440,height:800}),
    querySelector:s=>s==='.station-info-layer'?info:
      s==='.station-node-layer'?stationNodes:null
  };
  const layer={ownerSVGElement:svg};
  const near={attrs:{},getBoundingClientRect:()=>({x:109,y:108,width:36,height:14}),
    setAttribute(k,v){this.attrs[k]=v;}};
  const far={attrs:{},getBoundingClientRect:()=>({x:200,y:180,width:40,height:14}),
    setAttribute(k,v){this.attrs[k]=v;}};
  assert.equal(env._protectStaticStationInfoFromTrainCaptions(layer,[near,far]),1);
  assert.equal(near.attrs.display,'none');
  assert.equal(far.attrs.display,undefined);
});

test('fixed train components fold even when a destination is statically obstructed; badge footprint also folds',()=>{
  const start=rendererSource.indexOf('  function _groupNearbyTrainMarkers(');
  const end=rendererSource.indexOf('  // The SVG badges are rebuilt',start);
  const groups=[];
  const env=vm.createContext({
    _trainUnitContainer:node=>node&&node.parentNode,
    _syncTrainFoldBadges:(_layer,folded,_labels,_markers,_matrix,badges)=>groups.push({folded,badges})
  });
  vm.runInContext(rendererSource.slice(start,end),env);
  const station={getBoundingClientRect:()=>({x:100,y:100,width:30,height:30})};
  const svg={
    getBoundingClientRect:()=>({x:0,y:0,width:440,height:800}),
    querySelector:s=>s==='.station-node-layer'?{querySelectorAll:()=>[station]}:null
  };
  for(const scale of [1,.5]){
    const matrix={a:scale,d:scale,b:0,c:0};
    function node(attrs,box,parentNode){
      return {attrs:{...attrs},parentNode,tagName:'image',
        getAttribute(k){return this.attrs[k]??null;},
        setAttribute(k,v){this.attrs[k]=String(v);},
        removeAttribute(k){delete this.attrs[k];},
        getBoundingClientRect(){return this.attrs.display==='none'?{x:0,y:0,width:0,height:0}:box;}};
    }
    const ua=node({},{}),ub=node({},{}),uc=node({},{});
    const a=node({'data-train-id':'a'},{x:105,y:82,width:14,height:18},ua);
    const b=node({'data-train-id':'b'},{x:136,y:105,width:14,height:18},ub);
    const c=node({'data-train-id':'c'},{x:105,y:64,width:14,height:12},uc);
    const la=node({'data-train-label-for':'a','data-label-raw-transform':'translate(-20,0)'},{x:94,y:108,width:55,height:14},ua);
    const lb=node({'data-train-label-for':'b','data-label-raw-transform':'translate(-15,0)'},{x:124,y:125,width:38,height:14},ub);
    const layer={ownerSVGElement:svg,getScreenCTM:()=>matrix,
      querySelectorAll:s=>s==='[data-train-id]'?[a,b,c]:s==='[data-train-label-for]'?[la,lb]:[]};
    env._resolveTrainLabelCollisions(layer);
    assert.equal(la.attrs.transform,'translate(-20,0)','caption must not drift');
    assert.equal(la.attrs.display,'none','static station remains readable');
    assert.equal(JSON.stringify(groups.at(-1).folded),JSON.stringify({a:['a','b','c']}));
    assert.equal(ub.attrs['data-train-fold-hidden'],'true');
    assert.equal(uc.attrs['data-train-fold-hidden'],'true','fold badge collision must also be resolved');
    assert.ok(groups.at(-1).badges.a.width>0);
  }
});
