'use strict';
/* Execute the real L3 station renderer with the shared StationInfoLayout
 * used by geometry. Overflow occupies a measured badge slot rather than
 * drawing outside the plan or adding a second background canvas.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const renderer=fs.readFileSync('js/trains-render.js','utf8');
const geometry=fs.readFileSync('js/trains-data.js','utf8');
const begin=renderer.indexOf('  function _renderStationNode(');
const end=renderer.indexOf('  function _isRealtimePositionFresh(',begin);
const layoutBegin=geometry.indexOf('window.StationInfoLayout = (function() {');
const layoutEnd=geometry.indexOf('})();',layoutBegin);
assert.ok(begin>=0&&end>begin&&layoutBegin>=0&&layoutEnd>layoutBegin);
const code=geometry.slice(layoutBegin,layoutEnd+5)+'\n'+renderer.slice(begin,end)+
  '\nthis.drawStation=_renderStationNode;';
const stations=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
assert.ok(stations.lines.Yamanote.stations.includes('Shinjuku'));

function node(tag) {
  return {tag,attrs:Object.create(null),textContent:'',children:[],
    setAttribute(key,value){this.attrs[key]=String(value);},
    getAttribute(key){return this.attrs[key]??null;},
    appendChild(child){this.children.push(child);return child;}
  };
}
function descend(n) {
  return [n].concat((n.children||[]).flatMap(descend));
}
function fixture({mobile=false,side='right',count=19,maxRows=4}={}) {
  const layer=node('g');
  const window={
    RuntimeConfig:{TRANSFER_MAX_ROWS:maxRows},
    ThroughChip:{
      badgeText(item){return item.lineId;},
      measureWidth(label,size){return String(label).length*size;},
      normalize(items){return items;},
      layoutGroup(){throw Error('unexpected through layout');}
    }
  };
  const ctx=vm.createContext({
    window,document:{createElementNS(_ns,tag){return node(tag);}},
    _losGroupKey(){return '';}
  });
  vm.runInContext(code,ctx,{filename:'train L3 station renderer'});
  const transfers=Array.from({length:count},(_,i)=>({
    lineId:'test-line-'+i,name:'line '+i,
    image:'fake-icon-'+i+'.png',through:false
  }));
  const o={stationId:'Shinjuku',si:0,x:side==='left'?32:180,y:120,
    color:'#9ac',isJunction:false,isMobileView:mobile,
    geometry:{isLoop:false},svgW:420,svgH:400,
    side,transferMap:{Shinjuku:transfers},rS(s){return s;}};
  assert.doesNotThrow(()=>ctx.drawStation({nodes:layer,info:layer},
    'http://www.w3.org/2000/svg',o));
  const all=descend(layer);
  const images=all.filter(it=>it.tag==='image');
  const extra=all.find(it=>it.tag==='text'&&/^\+\d+$/.test(it.textContent));
  const oldBackgrounds=all.filter(it=>it.tag==='rect'&&
    it.attrs.fill==='rgba(255,255,255,0.72)');
  assert.equal(oldBackgrounds.length,0,'L3 badge group is a transparent foreground');
  const plan=window.StationInfoLayout.plan(transfers,o.stationId,o.stationId,mobile,
    side==='left'?(o.x-(mobile?20:10)-2):(o.svgW-2-(o.x+(mobile?20:10))));
  assert.equal(images.length,plan.shown.length);
  assert.equal(extra?.textContent,plan.moreText||undefined);
  return {all,images,extra,plan,o};
}
test('Yamanote Shinjuku 19 transfers safely reserve an inline +N slot',()=>{
  const {images,extra,plan}=fixture();
  assert.equal(images.length,15,'one of 16 visual slots is used for the overflow');
  assert.equal(extra.textContent,'+4');
  assert.ok(Number(extra.attrs.x)>Number(images.at(-1).attrs.x));
  assert.ok(Number(extra.attrs.x)<=420,'overflow stays in the displayed station column');
  assert.equal(plan.shown.length+Number(!!plan.moreText),16);
});
test('Yamanote left-side layout reduces columns without crossing the track',()=>{
  const {images,extra,plan}=fixture({side:'left'});
  assert.ok(images.length<=15);
  assert.ok(plan.perRow<4);
  assert.ok(Number(images[0].attrs.x)>=2,'left-side badges are clamped inside SVG view');
  assert.ok(extra&&/^\+\d+$/.test(extra.textContent));
});
test('mobile and no-overflow paths use the same unified L3 planner',()=>{
  const a=fixture({mobile:true,count:20});
  assert.equal(a.extra.textContent,'+5');
  assert.equal(a.images.length,15);
  const b=fixture({mobile:true,count:4});
  assert.equal(b.extra,undefined);
  assert.equal(b.images.length,4);
});
