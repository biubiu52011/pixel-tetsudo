'use strict';
// Representative fallback times: 05:12 Tobu-Dobutsu-Koen -> 05:48 Tatebayashi
// (2026-11 transfer/timetable), then official Tobu train 303E:
// 05:01 Tatebayashi -> 06:00 Isesaki (2026-03-14 timetable).
// These are reference intervals, not substitutes for per-train SQL stop_times.
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const d=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const L=d.lines;
const joined=(id,other,station)=>Boolean(
  (L[id].throughServices||[]).includes(other) &&
  (L[id].serviceBoundaries||[]).some(b=>b.lineId===other && b.handoverStations.includes(station))
);
test('canonical data matches generated compact and file bundle',()=>{
 const canonical=JSON.stringify(d);
 assert.equal(fs.readFileSync('data/core/railway_data.compact.json','utf8'),canonical+'\n');
 assert.equal(fs.readFileSync('data/core/railway-data.file.js','utf8'),
   'window.RAILWAY_DATA = '+canonical.replace(/<\/script/gi,'<\\/script')+';\n');
});
test('Goshi is a geolocated Isesaki station',()=>{
 assert.equal(L.TobuIsesaki.stations[23],'Goshi');
 assert.ok(d.stations.Goshi);
 assert.ok(Math.abs(d.stations.Goshi.lat-36.295515)<0.00001);
 assert.ok(Math.abs(d.stations.Goshi.lng-139.2238014)<0.00001);
});
test('Isesaki fallback spans the line with evidenced representative durations',()=>{
 const a=L.TobuIsesaki;
 assert.equal(a.stations.length,26);
 assert.equal(a.durations.length,a.stations.length);
 assert.equal(a.durations[25],0,'terminal has no outgoing interval');
 assert.equal(a.durations.slice(0,10).reduce((x,y)=>x+y,0),36);
 assert.equal(a.durations.slice(10,25).reduce((x,y)=>x+y,0),59);
 assert.equal(a.durations.slice(0,25).reduce((x,y)=>x+y,0),a.durationTotalMin);
});
test('Skytree through corridors fork north; the northern lines do not through-run each other',()=>{
 for(const [from,to,at] of [
  ['TobuIsesaki','TobuSkytree','Tobu-Dobutsu-Koen'],
  ['TobuSkytree','TobuIsesaki','Tobu-Dobutsu-Koen'],
  ['TobuNikko','TobuSkytree','Tobu-Dobutsu-Koen'],
  ['TobuSkytree','TobuNikko','Tobu-Dobutsu-Koen'],
  ['TobuIsesaki','Kiryu','Ota'],['Kiryu','TobuIsesaki','Ota'],
  ['TobuIsesaki','Sano','Tatebayashi'],['Sano','TobuIsesaki','Tatebayashi']
 ])assert.ok(joined(from,to,at),from+' -> '+to+' @ '+at);
 assert.ok(!L.TobuIsesaki.throughServices.includes('TobuNikko'));
 assert.ok(!L.TobuNikko.throughServices.includes('TobuIsesaki'));
});
