-- Six November 2026 full-stop official JR-West services, 7 calendar rows.
-- Source: each official per-train detail URL is preserved as A-grade evidence.
-- Only 1340S is daily; all other services below are Sat/Holiday only.
-- The weekday and Sat/Holiday versions are separate canonical timetable IDs.
BEGIN;
SELECT pg_advisory_xact_lock(26110922);
SELECT setval(pg_get_serial_sequence('public.evidence_sources','id'),
  GREATEST((SELECT coalesce(max(id),0) FROM public.evidence_sources),
           (SELECT last_value FROM public.evidence_sources_id_seq)),true);
DO $import$
DECLARE
 stations text[] := ARRAY['Nishiwaki-Shi','Taki','Takino','Sha-Machi','Aono-Ke-Hara','Kawai-Nishi','Aou','Onochou','Shijou','Yakujin','Kanno','Hioka','Kakogawa']::text[];
 spec record;
 tid bigint;
 cid bigint;
 proof_id bigint;
 expected_count int;
 date_list date[];
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
     WHERE line_key='KakogawaLine') NOT IN (91,98)
 THEN RAISE EXCEPTION 'Kakogawa source count drift before official Nov trains'; END IF;
 FOR spec IN SELECT * FROM (VALUES
  ('1326S','odpt.Calendar:SaturdayHoliday','https://timetable.jr-odekake.net/train-timetable/65201?date=20261128',ARRAY[NULL,'07:27','07:30','07:34','07:37','07:40','07:44','07:50','07:53','07:59','08:03','08:07','08:11']::text[],ARRAY['07:24','07:28','07:30','07:34','07:38','07:41','07:46','07:50','07:54','08:00','08:04','08:08',NULL]::text[]),
  ('1328S','odpt.Calendar:SaturdayHoliday','https://timetable.jr-odekake.net/train-timetable/65231?date=20261128',ARRAY[NULL,'07:56','07:58','08:03','08:06','08:09','08:12','08:17','08:20','08:26','08:30','08:34','08:38']::text[],ARRAY['07:53','07:57','07:59','08:03','08:07','08:09','08:14','08:17','08:21','08:27','08:31','08:35',NULL]::text[]),
  ('1330S','odpt.Calendar:SaturdayHoliday','https://timetable.jr-odekake.net/train-timetable/65261?date=20261128',ARRAY[NULL,'08:25','08:27','08:31','08:35','08:37','08:41','08:45','08:49','08:54','08:58','09:02','09:06']::text[],ARRAY['08:21','08:25','08:27','08:31','08:35','08:38','08:42','08:46','08:49','08:55','08:59','09:03',NULL]::text[]),
  ('1332S','odpt.Calendar:SaturdayHoliday','https://timetable.jr-odekake.net/train-timetable/65321?date=20261128',ARRAY[NULL,'09:44','09:46','09:50','09:54','09:57','10:00','10:05','10:09','10:14','10:18','10:22','10:26']::text[],ARRAY['09:40','09:44','09:46','09:51','09:54','09:57','10:02','10:06','10:09','10:15','10:19','10:23',NULL]::text[]),
  ('1340S','odpt.Calendar:Weekday','https://timetable.jr-odekake.net/train-timetable/65411?date=20261128',ARRAY[NULL,'13:48','13:50','13:55','13:58','14:01','14:05','14:10','14:14','14:19','14:24','14:27','14:31']::text[],ARRAY['13:45','13:49','13:51','13:55','13:59','14:02','14:07','14:11','14:15','14:20','14:24','14:28',NULL]::text[]),
  ('1340S','odpt.Calendar:SaturdayHoliday','https://timetable.jr-odekake.net/train-timetable/65411?date=20261128',ARRAY[NULL,'13:48','13:50','13:55','13:58','14:01','14:05','14:10','14:14','14:19','14:24','14:27','14:31']::text[],ARRAY['13:45','13:49','13:51','13:55','13:59','14:02','14:07','14:11','14:15','14:20','14:24','14:28',NULL]::text[]),
  ('1350S','odpt.Calendar:SaturdayHoliday','https://timetable.jr-odekake.net/train-timetable/65531?date=20261128',ARRAY[NULL,'18:58','19:00','19:05','19:10','19:13','19:17','19:21','19:25','19:30','19:34','19:38','19:42']::text[],ARRAY['18:55','18:59','19:01','19:07','19:11','19:14','19:18','19:22','19:25','19:31','19:35','19:39',NULL]::text[])
 ) AS v(number,calendar,url,arrival,departure)
 LOOP
   IF cardinality(spec.arrival)<>13 OR cardinality(spec.departure)<>13
    OR cardinality(stations)<>13 OR spec.arrival[1] IS NOT NULL
    OR spec.departure[13] IS NOT NULL
   THEN RAISE EXCEPTION 'Kakogawa invalid official stop series %',spec.number; END IF;
   SELECT count(*) INTO expected_count
    FROM public.manual_timetable_templates t
    WHERE t.line_key='KakogawaLine' AND t.calendar_urn=spec.calendar
      AND t.train_number=spec.number;
   IF expected_count>1 THEN RAISE EXCEPTION 'Duplicate Kakogawa % %',spec.number,spec.calendar; END IF;
   INSERT INTO public.evidence_sources(source_key,source_url,source_type,evidence_grade,notes)
   VALUES('jrwest-kakogawa-2611-'||lower(spec.number)||'-'||
      CASE WHEN spec.calendar='odpt.Calendar:Weekday' THEN 'weekday' ELSE 'holiday' END,
      spec.url,'official','A','2026 November complete 13 station clocks, explicitly scoped calendar; not a vehicle/position proof')
   ON CONFLICT(source_key) DO UPDATE SET source_url=EXCLUDED.source_url
   RETURNING id INTO proof_id;
   IF expected_count=1 THEN
     -- Immutable import, no overwrite when migrations are reapplied.
     CONTINUE;
   END IF;
   date_list := ARRAY(
    SELECT d::date FROM generate_series('2026-11-01'::date,'2026-11-30'::date,interval '1 day') d
    WHERE CASE WHEN spec.calendar='odpt.Calendar:Weekday'
     THEN extract(isodow from d)::int BETWEEN 1 AND 5
       AND d::date NOT IN ('2026-11-03'::date,'2026-11-23'::date)
     ELSE extract(isodow from d)::int IN (6,7)
       OR d::date IN ('2026-11-03'::date,'2026-11-23'::date)
     END
   );
   INSERT INTO public.manual_timetable_templates
    (line_key,calendar_urn,train_number,railway_urn,direction_urn,train_type_urn,
     destination_urns,source_path,source_occurrence,source_revision_date,operating_dates)
   VALUES('KakogawaLine',spec.calendar,spec.number,
    'odpt.Railway:JR-West.KakogawaLine','odpt.RailDirection:Inbound',
    'odpt.TrainType:JR-West.Local',
    ARRAY['odpt.Station:JR-West.KakogawaLine.Kakogawa']::text[],
    'official-202611:jrwest-kakogawa-'||lower(spec.number)||'-'||
       CASE WHEN spec.calendar='odpt.Calendar:Weekday' THEN 'weekday' ELSE 'saturdayholiday' END,
    0,'2026-10-03'::date,date_list)
   RETURNING id INTO tid;
   INSERT INTO public.manual_timetable_template_stops
    (template_id,stop_sequence,arrival_station_urn,departure_station_urn,
     arrival_clock,departure_clock)
   SELECT tid,(st.i-1)::int,
     CASE WHEN st.arrival IS NOT NULL THEN 'odpt.Station:JR-West.KakogawaLine.'||st.station END,
     CASE WHEN st.departure IS NOT NULL THEN 'odpt.Station:JR-West.KakogawaLine.'||st.station END,
     st.arrival,st.departure
   FROM unnest(stations,spec.arrival,spec.departure)
        WITH ORDINALITY AS st(station,arrival,departure,i);
   INSERT INTO public.train_timetables
    (canonical_key,calendar_urn,primary_train_number,lead_source_template_id,
     group_evidence,timetable_validity,source_revision_date)
   VALUES('source:'||tid,spec.calendar,spec.number,tid,'source_only',
         'date_verified','2026-10-03'::date)
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
      'public_number_calendar_direction_only',proof_id)
    ON CONFLICT(source_template_id) DO NOTHING;
   END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='KakogawaLine')<>98
 OR (SELECT count(*) FROM public.published_jrwest_kakogawa_2611_public_number_map)<>49
 OR EXISTS(SELECT 1 FROM public.manual_timetable_templates t
    LEFT JOIN public.train_timetable_members m ON t.id=m.source_template_id
    WHERE t.line_key='KakogawaLine' AND m.source_template_id IS NULL)
 THEN RAISE EXCEPTION 'Kakogawa verified 2611 timetable import postcondition failed'; END IF;
END $import$;
UPDATE public.published_timetable_coverage_audit
 SET template_count=98,checked_at=now(),coverage_status='sparse_review',
 issues=ARRAY[
  'MISSING_OFFICIAL_PUBLIC_NUMBER_TRIPS_IN_BOTH_DIRECTIONS',
  'SATURDAY_HOLIDAY_OFFICIAL_NUMBER_GAPS_31',
  'WEEKDAY_OFFICIAL_TIMETABLE_INCOMPLETE',
  'UNDATED_LEGACY_STOP_CLOCKS_NOT_CURRENT_VERIFIED'
 ]::text[]
 WHERE line_key='KakogawaLine';
COMMIT;
