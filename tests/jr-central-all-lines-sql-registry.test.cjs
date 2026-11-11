'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const canonical=require('../data/core/railway_data.compact.json');
const i18n=require('../data/core/station_i18n.json');
const sql=fs.readFileSync('supabase/migrations/20261111110000_jr_central_all_conventional_station_registry_and_import.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const png=fs.readFileSync('data/timetables/train-number-png-ranges.js','utf8');

const counts={"TokaidoCentral":84,"ChuoCentral":40,"Gotemba":19,"Minobu":39,"Iida":94,"Takayama":45,"Taita":8,"Taketoyo":10,"KansaiCentral":18,"KiseiCentral":41,"Sangu":11,"Meisho":15,"MinoAkasaka":3};
const suffixes={"TokaidoCentral":"Tokaido","ChuoCentral":"Chuo","Gotemba":"Gotemba","Minobu":"Minobu","Iida":"Iida","Takayama":"Takayama","Taita":"Taita","Taketoyo":"Taketoyo","KansaiCentral":"Kansai","KiseiCentral":"Kisei","Sangu":"Sangu","Meisho":"Meisho","MinoAkasaka":"MinoAkasaka"};
const lines=Object.keys(counts);

test('the audited JR-Central operator includes exactly 13 conventional topology owners plus Shinkansen',()=>{
  assert.equal(lines.length,13);
  assert.equal(canonical.lines.TokaidoShinkansen.operator,'JR-Central');
  assert.equal(canonical.lines.TokaidoShinkansen.stations.length,17);
  assert.deepEqual(
    Object.keys(canonical.lines).filter(k=>canonical.lines[k].operator==='JR-Central').sort(),
    [...lines,'TokaidoShinkansen'].sort());
});
test('every conventional line has complete unique source station order; 11 are backfilled, 2 unchanged',()=>{
  let additions=0;
  for(const line of lines){
    const actual=canonical.lines[line];
    assert.equal(actual.operator,'JR-Central',line);
    assert.equal(actual.stations.length,counts[line],line);
    assert.equal(new Set(actual.stations).size,counts[line],line);
    assert.ok(actual.stations.every(st=>i18n[st]&&i18n[st].ja),line+' names');
    assert.ok(sql.includes("('"+line+"',"+counts[line]+",'"+suffixes[line]+"')"),line+' importer');
    if(line==='ChuoCentral'||line==='TokaidoCentral') continue;
    additions+=counts[line];
    for(const [index,station] of actual.stations.entries()){
      assert.ok(sql.includes("('"+line+"', "+index+", '"+station+"')"),line+' '+index);
    }
  }
  assert.equal(additions,303);
  assert.match(sql,/CREATE TEMP TABLE _jrc_expected_stations/);
  assert.match(sql,/JRC_ALL_LINES_STATION_BASELINE_CONFLICT/);
  assert.match(sql,/JRC_ALL_LINES_STATION_VERIFY_FAILED/);
  assert.match(sql,/ON CONFLICT \(line_key\) DO NOTHING/);
  assert.doesNotMatch(sql,/INSERT INTO public\.stations\b/);
  assert.doesNotMatch(sql,/INSERT INTO public\.manual_timetable_templates\s*\(/);
});
test('SQL importer is evidence-scoped, date-validating, invoker-only and cross-operator safe',()=>{
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.import_jr_central_authorized_plan/);
  assert.match(sql,/LANGUAGE plpgsql SECURITY INVOKER/);
  assert.match(sql,/JRC_PLAN_SOURCE_RIGHTS_UNVERIFIED/);
  assert.match(sql,/JRC_PLAN_EDITION_NOT_DATED/);
  assert.match(sql,/JRC_PLAN_SERVICE_CALENDAR_CONFLICT/);
  assert.match(sql,/JRC_PLAN_CONFLICTING_TRAIN_DATES/);
  assert.match(sql,/JRC_PLAN_TAKAYAMA_CROSS_BORDER_OPERATOR_UNVERIFIED/);
  assert.match(sql,/ls\.station_index>36/);
  assert.match(sql,/v_type NOT IN \('Local','Rapid','SectionRapid','SpecialRapid','LimitedExpress'\)/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.import_jr_central_authorized_plan\(text,jsonb\)/);
  assert.match(sql,/coverage_status='sampled'/);
});
test('Edge source selects only line/railway/date-verified JR-Central conventional imports',()=>{
  const start=edge.indexOf('let selected = revision?.unavailable ? [] : await pages(');
  const rule=edge.indexOf('if (timetableOperator === "JR-Central" && lineId !== "TokaidoShinkansen")',start);
  const next=edge.indexOf('if (selected.length || revision)',rule);
  assert.ok(start>=0&&rule>start&&next>rule);
  const gate=edge.slice(rule,next);
  assert.match(gate,/t\.line_key === lineId/);
  assert.match(gate,/t\.railway_urn === "odpt\.Railway:JR-Central\." \+ railwayCode/);
  assert.match(gate,/Array\.isArray\(t\.operating_dates\)/);
  assert.match(gate,/String\(day\)\.slice\(0, 10\) === serviceDate/);
  assert.match(gate,/lineId === "KansaiCentral" \? "Kansai"/);
  assert.match(gate,/lineId === "KiseiCentral" \? "Kisei"/);
  assert.match(png,/if\(!m\|\|number!==String\(p\.trainNumber\|\|""\)\.trim\(\)\.toUpperCase\(\)/);
});
