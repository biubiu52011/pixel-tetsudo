'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const migration=fs.readFileSync(
  'supabase/migrations/20261107211000_jrwest_osaka_higashi_2611_source_fleet_and_selected_clocks.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const adapter=fs.readFileSync('data/api/odpt-unified.js','utf8');
const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');

test('Osaka Higashi historic sources are not falsely presented as a full dated timetable',()=>{
  assert.match(migration, /WHERE line_key='OsakaHigashi'\)<>379/);
  assert.match(migration, /source_fleet\)<>282/);
  assert.match(migration, /public_train_type='Local'\)<>266/);
  assert.match(migration, /public_train_type='DirectRapid'\)<>16/);
  assert.match(migration, /source_stop_count IN\(8,15\)/);
  assert.match(edge, /expected=selectedCalendar==="odpt\.Calendar:Weekday"\?142:140/);
  assert.match(edge, /source-only-osaka-higashi-number-family/);
  assert.match(edge, /suppressedUnverifiedOsakaHigashiSpecialSources/);
  assert.match(edge, /new Set\(\["1091M","7092MH","9024MH"\]\)/);
});

test('published 2026 November number/type proof is scoped to six exact source calendars',()=>{
  assert.match(migration, /WITH \(security_invoker=true\) AS/);
  assert.match(migration, /source_stops_md5/);
  assert.match(migration, /published_jrwest_osaka_higashi_2611_verified_source_clocks\)<>6/);
  assert.match(edge, /clock\.verified_source_match!==true/);
  assert.match(edge, /original\.some\(\(o:any,j:number\)=>/);
  assert.match(edge, /sqlTime\(o\.arrival_clock\)!==stops\[j\]\.arrival_time/);
  assert.match(edge, /run\.train_type=run\.published_train_type/);
  assert.match(edge, /run\.train_number_verification="official-2611-osaka-higashi-source-stop-clock"/);
});

test('holiday H calendar marker stays out of public train number and canonical identity',()=>{
  assert.match(migration, /source_train_number=historical_public_number\|\|'H'/);
  assert.match(adapter, /"_sqlReferencePublicTrainNumber"/);
  assert.match(adapter, /run\.reference_public_train_number\|\|""/);
  assert.match(adapter, /"_sqlPublishedTrainNumber":run\.timetable_date_verified===true/);
  assert.match(estimator, /osakaHigashiDisplayNumber=refNumber/);
  assert.match(estimator, /osakaHigashiDisplayNumber \|\| saganoDisplayNumber/);
  assert.match(estimator, /officialNumberVerified: Boolean\(osakaHigashiOfficialVerified\)/);
  assert.match(estimator, /trainNumber: publicTrainNumber/);
});

test('221 fleet is reference only and cannot force exact carset, PNG or 207/321 nostalgia',()=>{
  assert.match(migration, /candidate_models text\[\] NOT NULL DEFAULT ARRAY\['221系'\]/);
  assert.match(migration, /candidate_png_paths text\[\] NOT NULL DEFAULT ARRAY\[\]::text\[\]/);
  assert.match(migration, /authorizes_png boolean NOT NULL DEFAULT false CHECK\(NOT authorizes_png\)/);
  assert.match(edge, /run\.vehicle_artwork_path=null/);
  assert.match(edge, /run\.vehicle_plan_confirmed=false/);
  assert.match(estimator, /var _osakaHigashiScoped=!!osakaHigashiScoped/);
  assert.match(estimator, /_publishedVehiclePlan=\{\s*status:"UNCONFIRMED_FLEET"/);
  assert.match(estimator, /vehicleIconPath: \(_osakaHigashiScoped\|\|_saganoScoped/);
  assert.doesNotMatch(migration, /\bUPDATE\s+(?:public\.)?manual_timetable_templates\b/i);
});
