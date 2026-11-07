'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const migration=fs.readFileSync(
  'supabase/migrations/20261107195000_jrwest_sagano_2611_source_fleet_and_verified_clocks.sql',
  'utf8');
const api=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');

test('SaninMain scoped reference coverage excludes the far-west Sanin Main line',()=>{
  assert.match(migration, /'Kyoto'=ANY\(stop_keys\) OR 'Sonobe'=ANY\(stop_keys\)/);
  assert.match(migration, /corridor_scope='kyoto_sonobe_full'\)<>16/);
  assert.match(migration, /corridor_scope='kyoto_short_turn'\)<>4/);
  assert.match(migration, /corridor_scope='sonobe_north_only'\)<>3/);
  assert.match(migration, /count\(\*\) FROM public\.manual_timetable_templates WHERE line_key='SaninMain'\)<>53/);
  assert.match(api, /lineId==="SaninMain"&&\/\^2026-11-/);
  assert.match(api, /expectedFleet=selectedCalendar==="odpt\.Calendar:Weekday"\?13:10/);
});

test('only six independently matched original full-stop schedules may be date verified',()=>{
  assert.match(migration, /CREATE OR REPLACE VIEW public\.published_jrwest_sagano_2611_clock_evidence/);
  assert.match(migration, /WITH \(security_invoker=true\)/);
  assert.match(migration, /source_stops_md5/);
  assert.match(migration, /published_jrwest_sagano_2611_verified_source_clocks\)<>6/);
  assert.match(api, /clock\.verified_source_match!==true/);
  assert.match(api, /originals\.some\(\(original:any,i:number\)=>/);
  assert.match(api, /sqlTime\(original\.departure_clock\)!==stops\[i\]\.departure_time/);
  assert.match(api, /run\.timetable_validity="date_verified"/);
  assert.match(api, /expectedFleet=selectedCalendar/);
  assert.match(api, /\(clockProofs\|\|\[\]\)\.length!==3/);
});

test('2217M rapid must become 2133M local at Sonobe without inventing a new vehicle',()=>{
  assert.match(migration, /continuation_number text NULL CHECK\(continuation_number IS NULL OR continuation_number='2133M'\)/);
  assert.match(migration, /continuation_station text NULL CHECK\(continuation_station IS NULL OR continuation_station='Sonobe'\)/);
  assert.match(migration, /continuation_number='2133M'\)<>2/);
  assert.match(api, /run\.published_number_scope="first_segment_only"/);
  assert.match(api, /run\.published_train_number_segments=\[/);
  assert.match(api, /st\.published_arrival_train_number=i<=pivot\?"2217M":"2133M"/);
  assert.match(api, /st\.published_departure_train_number=i<pivot\?"2217M":"2133M"/);
  assert.match(api, /from_station_key:"Sonobe",to_station_key:"Fukuchiyama"/);
});

test('fleet candidates are references and cannot grant real vehicles or artwork',()=>{
  assert.match(migration, /actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK\(NOT actual_vehicle_confirmed\)/);
  assert.match(migration, /authorizes_png boolean NOT NULL DEFAULT false CHECK\(NOT authorizes_png\)/);
  assert.match(migration, /candidate_png_paths text\[\] NOT NULL DEFAULT ARRAY\[\]::text\[\] CHECK\(candidate_png_paths=ARRAY\[\]::text\[\]\)/);
  assert.match(api, /run\.vehicle_type_label=null/);
  assert.match(api, /run\.vehicle_artwork_path=null/);
  assert.match(api, /run\.vehicle_plan_confirmed=false/);
  assert.match(api, /referenceOnly:true,numberDateVerified:false/);
  assert.doesNotMatch(migration,/\bUPDATE\s+(?:public\.)?manual_timetable_templates\b/i);
});


test('browser timetable adapter carries station-specific published number evidence',()=>{
  const adapter=fs.readFileSync('data/api/odpt-unified.js','utf8');
  assert.match(adapter, /"_sqlPublishedTrainNumberSegments":run\.timetable_date_verified===true/);
  assert.match(adapter, /"_sqlPublishedNumberScope":run\.timetable_date_verified===true/);
  assert.match(adapter, /"_sqlPublishedArrivalTrainNumber"/);
  assert.match(adapter, /"_sqlPublishedDepartureTrainNumber"/);
  assert.match(adapter, /run\.published_train_number_segments\.length===2/);
});

test('train estimator displays Sagano published numbers only with dated SQL proof',()=>{
  const estimator=fs.readFileSync('js/train-position-estimator.js','utf8');
  assert.match(estimator, /lineId==="SaninMain"&&/);
  assert.match(estimator, /saganoRef\.source==="sql-jrwest-sagano-2611-source-family"/);
  assert.match(estimator, /tt\._sqlTrainNumberVerification==="official-2611-sagano-original-source-stop-clock"/);
  assert.match(estimator, /saganoRef\.stopClocksVerified===true/);
  assert.match(estimator, /saganoDisplayNumber=afterSonobe\?"2133M":"2217M"/);
  assert.match(estimator, /displayTrainNumber:saganoDisplayNumber \|\|/);
  assert.match(estimator, /officialNumberVerified: Boolean\(saganoDisplayNumber\)/);
  assert.match(estimator, /var _saganoScoped=!!saganoScoped&&vehResult\.identityStatus!=="EXACT"/);
  assert.match(estimator, /vehicleIconPath: \(_saganoScoped\|\|_koseiScoped/);
});
