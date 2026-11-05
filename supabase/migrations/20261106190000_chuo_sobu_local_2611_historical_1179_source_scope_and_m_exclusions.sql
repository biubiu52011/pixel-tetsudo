-- 中央線・総武線各駅停車 2026-11.
-- This is a HISTORICAL source audit, NOT an assertion that each old clock
-- or old train number is independently verified against 659 u/d 1/2.
-- E231-500/0 + converted E235-0 are mixed on B/C; no exact train-number
-- or physical formation-to-PNG mapping can follow from the B/C suffix.
-- Y/A requires separate existing 659/671 Tozai per-number K/S crosswalk.
-- Four E353 LimitedExpress M entries belong to Chuo corridor express
-- evidence, not the regular ChuoSobuLocal diagram; quarantine on this LINE.
-- https://timetables.jreast.co.jp/2611/timetable-v/659u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/659u2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/659d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/659d2.html
-- https://media.jreast.co.jp/articles/1723
-- https://4gousya.net/jr_e/4284.php (B31/B33 conversion status)
BEGIN;
SELECT pg_advisory_xact_lock(2611659);
CREATE TABLE IF NOT EXISTS public.published_chuo_sobu_2611_source_scope(
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='ChuoSobuLocal'),
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id),
 calendar_urn text NOT NULL CHECK(calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN('odpt.RailDirection:Eastbound','odpt.RailDirection:Westbound')),
 train_number text NOT NULL,
 segment_key text NOT NULL CHECK(segment_key IN(
  'jr_ordinary_bc','tozai_through_ya','foreign_limited_express_m')),
 source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys) BETWEEN 2 AND 39),
 candidate_models text[] NOT NULL,
 official_line_source_url text NOT NULL,
 source_clock_status text NOT NULL DEFAULT 'historical_not_2611_verified'
 CHECK(source_clock_status='historical_not_2611_verified'),
 train_number_verification text NOT NULL DEFAULT 'historical_source_only'
 CHECK(train_number_verification='historical_source_only'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 png_reference text DEFAULT NULL CHECK(png_reference IS NULL)
);
ALTER TABLE public.published_chuo_sobu_2611_source_scope ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_chuo_sobu_2611_source_scope IS
'Historic 1179 timetable sources. Exact JR 659 number/clock and any physical B/C vehicle remain unverified. 4 foreign E353 M entries blocked, Y/A ownership delegated to existing 659/671 numbered crosswalk.';
WITH t AS (
 SELECT a.*,ARRAY(
  SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
  FROM public.manual_timetable_template_stops s
  WHERE s.template_id=a.id ORDER BY s.stop_sequence
 ) AS stop_keys
 FROM public.manual_timetable_templates a
 WHERE a.line_key='ChuoSobuLocal'
   AND a.railway_urn='odpt.Railway:JR-East.ChuoSobuLocal'
   AND a.source_path='data/timetables/ChuoSobuLocal-manual.js'
), classified AS (
 SELECT t.*,
 CASE WHEN train_number IN('5003M','5050M') AND
               train_type_urn='odpt.TrainType:JR-East.LimitedExpress'
       THEN 'foreign_limited_express_m'
      WHEN train_number~'^[0-9]{3,4}[BC]$' AND
           train_type_urn='odpt.TrainType:JR-East.Local'
       THEN 'jr_ordinary_bc'
      WHEN train_number~'^[0-9]{3,4}[YA]$' AND
           train_type_urn='odpt.TrainType:JR-East.Local'
       THEN 'tozai_through_ya'
      ELSE 'unclassified' END segment
 FROM t
)
INSERT INTO public.published_chuo_sobu_2611_source_scope(
 edition,line_key,source_template_id,calendar_urn,direction_urn,train_number,
 segment_key,source_stop_keys,candidate_models,official_line_source_url)
SELECT '2611','ChuoSobuLocal',id,calendar_urn,direction_urn,train_number,
 segment,stop_keys,
 CASE WHEN segment='jr_ordinary_bc' THEN
 ARRAY['E231系500番台','E231系0番台（中央・総武線各駅停車）',
       'E235系0番台（中央・総武線各駅停車）']::text[]
 WHEN segment='tozai_through_ya' THEN
 ARRAY['E231系800番台（東西線直通）','東京メトロ05系',
       '東京メトロ07系','東京メトロ15000系']::text[]
 ELSE '{}'::text[] END,
 'https://timetables.jreast.co.jp/2611/timetable-v/659'||
 CASE WHEN direction_urn='odpt.RailDirection:Eastbound' THEN 'u' ELSE 'd' END||
 CASE WHEN calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html'
FROM classified
WHERE segment <> 'unclassified'
AND cardinality(stop_keys) BETWEEN 2 AND 39
ON CONFLICT(source_template_id) DO NOTHING;
DO $check$
BEGIN
 IF (SELECT COUNT(*) FROM public.manual_timetable_templates
 WHERE line_key='ChuoSobuLocal')<>1179
 OR (SELECT COUNT(*) FROM public.published_chuo_sobu_2611_source_scope)<>1179
 OR (SELECT COUNT(*) FROM public.published_chuo_sobu_2611_source_scope
 WHERE segment_key='jr_ordinary_bc')<>912
 OR (SELECT COUNT(*) FROM public.published_chuo_sobu_2611_source_scope
 WHERE segment_key='tozai_through_ya')<>263
 OR (SELECT COUNT(*) FROM public.published_chuo_sobu_2611_source_scope
 WHERE segment_key='foreign_limited_express_m')<>4
 OR (SELECT COUNT(*) FROM public.published_chuo_sobu_2611_source_scope
 WHERE calendar_urn='odpt.Calendar:Weekday')<>664
 OR (SELECT COUNT(*) FROM public.published_chuo_sobu_2611_source_scope
 WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>515
 OR EXISTS(SELECT 1 FROM public.published_chuo_sobu_2611_source_scope
 WHERE png_reference IS NOT NULL OR actual_vehicle_confirmed OR NOT reference_only)
 OR EXISTS(SELECT 1 FROM public.published_chuo_sobu_2611_source_scope
 WHERE segment_key='foreign_limited_express_m'
 AND train_number NOT IN ('5003M','5050M'))
 THEN RAISE EXCEPTION 'ChuoSobuLocal 2611 source scope or exact-car isolation mismatch';
 END IF;
END $check$;
COMMIT;