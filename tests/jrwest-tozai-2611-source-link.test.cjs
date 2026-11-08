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
