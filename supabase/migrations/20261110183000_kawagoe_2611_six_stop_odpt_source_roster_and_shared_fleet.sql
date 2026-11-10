-- Kawagoe west JR-East six-stop ODPT TrainTimetable roster, edition 2611.
-- 2026-07-17 ODPT current static source: 93 weekday + 93 holiday;
-- all 186 first departures match JR East 2026 November published station
-- boards (Kawagoe/Komagawa). The SIX stop clocks remain ODPT API evidence.
-- The two candidate 4-car models are in a SHARED, not type-specific, working:
-- E231-3000 and 209-3500. Never infer the actual carset from H service numbers.
BEGIN;
SELECT pg_advisory_xact_lock(2611526);
CREATE TABLE IF NOT EXISTS public.published_kawagoe_2611_source_roster (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'Kawagoe' CHECK(line_key='Kawagoe'),
 train_number text NOT NULL CHECK(train_number ~ '^[0-9]{3,4}H$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 source_stop_signature text NOT NULL,
 source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys)=6),
 odpt_source_railway text NOT NULL DEFAULT 'odpt.Railway:JR-East.Kawagoe'
  CHECK(odpt_source_railway='odpt.Railway:JR-East.Kawagoe'),
 odpt_source_issued date NOT NULL DEFAULT DATE '2026-03-14',
 odpt_source_updated date NOT NULL DEFAULT DATE '2026-07-17',
 official_departure_board_url text NOT NULL,
 first_departure_2611_verified boolean NOT NULL DEFAULT true CHECK(first_departure_2611_verified),
 candidate_models text[] NOT NULL DEFAULT ARRAY['E231系3000番台','209系3500番台']::text[]
  CHECK(candidate_models=ARRAY['E231系3000番台','209系3500番台']::text[]),
 candidate_png_paths text[] NOT NULL DEFAULT ARRAY[
  '../images/列车/JR東日本/JR東日本_E231系_3000番台.png',
  '../images/列车/JR東日本/JR東日本_209系_3500番台.png']::text[],
 fleet_working_url text NOT NULL,
 fleet_evidence_grade text NOT NULL DEFAULT 'C' CHECK(fleet_evidence_grade='C'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_single_model_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_single_model_png),
 verified_at date NOT NULL DEFAULT DATE '2026-11-10',
 UNIQUE(edition,calendar_urn,direction_urn,train_number)
);
ALTER TABLE public.published_kawagoe_2611_source_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_kawagoe_2611_source_roster IS
 'Source-only ODPT six-stop Nov 2611 Kawagoe roster, JR first departures crosschecked; two shared vehicle candidates not per-number physical model proof.';
