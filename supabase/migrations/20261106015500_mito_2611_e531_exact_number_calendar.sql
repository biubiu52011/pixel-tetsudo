-- 水戸線 Mito 2026-11 (JR East 2611) exact numbered fleet-reference roster.
-- Ordinary M numbers: 32 Inbound (u), 30 Outbound (d) on each calendar.
-- https://timetables.jreast.co.jp/2611/timetable-v/246u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/246u2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/246d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/246d2.html
-- 2019 JR-East transition E501 -> E531 (5 cars):
-- https://www.jreast.co.jp/mito/press/181214/press_01m.pdf
-- 9074/9075M: 10/31-only limited expresses, NOT November locals;
-- 9785M: imported but NO 2611 November official local-number proof.
-- Duplicated template rows are time VARIANTS, not extra trains.
-- Timetable clocks were imported historically; they are not 2611 certified.
BEGIN;
SELECT pg_advisory_xact_lock(2611246);
CREATE TABLE IF NOT EXISTS public.published_mito_2611_number_roster(
  edition text NOT NULL CHECK(edition='2611'),
  line_key text NOT NULL CHECK(line_key='Mito'),
  train_number text NOT NULL CHECK(train_number ~ '^[0-9]{3,4}M$'),
  calendar_urn text NOT NULL CHECK(calendar_urn IN
    ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
  direction_urn text NOT NULL CHECK(direction_urn IN
    ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
  train_type_urn text NOT NULL CHECK(train_type_urn='odpt.TrainType:JR-East.Local'),
  source_template_id bigint NOT NULL,
  source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys) BETWEEN 2 AND 16),
  date_variant_template_ids jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK(jsonb_typeof(date_variant_template_ids)='object'),
  vehicle_model text NOT NULL CHECK(vehicle_model='E531系'),
  png_reference text NOT NULL CHECK(png_reference=
    '../images/列车/JR東日本/JR東日本_E531系_水戸線.png'),
  official_source_url text NOT NULL,
  fleet_source_url text NOT NULL,
  stop_clock_status text NOT NULL DEFAULT 'historical_not_2611_verified'
    CHECK(stop_clock_status='historical_not_2611_verified'),
  reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
  actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
  PRIMARY KEY(edition,line_key,train_number,calendar_urn,direction_urn)
);
ALTER TABLE public.published_mito_2611_number_roster ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_mito_2611_number_roster IS
'2026/11 62 exact regular M numbers on each calendar. E531 illustrative family ONLY, not confirmed E531 subseries or actual carset. 756M 11/23, 763M 11/1,8,21,28,29 use single dated timetable variants. All other duplicate source rows and Oct 31 limited expresses excluded.';

CREATE TEMP TABLE _mito2611_expected(n text PRIMARY KEY,dir text NOT NULL)
 ON COMMIT DROP;
INSERT INTO _mito2611_expected(n,dir) VALUES
-- Inbound 32: 246u1 / u2
('1720M','Inbound'),('722M','Inbound'),('1724M','Inbound'),
('726M','Inbound'),('2728M','Inbound'),('730M','Inbound'),
('1732M','Inbound'),('2734M','Inbound'),('736M','Inbound'),
('1738M','Inbound'),('740M','Inbound'),('1742M','Inbound'),
('744M','Inbound'),('746M','Inbound'),('748M','Inbound'),
('750M','Inbound'),('752M','Inbound'),('754M','Inbound'),
('756M','Inbound'),('758M','Inbound'),('760M','Inbound'),
('762M','Inbound'),('764M','Inbound'),('766M','Inbound'),
('2768M','Inbound'),('1770M','Inbound'),('772M','Inbound'),
('1774M','Inbound'),('776M','Inbound'),('778M','Inbound'),
('1780M','Inbound'),('782M','Inbound'),
-- Outbound 30: 246d1 / d2
('721M','Outbound'),('723M','Outbound'),('725M','Outbound'),
('2729M','Outbound'),('731M','Outbound'),('1733M','Outbound'),
('735M','Outbound'),('737M','Outbound'),('1739M','Outbound'),
('741M','Outbound'),('743M','Outbound'),('745M','Outbound'),
('747M','Outbound'),('749M','Outbound'),('751M','Outbound'),
('753M','Outbound'),('755M','Outbound'),('757M','Outbound'),
('759M','Outbound'),('761M','Outbound'),('763M','Outbound'),
('765M','Outbound'),('1767M','Outbound'),('769M','Outbound'),
('771M','Outbound'),('1773M','Outbound'),('775M','Outbound'),
('1777M','Outbound'),('779M','Outbound'),('1781M','Outbound');
CREATE TEMP TABLE _mito2611_source ON COMMIT DROP AS
SELECT t.* FROM public.manual_timetable_templates t
 JOIN _mito2611_expected e ON e.n=t.train_number AND
   t.direction_urn='odpt.RailDirection:'||e.dir
 WHERE t.line_key='Mito' AND
   t.railway_urn='odpt.Railway:JR-East.Mito' AND
   t.calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday');

