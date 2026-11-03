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
