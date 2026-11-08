'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const base='data/core/';
const d=JSON.parse(fs.readFileSync(base+'railway_data.json','utf8'));
const i=JSON.parse(fs.readFileSync(base+'station_i18n.json','utf8'));
const members=['KakogawaLine','ShintetsuAo','HojoRailway'];
const lines={ShintetsuAo:20,HojoRailway:8};

test('Ao station has three real lines and reciprocal transfers',()=>{
  assert.deepEqual(new Set(d.stationLines.Aou),new Set(members));
  const expected={KakogawaLine:['ShintetsuAo','HojoRailway'],
     ShintetsuAo:['KakogawaLine','HojoRailway'],
     HojoRailway:['KakogawaLine','ShintetsuAo']};
  for(const [id,peers] of Object.entries(expected)){
    const a=d.lines[id].transferStations.filter(t=>t.station==='Aou');
    assert.deepEqual(new Set(a.map(t=>t.lineId)),new Set(peers),id);
    for(const t of a){
      assert.equal(t.type,'in');
      assert.ok(!t.toStation || t.toStation==='Aou');
    }
  }
  assert.deepEqual(d.stations.Aou,{lat:34.857253,lng:134.909487});
});

test('both newly mapped lines have complete ordered physical stations and bounded geometry',()=>{
  for(const [lineId,count] of Object.entries(lines)){
    const line=d.lines[lineId], order=d.lineStationOrder[lineId];
    assert.equal(line.stations.length,count);
    assert.equal(new Set(line.stations).size,count);
    assert.equal(line.durations.length,count-1);
    assert.equal(line.durationTotalMin,line.durations.reduce((a,b)=>a+b,0));
    assert.equal(line.timetableDataStatus,'station_topology_only');
    assert.ok(/^https:\/\//.test(line.durationReference));
    line.stations.forEach((station,index)=>{
      assert.equal(order[station],index);
      assert.ok(d.stationLines[station].includes(lineId),station+':'+lineId);
      const coord=d.stations[station],languages=i[station];
      assert.ok(coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lng),station);
      assert.ok(coord.lat>34.70 && coord.lat<34.95 && coord.lng>134.80 && coord.lng<135.16,station);
      for(const lang of ['ja','en','zh','ko'])assert.ok(languages?.[lang],station+':'+lang);
    });
  }
  assert.equal(d.lines.ShintetsuAo.stations.at(0),'Suzurandai');
  assert.equal(d.lines.ShintetsuAo.stations.at(-1),'Aou');
  assert.equal(d.lines.HojoRailway.stations.at(0),'Aou');
  assert.equal(d.lines.HojoRailway.stations.at(-1),'Hojo-Machi');
});

test('same-named stations on separate networks retain different identities',()=>{
  const cases=[
    ['Kizu-Kobe','Kizu'],
    ['Midorigaoka-Kobe','Midorigaoka'],
    ['Ono-Hyogo','Ono'],
    ['Ichiba-Kobe','Shijou'],
    ['Ebisu-Kobe','Ebisu']
  ];
  for(const [a,b] of cases){
    assert.notDeepEqual(d.stations[a],d.stations[b],a);
    assert.notEqual(a,b);
    assert.ok(!d.stationLines[a].some(l=>d.stationLines[b].includes(l)),a);
  }
  assert.equal(d.name_map['木津'],'Kizu');
  assert.equal(d.name_map['木津（神戸電鉄）'],'Kizu-Kobe');
  assert.equal(d.name_map['市場'],'Shijou');
  assert.equal(d.name_map['市場（神戸電鉄）'],'Ichiba-Kobe');
});

test('SQL is the same 20+8 station roster, no fake realtime sources',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261109095000_ao_three_operator_line_stations.sql','utf8');
  assert.match(sql,/SELECT pg_advisory_xact_lock/);
  for(const id of Object.keys(lines))assert.ok(sql.includes("'"+id+"'"));
  for(const lineId of Object.keys(lines)){
    for(const station of d.lines[lineId].stations)
      assert.ok(sql.includes("('"+lineId+"','"+station+"',"),lineId+':'+station);
  }
  assert.match(sql,/false,false,false/);
  assert.match(sql,/timetable_api_enabled/);
  assert.match(sql,/realtime_position_api_enabled/);
});

test('canonical generated compact and file bundles have exactly matching facts',()=>{
  for(const [name,globalKey,target] of [
    ['railway_data','RAILWAY_DATA','railway-data.file.js'],
    ['station_i18n','RAILWAY_I18N','station-i18n.file.js']]){
    const bytes=fs.readFileSync(base+name+'.json','utf8');
    const compact=JSON.stringify(JSON.parse(bytes));
    assert.equal(fs.readFileSync(base+name+'.compact.json','utf8'),compact+'\n');
    assert.equal(fs.readFileSync(base+target,'utf8'),'window.'+globalKey+' = '+compact+';\n');
    const blob=fs.readFileSync(base+name+'.compact.json');
    const hash=crypto.createHash('sha1').update('blob '+blob.length+'\0').update(blob).digest('hex').slice(0,12);
    assert.ok(fs.readFileSync(base+'db-loader.js','utf8').includes(name+'.compact.json?v='+hash),name);
  }
});
