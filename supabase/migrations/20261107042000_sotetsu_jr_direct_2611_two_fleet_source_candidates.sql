-- Sotetsu / JR through train: 2611 source-bound rolling-stock CANDIDATES.
-- This is a fleet corridor, NOT a dated physical fleet assignment.
-- Original 4-stop timetables are undated mini-tokyo-3d records, not 2611 clocks.
-- 1xxM / 2xxM classify Sotetsu-side express/local; neither proves car ownership.
-- JR / Sotetsu official: https://www.jreast.co.jp/press/2019/20190716.pdf
-- Sotetsu current rolling-stock: https://www.sotetsu.co.jp/life/gallery/train/
-- JR 2611 pages: https://timetables.jreast.co.jp/2611/timetable-v/628d1p.html
--                https://timetables.jreast.co.jp/2611/timetable-v/628u1p.html
BEGIN;
SELECT pg_advisory_xact_lock(2611628);
CREATE TABLE IF NOT EXISTS public.published_sotetsu_jr_2611_fleet_roster(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='SotetsuJRDirect'),
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 train_number text NOT NULL CHECK(train_number ~ '^(1[2-5][0-9]|2[2-8][0-9])M$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN
  ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN
  ('odpt.RailDirection:Northbound','odpt.RailDirection:Southbound')),
 train_type_urn text NOT NULL CHECK(train_type_urn='odpt.TrainType:JR-East.Local'),
 source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys)=4),
 candidate_models text[] NOT NULL CHECK(candidate_models=ARRAY['E233系7000番台','相鉄12000系']::text[]),
 candidate_png_paths text[] NOT NULL CHECK(candidate_png_paths=ARRAY[
  '../images/列车/JR東日本/JR東日本_E233系_7000番台.png',
  '../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png']::text[]),
 official_fleet_source_url text NOT NULL CHECK(
  official_fleet_source_url='https://www.jreast.co.jp/press/2019/20190716.pdf'),
 timetable_index_url text NOT NULL,
 stop_clock_status text NOT NULL DEFAULT 'historical_not_2611_verified'
  CHECK(stop_clock_status='historical_not_2611_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 number_date_verified boolean NOT NULL DEFAULT false CHECK(NOT number_date_verified),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 UNIQUE(edition,line_key,calendar_urn,direction_urn,train_number)
);
ALTER TABLE public.published_sotetsu_jr_2611_fleet_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_sotetsu_jr_2611_fleet_roster IS
'JR Hazawa–Osaki historical source trains, E233-7000/Sotetsu 12000 candidates only, no 2611 current-stop or physical-carset proof. Not two trainsets.';
WITH source AS (
 SELECT m.*,
 ARRAY(SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
 FROM public.manual_timetable_template_stops s
 WHERE s.template_id=m.id ORDER BY s.stop_sequence) AS station_keys
 FROM public.manual_timetable_templates m
 WHERE m.line_key='SotetsuJRDirect'
   AND m.railway_urn='odpt.Railway:JR-East.SotetsuDirect'
   AND m.train_type_urn='odpt.TrainType:JR-East.Local'
   AND m.vehicle_type_label IS NULL
   AND m.source_revision_date IS NULL
   AND m.source_occurrence=0
   AND m.source_path='https://github.com/nagix/mini-tokyo-3d/blob/c708abea8bf05ab56137a50e52c032112b6f9beb/data/train-timetables/jreast-sotetsudirect.json'
)
INSERT INTO public.published_sotetsu_jr_2611_fleet_roster(
 edition,line_key,source_template_id,train_number,calendar_urn,direction_urn,
 train_type_urn,source_stop_keys,candidate_models,candidate_png_paths,
 official_fleet_source_url,timetable_index_url)
SELECT '2611','SotetsuJRDirect',id,train_number,calendar_urn,direction_urn,
 train_type_urn,station_keys,ARRAY['E233系7000番台','相鉄12000系']::text[],
 ARRAY['../images/列车/JR東日本/JR東日本_E233系_7000番台.png',
 '../images/列车/相模鉄道/相模鉄道_12000系_YOKOHAMA_NAVYBLUE.png']::text[],
 'https://www.jreast.co.jp/press/2019/20190716.pdf',
 'https://timetables.jreast.co.jp/2611/timetable-v/628' ||
 CASE WHEN direction_urn='odpt.RailDirection:Northbound' THEN 'd' ELSE 'u' END ||
 CASE WHEN calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END || 'p.html'
FROM source
WHERE train_number ~ '^(1[2-5][0-9]|2[2-8][0-9])M$'
 AND station_keys=CASE WHEN direction_urn='odpt.RailDirection:Northbound'
  THEN ARRAY['HazawaYokohamaKokudai','MusashiKosugi','NishiOi','Osaki']::text[]
  ELSE ARRAY['Osaki','NishiOi','MusashiKosugi','HazawaYokohamaKokudai']::text[] END
 AND (regexp_replace(train_number,'M$','')::int % 2)=
  (CASE WHEN direction_urn='odpt.RailDirection:Northbound' THEN 0 ELSE 1 END)
ON CONFLICT DO NOTHING;
DO $postcheck$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates
     WHERE line_key='SotetsuJRDirect')<>184
 OR (SELECT count(*) FROM public.published_sotetsu_jr_2611_fleet_roster
     WHERE edition='2611' AND line_key='SotetsuJRDirect')<>184
 OR EXISTS (
 SELECT 1 FROM public.published_sotetsu_jr_2611_fleet_roster r
 WHERE r.source_stop_keys<>CASE WHEN r.direction_urn='odpt.RailDirection:Northbound'
  THEN ARRAY['HazawaYokohamaKokudai','MusashiKosugi','NishiOi','Osaki']::text[]
  ELSE ARRAY['Osaki','NishiOi','MusashiKosugi','HazawaYokohamaKokudai']::text[] END
 )
 OR EXISTS (SELECT 1 FROM (
  SELECT calendar_urn,direction_urn,count(*) n
  FROM public.published_sotetsu_jr_2611_fleet_roster
  GROUP BY 1,2) x WHERE n<>46)
 THEN RAISE EXCEPTION 'SotetsuJRDirect source roster shape changed: review before advertising candidate fleet'; END IF;
END $postcheck$;
COMMIT;
