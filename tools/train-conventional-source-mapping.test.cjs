'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const base='supabase/migrations/';
const fleet=fs.readFileSync(base+
 '20261030121254_official_conventional_seibu_jrwest_jrkyushu_plan_fleet_20261030.sql','utf8');
const quarantine=fs.readFileSync(base+
 '20261030121401_quarantine_seibu_yamaguchi_8500_only_obsolete_candidate_20261030.sql','utf8');
const audit=fs.readFileSync(base+
 '20261030121430_audit_source_scoped_conventional_timetable_fleet_plans_20261030.sql','utf8');
for(const name of ['PLAN:OFFICIAL-SHINJUKU-REDARROW','PLAN:OFFICIAL-HAIJIMA-LINER',
                   'PLAN:OFFICIAL-SHINJUKU-HAIJIMA-LINER',
                   'PLAN:OFFICIAL-YAMAGUCHI-MIXED-FLEET',
                   'PLAN:OFFICIAL-NIPPO-SONIC','PLAN:OFFICIAL-KAGOSHIMA-SONIC',
                   'PLAN:OFFICIAL-SANYO-YAKUMO'])
  assert.ok(fleet.includes(name),'missing official fleet rule '+name);
for(const model of ['西武10000系','西武40000系','西武8500系','西武L00系',
                    'JR九州883系','JR九州885系','JR西日本273系'])
  assert.ok(fleet.includes(model),'missing sourced model '+model);
assert.match(fleet,/jr-odekake\.net\/railroad\/service\/train-woman/);
assert.match(fleet,/seiburailway\.jp\/cs\/faq\/reservedtrain/);
assert.match(fleet,/jrkyushu\.co\.jp\/trains\/sp\/sonic/);
assert.match(fleet,/candidateLabelsAny/);
assert.match(fleet,/planOnly/);
assert.doesNotMatch(fleet,/\bUPDATE\s+(?:public\.)?train_runs\b/i);
assert.match(quarantine,/SeibuYamaguchi/);
assert.match(quarantine,/8500系（レオライナー、新型導入中）/);
assert.match(quarantine,/THEN NULL::text/);
assert.match(quarantine,/THEN 'unresolved'::text/);
assert.match(quarantine,/seibu_yamaguchi_legacy_single_type/);
assert.match(audit,/official_conventional_timetable_plans/);
assert.match(audit,/candidateLabelsAny/);
assert.match(audit,/train_type_urn/);
assert.match(audit,/PLANNED_FLEET_UNVERIFIED_TIMETABLE/);
assert.match(audit,/false AS actual_vehicle_confirmed/);
assert.match(audit,/NULL::text AS exact_png_path/);
assert.match(audit,/REVOKE ALL/);

// Execute the actual runtime resolver; no false Laview identity or borrowed PNGs.
let js=fs.readFileSync('js/train-vehicle.js','utf8');
const injection='window.__testPlanResolution = resolveTimetableVehiclePlan;\nwindow.TrainVehicle = {';
assert.ok(js.includes('window.TrainVehicle = {'));
js=js.replace('window.TrainVehicle = {',injection);
const browser={};
vm.runInNewContext(js,{window:browser,console:{debug(){},warn(){},error(){}}},
 {filename:'js/train-vehicle.js',timeout:10000});
const resolve=browser.TrainVehicle.resolveCanonicalVehicle;
const plan=browser.__testPlanResolution;
assert.equal(resolve('40000系（Laview）'),null,'wrong Seibu Laview alias must stay removed');
const l00=resolve('西武L00系');
assert.ok(l00);
assert.deepEqual(Array.from(l00.lineIds),['SeibuYamaguchi']);
assert.equal(l00.asset,null);
assert.equal(l00.candidateOnly,true);
const singleL00=plan('西武L00系',{operator:'Seibu',lineId:'SeibuYamaguchi'});
assert.equal(singleL00.status,'PLANNED_MODEL');
assert.match(singleL00.iconPath,/L00系_れおけい\.png$/);
const mixed=plan('西武8500系 / 西武L00系',
 {operator:'Seibu',lineId:'SeibuYamaguchi'});
assert.equal(mixed.status,'PLANNED_CANDIDATES');
assert.deepEqual(Array.from(mixed.models),['西武8500系','西武L00系']);
assert.equal(mixed.iconPath,'','two possible models cannot select a single image');
const sonic=plan('JR九州883系 / JR九州885系',
 {operator:'JR-Kyushu',lineId:'Nippo'});
assert.equal(sonic.status,'PLANNED_CANDIDATES');
assert.equal(sonic.iconPath,'');
const west=plan('JR西日本323系',{operator:'JR-West',lineId:'OsakaLoop'});
assert.equal(west.status,'PLANNED_MODEL');
assert.equal(west.iconPath,'','unavailable native image cannot be invented');
assert.equal(resolve('JR九州883系').asset,null);
assert.equal(resolve('JR九州885系').asset,null);
console.log('Conventional-line official source and no-guessing contract: PASS');
