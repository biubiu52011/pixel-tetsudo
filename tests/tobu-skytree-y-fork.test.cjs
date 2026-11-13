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
 {stationId:'Asakusa',x:150,y:230},
 {stationId:'Tokyo-Skytree',x:150,y:185},
 {stationId:'Oshiage',x:250,y:185},
 {stationId:'Hikifune',x:150,y:140},
 {stationId:'Higashi-Mukojima',x:150,y:95},
 {stationId:'Kanegafuchi',x:150,y:50}
];
const fork={kind:'tobu-skytree-hikifune-y',junctionIndex:3,edges:[[0,1],[1,3],[2,3],[3,4],[4,5]],
 elbows:{'2-3':{x:250,y:140}}};
const geometry={isLoop:false,mapFork:fork};
const opts={laneGap:0,stackGap:0,getDisplayMoveDir:p=>p.screenDir||null};
const run=p=>track.resolveAll([{trainId:'train',...p}],points,geometry,'TobuSkytree',opts)[0];
test('source Skytree station indexes retain a real Y, not a Tokyo-Skytree to Oshiage segment',()=>{
 assert.match(data,/stations\[1\] === "Tokyo-Skytree"/);
 assert.match(data,/stations\[2\] === "Oshiage"/);
 assert.match(data,/stations\[3\] === "Hikifune"/);
 assert.ok(data.includes("if (isSkytreeYFork && (_segI === 1 || _segI === 2)) continue"));
 assert.match(data,/data-fork-track':'asakusa'/);
 assert.match(data,/mapFork: isSkytreeYFork/);
 assert.match(data,/junctionStation: isSixShapedLoop \? stations\[0\] : \(isSkytreeYFork \? "Hikifune"/);
 assert.equal(points[0].stationId,'Asakusa');assert.equal(points[2].stationId,'Oshiage');
});
test('train runs travel on the two painted branches, never the invalid direct connector',()=>{
 const left=run({stationIndex:1,segmentToIndex:3,segmentProgress:0.5});
 const right=run({stationIndex:2,segmentToIndex:3,segmentProgress:0.5});
 assert.ok(left);assert.ok(right);
 assert.equal(left.x,150,'Asakusa spine is vertical below Hikifune');
 assert.ok(right.x>150,'Oshiage uses the right-hand L spur');
 assert.equal(right.y,140,'Oshiage midpoint travels on the horizontal L leg');
 assert.equal(run({stationIndex:1,segmentToIndex:2,segmentProgress:0.5}),null);
 assert.equal(run({stationIndex:0,segmentToIndex:2,segmentProgress:0.5}),null);
});
test('express skipping Tokyo-Skytree interpolates along the Asakusa leg, never across Oshiage',()=>{
 const early=run({stationIndex:0,segmentToIndex:3,segmentProgress:0.15});
 const later=run({stationIndex:0,segmentToIndex:3,segmentProgress:0.8});
 assert.ok(early&&later);assert.equal(early.x,150);
 assert.equal(later.x,150,'skipped Tokyo-Skytree follows the main vertical track');
});
test('unknown junction branch stays at Hikifune instead of assuming Oshiage',()=>{
 const unknown=run({stationIndex:3,segmentProgress:0.4,screenDir:'down'});
 assert.ok(unknown);assert.equal(unknown.idx,3);assert.equal(unknown.nextIdx,3);
 const asa=run({stationIndex:3,segmentProgress:0.5,screenDir:'down',
    scheduledStopKeys:['Tobu.TobuSkytree.Asakusa','Tobu.TobuSkytree.TokyoSkytree']});
 const osh=run({stationIndex:3,segmentProgress:0.5,screenDir:'down',
    scheduledStopKeys:['Tobu.TobuSkytree.Oshiage']});
 assert.ok(asa&&osh);assert.equal(asa.nextIdx,1);assert.equal(osh.nextIdx,2);
 assert.equal(asa.x,150);assert.ok(osh.x>150);assert.equal(osh.y,140);
 const contradiction=run({stationIndex:3,segmentProgress:0.2,screenDir:'down',
    scheduledStopKeys:['Tobu.TobuSkytree.Asakusa','Tobu.TobuSkytree.Oshiage']});
 assert.ok(contradiction);assert.equal(contradiction.nextIdx,3);
});
test('source direction arrow reversal applies only to the visual Skytree fork',()=>{
 assert.match(source,/function _sourceIndexTrainMoveDir\(/);
 assert.match(source,/function _trainMoveDir\(p, lineId\)/);
 assert.match(source,/indexDir==="up"\?"down":indexDir==="down"\?"up"/);
 assert.equal(run({stationIndex:3,segmentToIndex:4,segmentProgress:0.5}).moveDir,'up');
 assert.equal(run({stationIndex:4,segmentToIndex:3,segmentProgress:0.5}).moveDir,'down');
});

test('canonical Tobu map generates actual SVG Y coordinates from the existing geometry engine',()=>{
 const all=JSON.parse(fs.readFileSync('data/core/railway_data.compact.json','utf8')).lines;
 const window={
   currentLang:'ja',innerWidth:420,UNIFIED_LINES:all,
   TrainsActiveSystemLineIds:[],RuntimeConfig:{},
   RailwayDB:{getAllLines:()=>all,getLine:id=>all[id],resolveStationName:id=>id},
   LinePresentationService:{getMapBranchIds:()=>[]}
 };
 const document={
   querySelector:()=>({clientWidth:390}),
   createElement:()=>({getContext:()=>null}),
   fonts:{status:'loaded'},body:{}
 };
 const ctx={window,document,console,
   GEOM:{BRANCH_STUB:24,BRANCH_COL_W:96,MAIN_BASE_W_MAX:297,MOBILE_CONTENT_W:297},
   _isMobileView:()=>true};
 vm.runInNewContext(data,ctx,{filename:'trains-data.js',timeout:15000});
 const line=ctx.getLinesData().TobuSkytree;
 const g=ctx.computeRouteGeometry(line,'TobuSkytree');
 // The physical north end is the last SOURCE station but the first
 // DISPLAYED station. Isesaki service must be above it, never below it.
 const northStation=line.stations[line.stations.length-1];
 assert.equal(northStation,'Tobu-Dobutsu-Koen');
 const chipMap=ctx._getTransferMap('TobuSkytree',g.staticRevision);
 const northThrough=(chipMap[northStation]||[]).find(item=>
   item.lineId==='TobuIsesaki'&&item.through===true);
 assert.ok(northThrough,'Isesaki through should be attached to Tobu-Dobutsu-Koen');
 assert.equal(northThrough.dir,'up','top-of-map continuation must point upward');
 assert.equal(window.ThroughChip.dirForStation('TobuSkytree',
   northStation,'TobuIsesaki'),'up');
 const chipHeight=window.ThroughChip.size(northThrough,true,g.throughChipMaxWidth).h;
 const northY=g.stationCoords[g.stationCoords.length-1].y;
 assert.ok(northY-18-chipHeight>=2,
   'top Isesaki chip must fit above northern terminal within SVG viewBox');
 // Changes here may not reverse all through service labels or break the
 // canonical directional meaning of other railway diagrams.
 const oshiageThrough=(chipMap.Oshiage||[]).find(item=>
   item.lineId==='Hanzomon'&&item.through===true);
 assert.ok(oshiageThrough,'Hanzomon through must appear at the Oshiage fork');
 assert.equal(oshiageThrough.dir,'down',
   'Hanzomon label follows the visible southern fork endpoint, not the hidden source order');
 assert.equal(window.ThroughChip.dirForStation('TobuSkytree',
   'Oshiage','Hanzomon'),'down');
 assert.equal(window.ThroughChip.dirForStation('TobuIsesaki',
   'Tobu-Dobutsu-Koen','TobuSkytree'),'up');
 assert.equal(g.stationCoords.length,line.stations.length);
 assert.equal(g.stationCoords[3].stationId,'Hikifune');
 assert.ok(g.stationCoords[3].y<g.stationCoords[1].y);
 assert.ok(g.stationCoords[3].y<g.stationCoords[2].y);
 assert.equal(g.stationCoords[1].x,g.stationCoords[3].x,'Asakusa remains on the trunk');
 assert.equal(g.stationCoords[0].x,g.stationCoords[3].x);
 assert.ok(g.stationCoords[2].x>g.stationCoords[3].x,'Oshiage branches right');
 assert.equal(g.stationCoords[2].y,g.stationCoords[1].y,'both destinations occupy the same map row');
 assert.ok(g.stationCoords[1].y-g.stationCoords[3].y>=106,
   'Hikifune transfers and Tokyo-Skytree name need their own vertical region');
 assert.ok(g.stationCoords[0].y-g.stationCoords[1].y>=112,
   'multiline Tokyo-Skytree label and badges need clearance from Asakusa');
 assert.ok(g.svgH>=g.stationCoords[0].y+65,
   'Asakusa transfer badges must remain inside the canvas');
 assert.ok(g.svgW>=g.stationCoords[2].x+124,'right name and transfers must fit');
 assert.equal(g.stationCoords[1].side,'dual');
 assert.equal(g.stationCoords[2].side,'right');
 assert.equal(g.stationCoords[3].side,'top');
 assert.equal(g.junctionStation,'Hikifune');
 assert.equal(g.mapFork.kind,'tobu-skytree-hikifune-y');
 const tracks=g.routeElements.filter(e=>e.type==='line');
 function edge(a,b){
   const p=g.stationCoords[a],q=g.stationCoords[b];
   return tracks.some(e=>(e.attrs.x1===p.x&&e.attrs.y1===p.y&&
     e.attrs.x2===q.x&&e.attrs.y2===q.y)||
     (e.attrs.x2===p.x&&e.attrs.y2===p.y&&e.attrs.x1===q.x&&e.attrs.y1===q.y));
 }
 assert.equal(edge(0,1),true);
 assert.equal(edge(1,3),true);
 assert.equal(edge(2,3),false,'diagonal Oshiage connector must not exist');
 assert.equal(edge(3,4),true);
 const bend=g.routeElements.find(e=>e.attrs&&e.attrs['data-fork-track']==='oshiage-l');
 assert.ok(bend,'right-angle Oshiage SVG path');
 assert.equal(bend.type,'path');
 assert.ok(bend.attrs.d.includes(' H '));
 assert.ok(bend.attrs.d.includes(' V '));
 assert.equal(g.mapFork.elbows['2-3'].x,g.stationCoords[2].x);
 assert.equal(g.mapFork.elbows['2-3'].y,g.stationCoords[3].y);
 assert.equal(edge(1,2),false,'no Tokyo-Skytree to Oshiage fake line');
 assert.ok(g.stationCoords.every(p=>p.x>=0&&p.x<=g.svgW&&p.y>=0&&p.y<=g.svgH));
 const caption=g.routeElements.find(e=>e.attrs&&e.attrs['data-fork-caption']==='oshiage-through');
 assert.equal(caption,undefined,'branch track must not duplicate the ThroughChip label');
});

test('L corner interpolation keeps the vehicle on painted horizontal then vertical legs',()=>{
 const first=run({stationIndex:3,segmentToIndex:2,segmentProgress:0.25});
 const final=run({stationIndex:3,segmentToIndex:2,segmentProgress:0.9});
 assert.ok(first&&final);
 assert.equal(first.y,140,'first leg is horizontal out of Hikifune');
 assert.ok(first.x>150&&first.x<250);
 assert.equal(final.x,250,'second leg turns vertically to Oshiage');
 assert.ok(final.y>140&&final.y<185);
 const reverse=run({stationIndex:2,segmentToIndex:3,segmentProgress:0.25});
 assert.equal(reverse.x,250,'reverse trip first climbs Oshiage vertical leg');
 assert.ok(reverse.y<185&&reverse.y>140);
 assert.equal(run({stationIndex:1,segmentToIndex:2,segmentProgress:0.5}),null);
});
test('long station name, Hikifune transfers and through caption use nonoverlapping L coordinates',()=>{
 assert.ok(source.includes('forkMultiline: !!_forkLines'));
 assert.ok(source.includes('forkJunction: _forkHikifune'));
 assert.ok(source.includes('if(o.forkMultiline)iy0=o.y+21'));
 assert.ok(source.includes('ix0 = o.forkJunction ? o.x - 24 - totalW'));
 assert.ok(source.includes('_setRows(3);'),'fork badge reflow uses existing rows');
 assert.ok(source.includes('ix0 = Math.max(2, ix0)'),'junction badges never clip left');
 assert.ok(source.includes('_forkHikifune ? sc.y - 16'));
 assert.ok(!data.includes("'data-fork-caption':'oshiage-through'"),
   'Hanzomon label is owned by ThroughChip, not a separate track caption');
});
