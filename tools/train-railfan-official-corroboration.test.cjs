'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const sql=fs.readFileSync('supabase/migrations/20261030130459_railfan_source_registry_and_official_sonic_two_stop_crosscheck_20261030.sql','utf8');
// Fan-source tracking is separate from the official-source assertions.
assert.ok(sql.includes('community_railway_evidence_registry'));
for(const site of ['t-take.com/jrw/index.html','tetsudouunyou.wepage.com/jrtetsudounyou','207hd.com/post-45366/'])
 assert.ok(sql.includes(site), 'missing original railfan source '+site);
assert.ok(sql.includes('SPECIFIC_CLAIM_CONTRADICTED'));
assert.ok(sql.includes('DISCOVERY_ONLY'));
assert.ok(sql.includes('PARTIAL_OFFICIAL_CORROBORATION'));
assert.ok(sql.includes('exact_vehicle_authorized boolean NOT NULL DEFAULT false CHECK (exact_vehicle_authorized = false)'));
assert.ok(sql.includes('sonic_official_timetable_anchors'));
assert.ok(sql.includes('sonic_legacy_official_time_crosscheck'));
assert.ok(sql.includes('OFFICIAL_2_STOP_CROSSCHECK'));
for(const [train,series] of [['3001M','JR九州883系'],['3005M','JR九州885系'],
 ['3010M','JR九州885系'],['3031M','JR九州883系']]){
 assert.ok(sql.includes("'"+train+"'"));
 assert.ok(sql.includes("'"+series+"'"));
}
for(const p of ['00013201.html','00013601.html','00070101.html','00015001.html'])
 assert.ok(sql.includes(p),'source URL missing '+p);
assert.ok(sql.includes('station_a_kind') && sql.includes('station_b_kind'));
assert.ok(sql.includes('EXISTS (') && sql.includes('public.train_timetable_stops'));
assert.ok(sql.includes("t.timetable_validity='undated_not_current_verified'"));
assert.ok(sql.includes('TWO_STOPS_AND_RUN_NUMBER_MATCH_UNDATED'));
assert.ok(sql.includes('false AS actual_vehicle_confirmed'));
assert.ok(sql.includes('NULL::text AS exact_png_path'));
assert.ok(sql.includes('REVOKE ALL ON rail_audit.community_railway_evidence_registry'));
assert.ok(sql.includes(' rail_audit.sonic_official_timetable_anchors,'));
assert.ok(sql.includes(' rail_audit.sonic_legacy_official_time_crosscheck'));
assert.doesNotMatch(sql,/\bUPDATE\s+(?:public\.)?train_runs\b/i);
assert.doesNotMatch(sql,/\bUPDATE\s+(?:public\.)?train_timetables\b/i);
assert.doesNotMatch(sql,/\bINSERT\s+INTO\s+(?:public\.)?train_timetable_vehicle_mappings\b/i);
console.log('Fan source quarantine + official Sonic 2-stop undated candidate: PASS');
