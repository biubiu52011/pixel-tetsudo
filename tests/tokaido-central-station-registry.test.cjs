'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const d=JSON.parse(fs.readFileSync('data/core/railway_data.json','utf8'));
const i=JSON.parse(fs.readFileSync('data/core/station_i18n.json','utf8'));
const expected=[
  [24,'Shimada','JRC-TokaidoCentral-025','SanyoMain',[34.83015,138.173425]],
  [26,'Kikukawa','JRC-TokaidoCentral-027','Shinjuku',[34.761757,138.085572]],
  [80,'Kashiwara','JRC-TokaidoCentral-081','KansaiMain',[35.344595,136.402325]]
];
test('JR Central uses physical station IDs without hijacking same-name JR/Metro stations',()=>{
  const line=d.lines.TokaidoCentral;
  assert.equal(line.operator,'JR-Central');
  assert.equal(line.stations.length,84);
  assert.equal(new Set(line.stations).size,84);
  assert.deepEqual(line.stations,d.lineStationOrder.TokaidoCentral);
  for(const [index,oldId,newId,otherLine,[lat,lng]] of expected){
    assert.equal(line.stations[index],newId);
    assert.ok(!line.stations.includes(oldId),oldId);
    assert.ok(d.lines[otherLine].stations.includes(oldId),otherLine);
    assert.ok(!d.stationLines[oldId].includes('TokaidoCentral'));
    assert.deepEqual(d.stationLines[newId],['TokaidoCentral']);
    assert.equal(d.stations[newId].lat,lat);
    assert.equal(d.stations[newId].lng,lng);
    assert.equal(i[newId].ja,i[oldId].ja);
    assert.ok(i[newId].en);
  }
  assert.equal(i['JRC-TokaidoCentral-081'].en,'Kashiwabara');
});
test('SQL path follows JR East station registration and does not invent timetable records',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261110223500_tokaido_central_scoped_station_registry.sql','utf8');
  assert.match(sql,/INSERT INTO public\.stations/);
  assert.match(sql,/INSERT INTO public\.line_stations/);
  assert.match(sql,/ON CONFLICT \(id\) DO NOTHING/);
  assert.match(sql,/TokaidoCentral canonical 84 station registry mismatch/);
  const rows=[...sql.matchAll(/\('TokaidoCentral', (\d+), '(.*?)'\)/g)];
  assert.equal(rows.length,84);
  rows.forEach(([_,idx,id],order)=>{
    assert.equal(Number(idx),order);
    assert.equal(id,d.lines.TokaidoCentral.stations[order]);
  });
  assert.doesNotMatch(sql,/INSERT INTO public\.(manual_timetable_templates|train_runs|train_operation_mappings)/);
  const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
  assert.match(edge,/NO_API_NO_DATA/);
});
test('compact and script bundles stay exact replicas of canonical JSON',()=>{
  const min=JSON.stringify(d);
  const imin=JSON.stringify(i);
  assert.equal(fs.readFileSync('data/core/railway_data.compact.json','utf8'),min+'\n');
  assert.equal(fs.readFileSync('data/core/station_i18n.compact.json','utf8'),imin+'\n');
  assert.equal(fs.readFileSync('data/core/railway-data.file.js','utf8'),
    'window.RAILWAY_DATA = '+min+';\n');
  assert.equal(fs.readFileSync('data/core/station-i18n.file.js','utf8'),
    'window.RAILWAY_I18N = '+imin+';\n');
});
