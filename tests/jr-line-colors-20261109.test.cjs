'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const compact=fs.readFileSync('data/core/railway_data.compact.json','utf8');
const generated=fs.readFileSync('data/core/railway-data.file.js','utf8');
const loader=fs.readFileSync('data/core/db-loader.js','utf8');
const west={
 TokaidoKansai:['A','#007ac0'],Nara:['D','#b67c2b'],
 OsakaHigashi:['F','#47677f'],KakogawaLine:['I','#00a98f'],
 Maizuru:['L','#e9a500'],OsakaLoop:['O','#e93550'],
 Hanwa:['R','#f28c00'],Sakurai:['U','#d81e45']
};
const east={
 Joban:['JJ','#00b261'],JobanLocal:['JL','#808080'],
 SaikyoKawagoe:['JA','#00ac9a'],Itsukaichi:['JC','#f15a22'],
 Hachiko:['HAC','#808080']
};
test('eight JR-West official single-color route corridors agree with presentation',()=>{
 for(const [id,[code,color]] of Object.entries(west)){
   const line=data.lines[id];
   assert.equal(line.operator,'JR-West',id);
   assert.equal(line.presentation.code,code,id);
   assert.equal(line.color,color,id);
   assert.equal(line.presentation.color,color,id);
 }
});
test('five JR-East base colors match established passenger colors',()=>{
 for(const [id,[code,color]] of Object.entries(east)){
   const line=data.lines[id];
   assert.equal(line.operator,'JR-East',id);
   assert.equal(line.presentation.code,code,id);
   assert.equal(line.color,color,id);
   assert.equal(line.presentation.color,color,id);
 }
});
test('Fukuchiyama G stays yellow; long interregional routes remain independent',()=>{
 assert.equal(data.lines.Fukuchiyama.color,'#fcc800');
 assert.equal(data.lines.Fukuchiyama.presentation.code,'G');
 assert.equal(data.lines.KagoshimaMainJA.presentation.code,'JA');
 assert.equal(data.lines.KagoshimaMainJB.presentation.code,'JB');
 assert.equal(data.lines.KagoshimaMainJA.color,data.lines.KagoshimaMainJB.color);
 for(const id of ['SaninMain','SanyoMain','KansaiMain','HimejiLine']){
   assert.ok(data.lines[id].stations.length>30,id);
 }
});
test('canonical pretty data and generated bundles remain byte-identical',()=>{
 const compactExpected=JSON.stringify(data);
 assert.equal(compact,compactExpected+'\n');
 assert.equal(generated,'window.RAILWAY_DATA = '+
   compactExpected.replace(/<\/script/gi,'<\\/script')+';\n');
});
test('cache manifest and each page track actual Git blob versions',()=>{
 const sha=x=>{
   const b=Buffer.from(x);
   return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
 };
 assert.match(loader,new RegExp('railway_data\\.compact\\.json\\?v='+sha(compact)));
 assert.match(loader,new RegExp('railway-data\\.file\\.js\\?v='+sha(generated)));
 for(const name of ['home','trains','realtime','history',
   'tourism-event','tourism-spot','tourism-shop']){
   const page=fs.readFileSync('pages/'+name+'.html','utf8');
   assert.match(page,new RegExp('db-loader\\.js\\?v='+sha(loader)),name);
 }
});
