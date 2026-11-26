'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('地下铁批次素材区分与相铁直通线路门禁',()=>{
 const w={};vm.runInNewContext(fs.readFileSync('data/timetables/vehicle-garage-png-map.js','utf8'),{window:w});
 const g=w.VehicleGaragePngMap,p=(d,n)=>'../images/列车/'+d+'/'+n+'.png';
 const variants=[
 ['東京メトロ05系（4～7次車）','東京メトロ05系',p('東京メトロ','東京メトロ_05系_4～7次車'),'Tozai','Chiyoda'],
 ['東京メトロ05系（8～13次車）','東京メトロ05系',p('東京メトロ','東京メトロ_05系_8～13次車'),'Tozai','Chiyoda'],
 ['横浜市営10000形（1次車）','横浜市営10000形',p('横浜市交通局','横浜市交通局_10000形_1次車'),'YokohamaGreen','YokohamaBlue'],
 ['横浜市営10000形（2次車）','横浜市営10000形',p('横浜市交通局','横浜市交通局_10000形_2次車'),'YokohamaGreen','YokohamaBlue']
 ];
 for(const [model,family,path,line,other] of variants){
  assert.ok(g.matchModelPath(model,path,line));
  assert.ok(!g.matchModelPath(family,path,line));
  assert.ok(!g.matchModelPath(model,path,other));
  assert.ok(g.findPath(path).every(x=>!x.canonicalImage));
 }
 for(const line of ['Mita','Namboku','TokyuMeguro'])assert.equal(g.findModel('相鉄20000系',line).length,0);
 for(const [model,line,file] of [['相鉄20000系','Fukutoshin','相模鉄道_20000系_YOKOHAMA_NAVYBLUE'],['相鉄21000系','Namboku','相模鉄道_21000系']]){
  assert.ok(g.findModel(model,line).length);
  assert.ok(g.isQuarantinedPng(p('相模鉄道',file)));
  assert.ok(!g.matchModelPath(model,p('相模鉄道',file),line));
 }
});
