'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const manifest=JSON.parse(fs.readFileSync('data/audits/jr-missing-lines-20261109.json','utf8'));
const data=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
test('JR missing-line backlog is explicit, disjoint and grounded in real operators',()=>{
 const ids=new Set();
 for(const item of manifest.missingFrontend){
  assert.match(item.operator,/^JR-(East|West|Central|Hokkaido|Kyushu|Shikoku)$/);
  assert.ok(item.nameJa&&item.id&&item.priority);
  assert.equal(ids.has(item.id),false,item.id);
  ids.add(item.id);
  // Once implemented, update the inventory rather than claiming it is still missing.
  assert.equal(Object.hasOwn(data.lines,item.id),false,item.id+' is no longer missing; reconcile inventory');
 }
 for(const id of manifest.databaseOnlyCentral){
  assert.equal(Object.hasOwn(data.lines,id),false,'JR Central frontend still missing: '+id);
 }
 for(const id of manifest.verifiedTopologyBranches){
  assert.deepEqual(data.lines[id]?.stations?.length,2,id);
  assert.equal(data.lines[id].timetableDataStatus,'station_topology_only',id);
 }
});
test('known frontend-only JR IDs remain visible until registry reconciliation',()=>{
 for(const id of manifest.frontendOnlyKnown)assert.ok(data.lines[id],id);
 assert.equal(data.lines.HakataMinami.operator,'JR-West');
});
test('corrected JR branch topology has exactly one edge and valid canonical stations',()=>{
 for(const id of manifest.verifiedTopologyBranches){
  const line=data.lines[id];
  assert.equal(line.durations.length,1,id);
  for(const station of line.stations)assert.ok(data.stations[station],id+':'+station);
  assert.equal(line.branchOf&&Boolean(data.lines[line.branchOf]),true,id);
 }
});
