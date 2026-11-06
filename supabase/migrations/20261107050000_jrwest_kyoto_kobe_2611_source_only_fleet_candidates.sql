-- Kyoto–Osaka JR Kyoto Line / Osaka–Himeji JR Kobe Line.
-- 46 TokaidoKansai partial manual records, plus 20 Kobe-side SanyoMain
-- regular/rapid source segments; NOT a 2026-11 verified daily roster.
-- TokaidoMain is JR-East and MUST NEVER be used here.
-- Composite source IDs (e.g. 500310-1385400-714T) are source keys;
-- 714T is a historical suffix, NOT certified 2026-11 train-number proof.
-- C locals: possible JR West 207/321; T/M regional rapid: 223/225.
-- 221 retired from Kyoto/Kobe rapid working by March 2024.
-- No number/label can certify a 2026-11 physical formation or PNG.
-- Official fleet: https://www.westjr.co.jp/fan/paper/local/
--               https://www.westjr.co.jp/press/article/2020/02/page_15645.html
-- 2025 fleet survey (JR West advertising):
-- https://www.jcomm.co.jp/assets/pdf/transit/price/media_guide/2025/mg_77-82_2025.pdf
BEGIN;
SELECT pg_advisory_xact_lock(26110500);
CREATE TABLE IF NOT EXISTS public.published_jrwest_kyoto_kobe_2611_source_fleet(
  source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
  edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
  source_line_key text NOT NULL CHECK(source_line_key IN ('TokaidoKansai','SanyoMain')),
  candidate_segment text NOT NULL CHECK(candidate_segment IN('kyoto_osaka_kobe','kobe_himeji')),
  source_train_id text NOT NULL CHECK(source_train_id ~ '^[0-9]{6}-[0-9]{4,7}-[0-9]{1,4}[CMT]$'),
  source_public_number_suffix text NOT NULL CHECK(source_public_number_suffix ~ '^[0-9]{1,4}[CMT]$'),
  calendar_urn text NOT NULL CHECK(calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
  direction_urn text NOT NULL CHECK(direction_urn IN ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
  train_type_urn text NOT NULL CHECK(train_type_urn IN('odpt.TrainType:JR-West.Local','odpt.TrainType:JR-West.Rapid')),
  service_family text NOT NULL CHECK(service_family IN('local_c','regional_rapid_t_m')),
  source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys)>=2),
  candidate_models text[] NOT NULL,
  candidate_gallery_models text[] NOT NULL,
  candidate_png_paths text[] NOT NULL,
  fleet_source_url text NOT NULL,
  timetable_source_path text NOT NULL,
  timetable_validity text NOT NULL DEFAULT 'undated_not_current_verified'
    CHECK(timetable_validity='undated_not_current_verified'),
  number_date_verified boolean NOT NULL DEFAULT false CHECK(NOT number_date_verified),
  reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
  actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
  authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
  CHECK(
    (service_family='local_c' AND train_type_urn='odpt.TrainType:JR-West.Local'
      AND right(source_public_number_suffix,1)='C'
      AND candidate_models=ARRAY['207系','321系']::text[])
    OR
    (service_family='regional_rapid_t_m' AND train_type_urn='odpt.TrainType:JR-West.Rapid'
      AND right(source_public_number_suffix,1) IN('T','M')
      AND candidate_models=ARRAY['223系','225系']::text[])
  ),
  CHECK(cardinality(candidate_gallery_models)=cardinality(candidate_png_paths)),
  CHECK(
    (source_line_key='TokaidoKansai' AND service_family='local_c'
      AND candidate_gallery_models=ARRAY['JR西日本207系（NK）','JR西日本207系（Y2）','JR西日本321系']::text[]
      AND candidate_png_paths=ARRAY[
        '../images/列车/JR西日本/JR西日本_207系_NK.png',
        '../images/列车/JR西日本/JR西日本_207系_Y2.png',
        '../images/列车/JR西日本/JR西日本_321系.png']::text[])
    OR
    ((source_line_key='SanyoMain' OR service_family='regional_rapid_t_m')
      AND cardinality(candidate_png_paths)=0
      AND cardinality(candidate_gallery_models)=0)
  ),
  UNIQUE(edition,source_line_key,calendar_urn,source_train_id)
);
ALTER TABLE public.published_jrwest_kyoto_kobe_2611_source_fleet ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_jrwest_kyoto_kobe_2611_source_fleet IS
'56? source-only Kyoto/Kobe locals and rapid fleet candidates, with composite historical source ID kept separately from unverified public-number suffix. Vehicle fleet is not a 2026-11 formation; Hanwa-only 223/225 artwork is strictly excluded.';
WITH base AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.direction_urn,m.train_type_urn,
 m.train_number,m.source_path,m.source_occurrence,m.source_revision_date,m.vehicle_type_label,
 ARRAY(
  SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
  FROM public.manual_timetable_template_stops s
  WHERE s.template_id=m.id ORDER BY s.stop_sequence
 ) stop_keys
 FROM public.manual_timetable_templates m
 WHERE m.line_key IN('TokaidoKansai','SanyoMain')
), scoped AS (
 SELECT *,split_part(train_number,'-',3) AS suffix,
 CASE WHEN train_type_urn='odpt.TrainType:JR-West.Local' THEN 'local_c'
   ELSE 'regional_rapid_t_m' END AS family
 FROM base
 WHERE source_occurrence=0 AND source_revision_date IS NULL
 AND vehicle_type_label IS NULL
 AND (
  (line_key='TokaidoKansai' AND source_path='data/timetables/TokaidoKansai-manual.js')
  OR (line_key='SanyoMain' AND source_path='data/timetables/SanyoMain-manual.js'
    AND stop_keys[1] IN('Hyougo','Akashi')
    AND stop_keys[array_length(stop_keys,1)] IN('Suma','Nishi-Akashi','Himeji','Amiboshi'))
 )
 AND train_number ~ '^[0-9]{6}-[0-9]{4,7}-[0-9]{1,4}[CMT]$'
 AND (
  (train_type_urn='odpt.TrainType:JR-West.Local' AND right(train_number,1)='C')
  OR (train_type_urn='odpt.TrainType:JR-West.Rapid' AND right(train_number,1) IN('T','M'))
 )
)
INSERT INTO public.published_jrwest_kyoto_kobe_2611_source_fleet(
 source_template_id,edition,source_line_key,candidate_segment,source_train_id,
 source_public_number_suffix,calendar_urn,direction_urn,train_type_urn,
 service_family,source_stop_keys,candidate_models,candidate_gallery_models,
 candidate_png_paths,fleet_source_url,timetable_source_path)
