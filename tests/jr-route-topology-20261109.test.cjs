'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const lines=data.lines;
const pairs=[
 ['SanyoMain','SanyoWadamisaki','Hyougo','Wada-Misaki'],
 ['Hanwa','HanwaHagoromo','Otori','Higashi-Hagoromo'],
 ['SaninMain','SaninSenzaki','Nagato-Shi','Senzaki']
];
test('all three branch rails are separate from the real main-line adjacency',()=>{
 for(const [parent,branch,junction,terminus]of pairs){
   const trunk=lines[parent],side=lines[branch];
   assert.ok(trunk&&side,branch);
   assert.equal(side.operator,'JR-West');
   assert.equal(side.branchOf,parent);
   assert.deepEqual(side.stations,[junction,terminus]);
   assert.equal(trunk.stations.includes(terminus),false);
   assert.equal(side.durations.length,1);
   assert.equal(trunk.durations.length,trunk.stations.length-1);
   assert.ok(data.stationLines[junction].includes(parent));
   assert.ok(data.stationLines[junction].includes(branch));
   assert.ok(!data.stationLines[terminus].includes(parent));
   assert.ok(data.stationLines[terminus].includes(branch));
 }
});
test('non-rail tails are removed from active railway topology, not archived SQL',()=>{
 const ends=[
  ['KansaiMain','J-R-Nanba',50],
  ['Kesennuma','Yanagitsu',6],
  ['Ofunato','Kesennuma',14],
  ['Hitahikosan','JRW-Hitahikosan-1191418',16]
 ];
 for(const [id,terminal,count]of ends){
   const l=lines[id];
   assert.equal(l.stations.length,count,id);
   assert.equal(l.stations.at(-1),terminal,id);
   assert.equal(l.durations.length,count-1,id);
   assert.equal(data.lineStationOrder[id][terminal],count-1,id);
   assert.ok(l.topologyAudit?.reason,id);
 }
 assert.ok(!lines.KansaiMain.stations.includes('Taisho'));
 assert.ok(!lines.Kesennuma.stations.includes('Shizugawa'));
 assert.ok(!lines.Ofunato.stations.includes('Rikuzen-Takata'));
 assert.ok(!lines.Hitahikosan.stations.includes('Hita'));
});
test('non-JR gaps are explicit and routing never builds edges across them',()=>{
 const checks=[
  ['Shinetsu','Yokokawa','Shinonoi'],
  ['Shinetsu','Nagano','Naoetsu'],
  ['KagoshimaMain','Yatsushiro','Satsuma-Sendai']
 ];
 const window={
  RailwayDB:{getAllLines:()=>lines,getData:()=>({stations:data.stations,line_types:data.line_types})},
  RuntimeConfig:{TRUNK_MAIN_LINE_IDS:[]}
 };
 vm.runInNewContext(fs.readFileSync('js/route-search.js','utf8'),
   {window,console,Map,Set,Date,Math});
 const graph=window.RouteSearch.buildStationGraph();
 for(const [id,from,to]of checks){
   const l=lines[id],i=l.stations.indexOf(from);
   assert.equal(l.stations[i+1],to,id);
   assert.ok(l.topologyBreaks.some(g=>g.from===from&&g.to===to),id);
   assert.equal(graph.get(from)?.has(to),false,id+': '+from+'->'+to);
   assert.equal(graph.get(to)?.has(from),false,id+': '+to+'->'+from);
 }
 const mapSource=fs.readFileSync('js/trains-data.js','utf8');
 assert.match(mapSource,/_isTopologyBreakForMap\(lineId, _segA\.stationId, _segB\.stationId\)/);
 assert.match(mapSource,/if \(_isTopologyBreakForMap\(lineId, _segA\.stationId, _segB\.stationId\)\) continue/);
});
test('operator boundaries are explicit without forging new train sources',()=>{
 assert.equal(lines.HakataMinami.operator,'JR-West');
 assert.equal(lines.HakataMinami.presentation.operatorGroup,'JR_WEST');
 assert.deepEqual(lines.HokurikuShinkansen.operatorSections.map(x=>x.operator),['JR-East','JR-West']);
 assert.equal(lines.HokurikuShinkansen.operatorSections[0].to,'Joetsu-Myoko');
 assert.equal(lines.HokurikuShinkansen.operatorSections[1].from,'Joetsu-Myoko');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 assert.ok(edge.includes('SQL read failed'));
});
test('all edited line-station indexes and data bundles stay synchronized',()=>{
 for(const [id,l]of Object.entries(lines)){
   if(!l.stations||!['SanyoMain','SanyoWadamisaki','Hanwa','HanwaHagoromo',
    'SaninMain','SaninSenzaki','KansaiMain','Kesennuma','Ofunato','Hitahikosan'].includes(id))continue;
   l.stations.forEach((sid,i)=>{
     assert.equal(data.lineStationOrder[id][sid],i,id+':'+sid);
     assert.ok(data.stationLines[sid]?.includes(id),id+':'+sid);
   });
 }
 const compact=JSON.stringify(data);
 assert.equal(fs.readFileSync('data/core/railway_data.compact.json','utf8'),compact+'\n');
 assert.equal(fs.readFileSync('data/core/railway-data.file.js','utf8'),
   'window.RAILWAY_DATA = '+compact.replace(/<\/script/gi,'<\\/script')+';\n');
 const blobSHA=src=>{
   const b=Buffer.from(src);return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);
 };
 const loader=fs.readFileSync('data/core/db-loader.js','utf8');
 assert.match(loader,new RegExp('railway_data\\.compact\\.json\\?v='+blobSHA(compact+'\n')));
 assert.match(loader,new RegExp('railway-data\\.file\\.js\\?v='+blobSHA('window.RAILWAY_DATA = '+compact+';\n')));
 for(const name of ['home','trains','realtime','history','tourism-event','tourism-spot','tourism-shop']){
   const page=fs.readFileSync('pages/'+name+'.html','utf8');
   assert.match(page,new RegExp('db-loader\\.js\\?v='+blobSHA(loader)),name);
 }
});
