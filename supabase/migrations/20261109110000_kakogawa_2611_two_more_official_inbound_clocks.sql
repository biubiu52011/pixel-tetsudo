-- JR West 2026-11: two independently verified public inbound trips,
-- 1324S SaturdayHoliday, 1344S daily (two calendar templates).
-- Scope: source-backed 13 stops, number, service day, no physical carset/position claim.
-- https://timetable.jr-odekake.net/train-timetable/65181?date=20261128
-- https://timetable.jr-odekake.net/train-timetable/65471?date=20261128
-- Do not replicate the 80-train timetable or infer missing trains from historical SQL.
BEGIN;
SELECT pg_advisory_xact_lock(26110932);
DO $import$
DECLARE
 stations text[] := ARRAY['Nishiwaki-Shi','Taki','Takino','Sha-Machi','Aono-Ke-Hara','Kawai-Nishi','Aou','Onochou','Shijou','Yakujin','Kanno','Hioka','Kakogawa']::text[];
 spec record;
 tid bigint;
 cid bigint;
 proof_id bigint;
 found integer;
 days date[];
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
     WHERE line_key='KakogawaLine') NOT IN (98,101) THEN
   RAISE EXCEPTION 'Kakogawa source count drift prior to 1324/1344 import';
 END IF;
 FOR spec IN SELECT * FROM (VALUES
  ('1324S','odpt.Calendar:SaturdayHoliday','https://timetable.jr-odekake.net/train-timetable/65181?date=20261128',ARRAY[NULL,'07:02','07:04','07:08','07:12','07:15','07:18','07:23','07:26','07:32','07:37','07:41','07:45']::text[],ARRAY['06:59','07:03','07:05','07:09','07:13','07:15','07:19','07:23','07:27','07:33','07:38','07:41',NULL]::text[]),
  ('1344S','odpt.Calendar:Weekday','https://timetable.jr-odekake.net/train-timetable/65471?date=20261128',ARRAY[NULL,'15:48','15:50','15:55','15:58','16:01','16:05','16:10','16:14','16:19','16:24','16:27','16:31']::text[],ARRAY['15:45','15:49','15:51','15:55','15:59','16:02','16:07','16:11','16:15','16:20','16:24','16:28',NULL]::text[]),
  ('1344S','odpt.Calendar:SaturdayHoliday','https://timetable.jr-odekake.net/train-timetable/65471?date=20261128',ARRAY[NULL,'15:48','15:50','15:55','15:58','16:01','16:05','16:10','16:14','16:19','16:24','16:27','16:31']::text[],ARRAY['15:45','15:49','15:51','15:55','15:59','16:02','16:07','16:11','16:15','16:20','16:24','16:28',NULL]::text[])
 ) AS v(number,calendar,url,arrival,departure)
 LOOP
   IF cardinality(spec.arrival)<>13 OR cardinality(spec.departure)<>13 OR
      spec.arrival[1] IS NOT NULL OR spec.departure[13] IS NOT NULL
   THEN RAISE EXCEPTION 'Invalid station clocks for %',spec.number; END IF;
   SELECT count(*) INTO found FROM public.manual_timetable_templates
    WHERE line_key='KakogawaLine' AND train_number=spec.number
      AND calendar_urn=spec.calendar;
   IF found>1 THEN RAISE EXCEPTION 'Duplicate numbered source: %',spec.number; END IF;
   INSERT INTO public.evidence_sources
    (source_key,source_url,source_type,evidence_grade,notes)
   VALUES ('jrwest-kakogawa-2611-'||lower(spec.number)||'-'||
     CASE WHEN spec.calendar='odpt.Calendar:Weekday' THEN 'weekday'
          ELSE 'holiday' END,
     spec.url,'official','A',
     '2026-11 official per-train full stop clocks; vehicle and live position NOT proven')
   ON CONFLICT(source_key) DO UPDATE
     SET source_url=EXCLUDED.source_url
   RETURNING id INTO proof_id;
   IF found=1 THEN
     IF NOT EXISTS (SELECT 1 FROM public.manual_timetable_templates t
       WHERE t.line_key='KakogawaLine' AND t.calendar_urn=spec.calendar
         AND t.train_number=spec.number AND t.source_revision_date='2026-10-03'
         AND t.source_path LIKE 'official-202611:jrwest-kakogawa-%'
         AND (SELECT count(*) FROM public.manual_timetable_template_stops s
              WHERE s.template_id=t.id)=13)
     THEN RAISE EXCEPTION 'Kakogawa source exists but not verified: %',spec.number;
     END IF;
     CONTINUE;
   END IF;
   days:=ARRAY(
     SELECT d::date FROM generate_series('2026-11-01'::date,'2026-11-30'::date,
       interval '1 day') d
     WHERE CASE WHEN spec.calendar='odpt.Calendar:Weekday'
       THEN extract(isodow FROM d)::int BETWEEN 1 AND 5
            AND d::date NOT IN ('2026-11-03'::date,'2026-11-23'::date)
       ELSE extract(isodow FROM d)::int IN (6,7)
            OR d::date IN ('2026-11-03'::date,'2026-11-23'::date)
       END
   );
   INSERT INTO public.manual_timetable_templates
    (line_key,calendar_urn,train_number,railway_urn,direction_urn,
     train_type_urn,destination_urns,source_path,source_occurrence,
     source_revision_date,operating_dates)
   VALUES ('KakogawaLine',spec.calendar,spec.number,
    'odpt.Railway:JR-West.KakogawaLine','odpt.RailDirection:Inbound',
    'odpt.TrainType:JR-West.Local',
    ARRAY['odpt.Station:JR-West.KakogawaLine.Kakogawa']::text[],
    'official-202611:jrwest-kakogawa-'||lower(spec.number)||'-'||
    CASE WHEN spec.calendar='odpt.Calendar:Weekday' THEN 'weekday'
         ELSE 'saturdayholiday' END,0,'2026-10-03'::date,days)
   RETURNING id INTO tid;
   INSERT INTO public.manual_timetable_template_stops
     (template_id,stop_sequence,arrival_station_urn,departure_station_urn,
      arrival_clock,departure_clock)
   SELECT tid,(st.idx-1)::int,
     CASE WHEN st.arr IS NULL THEN NULL ELSE 'odpt.Station:JR-West.KakogawaLine.'||st.station END,
     CASE WHEN st.dep IS NULL THEN NULL ELSE 'odpt.Station:JR-West.KakogawaLine.'||st.station END,
     st.arr,st.dep
   FROM unnest(stations,spec.arrival,spec.departure)
        WITH ORDINALITY AS st(station,arr,dep,idx);
   INSERT INTO public.train_timetables
     (canonical_key,calendar_urn,primary_train_number,lead_source_template_id,
      group_evidence,timetable_validity,source_revision_date)
   VALUES('source:'||tid,spec.calendar,spec.number,tid,
     'source_only','date_verified','2026-10-03'::date)
   RETURNING id INTO cid;
   INSERT INTO public.train_timetable_members
     (source_template_id,timetable_id,segment_order,member_role,
      first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
   VALUES(tid,cid,0,'primary',0,12,0,false);
   IF spec.calendar='odpt.Calendar:SaturdayHoliday' THEN
     INSERT INTO public.published_jrwest_kakogawa_2611_public_number_map
       (source_template_id,calendar_urn,source_train_label,public_train_number,
        verification_scope,evidence_source_id)
     VALUES(tid,spec.calendar,spec.number,spec.number,
       'public_number_calendar_direction_only',proof_id);
   END IF;
 END LOOP;
END $import$;
UPDATE public.published_timetable_coverage_audit SET
  template_count=101,checked_at=now(),coverage_status='sparse_review',
  issues=ARRAY[
    'MISSING_OFFICIAL_PUBLIC_NUMBER_TRIPS_IN_BOTH_DIRECTIONS',
    'SATURDAY_HOLIDAY_OFFICIAL_NUMBER_GAPS_29',
    'WEEKDAY_OFFICIAL_TIMETABLE_INCOMPLETE',
    'UNDATED_LEGACY_STOP_CLOCKS_NOT_CURRENT_VERIFIED'
  ]::text[]
 WHERE line_key='KakogawaLine';
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='KakogawaLine')<>101
 OR (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_public_number_map)<>51
 OR (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_holiday_mapping_audit WHERE mapping_status='missing_stop_template')<>29
 OR (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_holiday_mapping_audit WHERE mapping_status='public_number_mapped')<>51
 OR (SELECT count(*) FROM public.manual_timetable_templates t
     JOIN public.train_timetable_members m ON m.source_template_id=t.id
     JOIN public.train_timetables c ON c.id=m.timetable_id
     WHERE t.line_key='KakogawaLine' AND c.timetable_validity='date_verified')<>11
 THEN RAISE EXCEPTION 'Kakogawa 1324/1344 verified source postcondition failed';
 END IF;
END $verify$;
COMMIT;
