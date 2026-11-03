'use strict';
/* Real SVG fold lifecycle: every visible nearby train forms one marker +N.
 * Grouping is for visual density, never an assertion of the same formation.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const render=fs.readFileSync('js/trains-render.js','utf8');
function extract(start,end){
  const a=render.indexOf(start),b=render.indexOf(end,a);
  assert.ok(a>=0&&b>a,'missing train folding source '+start);
  return render.slice(a,b);
}
const extracted=extract('  function _groupNearbyTrainMarkers(entries, distance) {',
  '  // The SVG badges are rebuilt as collision layout moves.');
const badgeSource=extract('  function _syncTrainFoldBadges(layer, folded, groups, markers, matrix) {',
  '  // 折叠视图是展示分组，绝不是连挂编组或合并运行。');
const ctx={window:{},console,document:{createElementNS:(ns,tag)=>node(tag)},
  _bindTrainFoldBadgeActivation(){},_trainUnitContainer(marker){return marker&&marker.parentNode},
  _trainMarkerDomKind(){}};
function node(tag){
  const attrs=Object.create(null);
  return {tagName:tag,attrs,style:{},children:[],parentNode:null,
    setAttribute(k,v){attrs[k]=String(v)},
    getAttribute(k){return attrs[k]===undefined?null:attrs[k]},
    removeAttribute(k){delete attrs[k]},
    appendChild(child){child.parentNode=this;this.children.push(child);return child},
    removeChild(child){this.children.splice(this.children.indexOf(child),1);child.parentNode=null},
  };
}
const sandbox=vm.createContext(ctx);
vm.runInContext(extracted+badgeSource+'\nthis.group=_groupNearbyTrainMarkers;\nthis.layout=_resolveTrainLabelCollisions;',sandbox);
const group=ctx.group;
const sample=[
  {id:'b',x:100,y:110,artwork:false,direction:'Outbound'},
  {id:'a',x:110,y:109,artwork:true,direction:'Outbound'},
  {id:'c',x:140,y:110,artwork:true,direction:'Outbound'},
  {id:'far',x:210,y:110,artwork:true,direction:'Outbound'}
];
const groups=group(sample,44);
assert.equal(Object.keys(groups).length,1);
assert.deepEqual(Array.from(groups.a),['a','b','c']);
assert.ok(!groups.far,'remote train not folded by chaining');

const opposite=group([
  {id:'up',x:100,y:100,direction:'Outbound',artwork:true},
  {id:'down',x:134,y:100,direction:'Inbound',artwork:true}
],44);
assert.equal(Object.keys(opposite).length,0,
  'distinct opposite-direction tracks may not be suppressed merely for proximity');
assert.equal(Object.keys(group([
  {id:'up',x:100,y:100,direction:'Outbound'},
  {id:'down',x:111,y:102,direction:'Inbound'}
],44)).length,1,'overlapping opposite-direction icons need fold');

function fixture(opts={}){
  const icons=[],labels=[],units=[];
  function add(id,x,y,dir,type){
    const unit=node('g'),icon=node(type||'image');
    unit.setAttribute('data-train-unit-id',id);
    icon.setAttribute('data-train-id',id);
    icon._trainPosition={railDirection:dir,trainId:id,trainNumber:id};
    icon._rect={x,y,width:type==='circle'?9:14,height:type==='circle'?9:18};
    icon.getBoundingClientRect=()=>icon._rect;
    unit.appendChild(icon);units.push(unit);icons.push(icon);
    if(opts.noLabels)return;
    const label=node('g');
    label.setAttribute('data-train-label-for',id);
    label.setAttribute('data-dir-sym',dir==='Outbound'?'down':'up');
    label.setAttribute('data-label-raw-transform','translate(0,0)');
    label.getBoundingClientRect=()=>({x:x+8,y:y,width:40,height:16});
    unit.appendChild(label);labels.push(label);
  }
  add('a',100,100,'Outbound','image');
  add('b',111,105,'Outbound','circle');
  add('c',280,260,'Outbound','image');
  const svg={
    __geometry:{},getScreenCTM:()=>({a:1,d:1}),
    getBoundingClientRect:()=>({x:0,y:0,width:400,height:600}),
    querySelectorAll(sel){return sel==='text, .static-layer image, [data-train-id]'?icons:[]}
  };
  const layer={
    ownerSVGElement:svg,
    querySelectorAll(sel){
      if(sel==='[data-train-id]')return icons;
      if(sel==='[data-train-label-for]')return labels;
      if(sel==='[data-train-fold-badge]')return units.flatMap(unit=>unit.children.filter(c=>c.getAttribute('data-train-fold-badge')));
      return [];
    },
  };
  ctx.window.TrainTrackLayout={resolveLabels:seen=>{
    const result={};
    for(const e of seen)result[e.id]={x:0,y:0};
    return result;
  }};
  return {layer,icons,labels,units};
}

const first=fixture();ctx.layout(first.layer);
assert.equal(first.units[0].getAttribute('data-train-fold-hidden'),null);
assert.equal(first.units[1].getAttribute('visibility'),'hidden');
assert.equal(first.units[1].getAttribute('data-train-fold-hidden'),'true');
assert.equal(first.units[2].getAttribute('visibility'),null);
let badge=first.units[0].children.find(x=>x.getAttribute('data-train-fold-badge')==='a');
assert.ok(badge,'badge must attach to kept train, not a destination label');
assert.deepEqual(Array.from(badge._foldTrainIds),['a','b']);
assert.equal(badge.children[1].textContent,'+1');
// The folded icon is only visually hidden: the real train and position stay.
assert.equal(first.icons[1].getAttribute('data-train-id'),'b');
assert.equal(first.icons[1]._trainPosition.trainNumber,'b');

// During the next poll two vehicles separate, so remove stale fold badges and
// show the previously hidden TrainComponent again.
first.icons[1]._rect={x:280,y:120,width:9,height:9};
ctx.layout(first.layer);
assert.equal(first.units[1].getAttribute('visibility'),null);
assert.equal(first.units[1].getAttribute('data-train-fold-hidden'),null);
assert.ok(!first.units[0].children.some(x=>x.getAttribute('data-train-fold-badge')),
  'no stale badges after trains separate');

// Regression: a train need not have a direction caption to be foldable.
const withoutCaptions=fixture({noLabels:true});
ctx.layout(withoutCaptions.layer);
assert.ok(withoutCaptions.units[0].children.some(x=>x.getAttribute('data-train-fold-badge')),
  'marker-based grouping must work without labels');
assert.equal(withoutCaptions.units[1].getAttribute('visibility'),'hidden');
assert.match(render,/caption\.textContent=captionBase;/,
  'ordinary train numbers must remain absent from fold list');
console.log('train visual-fold regression: PASS (proximity, badge, hide, restore, no label, identity)');
