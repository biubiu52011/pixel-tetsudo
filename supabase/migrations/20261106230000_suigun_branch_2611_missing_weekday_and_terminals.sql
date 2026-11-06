-- 2026-11 JR-East Suigun Hitachi-Ota branch standalone completion.
-- Genuine official 2611 timetable records, not inferred numbered ranges.
-- Previous main+branch fleet scope already exists; update it, not replace it.
-- Four missing Weekday runs, and 14 officially documented Kami-Sugaya ends.
BEGIN;
SELECT pg_advisory_xact_lock(2611243009);
-- Only 8 actual published inbound stop boundaries. Their source clocks
-- remain untouched; the missing terminal is independently documented.
CREATE TABLE IF NOT EXISTS public.published_suigun_branch_2611_stop_completion_audit(
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'SuigunBranch' CHECK(line_key='SuigunBranch'),
 calendar_urn text NOT NULL,
 train_number text NOT NULL,
 previous_last_clock text NOT NULL,
 published_kami_sugaya_arrival text NOT NULL,
 official_train_url text NOT NULL
);
ALTER TABLE public.published_suigun_branch_2611_stop_completion_audit
 ENABLE ROW LEVEL SECURITY;
CREATE TEMP TABLE _branch_2611_missing_weekday(
 source_id bigint PRIMARY KEY, train_number text, direction text,
 official_url text, canonical_id bigint
) ON COMMIT DROP;
INSERT INTO _branch_2611_missing_weekday VALUES
    (261124300929,'929D','Outbound','https://timetables.jreast.co.jp/2611/train/025/025061.html',261124310929),
    (261124300930,'930D','Inbound','https://timetables.jreast.co.jp/2611/train/025/025181.html',261124310930),
    (261124300931,'931D','Outbound','https://timetables.jreast.co.jp/2611/train/025/025071.html',261124310931),
    (261124300932,'932D','Inbound','https://timetables.jreast.co.jp/2611/train/025/025191.html',261124310932);
CREATE TEMP TABLE _branch_2611_terminal_proof(
 train_number text PRIMARY KEY, last_clock text,
 kami_sugaya_arrival text, official_url text
) ON COMMIT DROP;
INSERT INTO _branch_2611_terminal_proof VALUES
    ('928D','10:21','10:25','https://timetables.jreast.co.jp/2611/train/025/025171.html'),
    ('930D','12:11','12:14','https://timetables.jreast.co.jp/2611/train/025/025181.html'),
    ('932D','13:22','13:25','https://timetables.jreast.co.jp/2611/train/025/025191.html'),
    ('938D','17:41','17:44','https://timetables.jreast.co.jp/2611/train/050/052251.html'),
    ('940D','18:38','18:41','https://timetables.jreast.co.jp/2611/train/085/088771.html'),
    ('944D','20:20','20:24','https://timetables.jreast.co.jp/2611/train/050/052261.html'),
    ('946D','21:21','21:24','https://timetables.jreast.co.jp/2611/train/025/025221.html'),
    ('948D','22:32','22:35','https://timetables.jreast.co.jp/2611/train/025/025231.html');
-- Idempotent, source-qualified correction: never add a guessed extra station
-- to a train without exactly the verified five old stop rows.
INSERT INTO public.published_suigun_branch_2611_stop_completion_audit(
 source_template_id,calendar_urn,train_number,previous_last_clock,
 published_kami_sugaya_arrival,official_train_url)
SELECT t.id,t.calendar_urn,t.train_number,proof.last_clock,
 proof.kami_sugaya_arrival,proof.official_url
FROM public.manual_timetable_templates t
JOIN _branch_2611_terminal_proof proof ON proof.train_number=t.train_number
JOIN public.manual_timetable_template_stops old ON old.template_id=t.id
 AND old.stop_sequence=4
