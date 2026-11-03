'use strict';
/* Regress Yamanote hub station rendering when its transfer badge list shows
 * an overflow "+N": the former rowW reference threw on iOS Safari.
 * Exercises the REAL _renderStationNode() source with small SVG DOM stubs,
 * not only a textual assertion. node --test tools/yamanote-transfer-overflow.test.cjs
 */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/trains-render.js','utf8');
const begin = source.indexOf('  function _renderStationNode(');
const end = source.indexOf('  function _isRealtimePositionFresh(', begin);
assert.ok(begin >= 0 && end > begin, 'station renderer source section changed');
const helperBegin = source.indexOf('function _badgeW(');
const helperEnd = source.indexOf('function _rememberTrainArtworkFailure(', helperBegin);
assert.ok(helperBegin >= 0 && helperEnd > helperBegin);
const code = source.slice(helperBegin, helperEnd) +
  source.slice(begin, end) + '\nthis.drawStation=_renderStationNode;';
const railway = JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
assert.ok(railway.lines.Yamanote.stations.includes('Shinjuku'));
const name = 'Shinjuku';

function node(tag) {
  return {
    tag, attrs:Object.create(null), textContent:'', children:[],
    setAttribute(key,value){this.attrs[key]=String(value);},
    getAttribute(key){return this.attrs[key] ?? null;},
    appendChild(child){this.children.push(child);return child;}
  };
}
function fixture({mobile=false,side='right',count=19,maxRows=4}={}) {
  const nodes=[];
  const layer={appendChild(item){nodes.push(item);return item;}};
  const win={
    RuntimeConfig:{TRANSFER_MAX_ROWS:maxRows},
    ThroughChip:{
      badgeText(item){return item.lineId;},
      normalize(items){return items;},
      layoutGroup(){throw Error('unexpected through layout');},
      layoutRow(){throw Error('unexpected through layout');}
    }
  };
  const context=vm.createContext({
    window:win,
    document:{createElementNS(_ns,tag){return node(tag);}},
    staticLayer:layer,svgNS:'http://www.w3.org/2000/svg'
  });
  vm.runInContext(code,context,{filename:'js/trains-render.js:station'});
  const transfers=Array.from({length:count},(_,i)=>({
    lineId:'test-line-'+i, name:'line '+i,
    image:'fake-icon-'+i+'.png',through:false
  }));
  const o={
    stationId:name,si:0,x:side==='left'?32:180,y:120,
    color:'#9ac',isJunction:false,isMobileView:mobile,
    geometry:{isLoop:false},svgW:420,svgH:400,
    side,transferMap:{[name]:transfers},
    rS(s){return s;}
  };
  assert.doesNotThrow(()=>context.drawStation(o),'overflow must never crash SVG map');
  const backgrounds=nodes.filter(it=>it.tag==='rect' &&
    it.attrs.fill==='rgba(255,255,255,0.72)');
  const extras=nodes.filter(it=>it.tag==='text' && /^\+\d+$/.test(it.textContent));
  assert.equal(backgrounds.length,1,'a transfer badge background exists');
  assert.equal(extras.length,count>4*maxRows?1:0,'overflow text only when needed');
  return {nodes,bg:backgrounds[0],extra:extras[0],o};
}

test('Yamanote Shinjuku hub: 19 transfers display +3 without rowW error',()=>{
  const {nodes,bg,extra,o}=fixture();
  assert.equal(extra.textContent,'+3');
  assert.equal(nodes.filter(n=>n.tag==='image').length,16);
  const x0=o.x+10;
  const rowWidth=4*16+3*2;
  assert.equal(Number(extra.attrs.x),x0+rowWidth+2,
    'overflow count follows the widest rendered row');
  assert.equal(Number(bg.attrs.x),x0-1);
  assert.ok(Number(extra.attrs.x) < Number(bg.attrs.x)+Number(bg.attrs.width));
});

test('Yamanote left-hand transfer layout measures final two-chip rows',()=>{
  const {nodes,bg,extra}=fixture({side:'left'});
  assert.equal(nodes.filter(n=>n.tag==='image').length,8,
    'narrow left margin falls back from four to two badges per row');
  assert.equal(extra.textContent,'+11');
  assert.equal(Number(bg.attrs.x),1,'badge starts at safely clamped x=2');
  assert.equal(Number(extra.attrs.x),2+(2*16+2)+2,
    'overflow follows the final two-column width, not stale first width');
});

test('mobile badge layout and no-overflow path both still render',()=>{
  const a=fixture({mobile:true,count:20});
  assert.equal(a.extra.textContent,'+4');
  assert.equal(a.nodes.filter(n=>n.tag==='image').length,16);
  const b=fixture({mobile:true,count:4});
  assert.equal(b.extra,undefined);
  assert.equal(b.nodes.filter(n=>n.tag==='image').length,4);
});