DO $validate$
DECLARE bad integer; total integer;
BEGIN
 WITH source_rows AS (
  SELECT t.calendar_urn,t.direction_urn,t.train_number,
   string_agg(split_part(coalesce(s.arrival_station_urn,s.departure_station_urn),'.',4)||'|'||
    coalesce(s.arrival_clock,'')||'|'||coalesce(s.departure_clock,''),';' ORDER BY s.stop_sequence) sig,
   count(*) n
  FROM public.manual_timetable_templates t JOIN public.manual_timetable_template_stops s ON s.template_id=t.id
  WHERE t.line_key='Kawagoe' AND t.source_path='odpt-api:v1:Kawagoe'
  GROUP BY 1,2,3
 ), actual AS (
  SELECT calendar_urn,direction_urn,count(*) n,
  md5(string_agg(train_number||':'||sig,E'\n' ORDER BY train_number)) hash
  FROM source_rows WHERE n=6 GROUP BY 1,2
 ), expected(calendar_urn,direction_urn,n,hash) AS (VALUES
  ('odpt.Calendar:Weekday','odpt.RailDirection:Inbound',46,'87d072caae13f336613d81027088079d'),
  ('odpt.Calendar:Weekday','odpt.RailDirection:Outbound',47,'b1d046e97586016ccd7e95d7cd39708a'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Inbound',46,'f2bf3c99484bde1d21b8c9fc80854216'),
  ('odpt.Calendar:SaturdayHoliday','odpt.RailDirection:Outbound',47,'2a44dbe55030be3e04b06ee0c05da4e2')
 )
 SELECT count(*) INTO bad FROM expected e LEFT JOIN actual a USING(calendar_urn,direction_urn)
 WHERE a.n IS DISTINCT FROM e.n OR a.hash IS DISTINCT FROM e.hash;
 SELECT count(*) INTO total FROM public.manual_timetable_templates WHERE line_key='Kawagoe';
 IF bad<>0 OR total<>186 THEN
  RAISE EXCEPTION 'KAWAGOE_2611_ODPT_ROSTER_CHANGED: % groups, % trains',bad,total;
 END IF;
END $validate$;
WITH templates AS (
 SELECT t.id,t.train_number,t.calendar_urn,t.direction_urn,t.railway_urn,t.source_path,
 array_agg(split_part(coalesce(s.arrival_station_urn,s.departure_station_urn),'.',4)
           ORDER BY s.stop_sequence) station_keys,
 string_agg(split_part(coalesce(s.arrival_station_urn,s.departure_station_urn),'.',4)||'|'||
   coalesce(s.arrival_clock,'')||'|'||coalesce(s.departure_clock,''),';' ORDER BY s.stop_sequence) signature,
 count(*) n
 FROM public.manual_timetable_templates t
 JOIN public.manual_timetable_template_stops s ON s.template_id=t.id
 WHERE t.line_key='Kawagoe'
 GROUP BY 1,2,3,4,5,6
)
INSERT INTO public.published_kawagoe_2611_source_roster (
 source_template_id,edition,line_key,train_number,calendar_urn,direction_urn,
 source_stop_signature,source_stop_keys,official_departure_board_url,
 fleet_working_url
)
SELECT t.id,'2611','Kawagoe',t.train_number,t.calendar_urn,t.direction_urn,
 t.signature,t.station_keys,
 CASE
  WHEN t.direction_urn='odpt.RailDirection:Outbound' THEN
    'https://timetables.jreast.co.jp/2611/timetable/tt0525/'||
      CASE WHEN t.calendar_urn='odpt.Calendar:Weekday' THEN '0525010' ELSE '0525011' END||'.html'
  ELSE
    'https://timetables.jreast.co.jp/2611/timetable/tt0711/'||
      CASE WHEN t.calendar_urn='odpt.Calendar:Weekday' THEN '0711010' ELSE '0711011' END||'.html'
  END,
 CASE WHEN t.calendar_urn='odpt.Calendar:Weekday' THEN
   'https://ameblo.jp/tc205-37/entry-12972148726.html'
 ELSE 'https://ameblo.jp/tc205-37/entry-12972148835.html' END
FROM templates t
WHERE t.n=6 AND t.railway_urn='odpt.Railway:JR-East.Kawagoe'
 AND t.source_path='odpt-api:v1:Kawagoe'
 AND t.train_number ~ '^[0-9]{3,4}H$'
 AND (t.direction_urn='odpt.RailDirection:Outbound' AND
    t.station_keys=ARRAY['Kawagoe','NishiKawagoe','Matoba','Kasahata','MusashiTakahagi','Komagawa']::text[]
  OR t.direction_urn='odpt.RailDirection:Inbound' AND
    t.station_keys=ARRAY['Komagawa','MusashiTakahagi','Kasahata','Matoba','NishiKawagoe','Kawagoe']::text[]);
DO $postcheck$
BEGIN
 IF (SELECT count(*) FROM public.published_kawagoe_2611_source_roster)<>186
 OR EXISTS (SELECT 1 FROM (
  SELECT calendar_urn,direction_urn,count(*) n FROM public.published_kawagoe_2611_source_roster
  GROUP BY 1,2) x WHERE (direction_urn='odpt.RailDirection:Outbound' AND n<>47)
       OR(direction_urn='odpt.RailDirection:Inbound' AND n<>46))
 THEN RAISE EXCEPTION 'KAWAGOE_2611_ROSTER_COVERAGE_INCOMPLETE'; END IF;
END $postcheck$;
COMMIT;
