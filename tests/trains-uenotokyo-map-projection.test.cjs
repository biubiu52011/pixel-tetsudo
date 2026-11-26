'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/trains-render.js'), 'utf8');
const all = JSON.parse(fs.readFileSync(path.join(root, 'data/core/railway_data.compact.json'), 'utf8')).lines;
const line = all.UenoTokyo;
function slice(begin, end) {
  const a = source.indexOf(begin), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'missing source anchors: ' + begin);
  return source.slice(a, b);
}
const section = slice('  function _displayLineForMap(line, lineId) {', '  var _trainRenderSamples = []');
const direction = slice('  function _trainMoveDir(p, lineId) {', '  // Keep direction (');
const context = {window:{UNIFIED_LINES:all}, console};
const stubs = [
  'function _getLineOverride() { return null; }',
  'function _isOedoTailTrain() { return false; }',
  'function _stationKey(x) { return String(x).replace(/[-_]/g, "").toLowerCase(); }'
].join('\n');
vm.runInNewContext(stubs + '\n' + section + '\n' + direction +
  '\nthis.displayLine=_displayLineForMap;this.project=_projectPositionsForMap;this.dir=_trainMoveDir;', context);
const displayed=context.displayLine(line,'UenoTokyo');
const index = name => line.stations.indexOf(name);
function train(from,to,progress,dest) {
  return {trainId:from+':'+to, stationIndex:index(from), segmentToIndex:index(to),
    segmentProgress:progress, destinationStation:dest || 'Ueno',
    railDirection:'odpt.RailDirection:Inbound'};
}
const project = p => context.project([p], line, displayed);

test('passenger map covers exactly Ueno, Tokyo, Shimbashi and Shinagawa', () => {
  assert.deepEqual(Array.from(displayed.stations), ['Ueno','Tokyo','Shimbashi','Shinagawa']);
});

test('a northbound Shimbashi train uses four-stop source-consistent direction', () => {
  const p=project(train('Shimbashi','Tokyo',0.5,'Ueno'))[0];
  assert.ok(p);
  assert.equal(p.stationIndex,2);
  assert.equal(p.segmentToIndex,1);
  assert.equal(context.dir(p,'UenoTokyo'),'up');
});

test('destination-only direction comparisons use the displayed four-stop order', () => {
  const p=project(train('Shimbashi','Tokyo',0,'Ueno'))[0];
  p.segmentToIndex=null;
  assert.equal(context.dir(p,'UenoTokyo'),'up');
  const q=project(train('Tokyo','Shimbashi',0.3,'Shinagawa'))[0];
  assert.equal(context.dir(q,'UenoTokyo'),'down');
});

test('trains outside the displayed corridor are not pinned to its endpoints', () => {
  assert.equal(project(train('Oku','Ueno',0.5)).length,0);
  assert.equal(project(train('Shinagawa','Kawasaki',0.5,'Ofuna')).length,0);
  assert.equal(project(train('Ueno','Tokyo',0.5)).length,1);
});

/* 同一物理共轨权威被数据融合、详情渲染和车辆 PNG 选择器使用。 */
const trainData=fs.readFileSync(path.join(root,'js/trains-data.js'),'utf8');
const fusionSource=fs.readFileSync(path.join(root,'js/data-fusion.js'),'utf8');
const sharedStart=trainData.indexOf('  var _SHARED_TRACK_SECTIONS = [');
const sharedEnd=trainData.indexOf('  // 支线 junction',sharedStart);
const rankStart=trainData.indexOf('function _isFreshRealtimePosition(');
const rankEnd=trainData.indexOf('function _getBasePositions(',rankStart);
const exportStart=trainData.indexOf('  window.SharedTrackPairs = {');
assert.ok(sharedStart>=0&&sharedEnd>sharedStart&&rankStart>=0&&rankEnd>rankStart&&exportStart>=0);
const sharedContext={window:{UNIFIED_LINES:all},Date,console};
vm.runInNewContext(trainData.slice(rankStart,rankEnd)+trainData.slice(sharedStart,sharedEnd)+
 trainData.slice(exportStart),sharedContext);
