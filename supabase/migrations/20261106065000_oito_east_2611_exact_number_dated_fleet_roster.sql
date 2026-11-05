-- JR East ONLY, 大糸線 Matsumoto -- Minami-Otari, November 2026.
-- The Oito SQL source also contains JR-WEST diesel 4xxD and old 790x buses.
-- DO NOT migrate, rewrite, or filter either category in this migration.
-- Published official number sheets: 230u1/u2/d1/d2.
-- 8361D/8362D Resort View Furusato only on 18 Nov days.
-- 8041M/8042M Hakuba express & 8352M/8353M local: Nov 1 and Nov 21-23.
-- 9095M December-era source only, no November estimated train.
-- Historical SQL fleet labels are REFERENCES, NOT observed car identities.
BEGIN;
SELECT pg_advisory_xact_lock(2611230);
CREATE TABLE IF NOT EXISTS public.published_oito_east_2611_number_roster (
  edition text NOT NULL CHECK(edition='2611'),
  line_key text NOT NULL CHECK(line_key='Oito'),
  source_template_id bigint NOT NULL,
  train_number text NOT NULL CHECK(train_number ~ '^[0-9]+[MD]$'),
  calendar_urn text NOT NULL CHECK(calendar_urn IN
    ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
  direction_urn text NOT NULL CHECK(direction_urn IN
    ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
  train_type_urn text NOT NULL,
  original_vehicle_label text,
  service_kind text NOT NULL CHECK(service_kind IN
    ('regular','resort_furusato','hakuba_limited','hakuba_local','december_only')),
  operating_dates date[] NOT NULL DEFAULT '{}'::date[],
  source_stop_keys text[] NOT NULL,
  vehicle_model text,
  png_reference text,
  official_source_url text NOT NULL,
  fleet_source_url text,
  stop_clock_status text NOT NULL DEFAULT 'historical_not_2611_verified'
    CHECK(stop_clock_status='historical_not_2611_verified'),
  reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
  actual_vehicle_confirmed boolean NOT NULL DEFAULT false
    CHECK(NOT actual_vehicle_confirmed),
  PRIMARY KEY (edition,line_key,source_template_id),
  UNIQUE(edition,line_key,calendar_urn,direction_urn,train_number),
  CHECK(cardinality(source_stop_keys) BETWEEN 4 AND 33),
  CHECK(
    (service_kind='regular' AND cardinality(operating_dates)=0) OR
    (service_kind='resort_furusato' AND cardinality(operating_dates)=18
       AND train_number IN('8361D','8362D')) OR
    (service_kind IN('hakuba_limited','hakuba_local')
       AND cardinality(operating_dates)=4) OR
    (service_kind='december_only' AND train_number='9095M'
       AND cardinality(operating_dates)=0)
  ),
  CHECK (
    (vehicle_model IS NULL AND png_reference IS NULL) OR
    (vehicle_model IS NOT NULL AND (png_reference IS NULL OR
       (vehicle_model='211系（長野地区）' AND
        png_reference='../images/列车/JR東日本/JR東日本_211系_長野色.png') OR
       (vehicle_model='E127系100番台' AND
        png_reference='../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png') OR
       (vehicle_model='E353系' AND
        png_reference='../images/列车/JR東日本/JR東日本_E353系.png') OR
       (vehicle_model='HB-E300系（リゾートビューふるさと）' AND
        png_reference='../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png')))
  )
);
ALTER TABLE public.published_oito_east_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_oito_east_2611_number_roster IS
'JR-East-only Matsumoto–Minami-Otari: 141 original SQL template identities, dated 2611 official number proof, 4 possible illustration families; excludes JR-West 4xxD and former 790x buses (unchanged). Do not infer actual vehicle formations or 2611 minute-by-minute validation.';

CREATE TEMP TABLE _oito_east_sources ON COMMIT DROP AS
SELECT t.*, ARRAY(
 SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',3)
 FROM public.manual_timetable_template_stops s
 WHERE s.template_id=t.id ORDER BY s.stop_sequence
) AS source_stops
FROM public.manual_timetable_templates t
WHERE t.line_key='Oito' AND
 t.railway_urn='odpt.Railway:JR-East.Oito' AND
 (t.train_number ~ 'M$' OR t.train_number IN('8361D','8362D'));

DO $before$
BEGIN
  IF (SELECT count(*) FROM _oito_east_sources)<>141 OR
    (SELECT count(*) FROM _oito_east_sources WHERE train_number ~ 'M$')<>137 OR
    (SELECT count(*) FROM _oito_east_sources WHERE train_number IN('8361D','8362D'))<>4 OR
    (SELECT count(*) FROM _oito_east_sources
      WHERE calendar_urn='odpt.Calendar:Weekday')<>69 OR
    (SELECT count(*) FROM _oito_east_sources
      WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>72 OR
    (SELECT count(*) FROM _oito_east_sources WHERE vehicle_type_label IS NULL)<>2 OR
    EXISTS(SELECT 1 FROM _oito_east_sources WHERE source_occurrence<>0 OR
      cardinality(source_stops) NOT BETWEEN 4 AND 33 OR
      (substring(train_number FROM '^[0-9]+')::int%2) <>
        CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 0 ELSE 1 END OR
      train_type_urn NOT IN ('odpt.TrainType:JR-East.Local',
        'odpt.TrainType:JR-East.Rapid',
        'odpt.TrainType:JR-East.LimitedExpress') OR
      (train_number ~ 'D$' AND vehicle_type_label <>
        'HB-E300系（リゾートビューふるさと）') OR
      source_stops && ARRAY['Kita-Otari','Naka-Otsari','Itoigawa','Nechi']::text[])
  THEN RAISE EXCEPTION 'Oito JR-East source-shape changed: audit instead of patching';
  END IF;
END $before$;

INSERT INTO public.published_oito_east_2611_number_roster(
 edition,line_key,source_template_id,train_number,calendar_urn,direction_urn,
 train_type_urn,original_vehicle_label,service_kind,operating_dates,
 source_stop_keys,vehicle_model,png_reference,official_source_url,fleet_source_url)
SELECT '2611','Oito',t.id,t.train_number,t.calendar_urn,t.direction_urn,
 t.train_type_urn,t.vehicle_type_label,
 CASE WHEN t.train_number IN('8361D','8362D') THEN 'resort_furusato'
      WHEN t.train_number IN('8041M','8042M') THEN 'hakuba_limited'
      WHEN t.train_number IN('8352M','8353M') THEN 'hakuba_local'
      WHEN t.train_number='9095M' THEN 'december_only'
      ELSE 'regular' END,
 CASE WHEN t.train_number IN('8361D','8362D') THEN
   ARRAY['2026-11-01','2026-11-02','2026-11-03','2026-11-06',
     '2026-11-08','2026-11-09','2026-11-13','2026-11-14',
     '2026-11-15','2026-11-16','2026-11-20','2026-11-21',
     '2026-11-22','2026-11-23','2026-11-27','2026-11-28',
     '2026-11-29','2026-11-30']::date[]
 WHEN t.train_number IN('8041M','8042M','8352M','8353M') THEN
   ARRAY['2026-11-01','2026-11-21','2026-11-22','2026-11-23']::date[]
 ELSE '{}'::date[] END,
 t.source_stops,
 CASE t.vehicle_type_label
  WHEN '211系' THEN '211系（長野地区）'
  WHEN 'E127系100番台' THEN 'E127系100番台'
  WHEN 'E353系（あずさ）' THEN 'E353系'
  WHEN 'HB-E300系（リゾートビューふるさと）' THEN
    'HB-E300系（リゾートビューふるさと）'
  ELSE NULL END,
 CASE WHEN t.train_number='9095M' THEN NULL
  WHEN t.vehicle_type_label='211系' THEN
    '../images/列车/JR東日本/JR東日本_211系_長野色.png'
  WHEN t.vehicle_type_label='E127系100番台' THEN
    '../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png'
  WHEN t.vehicle_type_label='E353系（あずさ）' THEN
    '../images/列车/JR東日本/JR東日本_E353系.png'
  WHEN t.vehicle_type_label='HB-E300系（リゾートビューふるさと）' THEN
    '../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png'
  ELSE NULL END,
 'https://timetables.jreast.co.jp/2611/timetable-v/230'||
   CASE WHEN t.direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
   CASE WHEN t.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html',
 CASE t.vehicle_type_label
  WHEN 'E353系（あずさ）' THEN 'https://www.jreast.co.jp/train/express/azusa.html'
  WHEN 'HB-E300系（リゾートビューふるさと）' THEN
    'https://www.jreast.co.jp/train/fun/resortfuru.html'
  ELSE 'https://timetables.jreast.co.jp/2611/timetable-v/230d1.html'
 END
FROM _oito_east_sources t
ON CONFLICT DO NOTHING;

INSERT INTO public.published_train_png_number_ranges(
 edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
 ('2611','Oito','east_211_family',1522,3259,'M',
  '211系（長野地区）',
  '../images/列车/JR東日本/JR東日本_211系_長野色.png',
  'https://timetables.jreast.co.jp/2611/timetable-v/230u1.html',true,false),
 ('2611','Oito','east_e127_100_family',3111,8353,'M',
  'E127系100番台',
  '../images/列车/JR東日本/JR東日本_E127系_100番台_長野色.png',
  'https://timetables.jreast.co.jp/2611/timetable-v/230d1.html',true,false),
 ('2611','Oito','east_e353_azusa_hakuba',5,8042,'M',
  'E353系',
  '../images/列车/JR東日本/JR東日本_E353系.png',
  'https://timetables.jreast.co.jp/2611/timetable-v/230d2.html',true,false),
 ('2611','Oito','east_hbe300_resort',8361,8362,'D',
  'HB-E300系（リゾートビューふるさと）',
  '../images/列车/JR東日本/JR東日本_HB-E300系_リゾートビューふるさと.png',
  'https://timetables.jreast.co.jp/2611/timetable-v/230d1.html',true,false)
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_number_evidence(
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,'train_number_only'
FROM public.published_oito_east_2611_number_roster
WHERE service_kind<>'december_only'
ON CONFLICT DO NOTHING;

DO $after$
BEGIN
 IF (SELECT count(*) FROM public.published_oito_east_2611_number_roster)<>141 OR
   (SELECT count(*) FROM public.published_oito_east_2611_number_roster
      WHERE service_kind='resort_furusato')<>4 OR
   (SELECT count(*) FROM public.published_oito_east_2611_number_roster
      WHERE service_kind IN('hakuba_limited','hakuba_local'))<>4 OR
   (SELECT count(*) FROM public.published_oito_east_2611_number_roster
      WHERE service_kind='december_only')<>1 OR
   (SELECT count(*) FROM public.published_oito_east_2611_number_roster
      WHERE png_reference IS NULL)<>3 OR
   (SELECT count(*) FROM public.published_train_number_evidence
      WHERE edition='2611' AND line_key='Oito')<>140 OR
   (SELECT count(*) FROM public.published_train_png_number_ranges
      WHERE edition='2611' AND line_key='Oito')<>4
 THEN RAISE EXCEPTION 'Oito JR-East exact roster counts do not match review';
 END IF;
END $after$;
COMMIT;