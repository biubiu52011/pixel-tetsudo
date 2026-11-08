-- One dated 2026-11 WEEKDAY Friday Kounotori 25 (7025M) sample.
-- JR-West: https://timetable.jr-odekake.net/train-timetable/200071?date=20261114
-- '11月29日までの金・土曜・休日運転'.
-- Reuse the existing, manually reconciled 68168 11-stop Osaka--Fukuchiyama
-- source; no bulk copy of other JR timetable content or extra false runs.
BEGIN;
SELECT pg_advisory_xact_lock(26110840);
DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>387
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id=2611087025001)<>0
 OR (SELECT count(*) FROM public.train_timetables WHERE id=2611087025001)<>0
 OR (SELECT count(*) FROM public.manual_timetable_templates WHERE id=68168
       AND train_number='7025MH' AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress'
       AND cardinality(operating_dates)=11
       AND direction_urn='odpt.RailDirection:Outbound')<>1
 OR (SELECT count(*) FROM public.manual_timetable_template_stops
       WHERE template_id=68168)<>11
 OR (SELECT count(*) FROM public.manual_timetable_templates
       WHERE line_key='Fukuchiyama' AND train_number='7025M')<>0
 THEN RAISE EXCEPTION 'Kounotori Friday source not suitable for canonical clone';
 END IF;
END $guard$;

INSERT INTO public.manual_timetable_templates (
 id,line_key,calendar_urn,train_number,railway_urn,direction_urn,
 train_type_urn,destination_urns,vehicle_type_label,source_path,
 source_occurrence,source_revision_date,revision_id,operating_dates)
OVERRIDING SYSTEM VALUE
SELECT 2611087025001,m.line_key,'odpt.Calendar:Weekday','7025M',
 m.railway_urn,m.direction_urn,m.train_type_urn,m.destination_urns,
 NULL,'official-sampled:fukuchiyama:2611:7025M-friday',0,NULL,NULL,
 ARRAY['2026-11-06','2026-11-13','2026-11-20','2026-11-27']::date[]
FROM public.manual_timetable_templates m WHERE m.id=68168;

INSERT INTO public.manual_timetable_template_stops (
 template_id,stop_sequence,arrival_station_urn,departure_station_urn,
 arrival_clock,departure_clock)
SELECT 2611087025001,stop_sequence,arrival_station_urn,
 departure_station_urn,arrival_clock,departure_clock
FROM public.manual_timetable_template_stops
WHERE template_id=68168 ORDER BY stop_sequence;

INSERT INTO public.train_timetables (
 id,canonical_key,calendar_urn,primary_train_number,
 lead_source_template_id,group_evidence,timetable_validity)
VALUES (2611087025001,'source:2611087025001',
 'odpt.Calendar:Weekday','7025M',2611087025001,
 'source_only','undated_not_current_verified');

INSERT INTO public.train_timetable_members(
 source_template_id,timetable_id,segment_order,member_role,
 first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
VALUES (2611087025001,2611087025001,0,'primary',0,10,0,false);

DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Fukuchiyama')<>388
 OR (SELECT count(*) FROM public.published_jrwest_fukuchiyama_2611_source_fleet)<>357
 OR (SELECT count(*) FROM public.manual_timetable_templates
       WHERE id=2611087025001
         AND train_number='7025M'
         AND calendar_urn='odpt.Calendar:Weekday'
         AND train_type_urn='odpt.TrainType:JR-West.LimitedExpress'
         AND cardinality(operating_dates)=4)<>1
 OR (SELECT count(*) FROM public.train_timetable_stops
       WHERE source_template_id=2611087025001)<>11
 OR (SELECT count(*) FROM public.train_timetable_lines
       WHERE timetable_id=2611087025001 AND line_key='Fukuchiyama')<>1
 OR (SELECT count(*) FROM public.train_timetable_source_resolution
       WHERE source_template_id=2611087025001
         AND group_evidence='source_only')<>1
 OR (SELECT count(*) FROM public.manual_timetable_template_stops a
       FULL JOIN public.manual_timetable_template_stops b
         ON a.stop_sequence=b.stop_sequence AND b.template_id=68168
       WHERE a.template_id=2611087025001
         AND (a.arrival_station_urn,a.departure_station_urn,
              a.arrival_clock,a.departure_clock)
             IS DISTINCT FROM
             (b.arrival_station_urn,b.departure_station_urn,
              b.arrival_clock,b.departure_clock))<>0
 THEN RAISE EXCEPTION '7025M Friday canonical sample failed validation';
 END IF;
END $verify$;
COMMIT;
