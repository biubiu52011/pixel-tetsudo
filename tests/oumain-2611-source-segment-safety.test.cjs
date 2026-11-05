'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync(
 'supabase/migrations/20261106111500_oumain_yamagata_2611_legacy_source_scope_audit.sql',
 'utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const fleets=fs.readFileSync('data/core/major-vehicle-fleet-presets.js','utf8');
test('1075 historical source segments retain source identity, not number uniqueness',()=>{
 for(const term of [
  'published_oumain_2611_source_scope','source_template_id bigint PRIMARY KEY',
  '1075','776','299','historical_not_2611_verified','historical_source_only',
  'actual_vehicle_confirmed boolean NOT NULL DEFAULT false',
  'png_reference text CHECK(png_reference IS NULL)',
  'akita_shinkansen_shared','yamagata_shinkansen_shared',
  'insufficient_source_stops','gono_resort_through',
  'oga_accum_through','tsugaru_limited_express_candidate',
  'yamagata_regional_mixed_stock','regional_diesel_or_special'])
  assert.ok(sql.includes(term),'Missing SQL source contract: '+term);
 assert.ok(!sql.includes('UNIQUE(line_key,calendar_urn,direction_urn,train_number)'),
  'Split through-service trains must not collapse onto one number');
});
test('new E723 is a candidate on Yamagata, not a number-derived set or logo',()=>{
 assert.ok(sql.includes("ARRAY['701系5500番台','719系5000番台','E723系5000番台']"));
 assert.ok(fleets.includes("'E723系5000番台'"));
 assert.ok(fleets.includes("'719系5000番台'"));
 assert.ok(edge.includes('proof.png_reference!==null'));
 assert.ok(edge.includes('run.vehicle_artwork_path=null'));
 assert.ok(edge.includes('officialNumberVerified:false'));
 assert.ok(edge.includes('actualVehicleConfirmed:false'));
});
test('shared Shinkansen/resort and unusable source segments cannot pose as ordinary trains',()=>{
 for(const term of [
  'OU_2611_SOURCE_SCOPE_UNAVAILABLE','OU_2611_OGA_THROUGH_PROOF_UNAVAILABLE',
  'source_template_id','scopeCount','insufficient_source_stops',
  'akita_shinkansen_shared','yamagata_shinkansen_shared',
  'gono_resort_through','result.splice(i,1);continue;',
  'proof.source_stop_keys','oga.calendar_scope!=="sql_rail_service"',
  'excluded.includes(serviceDate)||changed.includes(serviceDate)',
  'serviceDate==="2026-11-09"||serviceDate==="2026-11-10"',
  'run.vehicle_type_label=null',
  'run.train_number_verification="historical-source-only-ou-2611"'])
  assert.ok(edge.includes(term),'Missing server admission: '+term);
});

test('dated YOKOTE festival and 9463M sources do not become daily trains',()=>{
 const dates=fs.readFileSync('supabase/migrations/'+
  '20261106151000_oumain_2611_official_feb_snow_and_nov_9463_date_filter.sql','utf8');
 const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
 for(const term of ['9459M','9463M','2026-11-02','2026-11-03',
  '2026-11-04','190611.html','187971.html',
  "verified_november_operating_dates='{}'::date[]"])
  assert.ok(dates.includes(term),'Missing official date proof: '+term);
 assert.ok(edge.includes('proof.verified_november_operating_dates!==null'));
 assert.ok(edge.includes('!dates.some((date:any)=>String(date).slice(0,10)===serviceDate)'));
 assert.ok(edge.includes('service_date_source_url'));
});