WHERE t.line_key='SuigunBranch'
 AND t.direction_urn='odpt.RailDirection:Inbound'
 AND t.calendar_urn IN(
  'odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
 AND COALESCE(old.arrival_station_urn,old.departure_station_urn)
 = 'odpt.Station:JR-East.Minami-Sakeide'
 AND COALESCE(old.departure_clock,old.arrival_clock)=proof.last_clock
 AND (SELECT count(*) FROM public.manual_timetable_template_stops s
      WHERE s.template_id=t.id)=5
ON CONFLICT(source_template_id) DO NOTHING;
DO $proof$
BEGIN
 IF (SELECT COUNT(*) FROM public.published_suigun_branch_2611_stop_completion_audit) <> 14
 THEN RAISE EXCEPTION 'SuigunBranch 2611 incomplete terminal source proof'; END IF;
END $proof$;
INSERT INTO public.manual_timetable_template_stops (
 template_id,stop_sequence,arrival_station_urn,departure_station_urn,
 arrival_clock,departure_clock)
SELECT a.source_template_id,5,'odpt.Station:JR-East.Kami-Sugaya',
 NULL,a.published_kami_sugaya_arrival,NULL
FROM public.published_suigun_branch_2611_stop_completion_audit a
ON CONFLICT(template_id,stop_sequence) DO NOTHING;
UPDATE public.manual_timetable_templates t
SET destination_urns=ARRAY['odpt.Station:JR-East.Kami-Sugaya']::text[]
FROM public.published_suigun_branch_2611_stop_completion_audit a
WHERE t.id=a.source_template_id
 AND t.destination_urns IS DISTINCT FROM
   ARRAY['odpt.Station:JR-East.Kami-Sugaya']::text[];
-- Source-table rows are fully official, but not a physical rolling-stock
-- observation. Their new canonical IDs remain separate from the old
-- holiday run IDs, and need a member relationship for the canonical view.
INSERT INTO public.manual_timetable_templates(
 id,line_key,calendar_urn,train_number,railway_urn,direction_urn,
 train_type_urn,destination_urns,vehicle_type_label,source_path,
 source_occurrence,source_revision_date,operating_dates)
SELECT source_id,'SuigunBranch','odpt.Calendar:Weekday',train_number,
 'odpt.Railway:JR-East.SuigunBranch','odpt.RailDirection:'||direction,
 'odpt.TrainType:JR-East.Local',
 ARRAY[CASE WHEN direction='Outbound'
   THEN 'odpt.Station:JR-East.Hitachi-Ota'
   ELSE 'odpt.Station:JR-East.Kami-Sugaya' END]::text[],
 'キハE130系0番台',
 'official-2611:suigunbranch:train-number-and-stops:'||train_number,
 0,NULL,NULL
FROM _branch_2611_missing_weekday
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.train_timetables(
 id,canonical_key,calendar_urn,primary_train_number,
 lead_source_template_id,group_evidence,timetable_validity)
SELECT canonical_id,
 'official-jreast-2611:SuigunBranch:Weekday:'||train_number,
 'odpt.Calendar:Weekday',train_number,source_id,'source_only',
 'undated_not_current_verified'
FROM _branch_2611_missing_weekday
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.train_timetable_members(
 source_template_id,timetable_id,segment_order,member_role,
 first_stop_sequence,last_stop_sequence,stop_offset,merge_first_stop)
SELECT source_id,canonical_id,0,'primary',0,5,0,false
FROM _branch_2611_missing_weekday
ON CONFLICT(source_template_id) DO NOTHING;
-- Every station is explicitly read from the four official stop pages.
CREATE TEMP TABLE _branch_2611_official_stops(
 template_id bigint,stop_sequence integer,
 arrival_station_urn text,departure_station_urn text,
 arrival_clock text,departure_clock text,
 PRIMARY KEY(template_id,stop_sequence)
) ON COMMIT DROP;
INSERT INTO _branch_2611_official_stops VALUES
    (261124300929,0,NULL,'odpt.Station:JR-East.Kami-Sugaya',NULL,'11:35'),
    (261124300929,1,'odpt.Station:JR-East.Minami-Sakeide','odpt.Station:JR-East.Minami-Sakeide','11:38','11:39'),
    (261124300929,2,'odpt.Station:JR-East.Gada','odpt.Station:JR-East.Gada','11:40','11:41'),
    (261124300929,3,'odpt.Station:JR-East.Kawai','odpt.Station:JR-East.Kawai','11:45','11:45'),
    (261124300929,4,'odpt.Station:JR-East.Tani-Kawara','odpt.Station:JR-East.Tani-Kawara','11:47','11:48'),
    (261124300929,5,'odpt.Station:JR-East.Hitachi-Ota',NULL,'11:50',NULL),
    (261124300930,0,NULL,'odpt.Station:JR-East.Hitachi-Ota',NULL,'12:00'),
    (261124300930,1,'odpt.Station:JR-East.Tani-Kawara','odpt.Station:JR-East.Tani-Kawara','12:02','12:02'),
    (261124300930,2,'odpt.Station:JR-East.Kawai','odpt.Station:JR-East.Kawai','12:04','12:05'),
    (261124300930,3,'odpt.Station:JR-East.Gada','odpt.Station:JR-East.Gada','12:08','12:09'),
    (261124300930,4,'odpt.Station:JR-East.Minami-Sakeide','odpt.Station:JR-East.Minami-Sakeide','12:11','12:11'),
    (261124300930,5,'odpt.Station:JR-East.Kami-Sugaya',NULL,'12:14',NULL),
    (261124300931,0,NULL,'odpt.Station:JR-East.Kami-Sugaya',NULL,'12:35'),
    (261124300931,1,'odpt.Station:JR-East.Minami-Sakeide','odpt.Station:JR-East.Minami-Sakeide','12:38','12:38'),
    (261124300931,2,'odpt.Station:JR-East.Gada','odpt.Station:JR-East.Gada','12:40','12:40'),
    (261124300931,3,'odpt.Station:JR-East.Kawai','odpt.Station:JR-East.Kawai','12:44','12:44'),
    (261124300931,4,'odpt.Station:JR-East.Tani-Kawara','odpt.Station:JR-East.Tani-Kawara','12:46','12:47'),
    (261124300931,5,'odpt.Station:JR-East.Hitachi-Ota',NULL,'12:49',NULL),
    (261124300932,0,NULL,'odpt.Station:JR-East.Hitachi-Ota',NULL,'13:11'),
    (261124300932,1,'odpt.Station:JR-East.Tani-Kawara','odpt.Station:JR-East.Tani-Kawara','13:13','13:13'),
    (261124300932,2,'odpt.Station:JR-East.Kawai','odpt.Station:JR-East.Kawai','13:15','13:16'),
    (261124300932,3,'odpt.Station:JR-East.Gada','odpt.Station:JR-East.Gada','13:19','13:20'),
    (261124300932,4,'odpt.Station:JR-East.Minami-Sakeide','odpt.Station:JR-East.Minami-Sakeide','13:22','13:22'),
    (261124300932,5,'odpt.Station:JR-East.Kami-Sugaya',NULL,'13:25',NULL);
INSERT INTO public.manual_timetable_template_stops(
 template_id,stop_sequence,arrival_station_urn,departure_station_urn,
 arrival_clock,departure_clock)
SELECT template_id,stop_sequence,arrival_station_urn,departure_station_urn,
 arrival_clock,departure_clock FROM _branch_2611_official_stops
ON CONFLICT(template_id,stop_sequence) DO NOTHING;
INSERT INTO public.published_suigun_2611_fleet_scope(
 edition,line_key,source_template_id,calendar_urn,direction_urn,
 train_number,source_type_urn,published_type_urn,source_occurrence,
 fleet_role,candidate_models,illustration_model,png_reference,
 operating_dates,excluded_dates,number_evidence_scope,source_url)
SELECT '2611','SuigunBranch',source_id,'odpt.Calendar:Weekday',
 'odpt.RailDirection:'||direction,train_number,
 'odpt.TrainType:JR-East.Local','odpt.TrainType:JR-East.Local',0,
 'kiha_e130_0_reference',ARRAY['キハE130系0番台']::text[],
 'キハE130系0番台',
 '../images/列车/JR東日本/JR東日本_キハE130系0番台.png',
 '{}'::text[],'{}'::text[],'official-2611-number-and-stops',
 official_url
FROM _branch_2611_missing_weekday
ON CONFLICT(source_template_id) DO NOTHING;
DO $verify$
DECLARE insufficient integer;
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='SuigunBranch' AND calendar_urn='odpt.Calendar:Weekday') <>30
 OR (SELECT count(*) FROM public.manual_timetable_templates
      WHERE line_key='SuigunBranch' AND calendar_urn='odpt.Calendar:SaturdayHoliday') <>30
 OR (SELECT count(*) FROM public.published_suigun_2611_fleet_scope
      WHERE line_key='SuigunBranch')<>60
 OR (SELECT count(*) FROM public.published_suigun_2611_fleet_scope)<>219
 OR EXISTS (
   SELECT 1 FROM public.published_suigun_2611_fleet_scope
   WHERE actual_vehicle_confirmed
 )
 THEN RAISE EXCEPTION 'SuigunBranch 2611 roster count/scope mismatch'; END IF;
 SELECT count(*) INTO insufficient
 FROM public.manual_timetable_templates t
 LEFT JOIN public.train_timetable_source_resolution r
   ON r.source_template_id=t.id
 LEFT JOIN LATERAL(
   SELECT count(*) stops,
    MAX(s.arrival_clock) FILTER (WHERE s.stop_sequence=5) last_clock
   FROM public.manual_timetable_template_stops s WHERE s.template_id=t.id
 ) stops ON true
 WHERE t.line_key='SuigunBranch' AND
  (stops.stops<>6 OR r.timetable_id IS NULL);
 IF insufficient<>0
 THEN RAISE EXCEPTION 'SuigunBranch unresolved timetable or incomplete 6-stop path: %',insufficient; END IF;
 IF EXISTS (
  SELECT 1 FROM _branch_2611_missing_weekday x
  LEFT JOIN public.manual_timetable_templates t ON t.id=x.source_id
  LEFT JOIN public.train_timetable_source_resolution r ON r.source_template_id=t.id
  WHERE t.train_number IS DISTINCT FROM x.train_number
    OR r.timetable_id IS DISTINCT FROM x.canonical_id
 ) THEN RAISE EXCEPTION 'SuigunBranch new canonical identity mismatch'; END IF;
END $verify$;
COMMIT;
