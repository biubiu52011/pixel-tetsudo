'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='data/core/';
const d=JSON.parse(fs.readFileSync(root+'railway_data.json','utf8'));
const i=JSON.parse(fs.readFileSync(root+'station_i18n.json','utf8'));
const splits=[
 {old:'Kanda',id:'Kanda-Fukuoka',ja:'苅田',lines:['Nippo']},
 {old:'Kasuga',id:'Kasuga-Fukuoka',ja:'春日',lines:['KagoshimaMain','KagoshimaMainJB']},
 {old:'Koga',id:'Koga-Fukuoka',ja:'古賀',lines:['KagoshimaMain','KagoshimaMainJA']},
 {old:'Araki',id:'Araki-Fukuoka',ja:'荒木',lines:['KagoshimaMain','KagoshimaMainJB']}
];
test('Kyushu same-ID collisions have independent station identities and positions',()=>{
  for(const s of splits){
    assert.ok(d.stations[s.old],s.old);
    assert.ok(d.stations[s.id],s.id);
    assert.notDeepEqual(d.stations[s.id],d.stations[s.old],s.id);
    assert.equal(i[s.id]?.ja,s.ja);
    for(const lang of ['ja','zh','ko','en'])assert.ok(i[s.id]?.[lang],s.id+':'+lang);
    for(const lineId of s.lines){
      const line=d.lines[lineId],index=line.stations.indexOf(s.id);
      assert.ok(index>=0,s.id+' missing on '+lineId);
      assert.ok(!line.stations.includes(s.old),s.old+' was not migrated on '+lineId);
      assert.equal(d.lineStationOrder[lineId][s.id],index);
      assert.ok(!Object.hasOwn(d.lineStationOrder[lineId],s.old));
      assert.ok(d.stationLines[s.id].includes(lineId));
      assert.ok(!d.stationLines[s.old].includes(lineId));
    }
  }
  assert.equal(d.name_map['神田'],'Kanda');
  assert.equal(d.name_map['苅田'],'Kanda-Fukuoka');
  assert.equal(d.name_map['古河'],'Koga');
  assert.equal(d.name_map['古賀'],'Koga-Fukuoka');
  assert.equal(d.name_map['新木'],'Araki');
  assert.equal(d.name_map['荒木'],'Araki-Fukuoka');
});
test('published bundle data are deterministic mirrors of the readable sources',()=>{
  for(const [name,globalKey,file] of [
    ['railway_data','RAILWAY_DATA','railway-data.file.js'],
    ['station_i18n','RAILWAY_I18N','station-i18n.file.js']]){
    const raw=fs.readFileSync(root+name+'.json','utf8');
    const compact=JSON.stringify(JSON.parse(raw));
    assert.equal(fs.readFileSync(root+name+'.compact.json','utf8'),compact+'\n');
    assert.equal(fs.readFileSync(root+file,'utf8'),'window.'+globalKey+' = '+compact+';\n');
  }
});
test('qualified ODPT railway IDs still resolve scoped aliases in realtime',()=>{
  const source=fs.readFileSync('js/data-fusion.js','utf8');
  assert.match(source,/var _railwayAliasCode = String\(railwayName \|\| ""\)\.split\("\."\)\.pop\(\)/);
  assert.match(source,/var _scopedStationAliases/);
  assert.match(source,/Object\.prototype\.hasOwnProperty\.call\(_scopedStationAliases,stationKey\)/);
});
test('ODPT station-token compatibility stays line-scoped',()=>{
  for(const file of ['data/core/runtime-config.js','data/core/data-config-bundle.js']){
    const source=fs.readFileSync(file,'utf8');
    for(const s of splits)assert.ok(source.includes('"'+s.old+'": "'+s.id+'"'),file+' '+s.id);
  }
  const sql=fs.readFileSync('supabase/migrations/20261109053000_kyushu_station_identity_split.sql','utf8');
  for(const s of splits)assert.ok(sql.includes("'"+s.id+"'"),s.id);
  assert.ok(!/UPDATE\s+public\.manual_timetable_templates/i.test(sql));
});
