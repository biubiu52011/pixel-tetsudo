'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/trains-render.js','utf8');
const data=fs.readFileSync('js/trains-data.js','utf8');
const start=source.indexOf('/*\n * TrainTrackLayout');
assert.ok(start>0,'existing shared train layout must be used');
const w={};vm.runInNewContext(source.slice(start),{window:w,console});
const track=w.TrainTrackLayout;
const points=[
 {stationId:'Asakusa',x:95,y:230},
 {stationId:'Tokyo-Skytree',x:95,y:185},
 {stationId:'Oshiage',x:205,y:210},
 {stationId:'Hikifune',x:150,y:140},
 {stationId:'Higashi-Mukojima',x:150,y:95},
 {stationId:'Kanegafuchi',x:150,y:50}
];
const fork={kind:'tobu-skytree-hikifune-y',junctionIndex:3,edges:[[0,1],[1,3],[2,3],[3,4],[4,5]]};
const geometry={isLoop:false,mapFork:fork};
const opts={laneGap:0,stackGap:0,getDisplayMoveDir:p=>p.screenDir||null};
const run=p=>track.resolveAll([{trainId:'train',...p}],points,geometry,'TobuSkytree',opts)[0];
test('source Skytree station indexes retain a real Y, not a Tokyo-Skytree to Oshiage segment',()=>{
 assert.match(data,/stations\[1\] === "Tokyo-Skytree"/);
 assert.match(data,/stations\[2\] === "Oshiage"/);
 assert.match(data,/stations\[3\] === "Hikifune"/);
 assert.match(data,/if \(isSkytreeYFork && _segI === 1\) continue/);
 assert.match(data,/data-fork-track':'asakusa'/);
 assert.match(data,/mapFork: isSkytreeYFork/);
 assert.match(data,/junctionStation: isSixShapedLoop \? stations\[0\] : \(isSkytreeYFork \? "Hikifune"/);
 assert.equal(points[0].stationId,'Asakusa');assert.equal(points[2].stationId,'Oshiage');
});
test('train runs travel on the two painted branches, never the invalid direct connector',()=>{
 const left=run({stationIndex:1,segmentToIndex:3,segmentProgress:0.5});
 const right=run({stationIndex:2,segmentToIndex:3,segmentProgress:0.5});
 assert.ok(left);assert.ok(right);
 assert.ok(left.x<150,'Tokyo-Skytree track goes left of Hikifune');
 assert.ok(right.x>150,'Oshiage through track goes right of Hikifune');
 assert.equal(run({stationIndex:1,segmentToIndex:2,segmentProgress:0.5}),null);
 assert.equal(run({stationIndex:0,segmentToIndex:2,segmentProgress:0.5}),null);
});
test('express skipping Tokyo-Skytree interpolates along the Asakusa leg, never across Oshiage',()=>{
 const early=run({stationIndex:0,segmentToIndex:3,segmentProgress:0.15});
 const later=run({stationIndex:0,segmentToIndex:3,segmentProgress:0.8});
 assert.ok(early&&later);assert.equal(early.x,95);
 assert.ok(later.x>95&&later.x<150,'skip follows Asakusa-Tokyo-Skytree-Hikifune');
});
test('unknown junction branch stays at Hikifune instead of assuming Oshiage',()=>{
 const unknown=run({stationIndex:3,segmentProgress:0.4,screenDir:'down'});
 assert.ok(unknown);assert.equal(unknown.idx,3);assert.equal(unknown.nextIdx,3);
 const asa=run({stationIndex:3,segmentProgress:0.5,screenDir:'down',
    scheduledStopKeys:['Tobu.TobuSkytree.Asakusa','Tobu.TobuSkytree.TokyoSkytree']});
 const osh=run({stationIndex:3,segmentProgress:0.5,screenDir:'down',
    scheduledStopKeys:['Tobu.TobuSkytree.Oshiage']});
 assert.ok(asa&&osh);assert.equal(asa.nextIdx,1);assert.equal(osh.nextIdx,2);
 assert.ok(asa.x<150);assert.ok(osh.x>150);
 const contradiction=run({stationIndex:3,segmentProgress:0.2,screenDir:'down',
    scheduledStopKeys:['Tobu.TobuSkytree.Asakusa','Tobu.TobuSkytree.Oshiage']});
 assert.ok(contradiction);assert.equal(contradiction.nextIdx,3);
});
test('source direction arrow reversal applies only to the visual Skytree fork',()=>{
 assert.match(source,/function _sourceIndexTrainMoveDir\(/);
 assert.match(source,/function _trainMoveDir\(p,lineId\)/);
 assert.match(source,/indexDir==="up"\?"down":indexDir==="down"\?"up"/);
 assert.equal(run({stationIndex:3,segmentToIndex:4,segmentProgress:0.5}).moveDir,'up');
 assert.equal(run({stationIndex:4,segmentToIndex:3,segmentProgress:0.5}).moveDir,'down');
});