DO $check$
BEGIN
  IF (SELECT count(*) FROM _mito2611_expected)<>62 OR
     (SELECT count(*) FROM _mito2611_expected WHERE dir='Inbound')<>32 OR
     (SELECT count(*) FROM _mito2611_expected WHERE dir='Outbound')<>30 OR
     (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Mito')<>134 OR
     (SELECT count(*) FROM _mito2611_source)<>131 OR
     (SELECT count(*) FROM _mito2611_source WHERE source_occurrence=0)<>124 OR
     EXISTS(SELECT 1 FROM _mito2611_source WHERE
       train_type_urn<>'odpt.TrainType:JR-East.Local' OR
       vehicle_type_label<>'E501系 / E531系' OR
       (substring(train_number FROM '^[0-9]+')::int % 2)
       <>CASE WHEN direction_urn='odpt.RailDirection:Inbound' THEN 0 ELSE 1 END) OR
     EXISTS(SELECT 1 FROM
       (SELECT calendar_urn,count(*) c,
          count(distinct train_number) n
        FROM _mito2611_source WHERE source_occurrence=0
        GROUP BY calendar_urn) s WHERE c<>62 OR n<>62) OR
     (SELECT count(*) FROM _mito2611_source
       WHERE calendar_urn='odpt.Calendar:SaturdayHoliday'
       AND train_number='756M' AND source_occurrence=1)<>1 OR
     (SELECT count(*) FROM _mito2611_source
       WHERE calendar_urn='odpt.Calendar:SaturdayHoliday'
       AND train_number='763M' AND source_occurrence=2)<>1 OR
     (SELECT count(*) FROM _mito2611_source
       WHERE calendar_urn='odpt.Calendar:SaturdayHoliday'
       AND train_number='763M' AND source_occurrence=3)<>1
  THEN RAISE EXCEPTION
    'Mito 2611 official 62 numbers/2 calendars or dated source variants mismatch';
  END IF;
END $check$;
WITH chosen AS (
 SELECT t.*,
  ARRAY(SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',3)
     FROM public.manual_timetable_template_stops s
     WHERE s.template_id=t.id ORDER BY s.stop_sequence) AS stop_keys
 FROM _mito2611_source t WHERE t.source_occurrence=0
)
INSERT INTO public.published_mito_2611_number_roster(
 edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 source_template_id,source_stop_keys,date_variant_template_ids,
 vehicle_model,png_reference,official_source_url,fleet_source_url)
SELECT '2611','Mito',t.train_number,t.calendar_urn,t.direction_urn,t.train_type_urn,
 t.id,t.stop_keys,
 CASE WHEN t.calendar_urn='odpt.Calendar:SaturdayHoliday' AND
         t.train_number='756M' THEN
   jsonb_build_object('2026-11-23',
     (SELECT v.id FROM _mito2611_source v WHERE v.calendar_urn=t.calendar_urn
       AND v.train_number='756M' AND v.source_occurrence=1))
 WHEN t.calendar_urn='odpt.Calendar:SaturdayHoliday' AND
         t.train_number='763M' THEN
   jsonb_build_object(
     '2026-11-01',(SELECT v.id FROM _mito2611_source v WHERE
       v.calendar_urn=t.calendar_urn AND v.train_number='763M' AND v.source_occurrence=2),
     '2026-11-08',(SELECT v.id FROM _mito2611_source v WHERE
       v.calendar_urn=t.calendar_urn AND v.train_number='763M' AND v.source_occurrence=2),
     '2026-11-21',(SELECT v.id FROM _mito2611_source v WHERE
       v.calendar_urn=t.calendar_urn AND v.train_number='763M' AND v.source_occurrence=3),
     '2026-11-28',(SELECT v.id FROM _mito2611_source v WHERE
       v.calendar_urn=t.calendar_urn AND v.train_number='763M' AND v.source_occurrence=3),
     '2026-11-29',(SELECT v.id FROM _mito2611_source v WHERE
       v.calendar_urn=t.calendar_urn AND v.train_number='763M' AND v.source_occurrence=3))
 ELSE '{}'::jsonb END,
 'E531系','../images/列车/JR東日本/JR東日本_E531系_水戸線.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/246'||
 CASE WHEN t.direction_urn='odpt.RailDirection:Inbound' THEN 'u' ELSE 'd' END||
 CASE WHEN t.calendar_urn='odpt.Calendar:Weekday' THEN '1' ELSE '2' END||'.html',
 'https://www.jreast.co.jp/mito/press/181214/press_01m.pdf'
FROM chosen t
ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_png_number_ranges(
 edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
 png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES('2611','Mito','mito_regular_local',721,2785,'M','E531系',
 '../images/列车/JR東日本/JR東日本_E531系_水戸線.png',
 'https://timetables.jreast.co.jp/2611/timetable-v/246d1.html',
 true,false) ON CONFLICT DO NOTHING;
INSERT INTO public.published_train_number_evidence(
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,'train_number_only'
FROM public.published_mito_2611_number_roster
ON CONFLICT DO NOTHING;
DO $after$
BEGIN
 IF (SELECT count(*) FROM public.published_mito_2611_number_roster)<>124 OR
    (SELECT count(*) FROM public.published_train_number_evidence
      WHERE edition='2611' AND line_key='Mito')<>124 OR
    (SELECT count(*) FROM public.published_train_png_number_ranges
      WHERE edition='2611' AND line_key='Mito')<>1 OR
    EXISTS(SELECT 1 FROM public.published_mito_2611_number_roster
      WHERE train_number IN('9074M','9075M','9785M') OR
        source_template_id IS NULL OR
        source_stop_keys @> ARRAY['']::text[])
 THEN RAISE EXCEPTION 'Mito 2611 published source roster count or type inconsistent';
 END IF;
END $after$;
COMMIT;