SELECT id,'2611',line_key,
 CASE WHEN line_key='TokaidoKansai' THEN 'kyoto_osaka_kobe' ELSE 'kobe_himeji' END,
 train_number,suffix,calendar_urn,direction_urn,train_type_urn,
 family,stop_keys,
 CASE WHEN family='local_c' THEN ARRAY['207系','321系']::text[]
  ELSE ARRAY['223系','225系']::text[] END,
 CASE WHEN family='local_c' AND line_key='TokaidoKansai'
 THEN ARRAY['JR西日本207系（NK）','JR西日本207系（Y2）','JR西日本321系']::text[]
 ELSE ARRAY[]::text[] END,
 CASE WHEN family='local_c' AND line_key='TokaidoKansai' THEN
  ARRAY[
   '../images/列车/JR西日本/JR西日本_207系_NK.png',
   '../images/列车/JR西日本/JR西日本_207系_Y2.png',
   '../images/列车/JR西日本/JR西日本_321系.png']::text[]
 ELSE ARRAY[]::text[] END,
 CASE WHEN family='local_c' THEN
  'https://www.westjr.co.jp/fan/paper/local/'
 ELSE 'https://www.westjr.co.jp/press/article/2020/02/page_15645.html' END,
 source_path
FROM scoped
WHERE stop_keys IS NOT NULL AND cardinality(stop_keys)>=2
 AND split_part(train_number,'-',3) ~ '^[0-9]{1,4}[CMT]$'
 AND (regexp_replace(suffix,'[CMT]$','')::integer % 2)=
  (CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 0 ELSE 1 END)
ON CONFLICT(source_template_id) DO NOTHING;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
   WHERE edition='2611')<>58
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
   WHERE source_line_key='TokaidoKansai')<>38
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
   WHERE source_line_key='SanyoMain')<>20
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
   WHERE service_family='local_c')<>26
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
   WHERE service_family='regional_rapid_t_m')<>32
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
   WHERE cardinality(candidate_png_paths)>0)<>15
 THEN RAISE EXCEPTION 'Kyoto/Kobe source-only fleet candidate coverage changed: audit the route and source'; END IF;
END $verify$;
COMMIT;