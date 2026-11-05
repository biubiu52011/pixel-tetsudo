-- 大船渡線 (Ofunato) 2026-11 public TRAIN numbers and vehicle PNG.
-- 269u1/u2/d1/d2 combine two DIFFERENT transport modes.
-- 321-340 D: rail Ichinoseki--Kesennuma, ordinary KiHa110 since Mar 2025.
-- 8327D/8336D: KiHa100 POKEMON with YOU, designated holiday dates,
-- NO approved corresponding PNG in the existing gallery.
-- F & 1918K: BRT buses Kesennuma--Sakari, never diesel train PNG.
-- 9327D/9336D Hinabi: Feb 27-28 2027 ONLY, not November.
-- Official https://timetables.jreast.co.jp/2611/timetable-v/269d1.html
--          https://timetables.jreast.co.jp/2611/timetable-v/269d2.html
--          https://timetables.jreast.co.jp/2611/timetable-v/269u1.html
--          https://timetables.jreast.co.jp/2611/timetable-v/269u2.html
-- KiHa110 (regular) https://media.jreast.co.jp/articles/4399
-- This database has HISTORICAL clocks: no November per-stop validation.
BEGIN;
SELECT pg_advisory_xact_lock(2611269);
CREATE TABLE IF NOT EXISTS public.published_ofunato_2611_number_roster(
  edition text NOT NULL CHECK(edition='2611'),
  line_key text NOT NULL CHECK(line_key='Ofunato'),
  source_template_id bigint NOT NULL,
  train_number text NOT NULL CHECK(train_number ~ '^[0-9]+[DFK]$'),
  calendar_urn text NOT NULL CHECK(calendar_urn IN
    ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
  direction_urn text NOT NULL CHECK(direction_urn IN
    ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
  original_train_type_urn text NOT NULL,
  published_train_type_urn text NOT NULL,
  transport_scope text NOT NULL CHECK(transport_scope IN
    ('rail_regular','rail_pokemon','brt_only')),
  operating_dates date[] NOT NULL DEFAULT '{}'::date[],
  source_stop_keys text[] NOT NULL DEFAULT '{}'::text[],
  vehicle_model text,
  png_reference text,
  service_name text,
  official_source_url text NOT NULL,
  fleet_source_url text,
  stop_clock_status text NOT NULL
    DEFAULT 'historical_not_2611_verified'
    CHECK(stop_clock_status='historical_not_2611_verified'),
  reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
  actual_vehicle_confirmed boolean NOT NULL DEFAULT false
    CHECK(NOT actual_vehicle_confirmed),
  PRIMARY KEY (edition,line_key,source_template_id),
  CHECK (
    (transport_scope='brt_only' AND train_number ~ '[FK]$' AND
      cardinality(source_stop_keys)=0 AND vehicle_model IS NULL AND
      png_reference IS NULL AND cardinality(operating_dates)=0)
    OR
    (transport_scope='rail_regular' AND train_number ~ '^3[0-9]{2}D$'
      AND cardinality(source_stop_keys) BETWEEN 9 AND 14 AND
      cardinality(operating_dates)=0 AND
      vehicle_model='キハ110系' AND
      png_reference='../images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png')
    OR
    (transport_scope='rail_pokemon' AND
      train_number IN('8327D','8336D') AND
      cardinality(source_stop_keys)=5 AND
      cardinality(operating_dates)=11 AND
      published_train_type_urn='odpt.TrainType:JR-East.Rapid' AND
      vehicle_model='キハ100系（POKÉMON with YOU）' AND
      png_reference IS NULL)
  )
);
ALTER TABLE public.published_ofunato_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_ofunato_2611_number_roster IS
'JR East 2611: 159 SQL source records include 123 BRT (F/K, no train PNG), 34 ordinary railway D (KiHa110 representative gallery), and 2 weekend/holiday Pokemon KiHa100 railway D (no authentic PNG). Historical SQL clocks not certified 2611.';

CREATE TEMP TABLE _ofunato2611_rail_source ON COMMIT DROP AS
SELECT t.*,
  ARRAY(SELECT split_part(
    coalesce(s.departure_station_urn,s.arrival_station_urn),'.',3)
    FROM public.manual_timetable_template_stops s
    WHERE s.template_id=t.id ORDER BY s.stop_sequence) as keys
FROM public.manual_timetable_templates t
WHERE t.line_key='Ofunato' AND
  t.railway_urn='odpt.Railway:JR-East.Ofunato';
DO $validate$
BEGIN
 IF (SELECT count(*) FROM _ofunato2611_rail_source)<>159 OR
   (SELECT count(*) FROM _ofunato2611_rail_source
     WHERE calendar_urn='odpt.Calendar:Weekday')<>83 OR
   (SELECT count(*) FROM _ofunato2611_rail_source
     WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>76 OR
   (SELECT count(*) FROM _ofunato2611_rail_source WHERE train_number ~ 'D$')<>36 OR
   (SELECT count(*) FROM _ofunato2611_rail_source WHERE train_number ~ '[FK]$')<>123 OR
   (SELECT count(*) FROM _ofunato2611_rail_source WHERE train_number IN
     ('8327D','8336D'))<>2 OR
   (SELECT count(*) FROM _ofunato2611_rail_source WHERE
     train_number ~ '^3[0-9]{2}D$')<>34 OR
   EXISTS(SELECT 1 FROM _ofunato2611_rail_source WHERE
     source_occurrence<>0 OR
     (train_number ~ '[FK]$' AND vehicle_type_label IS NOT NULL) OR
     (train_number ~ 'D$' AND vehicle_type_label<>'キハ110系') OR
     (train_number ~ 'D$' AND cardinality(keys) NOT IN(5,9,14)) OR
     (train_number ~ 'D$' AND keys @> ARRAY['']::text[]) OR
     (train_number ~ 'D$' AND substring(train_number from '^[0-9]+')::int%2
       <>CASE WHEN direction_urn='odpt.RailDirection:Inbound'
         THEN 0 ELSE 1 END))
 THEN RAISE EXCEPTION 'Ofunato 2611 source, BRT/rail or train-number source shape changed';
 END IF;
END $validate$;
INSERT INTO public.published_ofunato_2611_number_roster(
  edition,line_key,source_template_id,train_number,calendar_urn,direction_urn,
  original_train_type_urn,published_train_type_urn,transport_scope,
  operating_dates,source_stop_keys,vehicle_model,png_reference,service_name,
  official_source_url,fleet_source_url)
SELECT '2611','Ofunato',t.id,t.train_number,t.calendar_urn,t.direction_urn,
  t.train_type_urn,
  CASE WHEN t.train_number IN('8327D','8336D') THEN
    'odpt.TrainType:JR-East.Rapid' ELSE t.train_type_urn END,
  CASE WHEN t.train_number ~ '[FK]$' THEN 'brt_only'
       WHEN t.train_number IN('8327D','8336D') THEN 'rail_pokemon'
       ELSE 'rail_regular' END,
  CASE WHEN t.train_number IN('8327D','8336D') THEN
    ARRAY['2026-11-01','2026-11-03','2026-11-07','2026-11-08',
      '2026-11-14','2026-11-15','2026-11-21','2026-11-22',
      '2026-11-23','2026-11-28','2026-11-29']::date[]
    ELSE '{}'::date[] END,
  CASE WHEN t.train_number ~ '[FK]$' THEN '{}'::text[] ELSE t.keys END,
  CASE WHEN t.train_number ~ '[FK]$' THEN NULL
       WHEN t.train_number IN('8327D','8336D') THEN
         'キハ100系（POKÉMON with YOU）'
       ELSE 'キハ110系' END,
  CASE WHEN t.train_number ~ 'D$'
         AND t.train_number NOT IN('8327D','8336D') THEN
         '../images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png'
       ELSE NULL END,
  CASE WHEN t.train_number IN('8327D','8336D') THEN
       'ポケモントレイン気仙沼号' ELSE NULL END,
  'https://timetables.jreast.co.jp/2611/timetable-v/269'||
    CASE WHEN t.direction_urn='odpt.RailDirection:Inbound'
      THEN 'u' ELSE 'd' END||
    CASE WHEN t.calendar_urn='odpt.Calendar:Weekday'
      THEN '1' ELSE '2' END||'.html',
  CASE WHEN t.train_number IN('8327D','8336D') THEN
    'https://timetables.jreast.co.jp/2611/train/075/076751.html'
    WHEN t.train_number ~ 'D$' THEN
    'https://media.jreast.co.jp/articles/4399'
    ELSE NULL END
FROM _ofunato2611_rail_source t
ON CONFLICT DO NOTHING;

INSERT INTO public.published_train_png_number_ranges(
 edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES('2611','Ofunato','ichinoseki_kesennuma_regular_rail',
 321,340,'D','キハ110系',
 '../images/列车/JR東日本/JR東日本_キハ110系（大船渡線）.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/269d1.html',
 true,false)
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_number_evidence(
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT edition,line_key,calendar_urn,direction_urn,train_number,
  source_template_id,official_source_url,'train_number_only'
FROM public.published_ofunato_2611_number_roster
WHERE transport_scope IN('rail_regular','rail_pokemon')
ON CONFLICT DO NOTHING;

DO $after$
BEGIN
 IF (SELECT count(*) FROM public.published_ofunato_2611_number_roster)<>159 OR
   (SELECT count(*) FROM public.published_ofunato_2611_number_roster WHERE
     transport_scope='brt_only')<>123 OR
   (SELECT count(*) FROM public.published_ofunato_2611_number_roster WHERE
     transport_scope='rail_regular' AND png_reference IS NOT NULL)<>34 OR
   (SELECT count(*) FROM public.published_ofunato_2611_number_roster WHERE
     transport_scope='rail_pokemon' AND png_reference IS NULL)<>2 OR
   (SELECT count(*) FROM public.published_train_number_evidence WHERE
     edition='2611' AND line_key='Ofunato')<>36 OR
   (SELECT count(*) FROM public.published_train_png_number_ranges WHERE
     edition='2611' AND line_key='Ofunato')<>1
 THEN RAISE EXCEPTION 'Ofunato 2611 transport scope or published evidence count mismatch';
 END IF;
END $after$;
COMMIT;