const shared=sharedContext.window.SharedTrackPairs;
const pos=(lid,from,to,progress,mods={})=>({positionLineId:lid,trainId:'id:'+lid+':'+from,
 trainNumber:'1234T',stationIndex:all[lid].stations.indexOf(from),stationId:from,
 segmentToIndex:to==null?null:all[lid].stations.indexOf(to),segmentProgress:progress,
 positionSource:'train-timetable',estimated:true,...mods});
test('only the two independent subway shared sections are symmetric',()=>{
 const pairs=[['Yurakucho','Fukutoshin','Wakoshi','Kotake-Mukaihara'],
  ['Namboku','Mita','Meguro','Shirokane-Takanawa']];
 for(const [a,b,first,last] of pairs)for(const [host,peer] of [[a,b],[b,a]]){
   assert.ok(shared.getSharedLines(host).includes(peer),host+' '+peer);
   for(const st of [first,last])assert.ok(shared.isSharedStation(host,st,peer));
   const p=pos(peer,first,null,0),q=shared.projectPosition(host,peer,p);
   assert.ok(q);assert.equal(q.stationIndex,all[host].stations.indexOf(first));
   assert.equal(q.positionLineId,peer);assert.equal(q.displayLineId,host);
   assert.equal(shared.restoreSourcePosition(q,host).stationIndex,p.stationIndex);
 }
 assert.equal(shared.isSharedStation('Yurakucho','Ikebukuro','Fukutoshin'),false);
 assert.equal(shared.isSharedStation('Yurakucho','Senkawa','Fukutoshin'),false);
 const expected=new Set(pairs.flatMap(([a,b])=>[a+':'+b,b+':'+a]));
 const actual=new Set(Object.keys(all).flatMap(a=>Array.from(shared.getSharedLines(a),b=>a+':'+b)));
 assert.deepEqual(actual,expected,'no other physical shared-track display pairs');
 const excluded=[['SaikyoKawagoe','ShonanShinjuku','Osaki'],
  ['Yokosuka','ShonanShinjuku','Nishi-Oi'],['Takasaki','UtsunomiyaJR','Tokyo'],
  ['Joban','JobanMain','Toride'],['ChuoRapid','ChuoSobu','Shinjuku'],
  ['Yamanote','KeihinTohoku','Tokyo'],['UenoTokyo','Tokaido','Tokyo']];
 for(const [a,b,st] of excluded)for(const [host,peer] of [[a,b],[b,a]]){
  assert.equal(shared.getSharedLines(host).includes(peer),false,host+' '+peer);
  assert.equal(shared.isSharedStation(host,st,peer),false);
  if(all[peer]&&all[peer].stations.includes(st))
   assert.equal(shared.projectPosition(host,peer,pos(peer,st,null,0)),null);
 }
 assert.equal(shared.getSharedLines('Yamanote').length,0);
 assert.equal(shared.getSharedLines('JobanLocal').length,0);
 assert.equal(shared.isSharedStation('ShonanShinjuku','Akabane','SaikyoKawagoe'),false);
 assert.equal(shared.isSharedStation('ShonanShinjuku','Ofuna','Yokosuka'),false);
});
test('raw ODPT from/to must be inside actual common tracks; departures and arrivals outside fail closed',()=>{
 const live={positionSource:'realtime-api',estimated:false,sourceRailway:'odpt.Railway:TokyoMetro.Fukutoshin'};
 const p=pos('Fukutoshin','Hikawadai',null,0,{...live,sourceFromStation:'odpt.Station:TokyoMetro.Fukutoshin.Hikawadai',sourceToStation:'odpt.Station:TokyoMetro.Fukutoshin.KotakeMukaihara'});
 const q=shared.projectPosition('Yurakucho','Fukutoshin',p);
 assert.ok(q);assert.equal(q.segmentToIndex,5);assert.equal(q.segmentProgress,0);
 assert.equal(shared.restoreSourcePosition(q,'Yurakucho').sourceRailway,p.sourceRailway);
 for(const [from,to] of [['Kotake-Mukaihara','Senkawa'],['Senkawa','Kotake-Mukaihara']])
  assert.equal(shared.projectPosition('Yurakucho','Fukutoshin',pos('Fukutoshin',from,null,0,{...live,sourceFromStation:from,sourceToStation:to})),null);
 assert.equal(shared.projectPosition('Mita','Namboku',pos('Namboku','Shirokane-Takanawa',null,0,{...live,sourceToStation:'Azabu-Juban'})),null);
 assert.equal(shared.projectPosition('Yurakucho','Fukutoshin',{...p,stationIndex:null}),null);
 assert.equal(shared.projectPosition('Yurakucho','Fukutoshin',{...p,sourceToStation:'unknown'}),null);
 assert.equal(shared.projectPosition('Yurakucho','Fukutoshin',{...p,positionLineId:'Namboku'}),null);
 assert.equal(shared.restoreSourcePosition({...q,stationIndex:12},'Yurakucho'),null);
 assert.equal(shared.restoreSourcePosition({...q,displayLineId:'Mita'},'Mita'),null);
 assert.equal(shared.projectPosition('Fukutoshin','Yurakucho',q),null,'projection never chains');
});
test('reverse station order maps direction on a retained shared pair; estimates never stick outside a boundary',()=>{
 const p=pos('Namboku','Meguro','Shirokanedai',0.25,{railDirection:'Outbound'});
 const own=all.Mita.stations, peer=all.Namboku.stations;
 const orientation=Math.sign(own.indexOf('Shirokanedai')-own.indexOf('Meguro'))*
  Math.sign(peer.indexOf('Shirokanedai')-peer.indexOf('Meguro'));
 const reversed=orientation<0?own.slice():own.slice().reverse();
 const fixture={...all,Mita:{...all.Mita,stations:reversed}};
 const q=shared.projectPosition('Mita','Namboku',p,fixture);
 assert.ok(q);
 assert.equal(q.stationIndex,reversed.indexOf('Meguro'));
 assert.equal(q.segmentToIndex,reversed.indexOf('Shirokanedai'));
 assert.equal(q.segmentProgress,0.25);
 assert.equal(q.sharedTrackDirection,-Math.sign(p.segmentToIndex-p.stationIndex));
 const original=sharedContext.window.UNIFIED_LINES;
 try {
  sharedContext.window.UNIFIED_LINES=fixture;
  assert.equal(shared.restoreSourcePosition(q,'Mita').segmentProgress,0.25);
 } finally { sharedContext.window.UNIFIED_LINES=original; }
 assert.equal(shared.projectPosition('ShonanShinjuku','SaikyoKawagoe',pos('SaikyoKawagoe','Shibuya','Shinjuku',0.25)),null);
 assert.equal(shared.projectPosition('Mita','Namboku',pos('Namboku','Shirokane-Takanawa','Azabu-Juban',0.1)),null);
 assert.ok(shared.projectPosition('Mita','Namboku',pos('Namboku','Meguro','Shirokane-Takanawa',0.75)));
});
test('shared position merge preserves identity, prefers fresh live and drops departed peer projections',()=>{
 const a=pos('Mita','Meguro','Shirokanedai',0.2,{runningChainId:'chain:1'});
 const b=pos('Namboku','Meguro',null,0,{runningChainId:'chain:1',positionSource:'realtime-api',estimated:false,sourceToStation:'Shirokanedai'});
 const different=pos('Namboku','Shirokanedai',null,0,{trainId:'different',trainNumber:a.trainNumber});
 let merged=shared.mergePositions('Mita',[a],()=>[b,different]);
 assert.equal(merged.length,2);assert.equal(merged[0].positionLineId,'Namboku');
 assert.equal(merged[0].fusionRole,'shared-track');assert.equal(merged[1].trainId,'different');
 assert.equal(shared.mergePositions('Mita',[a],()=>[{...b,sourceValidUntil:'2000-01-01T00:00:00Z'}])[0],a);
 merged=shared.mergePositions('Mita',[a],()=>[pos('Namboku','Azabu-Juban',null,0)]);
 assert.equal(merged.length,1);assert.equal(merged[0],a);
 assert.match(fusionSource,/_shared\.mergePositions\(lineId,_rtPositions/);
 assert.match(fusionSource,/_sharedPartners\.indexOf\(_tlLine\)>=0\)continue/);
 assert.match(trainData,/SharedTrackPairs\.mergePositions\(lineId,positions,_getBasePositions\)/);
});
