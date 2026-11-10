-- Sotetsu/JR JR-connector four-stop scheduled clocks: November 2026.
-- The 184 existing SQL rows are byte-for-byte identical to the licensed
-- ODPT TrainTimetable response (issued 2026-03-14, updated 2026-07-17).
-- Their published base departure/terminal clocks were independently checked
-- against JR East's 2611 four calendar/direction tables on 2026-11-10.
-- Do not replace historic source rows or infer any physical vehicle.
-- JR East dates 11/07 and 11/22 have explicitly published clock variants.
BEGIN;
SELECT pg_advisory_xact_lock(2611629);
CREATE TABLE IF NOT EXISTS public.published_sotetsu_jr_2611_clock_proof (
  source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
  edition text NOT NULL DEFAULT '2611' CHECK (edition='2611'),
  line_key text NOT NULL DEFAULT 'SotetsuJRDirect' CHECK (line_key='SotetsuJRDirect'),
  train_number text NOT NULL,
  calendar_urn text NOT NULL CHECK (calendar_urn IN
    ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
  direction_urn text NOT NULL CHECK (direction_urn IN
    ('odpt.RailDirection:Northbound','odpt.RailDirection:Southbound')),
  source_stop_signature text NOT NULL,
  official_timetable_url text NOT NULL CHECK
    (official_timetable_url LIKE 'https://timetables.jreast.co.jp/2611/timetable-v/628%'),
  evidence_scope text NOT NULL DEFAULT 'odpt_four_stops_jreast_2611_base_clock_crosscheck'
    CHECK (evidence_scope='odpt_four_stops_jreast_2611_base_clock_crosscheck'),
  verified_at date NOT NULL DEFAULT DATE '2026-11-10',
  actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK (NOT actual_vehicle_confirmed),
  UNIQUE (edition,calendar_urn,direction_urn,train_number)
);
ALTER TABLE public.published_sotetsu_jr_2611_clock_proof ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_sotetsu_jr_2611_clock_proof IS
 'Source-specific 2611 four-stop clock verification. Identity/clock only; never a real-time location or physical formation.';
DO $preflight$
DECLARE bad integer; total integer;
BEGIN
  WITH source_rows AS (
    SELECT t.calendar_urn,t.direction_urn,t.train_number,
      string_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
        ||'|'||coalesce(s.arrival_clock,'')||'|'||coalesce(s.departure_clock,''),
        ';' ORDER BY s.stop_sequence) signature,
      count(*) n
    FROM public.manual_timetable_templates t
    JOIN public.manual_timetable_template_stops s ON s.template_id=t.id
    WHERE t.line_key='SotetsuJRDirect'
    GROUP BY t.id,t.calendar_urn,t.direction_urn,t.train_number
  ), actual AS (
    SELECT calendar_urn,direction_urn,count(*) n,
      md5(string_agg(train_number||':'||signature,E'\n' ORDER BY train_number)) fingerprint
    FROM source_rows WHERE n=4 GROUP BY 1,2
  ), expected(calendar_urn,direction_urn,n,fingerprint) AS (VALUES
    ('odpt.Calendar:Weekday','odpt.RailDirection:Northbound',46,'d13853e28f64aca8796bb2da958ffc15'),
    ('odpt.Calendar:Weekday','odpt.RailDirection:Southbound',46,'9808c35329fc6f676b95bf8010d0e143'),
    ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Northbound',46,'45b7b1f1106b689597fe1f0ddcb79cdd'),
    ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Southbound',46,'8bcfdb0cf19289220c9428754167c90f')
  )
  SELECT count(*) INTO bad FROM expected e LEFT JOIN actual a USING(calendar_urn,direction_urn)
    WHERE a.n IS DISTINCT FROM e.n OR a.fingerprint IS DISTINCT FROM e.fingerprint;
  SELECT count(*) INTO total FROM public.manual_timetable_templates
    WHERE line_key='SotetsuJRDirect';
  IF bad<>0 OR total<>184 THEN
    RAISE EXCEPTION 'SOTETSU_JR_2611_PUBLISHED_BASE_CLOCK_SOURCE_CHANGED: % mismatched groups, % templates',bad,total;
  END IF;
