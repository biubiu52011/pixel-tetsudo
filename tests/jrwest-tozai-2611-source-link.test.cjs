'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const migration=read('supabase/migrations/20261109061000_jrwest_tozai_2611_junction_fleet_refs.sql');

test('JR-West official 207 and 321 fleet applies only as JR Tozai corridor reference',()=>{
 const scope={window:{},console:{debug(){}}};
 vm.runInNewContext(read('data/core/major-vehicle-fleet-presets.js'),scope);
 for(const line of ['JRTozai','Gakkentoshi']){
   const p=scope.window.MajorVehicleFleetPresets.lookup(line,'JR-West','odpt.TrainType:JR-West.Local');
   assert.deepEqual(Array.from(p.vehicleCandidates),['JR西日本207系','JR西日本321系']);
   assert.equal(p.evidenceRole,'route-fleet-reference');
   assert.equal(p.iconPath||'', '', 'fleet cannot assign any PNG');
 }
 assert.match(read('data/core/major-vehicle-fleet-presets.js'),
   /jrwest-gakkentoshi[^\n]+JRTozai[^\n]+\n[^\n]+https:\/\/www\.jr-odekake\.net\/railroad\/service\/train-woman\.html/);
 const d=JSON.parse(read('data/core/railway_data.json'));
 assert.equal(d.lines.JRTozai.operator,'JR-West');
 assert.equal(d.lines.JRTozai.stations.length,9);
 assert.equal(d.lines.Tozai.operator,'TokyoMetro');
 assert.notEqual(d.lines.JRTozai,d.lines.Tozai);
});
test('five independently checked Gakkentoshi source IDs are only JR Tozai through-service evidence',()=>{
 for(const id of [41568,41569,41436,41440,41441])
   assert.match(migration,new RegExp('\\('+id+'::bigint,'));
 for(const v of ['4622C','4622CH','4526M','5420M','5420MH'])
   assert.ok(migration.includes("'"+v+"'"));
 for(const uri of ['/190231?date=20261029','/191551?date=20261027',
   '/70241?date=20261023','/70951?date=20261101'])
   assert.ok(migration.includes(uri));
 assert.match(migration,/st\.stop_sequence=0 AND st\.arrival_clock=v\.arrival/);
 assert.match(migration,/m\.calendar_urn=v\.calendar/);
 assert.match(migration,/m\.train_number=v\.source_number/);
 assert.match(migration,/<>5 THEN/);
 assert.match(migration,/vehicle_type text NULL CHECK \(vehicle_type IS NULL\)/);
 assert.match(migration,/vehicle_png_path text NULL CHECK \(vehicle_png_path IS NULL\)/);
 assert.match(migration,/actual_vehicle_confirmed boolean NOT NULL DEFAULT false/);
 assert.match(migration,/partial_source_only/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.doesNotMatch(migration,/UPDATE\s+(?:public\.)?train_timetable_(?:stops|lines|members|vehicle_mappings)/i);
 assert.doesNotMatch(migration,/INSERT INTO\s+public\.train_timetable_(?:stops|lines|members|vehicle_mappings)/i);
});


test('bidirectional canonical source-link migration retains 13 evidence-only services and renumbering',()=>{
 const sql=read('supabase/migrations/20261109070000_jrwest_tozai_2611_both_direction_source_links.sql');
 const ids=[41344,41345,41346,41347,41375,41376,41364,41340];
 for(const id of ids) assert.ok(sql.includes('('+id+'::bigint,'), 'source template '+id);
 assert.equal(new Set(ids).size,8);
 for(const number of ['5421M','5421MH','5423M','5423MH','5491M',
   '5491MH','5953M','5727C','4527C'])
   assert.ok(sql.includes("'"+number+"'"),'train number '+number);
 assert.match(sql,/RENAME COLUMN previous_kyobashi_departure TO kyobashi_departure_clock/);
 assert.match(sql,/RENAME COLUMN junction_station_urn TO source_boundary_station_urn/);
 assert.match(sql,/RENAME COLUMN junction_arrival_clock TO source_boundary_arrival_clock/);
 assert.match(sql,/traversal_direction='Gakkentoshi_to_JRTozai'/);
 assert.match(sql,/continued_as_train_number='4527C'/);
 assert.match(sql,/s\.stop_sequence=\(SELECT max\(last\.stop_sequence\)/);
 assert.match(sql,/s\.arrival_clock=p\.kyobashi_arrival/);
 assert.match(sql,/s\.departure_clock=p\.kyobashi_departure/);
 assert.match(sql,/m\.calendar_urn=p\.cal/);
 assert.match(sql,/m\.train_number=p\.source_number/);
 assert.match(sql,/<>13 THEN/);
 assert.match(sql,/<>8 THEN/);
 assert.match(sql,/<>5 THEN/);
 assert.doesNotMatch(sql, /INSERT INTO\s+public\.train_timetable_(?:stops|lines|members|vehicle_mappings)/i);
 assert.doesNotMatch(sql, /UPDATE\s+public\.manual_timetable_templates/i);
 assert.doesNotMatch(sql, /SET\s+actual_vehicle_confirmed\s*=\s*true/i);
});
