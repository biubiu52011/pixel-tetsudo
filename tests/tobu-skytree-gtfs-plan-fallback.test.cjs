'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const sql=fs.readFileSync('supabase/migrations/20261113183000_tobu_skytree_tokyogtfs_plan_fallback.sql','utf8');
const edge=fs.readFileSync('supabase/functions/train-runs/index.ts','utf8');
const sharedSql=fs.readFileSync('supabase/migrations/20261113191000_tobu_noda_tokyogtfs_plan_fallback.sql','utf8');
const feed='bb1bf605817e7a3a65caffbcd019843aa0ffd5cb3b2c9fbb0444c8b3072ff87f';

test('TobuSkytree promotion locks exactly 1738 GTFS trips and 20860 stops',()=>{
 assert.match(sql,/count\(\*\).*?<> 1738/s);
 assert.match(sql,/stop_count <> 20860/);
 assert.match(sql,/service_id='Weekday'\) <> 909/);
 assert.match(sql,/service_id='SaturdayHoliday'\) <> 829/);
 assert.match(sql,/source_only','undated_not_current_verified'/);
 assert.match(sql,/vehicle_type_label,source_path/);
 assert.match(sql,/NULL::text, v_source/);
 assert.match(sql,/source_occurrence/);
 assert.match(sql,/train_timetable_members/);
});
test('date-scoped private RPC prevents service calendar and stale-feed leakage',()=>{
 assert.match(sql,/tobu_skytree_active_gtfs_trip_ids\(p_service_date date\)/);
 assert.match(sql,/service_exceptions ex/);
 assert.match(sql,/ex\.exception_type=1/);
 assert.match(sql,/p_service_date BETWEEN f\.service_start AND f\.service_end/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.tobu_skytree_active_gtfs_trip_ids\(date\)/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.tobu_skytree_active_gtfs_trip_ids\(date\)\s+TO service_role/);
 assert.match(edge,/db\.rpc\("tobu_tokyogtfs_active_trip_ids"/);
 assert.match(edge,/tobuGtfsActiveTripIds\?\.has\(String\(t\.source_trip_id\)\)/);
 assert.match(sharedSql,/tobu_tokyogtfs_active_trip_ids\(/);
 assert.match(sharedSql,/WHEN 'TobuSkytree' THEN 'Tobu.TobuSkytree'/);
 assert.match(edge,/t\.source_path === tobuGtfsSource/);
 assert.ok(sql.includes(feed) && edge.includes(feed));
});
test('preserve public train number independently from unverified stock labels',()=>{
 assert.match(sql,/regexp_replace\(t\.train_number/);
 assert.match(sql,/Tobu\.THLiner/);
 assert.match(sql,/Tobu\.LimitedExpress/);
 assert.match(sql,/Tobu\.SectionSemiExpress/);
 assert.doesNotMatch(sql,/vehicle_type_label.*?東武60000系/s);
});