END $preflight$;
WITH source_rows AS (
  SELECT t.id,t.train_number,t.calendar_urn,t.direction_urn,
    string_agg(split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
      ||'|'||coalesce(s.arrival_clock,'')||'|'||coalesce(s.departure_clock,''),
      ';' ORDER BY s.stop_sequence) signature,
    count(*) n
  FROM public.manual_timetable_templates t
  JOIN public.manual_timetable_template_stops s ON s.template_id=t.id
  WHERE t.line_key='SotetsuJRDirect'
  GROUP BY t.id,t.train_number,t.calendar_urn,t.direction_urn
)
INSERT INTO public.published_sotetsu_jr_2611_clock_proof
  (source_template_id,edition,line_key,train_number,calendar_urn,direction_urn,
   source_stop_signature,official_timetable_url)
SELECT s.id,'2611','SotetsuJRDirect',s.train_number,s.calendar_urn,s.direction_urn,
       s.signature,f.timetable_index_url
FROM source_rows s
JOIN public.published_sotetsu_jr_2611_fleet_roster f
  ON f.source_template_id=s.id AND f.train_number=s.train_number
 AND f.calendar_urn=s.calendar_urn AND f.direction_urn=s.direction_urn
 AND f.stop_clock_status='historical_not_2611_verified'
WHERE s.n=4
ON CONFLICT(source_template_id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.published_sotetsu_jr_2611_dated_clock_variation (
  source_template_id bigint NOT NULL REFERENCES public.published_sotetsu_jr_2611_clock_proof(source_template_id),
  service_date date NOT NULL CHECK (service_date BETWEEN DATE '2026-11-01' AND DATE '2026-11-30'),
  train_number text NOT NULL,
  station_times text[] NOT NULL CHECK (cardinality(station_times)=4),
  time_role text NOT NULL DEFAULT 'four_published_departure_terminal_clocks'
    CHECK (time_role='four_published_departure_terminal_clocks'),
  official_timetable_url text NOT NULL,
  PRIMARY KEY(source_template_id,service_date)
);
ALTER TABLE public.published_sotetsu_jr_2611_dated_clock_variation ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_sotetsu_jr_2611_dated_clock_variation IS
 'Official Nov 7/Nov 22 station clocks in line-stop order: departure at first/intermediates, arrival at terminal. Intermediate arrival is not independently published.';
WITH variants(train_number,direction_urn,service_date,station_times) AS (VALUES
  ('222M','odpt.RailDirection:Northbound',DATE '2026-11-07',ARRAY['07:30','07:51','07:57','08:02']::text[]),
  ('226M','odpt.RailDirection:Northbound',DATE '2026-11-07',ARRAY['08:09','08:23','08:29','08:33']::text[]),
  ('234M','odpt.RailDirection:Northbound',DATE '2026-11-07',ARRAY['10:27','10:43','10:49','10:53']::text[]),
  ('284M','odpt.RailDirection:Northbound',DATE '2026-11-07',ARRAY['21:25','21:42','21:48','21:51']::text[]),
  ('144M','odpt.RailDirection:Northbound',DATE '2026-11-07',ARRAY['22:33','22:48','22:54','22:57']::text[]),
  ('270M','odpt.RailDirection:Northbound',DATE '2026-11-22',ARRAY['19:08','19:26','19:32','19:35']::text[]),
  ('223M','odpt.RailDirection:Southbound',DATE '2026-11-07',ARRAY['08:05','08:10','08:15','08:30']::text[]),
  ('237M','odpt.RailDirection:Southbound',DATE '2026-11-07',ARRAY['10:50','10:54','10:59','11:14']::text[])
)
INSERT INTO public.published_sotetsu_jr_2611_dated_clock_variation
(source_template_id,service_date,train_number,station_times,official_timetable_url)
SELECT p.source_template_id,v.service_date,v.train_number,v.station_times,p.official_timetable_url
FROM variants v JOIN public.published_sotetsu_jr_2611_clock_proof p
 ON p.train_number=v.train_number
 AND p.direction_urn=v.direction_urn
 AND p.calendar_urn='odpt.Calendar:SaturdayHoliday'
ON CONFLICT(source_template_id,service_date) DO NOTHING;
DO $postcheck$
BEGIN
  IF (SELECT count(*) FROM public.published_sotetsu_jr_2611_clock_proof WHERE edition='2611')<>184
    OR (SELECT count(*) FROM public.published_sotetsu_jr_2611_dated_clock_variation)<>8
    OR EXISTS (SELECT 1 FROM (
      SELECT calendar_urn,direction_urn,count(*) n
      FROM public.published_sotetsu_jr_2611_clock_proof GROUP BY 1,2
    ) g WHERE g.n<>46)
  THEN RAISE EXCEPTION 'SOTETSU_JR_2611_CLOCK_PROOF_INCOMPLETE'; END IF;
END $postcheck$;
COMMIT;
