-- Audit-only, replay-safe correction for conventional rail published plans.
-- No timetable, dated train, vehicle type or stop is inserted/deleted.
-- Official JR East Nov 2026 reference for Tsurumi-Okawa:
-- https://timetables.jreast.co.jp/2611/timetable/tt0311/0311010.html
-- https://timetables.jreast.co.jp/2611/timetable/tt0311/0311011.html
-- https://timetables.jreast.co.jp/2611/timetable-v/661d2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/661u2.html
-- JR East Kawagoe station sample incompleteness:
-- https://timetables.jreast.co.jp/2611/timetable/tt0711/0711011.html
-- https://timetables.jreast.co.jp/2611/timetable/tt0525/0525011.html
BEGIN;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='TsurumiOkawa')<>24
 OR EXISTS (
 SELECT 1 FROM (VALUES ('odpt.Calendar:Weekday','odpt.RailDirection:Inbound',9),
                       ('odpt.Calendar:Weekday','odpt.RailDirection:Outbound',9),
                       ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound',3),
                       ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound',3)
 ) v(cal,dir,n)
 LEFT JOIN (SELECT calendar_urn,direction_urn,count(*) n FROM manual_timetable_templates
            WHERE line_key='TsurumiOkawa' GROUP BY 1,2) x
 ON x.calendar_urn=v.cal AND x.direction_urn=v.dir
 WHERE x.n IS DISTINCT FROM v.n)
 THEN RAISE EXCEPTION 'Okawa source counts changed; re-audit required'; END IF;
 IF (SELECT count(*) FROM manual_timetable_templates m
 JOIN manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='TsurumiOkawa' AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND m.direction_urn='odpt.RailDirection:Inbound' AND s.stop_sequence=0
 AND coalesce(s.departure_clock,s.arrival_clock) IN ('07:36','08:22','18:14'))<>3
 THEN RAISE EXCEPTION 'Okawa published weekend station time changed'; END IF;
 IF (SELECT count(*) FROM manual_timetable_templates m
 JOIN manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='TsurumiOkawa' AND m.calendar_urn='odpt.Calendar:Weekday'
 AND m.direction_urn='odpt.RailDirection:Inbound' AND s.stop_sequence=0
 AND coalesce(s.departure_clock,s.arrival_clock) IN ('07:18','07:56','08:23','08:51','17:28','18:03','18:54','19:44','20:29'))<>9
 THEN RAISE EXCEPTION 'Okawa published weekday station time changed'; END IF;
 IF (SELECT count(*) FROM manual_timetable_templates b
 JOIN train_timetable_members bm ON bm.source_template_id=b.id
 WHERE b.line_key='ChiyodaBranch' AND EXISTS (
   SELECT 1 FROM train_timetable_members cm
   JOIN manual_timetable_templates main ON main.id=cm.source_template_id
   WHERE cm.timetable_id=bm.timetable_id AND main.line_key='Chiyoda' AND main.calendar_urn=b.calendar_urn
 ))<>238
 OR (SELECT count(*) FROM manual_timetable_templates WHERE line_key='ChiyodaBranch')<>238
 THEN RAISE EXCEPTION 'Chiyoda alias mapping changed'; END IF;
 IF (SELECT count(*) FROM manual_timetable_templates WHERE line_key='Kawagoe')<>5
 OR (SELECT count(*) FROM manual_timetable_templates WHERE line_key='SaninMain')<>53
 OR (SELECT count(*) FROM manual_timetable_templates WHERE line_key='SanyoMain')<>58
 THEN RAISE EXCEPTION 'Other conventional source data changed'; END IF;
END $$;
UPDATE published_timetable_coverage_audit a SET coverage_status='calendar_review',
issues=(SELECT array_agg(DISTINCT f ORDER BY f) FROM unnest(
 array_remove(a.issues,'LOW_TEMPLATE_COUNT_NEEDS_EXTERNAL_BASELINE')
 || ARRAY['JR_EAST_202611_OKAWA_BASELINE_9_PLUS_9_WEEKDAY_3_PLUS_3_HOLIDAY_MATCH','SOURCE_MONTH_202611_NOT_LIFETIME_VALIDITY','CANONICAL_SOURCE_REVISION_NOT_DATE_VERIFIED']::text[]) f),
checked_at=now() WHERE line_key='TsurumiOkawa';
UPDATE published_timetable_coverage_audit a SET coverage_status='calendar_review',
issues=(SELECT array_agg(DISTINCT f ORDER BY f) FROM unnest(
 array_remove(a.issues,'BRANCH_HAS_ONLY_KITAAYASE_DIRECTION')
 || ARRAY['ALIAS_238_OF_238_SHARED_CANONICAL_WITH_CHIYODA','KITAAYASE_DIRECTION_ONLY_IN_BRANCH_SOURCE','REVERSE_BRANCH_DIRECTION_DERIVED_FROM_CHIYODA_MAIN_BY_API','DO_NOT_SUM_BRANCH_ALIAS_AS_ADDITIONAL_PHYSICAL_TRAINS','SOURCE_REVISION_UNVERIFIED']::text[]) f),
checked_at=now() WHERE line_key='ChiyodaBranch';
UPDATE published_timetable_coverage_audit a SET
issues=(SELECT array_agg(DISTINCT f ORDER BY f) FROM unnest(a.issues||
 ARRAY['JR_EAST_202611_STATION_SCHEDULE_HAS_MANY_MORE_THAN_5_SAMPLE_TRAINS','MUST_REMAIN_SAMPLED_UNTIL_LICENSED_FULL_REFERENCE']::text[]) f),
checked_at=now() WHERE line_key='Kawagoe' AND coverage_status='sampled';
UPDATE published_timetable_coverage_audit a SET
issues=(SELECT array_agg(DISTINCT f ORDER BY f) FROM unnest(a.issues||
 ARRAY['MULTIPLE_LONG_DISTANCE_SECTIONS_REQUIRE_PER_CORRIDOR_BASELINE','LOW_HOLIDAY_RATIO_NOT_SUFFICIENT_PROOF_OF_MISSING_TRAINS','SOURCE_REVISION_UNVERIFIED']::text[]) f),
checked_at=now() WHERE line_key IN ('SaninMain','SanyoMain') AND coverage_status='sparse_review';
COMMIT;
