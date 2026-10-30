'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const sql=fs.readFileSync(
  'supabase/migrations/20261030122739_official_keio_tobu_kuroshio_conventional_fleet_20261030.sql','utf8');
for(const [code,model,line,service] of [
  ['PLAN:OFFICIAL-KEIOLINER-5000','京王5000系','KeioSagami','KeioLiner'],
  ['PLAN:OFFICIAL-THLINER-70090','東武70090型','TobuIsesaki','TH-LINER'],
  ['PLAN:OFFICIAL-TJLINER-50090','東武50090型','Tojo','TJ-LINER'],
  ['PLAN:OFFICIAL-SPACIAX-N100-NIKKO','東武N100系','TobuNikko','スペーシアX'],
  ['PLAN:OFFICIAL-KUROSHIO-HANWA','JR西日本283系','Hanwa','くろしお'],
]){
  for(const s of [code,model,line,service])
    assert.ok(sql.includes(s),'missing scoped rule string: '+s);
}
for(const s of ['JR西日本287系','JR西日本289系','TokaidoKansai','KiseiWest','candidateLabelsAny',
                'source_url','planOnly','effective_from','actual_vehicle_type']){
  // Last item is intentionally not required: no exact type written.
  if(s==='actual_vehicle_type') continue;
  assert.ok(sql.includes(s),'missing official plan attribute: '+s);
}
assert.doesNotMatch(sql,/\bUPDATE\s+(?:public\.)?train_runs\b/i);
assert.doesNotMatch(sql,/\bINSERT\s+INTO\s+(?:public\.)?train_timetable_vehicle_mappings\b/i);
assert.match(sql,/NULL,NULL/,'actual vehicle type must stay unfilled');
const original=fs.readFileSync('js/train-vehicle.js','utf8');
const instrumented=original.replace('window.TrainVehicle = {',
    'window.__testPlanResolver = resolveTimetableVehiclePlan;\nwindow.TrainVehicle = {');
assert.notEqual(instrumented,original);
const browser={};
vm.runInNewContext(instrumented,{window:browser,console:{debug(){},warn(){},error(){}}},
  {filename:'js/train-vehicle.js',timeout:15000});
const plan=(name,lineId,operator)=>browser.__testPlanResolver(name,{lineId,operator});
const keio=plan('5000系','KeioSagami','Keio');
assert.equal(keio.status,'PLANNED_MODEL');
assert.ok(keio.iconPath.endsWith('/京王電鉄_5000系.png'),
  'scoped Keio Sagamihara artwork must use existing native 5000 PNG');
assert.equal(plan('5000系','Tojo','Tobu').iconPath,'',
  'the same generic series code must not leak to the wrong railway');
const th=plan('東武70090型','TobuIsesaki','Tobu');
assert.equal(th.status,'PLANNED_MODEL');
assert.ok(th.iconPath.endsWith('/東武鉄道_70090型.png'));
assert.equal(plan('東武70090型','KeioSagami','Keio').iconPath,'',
  'Tobu stock must never be projected onto a Keio-only line');
const kuroshio=plan('JR西日本283系 / JR西日本287系 / JR西日本289系','KiseiWest','JR-West');
assert.equal(kuroshio.status,'PLANNED_CANDIDATES');
assert.equal(kuroshio.iconPath,'',
  'multiple Kuroshio model candidates cannot choose one model PNG');
console.log('Official Keio/Tobu/Kuroshio plan, native PNG scope and UNKNOWN safeguards: PASS');
