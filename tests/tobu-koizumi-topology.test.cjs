'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const lines=data.lines;
const main=['Tatebayashi','Narushima','Hon_Nakano','Shinozuka','Higashi_Koizumi','Koizumicho','Nishi_Koizumi'];
const spur=['Higashi_Koizumi','Ryumai','Ota'];
test('official Koizumi graph has a Higashi-Koizumi junction, not an invented through line',()=>{
 assert.deepEqual(lines.Koizumi.stations,main);
 assert.deepEqual(lines.KoizumiBranch.stations,spur);
 assert.equal(lines.KoizumiBranch.branchOf,'Koizumi');
 assert.equal(lines.Koizumi.durations.length,main.length-1);
 assert.equal(lines.KoizumiBranch.durations.length,spur.length-1);
 for(const [id,stations] of [['Koizumi',main],['KoizumiBranch',spur]]){
  stations.forEach((station,i)=>{
   assert.equal(data.lineStationOrder[id][station],i);
   assert.ok(data.stationLines[station].includes(id),id+'/'+station);
  });
 }
 assert.deepEqual(data.stationLines.Higashi_Koizumi,['Koizumi','KoizumiBranch']);
 assert.ok(!main.includes('Ota'));
 assert.ok(!spur.includes('Nishi_Koizumi'));
});
test('spur uses generic internal branch view and is not an independently selectable line',()=>{
 const ctx={window:{UNIFIED_LINES:lines},console};
 vm.runInNewContext(fs.readFileSync('js/line-presentation-service.js','utf8'),ctx);
 const service=ctx.window.LinePresentationService;
 assert.deepEqual(Array.from(service.getMapBranchIds('Koizumi',lines)),['KoizumiBranch']);
 assert.equal(service.isIndependentLine('KoizumiBranch',lines),false);
 assert.equal(service.isIndependentLine('Koizumi',lines),true);
 assert.deepEqual(lines.Koizumi.presentation.lineIds,['Koizumi']);
});
test('Ota interchange is mapped to the spur without inventing current plans',()=>{
 for(const id of ['TobuIsesaki','Kiryu']){
  assert.ok(lines[id].transferStations.some(t=>t.station==='Ota'&&t.lineId==='KoizumiBranch'));
  assert.ok(!lines[id].transferStations.some(t=>t.station==='Ota'&&t.lineId==='Koizumi'));
 }
 assert.ok(lines.Koizumi.transferStations.every(t=>main.includes(t.station)));
 assert.ok(lines.KoizumiBranch.transferStations.every(t=>spur.includes(t.station)));
 assert.equal(lines.Koizumi.durationDerivation.verifiedCurrent,false);
 assert.equal(lines.KoizumiBranch.durationDerivation.verifiedCurrent,false);
});
test('generated offline and compact topology agree with canonical',()=>{
 const compact=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8'));
 assert.deepEqual(compact.lines.Koizumi,lines.Koizumi);
 assert.deepEqual(compact.lines.KoizumiBranch,lines.KoizumiBranch);
 const offline=fs.readFileSync('data/core/railway-data.file.js','utf8');
 assert.ok(offline.startsWith('window.RAILWAY_DATA = '));
 assert.ok(offline.includes('"KoizumiBranch"'));
});
