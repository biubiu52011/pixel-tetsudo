'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const i18n=JSON.parse(fs.readFileSync('data/core/station_i18n.json','utf8'));
const inventory=JSON.parse(fs.readFileSync('data/audits/jr-missing-lines-20261109.json','utf8'));
const expected={
 Fujikyu:{
  operator:'FujisanrokuElectricRailway',count:18,
  stations:['Otsuki','Kami-Otsuki','Tanokura','Kasei','Akasaka-Fujikyu',
   'Tsuru-shi','Yamuramachi','Tsurubunkadaigaku-mae','Tokaichiba-Fujikyu',
   'Higashi-Katsura','Mitsutoge','Kotobuki','Yoshiikeonsenmae','Shimoyoshida',
   'Gekkoji','Fujisan','Fujikyu-Highland','Kawaguchiko'],
  code:'FJ'
 },
 Nikko:{
  operator:'JR-East',count:7,
  stations:['Utsunomiya','Tsuruta','Kanuma','Fubasami','Shimotsuke-Osawa','Imaichi','Nikko']
 },
 TohokuRifu:{
  operator:'JR-East',count:3,
  stations:['Iwakiri','Shin-Rifu','Rifu']
 },
 ChikuhiWest:{
  operator:'JR-Kyushu',count:14,
  stations:['Nishi-Karatsu','Karatsu','Onizuka','Yamamoto-Saga','Hizen-Kubo',
   'Nishi-Ouchi','Sari','Komanaki','Okawano','Hizen-Nagano','Momonokawa',
   'Kanaishihara','Kami-Imari','Imari']
 }
};
test('four new lines use documented physical station order and remain topology-only',()=>{
 for(const [id,x]of Object.entries(expected)){
  const line=data.lines[id];
  assert.ok(line,id);
  assert.equal(line.operator,x.operator,id);
  assert.deepEqual(line.stations,x.stations,id);
  assert.equal(line.stations.length,x.count,id);
  assert.equal(line.durations.length,x.count-1,id);
  assert.equal(line.durationTotalMin,line.durations.reduce((a,b)=>a+b,0),id);
  assert.equal(line.presentation.lineIds[0],id,id);
  assert.equal(line.presentation.color,line.color,id);
  assert.equal(line.timetableDataStatus,'station_topology_only',id);
  assert.equal(line.sourceQuality,'topology_verified_times_approximate',id);
  if(x.code)assert.equal(line.presentation.code,x.code);
  line.stations.forEach((sid,i)=>{
   assert.ok(data.stations[sid]?.lat&&data.stations[sid]?.lng,id+':'+sid);
   assert.equal(data.lineStationOrder[id][sid],i,id+':'+sid);
   assert.ok(data.stationLines[sid]?.includes(id),id+':'+sid);
   assert.ok(i18n[sid]?.ja&&i18n[sid]?.zh&&i18n[sid]?.ko&&i18n[sid]?.en,id+':'+sid);
  });
 }
});
test('fujikyu different names for Akasaka and Tokaichiba do not collide',()=>{
 assert.notEqual(data.name_map['赤坂'],'Akasaka-Fujikyu');
 assert.notEqual(data.name_map['十日市場'],'Tokaichiba-Fujikyu');
 assert.equal(data.name_map['富士急 赤坂'],'Akasaka-Fujikyu');
 assert.equal(data.name_map['富士急 十日市場'],'Tokaichiba-Fujikyu');
 assert.equal(data.lines.Fujikyu.presentation.operatorGroup,'FUJIKYU');
});
test('Nikko and Kawaguchiko canonical terminal coordinates are corrected',()=>{
 assert.ok(Math.abs(data.stations.Nikko.lat-36.747192)<0.00001);
 assert.ok(Math.abs(data.stations.Nikko.lng-139.622108)<0.00001);
 assert.ok(Math.abs(data.stations.Kawaguchiko.lat-35.498239)<0.00001);
 assert.ok(Math.abs(data.stations.Kawaguchiko.lng-138.768624)<0.00001);
 assert.ok(Math.abs(data.stations.Otsuki.lat-35.61326)<0.00001);
});
test('missing inventory removes actual new JR routes and tracks completed topology',()=>{
 for(const id of ['Nikko','TohokuRifu','ChikuhiWest']){
  assert.equal(inventory.missingFrontend.some(x=>x.id===id),false,id);
  assert.equal(inventory.implementedFrontend.filter(x=>x.id===id).length,1,id);
  assert.equal(inventory.implementedFrontend.find(x=>x.id===id).status,'station_topology_only');
 }
 assert.ok(inventory.newNonJrLines.some(x=>x.id==='Fujikyu'&&x.stations===18));
});
test('corrected line endpoints and branches are connected in route graph',()=>{
 const window={RailwayDB:{getAllLines:()=>data.lines,getData:()=>({stations:data.stations,line_types:data.line_types})},RuntimeConfig:{TRUNK_MAIN_LINE_IDS:[]}};
 vm.runInNewContext(fs.readFileSync('js/route-search.js','utf8'),{window,console,Map,Set,Date,Math});
 const graph=window.RouteSearch.buildStationGraph();
 for(const [a,b] of [
  ['Otsuki','Kami-Otsuki'],['Fujisan','Fujikyu-Highland'],['Fujikyu-Highland','Kawaguchiko'],
  ['Utsunomiya','Tsuruta'],['Imaichi','Nikko'],['Iwakiri','Shin-Rifu'],
  ['Shin-Rifu','Rifu'],['Yamamoto-Saga','Hizen-Kubo'],['Kami-Imari','Imari']
 ]){
  assert.ok(graph.get(a)?.has(b),a+'->'+b);
  assert.ok(graph.get(b)?.has(a),b+'->'+a);
 }
});
test('canonical data and multilingual artifacts share exact generated content',()=>{
 const railway=JSON.stringify(data),translations=JSON.stringify(i18n);
 assert.equal(fs.readFileSync('data/core/railway_data.compact.json','utf8'),railway+'\n');
 assert.equal(fs.readFileSync('data/core/railway-data.file.js','utf8'),
  'window.RAILWAY_DATA = '+railway.replace(/<\/script/gi,'<\\/script')+';\n');
 assert.equal(fs.readFileSync('data/core/station_i18n.compact.json','utf8'),translations+'\n');
 assert.equal(fs.readFileSync('data/core/station-i18n.file.js','utf8'),
  'window.RAILWAY_I18N = '+translations.replace(/<\/script/gi,'<\\/script')+';\n');
 const hash=x=>{const b=Buffer.from(String(x).replace(/\r\n/g,'\n'));return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex').slice(0,12);};
 const loader=fs.readFileSync('data/core/db-loader.js','utf8');
 for(const [path,expression]of [
  ['data/core/railway_data.compact.json','railway_data\\.compact\\.json'],
  ['data/core/railway-data.file.js','railway-data\\.file\\.js'],
  ['data/core/station_i18n.compact.json','station_i18n\\.compact\\.json'],
  ['data/core/station-i18n.file.js','station-i18n\\.file\\.js']
 ])assert.match(loader,new RegExp(expression+'\\?v='+hash(fs.readFileSync(path,'utf8'))),path);
 for(const page of ['home','trains','realtime','history','tourism-event','tourism-spot','tourism-shop']){
  assert.match(fs.readFileSync('pages/'+page+'.html','utf8'),
    new RegExp('db-loader\\.js\\?v='+hash(loader)),page);
 }
});
