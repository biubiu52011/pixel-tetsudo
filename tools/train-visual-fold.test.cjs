'use strict';
/* Train symbols and entire destination captions collide as one component;
 * a +N fold never merges train identity or changes actual train positions.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const render=fs.readFileSync('js/trains-render.js','utf8');
function extract(start,end) {
  const a=render.indexOf(start),b=render.indexOf(end,a);
  assert.ok(a>=0&&b>a,'missing folding source '+start);
  return render.slice(a,b);
}
const functions=extract('  function _groupNearbyTrainMarkers(entries, distance) {',
  '  // The SVG badges are rebuilt as collision layout moves.');
const badgeSource=extract('  function _syncTrainFoldBadges(layer, folded, groups, markers, matrix) {',
  '  // 折叠视图是展示分组，绝不是连挂编组或合并运行。');
function node(tag) {
  const attrs=Object.create(null);
  return {tagName:tag,attrs,style:{},children:[],parentNode:null,
    setAttribute(k,v){attrs[k]=String(v)},
    getAttribute(k){return attrs[k]===undefined?null:attrs[k]},
    removeAttribute(k){delete attrs[k]},
    closest(){return null},
    appendChild(child){child.parentNode=this;this.children.push(child);return child},
    removeChild(child){this.children.splice(this.children.indexOf(child),1);child.parentNode=null}};
}
const ctx={window:{},console,document:{createElementNS:(ns,tag)=>node(tag)},
  _bindTrainFoldBadgeActivation(){},_trainUnitContainer(marker){return marker&&marker.parentNode}};
vm.runInNewContext(functions+badgeSource+
  '\nthis.group=_groupNearbyTrainMarkers;this.layout=_resolveTrainLabelCollisions;',ctx);
const group=ctx.group;
function box(id,x,y,width,height,artwork=true) {
  return {id,artwork,box:{x,y,width,height}};
}
assert.equal(Object.keys(group([box('up',100,100,14,18),box('down',120,100,14,18)])).length,0,
  'nonoverlapping trains across opposite directional lanes remain visible');
assert.deepEqual(Array.from(group([box('up',100,100,28,18),box('down',120,100,28,18)]).up),
  ['up','down'], 'overlapping opposing train components must fold');
assert.equal(Object.keys(group([box('a',100,100,14,18),box('b',140,100,14,18)])).length,0,
  '40px proximity alone is not a component collision');
assert.deepEqual(Array.from(group([
  box('a',100,100,20,18),box('b',116,100,20,18),box('c',132,100,20,18)
]).a),['a','b','c'], 'connected overlaps form one visual group');

function fixture(noLabels=false) {
  const icons=[],labels=[],units=[];
  function add(id,x,y,dir,type,caption) {
    const unit=node('g'),icon=node(type||'image');
    unit.setAttribute('data-train-unit-id',id);
    icon.setAttribute('data-train-id',id);
    icon._trainPosition={trainId:id,trainNumber:id,railDirection:dir};
    icon._rect={x,y,width:type==='circle'?9:14,height:type==='circle'?9:18};
    icon.getBoundingClientRect=()=>icon._rect;
    unit.appendChild(icon);units.push(unit);icons.push(icon);
    if (noLabels) return;
    const label=node('g');
    label.setAttribute('data-train-label-for',id);
    label.setAttribute('data-label-raw-transform','translate(0,0)');
    label.getBoundingClientRect=()=>caption;
    unit.appendChild(label);labels.push(label);
  }
  add('a',100,100,'Outbound','image',{x:95,y:120,width:65,height:16});
  add('b',135,100,'Inbound','image',{x:126,y:123,width:55,height:16});
  add('c',300,260,'Outbound','image',{x:290,y:280,width:55,height:16});
  const svg={__geometry:{},getScreenCTM:()=>({a:1,d:1})};
  const layer={ownerSVGElement:svg,
    querySelectorAll(sel) {
      if(sel==='[data-train-id]')return icons;
      if(sel==='[data-train-label-for]')return labels;
      if(sel==='[data-train-fold-badge]')
        return units.flatMap(u=>u.children.filter(x=>x.getAttribute('data-train-fold-badge')));
      return [];
    }};
  return {icons,labels,units,layer};
}
const first=fixture();
ctx.layout(first.layer);
assert.equal(first.units[0].getAttribute('data-train-fold-hidden'),null);
assert.equal(first.units[1].getAttribute('visibility'),'hidden',
  'two destination captions overlap although the train images do not');
assert.equal(first.units[1].getAttribute('data-train-fold-hidden'),'true');
assert.equal(first.units[2].getAttribute('visibility'),null);
const badge=first.units[0].children.find(x=>x.getAttribute('data-train-fold-badge')==='a');
assert.ok(badge,'+N badge attaches to kept train component');
assert.deepEqual(Array.from(badge._foldTrainIds),['a','b']);
assert.equal(badge.children[1].textContent,'+1');
assert.equal(first.icons[1]._trainPosition.trainNumber,'b','preserve source train identities');
// Move the *entire* second component away: previously folded members return.
first.icons[1]._rect={x:260,y:100,width:14,height:18};
first.labels[1].getBoundingClientRect=()=>({x:252,y:124,width:46,height:16});
ctx.layout(first.layer);
assert.equal(first.units[1].getAttribute('visibility'),null);
assert.equal(first.units[1].getAttribute('data-train-fold-hidden'),null);
assert.ok(!first.units[0].children.some(x=>x.getAttribute('data-train-fold-badge')));
const noCaption=fixture(true);
noCaption.icons[1]._rect={x:105,y:104,width:14,height:18};
ctx.layout(noCaption.layer);
assert.equal(noCaption.units[1].getAttribute('visibility'),'hidden');
assert.match(render,/caption\.textContent=captionBase;/);
console.log('whole-component collision and folding: PASS');
