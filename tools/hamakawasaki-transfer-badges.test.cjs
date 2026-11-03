'use strict';
// Transfer badges must be visible on both sides when a canonical branch is
// embedded in its parent line map. Run with:
// node --test tools/hamakawasaki-transfer-badges.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
const lines=data.lines;
const window={
  UNIFIED_LINES:lines,
  STATION_COORDS:data.stations,
  RuntimeConfig:{},
  currentLang:'ja',
  innerWidth:980
};
window.RailwayDB={
  getAllLines(){return lines;},
  resolveLineName(id){return lines[id]?.nameJa||id;},
  resolveStationName(station){return station;}
};
const ctx=vm.createContext({window,document:{}});
vm.runInContext(fs.readFileSync('js/line-presentation-service.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('js/trains-data.js','utf8'),ctx);
const getMap=vm.runInContext('_getTransferMap',ctx);
function at(map,station,lineId){
  return (map[station]||[]).filter(item=>item.lineId===lineId);
}
test('Hama-Kawasaki has both reciprocal visible transfer badges',()=>{
  const tsurumi=getMap('Tsurumi');
  const nambu=getMap('Nambu');
  const branch=getMap('NambuBranch');
  assert.equal(at(tsurumi,'Hama-Kawasaki','NambuBranch').length,1,
    'Tsurumi shows NambuBranch transfer at Hama-Kawasaki');
  assert.equal(at(nambu,'Hama-Kawasaki','Tsurumi').length,1,
    'Nambu parent map inherits embedded NambuBranch transfer');
  assert.equal(at(branch,'Hama-Kawasaki','Tsurumi').length,1,
    'independent branch source remains reciprocal');
  assert.equal(at(nambu,'Hama-Kawasaki','NambuBranch').length,0,
    'embedded parent/child is not a physical transfer');
  assert.notEqual(at(nambu,'Hama-Kawasaki','Tsurumi')[0].through,true,
    'Hama-Kawasaki is an outside transfer, not through service');
});
test('embedded branch keeps other external transfers but hides internal parent',()=>{
  const nambu=getMap('Nambu');
  assert.equal(at(nambu,'Hatchonawate','Keikyu').length,1);
  assert.equal(at(nambu,'Shitte','Nambu').length,0,
    'a branch-to-parent link must not show as a transfer on parent map');
});
test('Nambu branch target uses its existing parent icon without rewriting identity',()=>{
  const t=getMap('Tsurumi');
  const chip=at(t,'Hama-Kawasaki','NambuBranch')[0];
  assert.equal(chip.image,lines.Nambu.image);
  assert.equal(chip.lineId,'NambuBranch');
  assert.ok(chip.image.includes('南武線.png'));
});

test('terminal branch caption clears Hama-Kawasaki transfer icon on mobile',()=>{
  const map=getMap('Nambu');
  const offset=vm.runInContext('_branchTerminalCaptionOffset',ctx);
  assert.equal(offset([]),18,'ordinary branch ends keep their former baseline');
  assert.equal(offset(map['Hama-Kawasaki']),42,
    'single icon requires a caption lower than the previous 18px');

  // Execute the actual SVG branch-caption drawing block with the canonical
  // NambuBranch station order (remote terminus first, parent junction last).
  const source=fs.readFileSync('js/trains-render.js','utf8');
  const a=source.indexOf('          // 竖列支线名放回 SVG 层');
  const b=source.indexOf('          } // else（竖列现状）闭合',a);
  assert.ok(a>=0&&b>a);
  const drawn=[];
  ctx.document.createElementNS=(_ns,tag)=>({
    tag,attrs:{},textContent:'',
    setAttribute(name,value){this.attrs[name]=String(value);}
  });
  ctx.staticLayer={appendChild(node){drawn.push(node);}};
  ctx.svgNS='http://www.w3.org/2000/svg';
  ctx.branch=lines.NambuBranch;
  ctx._rStations=lines.NambuBranch.stations.slice().reverse();
  ctx._jFind7={station:'Shitte'};
  ctx.transferMap=map;
  ctx.bx=180;
  ctx._connY=100;
  ctx._vOwn=4;
  ctx.branchSp=45;
  ctx.bColor='#ffe400';
  vm.runInContext(source.slice(a,b),ctx);
  const caption=drawn.find(n=>n.tag==='text'&&n.textContent==='浜川崎支線');
  assert.ok(caption,'the branch caption must still be visible');
  assert.equal(Number(caption.attrs.y),100+3*45+42);
  const lastStopY=100+3*45;
  const iconBottom=lastStopY+9+16;
  const captionTop=Number(caption.attrs.y)-10;
  assert.ok(captionTop-iconBottom>=5,
    'branch name may not overlap the bottom of the reciprocal transfer icon');
  assert.equal(caption.attrs['text-anchor'],'middle');
});
test('vertical-branch geometry reserves caption clearance even in reversed station order',()=>{
  const source=fs.readFileSync('js/trains-data.js','utf8');
  assert.match(source,/var _bgTail = _bgArr\.reduce\(/,
    'the maximum branch y must not use the original station-array tail');
  assert.match(source,/svgH = Math\.max\(svgH, _bgTail\.y \+ _terminalOffset \+ 16\)/);
  assert.equal(lines.NambuBranch.stations[0],'Hama-Kawasaki',
    'NambuBranch terminal comes first in the canonical source order');
  assert.equal(lines.NambuBranch.stations.at(-1),'Shitte');
});
