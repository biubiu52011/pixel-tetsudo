'use strict';
// Sources: Tobu Railway 2026-03-14 timetable 303E; Chichibu Railway
// CR01-CR37 official station list; MLIT 2024 station coordinates.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const d=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const i18n=JSON.parse(fs.readFileSync('data/core/station_i18n.json','utf8'));
const L=d.lines;
test('generated JSON and file-mode bundles match canonical data',()=>{
 for(const [key,name,stem] of [['railway_data','RAILWAY_DATA','railway-data'],
 ['station_i18n','RAILWAY_I18N','station-i18n']]){
  const c=JSON.stringify(JSON.parse(fs.readFileSync('data/core/'+key+'.json','utf8')));
  assert.equal(fs.readFileSync('data/core/'+key+'.compact.json','utf8'),c+'\n');
  assert.equal(fs.readFileSync('data/core/'+stem+'.file.js','utf8'),
   'window.'+name+' = '+c.replace(/<\/script/gi,'<\\/script')+';\n');
 }
});
test('Goshi is located and displayed as 剛志, not 五志',()=>{
 assert.equal(L.TobuIsesaki.stations[23],'Goshi');
 assert.ok(Math.abs(d.stations.Goshi.lat-36.295515)<0.00001);
 assert.equal(i18n.Goshi.ja,'剛志');assert.equal(i18n.Goshi.zh,'刚志');
});
test('Tobu local 303E 2026-03-14 published departures match every station after Tatebayashi',()=>{
 const a=L.TobuIsesaki;
 const stations=['Tatebayashi','Tatara','Agata','Fukui','Tobu-Izumi','Ashikagashi',
 'Yashu-Yamabe','Niragawa','Ota','Hosoya','Kizaki','Serada','Sakaimachi',
 'Goshi','Shin-Isesaki','Isesaki'];
 const times=['05:01','05:05','05:09','05:13','05:15','05:18','05:21',
 '05:27','05:32','05:36','05:40','05:43','05:48','05:52','05:58','06:00'];
 let minute=5*60+1;
 stations.forEach((id,j)=>{
  assert.equal(a.stations[10+j],id);
  const [h,m]=times[j].split(':').map(Number);
  assert.equal(minute,h*60+m,id);
  if(j<stations.length-1)minute+=a.durations[10+j];
 });
 assert.equal(a.durations[23],6);assert.equal(a.durations[24],2);
 assert.equal(a.durations[25],0);
 assert.equal(a.durations.slice(10,25).reduce((x,y)=>x+y,0),59);
 assert.equal(a.durations.slice(0,25).reduce((x,y)=>x+y,0),a.durationTotalMin);
 // The initial 36m reference comes from a DIFFERENT train. This 95m
 // static value is not proof of a same-train 303E full-line trip.
});
test('Tobu official TI notation includes Sano, Kiryu and Koizumi',()=>{
 for(const id of ['TobuIsesaki','Sano','Kiryu','Koizumi']){
  assert.equal(L[id].code,'TI',id);assert.equal(L[id].presentation.code,'TI',id);
 }
});
test('through junctions are reciprocal; Kiryu/Sano are selected express only',()=>{
 const join=(a,b,s)=>L[a].throughServices.includes(b)&&
  L[a].serviceBoundaries.some(x=>x.lineId===b&&x.handoverStations.includes(s));
 for(const [a,b,at] of [
  ['TobuIsesaki','TobuSkytree','Tobu-Dobutsu-Koen'],
  ['TobuSkytree','TobuIsesaki','Tobu-Dobutsu-Koen'],
  ['TobuNikko','TobuSkytree','Tobu-Dobutsu-Koen'],
  ['TobuSkytree','TobuNikko','Tobu-Dobutsu-Koen'],
  ['TobuIsesaki','Kiryu','Ota'],['Kiryu','TobuIsesaki','Ota'],
  ['TobuIsesaki','Sano','Tatebayashi'],['Sano','TobuIsesaki','Tatebayashi']
 ])assert.ok(join(a,b,at),a+' -> '+b);
 for(const [a,b] of [
  ['TobuIsesaki','Kiryu'],['Kiryu','TobuIsesaki'],
  ['TobuIsesaki','Sano'],['Sano','TobuIsesaki']
 ])assert.equal(L[a].serviceBoundaries.find(x=>x.lineId===b).serviceScope,
    'selected-limited-express');
 assert.ok(!L.TobuIsesaki.throughServices.includes('TobuNikko'));
});
test('ThroughChip shows only destination line names for Kiryu/Sano limited express through',()=>{
 const s=fs.readFileSync('js/trains-data.js','utf8');
 const p=s.indexOf('/* ThroughChip 属于列车地图几何所有者。 */');
 assert.ok(p>0);
 const w={currentLang:'ja'};
 vm.runInNewContext(s.slice(p),{window:w,console});
 for(const [id,name] of [['Kiryu','東武桐生線'],['Sano','東武佐野線']]){
  const chip={lineId:id,name,through:true,operator:'',
   throughScope:'selected-limited-express'};
  for(const lang of ['ja','zh','ko','en']){
   w.currentLang=lang;
   assert.equal(w.ThroughChip.shortName(chip,false),name);
   assert.equal(w.ThroughChip.shortName(chip,true),name);
   assert.equal(w.ThroughChip.badgeText(chip),name);
   assert.doesNotMatch(w.ThroughChip.badgeText(chip),/一部特急|部分特急|Select limited|相互直通/);
  }
 }
 assert.equal(L.TobuIsesaki.serviceBoundaries.find(x=>x.lineId==='Kiryu').serviceScope,
   'selected-limited-express');
});
test('Chichibu Railway 37 official CR stations have names, positions and junctions',()=>{
 const l=L.ChichibuMain;
 assert.ok(l);assert.equal(l.code,'CR');assert.equal(l.stations.length,37);
 assert.equal(new Set(l.stations).size,37);
 for(const [idx,id] of l.stations.entries()){
  const p=d.stations[id];
  assert.ok(p&&p.lat>35.9&&p.lat<36.3&&p.lng>138.9&&p.lng<139.6,id);
  assert.ok(d.stationLines[id].includes('ChichibuMain'),id);
  assert.equal(d.lineStationOrder.ChichibuMain[id],idx);
  assert.ok(i18n[id]?.ja,id);
 }
 assert.equal(l.stations[0],'Hanyu');assert.equal(l.stations[8],'Kumagaya');
 assert.equal(l.stations[19],'Yorii');
 assert.equal(l.stations.at(-1),'CR-Mitsumineguchi');
 assert.equal(l.stations[35],'CR-Shiroku');
 assert.equal(i18n['CR-Shiroku'].en,'Shiroku');
 assert.equal(l.timetableDataStatus,'station_topology_only');
 assert.equal(l.sourceQuality,'official_station_order_mlit2024_coords');
 assert.equal(l.durations.length,0,'No fictional two-minute timetable');
 assert.ok(d.stationLines.Hanyu.includes('TobuIsesaki'));
 assert.ok(L.TobuIsesaki.transferStations.some(t=>t.station==='Hanyu'&&t.lineId==='ChichibuMain'));
 assert.ok(l.transferStations.some(t=>t.station==='Hanyu'&&t.lineId==='TobuIsesaki'));
 assert.ok(l.transferStations.some(t=>t.station==='CR-Ohanabatake'&&
  t.toStation==='Seibu-Chichibu'&&t.type==='out'));
});
