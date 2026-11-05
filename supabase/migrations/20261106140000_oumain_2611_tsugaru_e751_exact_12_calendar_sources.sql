-- JR-East 2611: six regular Tsugaru / Super Tsugaru numbers in both
-- calendars. 12 historic train sources matched to current published number.
-- Historical stop CLOCKS are still not November 2026 verified.
-- Representative E751 PNG is a model, not a confirmed physical trainset.
-- https://timetables.jreast.co.jp/2611/timetable-v/258d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/258d2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/258u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/258u2.html
-- https://www.jreast.co.jp/train/express/tsugaru.html
BEGIN;
SELECT pg_advisory_xact_lock(2611751);
CREATE TABLE IF NOT EXISTS public.published_oumain_2611_tsugaru_number_roster (
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='OuMain'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN
 ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN
 ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_number text NOT NULL CHECK(train_number IN
 ('2021M','2022M','2041M','2042M','2043M','2044M')),
 source_template_id bigint NOT NULL UNIQUE REFERENCES public.manual_timetable_templates(id),
 source_stop_keys text[] NOT NULL,
 train_type_urn text NOT NULL CHECK(train_type_urn='odpt.TrainType:JR-East.LimitedExpress'),
 service_name text NOT NULL,
 vehicle_model text NOT NULL CHECK(vehicle_model='E751系'),
 png_reference text NOT NULL CHECK
 (png_reference='../images/列车/JR東日本/JR東日本_E751系.png'),
 official_source_url text NOT NULL,
 vehicle_source_url text NOT NULL DEFAULT
 'https://www.jreast.co.jp/train/express/tsugaru.html',
 stop_clock_status text NOT NULL DEFAULT 'historical_not_2611_verified'
 CHECK(stop_clock_status='historical_not_2611_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,calendar_urn,direction_urn,train_number),
 CHECK(cardinality(source_stop_keys) IN (14,18)),
 CHECK(source_stop_keys[1]=
   CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'Aomori' ELSE 'Akita' END),
 CHECK(source_stop_keys[cardinality(source_stop_keys)]=
   CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'Akita' ELSE 'Aomori' END)
);
ALTER TABLE public.published_oumain_2611_tsugaru_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_oumain_2611_tsugaru_number_roster IS
'Exact JR-East 2611 E751 family reference, 6 scheduled Tsugaru train numbers x 2 calendars. This does NOT certify original historical stop clock times, operating consist or actual rolling-stock identity.';
WITH scope AS (
 SELECT s.*,t.train_type_urn AS historical_type,
 t.vehicle_type_label,t.source_occurrence,t.railway_urn
 FROM public.published_oumain_2611_source_scope s
 JOIN public.manual_timetable_templates t ON t.id=s.source_template_id
 WHERE s.line_key='OuMain' AND s.segment_key='tsugaru_limited_express_candidate'
)
INSERT INTO public.published_oumain_2611_tsugaru_number_roster(
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,source_stop_keys,train_type_urn,
 service_name,vehicle_model,png_reference,official_source_url)
SELECT '2611','OuMain',calendar_urn,direction_urn,train_number,
 source_template_id,source_stop_keys,'odpt.TrainType:JR-East.LimitedExpress',
 CASE train_number
 WHEN '2021M' THEN 'スーパーつがる1号'
 WHEN '2022M' THEN 'スーパーつがる2号'
 WHEN '2041M' THEN 'つがる41号'
 WHEN '2042M' THEN 'つがる42号'
 WHEN '2043M' THEN 'つがる43号'
 WHEN '2044M' THEN 'つがる44号' END,
 'E751系','../images/列车/JR東日本/JR東日本_E751系.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/258'||
 CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html'
FROM scope
WHERE historical_type='odpt.TrainType:JR-East.Local'
 AND vehicle_type_label='701系 / E721系'
 AND source_occurrence=0
 AND railway_urn='odpt.Railway:JR-East.OuMain'
 AND (substring(train_number FROM '^([0-9]+)')::int % 2) =
 CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 0 ELSE 1 END
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_number_evidence(
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,'train_number_only'
FROM public.published_oumain_2611_tsugaru_number_roster
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_png_number_ranges(
 edition,line_key,segment_key,min_number,max_number,suffix,
 vehicle_model,png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','OuMain','akita_aomori_super_tsugaru_e751',2021,2022,'M',
  'E751系','../images/列车/JR東日本/JR東日本_E751系.png',
  'https://www.jreast.co.jp/train/express/tsugaru.html',true,false),
 ('2611','OuMain','akita_aomori_tsugaru_e751',2041,2044,'M',
  'E751系','../images/列车/JR東日本/JR東日本_E751系.png',
  'https://www.jreast.co.jp/train/express/tsugaru.html',true,false)
ON CONFLICT DO NOTHING;
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.published_oumain_2611_tsugaru_number_roster)<>12
 OR (SELECT count(*) FROM public.published_train_number_evidence
   WHERE edition='2611' AND line_key='OuMain')<>12
 OR (SELECT count(*) FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='OuMain')<>2
 OR EXISTS(SELECT 1 FROM public.published_oumain_2611_tsugaru_number_roster p
   JOIN public.manual_timetable_templates t ON t.id=p.source_template_id
   WHERE t.calendar_urn<>p.calendar_urn OR t.train_number<>p.train_number
      OR t.direction_urn<>p.direction_urn OR t.line_key<>'OuMain')
 THEN RAISE EXCEPTION 'Tsugaru E751 2611 official number evidence failed';
 END IF;
END $check$;
COMMIT;