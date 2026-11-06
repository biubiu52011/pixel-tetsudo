-- Kabe Line: 87 obsolete source-only 12-stop synthetic schedules are not
-- the 2026-11 Hiroshima–Aki-Kameyama timetable. Never draw their 7001M–
-- 7087MH source numbers as contemporary train locations.
-- JR West: all Kabe services converted to 227 Red Wing by March 2019:
-- https://www.westjr.co.jp/press/article/items/181214_00_hiroshima.pdf
-- Published 2026-11 volume selected individual train references:
-- https://timetable.jr-odekake.net/train-timetable/139551?date=20261031
-- https://timetable.jr-odekake.net/train-timetable/140121?date=20261031
-- https://timetable.jr-odekake.net/train-timetable/140131?date=20261031
BEGIN;
CREATE TABLE IF NOT EXISTS public.published_jrwest_kabe_2611_source_quarantine (
 source_template_id bigint PRIMARY KEY REFERENCES public.manual_timetable_templates(id) ON DELETE CASCADE,
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'Kabe' CHECK(line_key='Kabe'),
 source_train_number text NOT NULL CHECK(source_train_number ~ '^70[0-9]{2}MH?$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 source_stop_keys text[] NOT NULL CHECK(cardinality(source_stop_keys)=12),
 source_path text NOT NULL DEFAULT 'data/timetables/Kabe-manual.js'
  CHECK(source_path='data/timetables/Kabe-manual.js'),
 source_clock_status text NOT NULL DEFAULT 'synthetic_4min_grid_not_2611'
  CHECK(source_clock_status='synthetic_4min_grid_not_2611'),
 reference_models text[] NOT NULL DEFAULT ARRAY['227系0番台（Red Wing）']::text[]
  CHECK(reference_models=ARRAY['227系0番台（Red Wing）']::text[]),
 fleet_source_url text NOT NULL DEFAULT 'https://www.westjr.co.jp/press/article/items/181214_00_hiroshima.pdf'
  CHECK(fleet_source_url='https://www.westjr.co.jp/press/article/items/181214_00_hiroshima.pdf'),
 png_paths text[] NOT NULL DEFAULT ARRAY[]::text[] CHECK(png_paths=ARRAY[]::text[]),
 number_date_verified boolean NOT NULL DEFAULT false CHECK(NOT number_date_verified),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 authorizes_2611_position boolean NOT NULL DEFAULT false CHECK(NOT authorizes_2611_position),
 CHECK((calendar_urn='odpt.Calendar:Weekday' AND source_train_number ~ '^70[0-9]{2}M$')
 OR(calendar_urn='odpt.Calendar:SaturdayHoliday' AND source_train_number ~ '^70[0-9]{2}MH$')),
 CHECK((direction_urn='odpt.RailDirection:Inbound' AND source_stop_keys[1]='Kabe' AND source_stop_keys[12]='Yokokawa')
 OR(direction_urn='odpt.RailDirection:Outbound' AND source_stop_keys[1]='Yokokawa' AND source_stop_keys[12]='Kabe'))
);
ALTER TABLE public.published_jrwest_kabe_2611_source_quarantine ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_jrwest_kabe_2611_source_quarantine IS
'87 historical synthetic 12-stop 4-minute-grid Kabe sources: never 2026-11 clocks or 227 physical formations, never PNG-authorized.';
WITH src AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,m.source_path,
 ARRAY(SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',4)
 FROM public.manual_timetable_template_stops s WHERE s.template_id=m.id ORDER BY s.stop_sequence) stops,
 ARRAY(SELECT COALESCE(s.departure_clock,s.arrival_clock)
 FROM public.manual_timetable_template_stops s WHERE s.template_id=m.id ORDER BY s.stop_sequence) clocks
 FROM public.manual_timetable_templates m WHERE m.line_key='Kabe'
 AND m.railway_urn='odpt.Railway:JR-West.Kabe'
 AND m.train_type_urn='odpt.TrainType:JR-West.Local'
 AND m.source_path='data/timetables/Kabe-manual.js'
 AND m.source_occurrence=0 AND m.source_revision_date IS NULL AND m.vehicle_type_label IS NULL
), checked AS(
 SELECT *,ARRAY(SELECT ((split_part(clocks[i+1],':',1)::int*60+
 split_part(clocks[i+1],':',2)::int)-(split_part(clocks[i],':',1)::int*60+
 split_part(clocks[i],':',2)::int)+1440)%1440
 FROM generate_subscripts(clocks,1) i WHERE i<cardinality(clocks)) gaps FROM src
)
INSERT INTO public.published_jrwest_kabe_2611_source_quarantine
 (source_template_id,source_train_number,calendar_urn,direction_urn,source_stop_keys,source_path)
SELECT id,train_number,calendar_urn,direction_urn,stops,source_path FROM checked
WHERE cardinality(stops)=12 AND cardinality(clocks)=12
 AND gaps[1:10]=ARRAY[4,4,4,4,4,4,4,4,4,4]::int[] AND gaps[11]=3
 AND ((calendar_urn='odpt.Calendar:Weekday' AND train_number ~ '^70[0-9]{2}M$')
 OR (calendar_urn='odpt.Calendar:SaturdayHoliday' AND train_number ~ '^70[0-9]{2}MH$'))
ON CONFLICT(source_template_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.published_jrwest_kabe_2611_number_reference (
 train_number text PRIMARY KEY CHECK(train_number ~ '^(740|866|868)M$'),
 edition text NOT NULL DEFAULT '2611' CHECK(edition='2611'),
 line_key text NOT NULL DEFAULT 'Kabe' CHECK(line_key='Kabe'),
 calendar_scope text NOT NULL CHECK(calendar_scope IN('daily','saturday_holiday')),
 official_timetable_issue text NOT NULL DEFAULT '2026-11' CHECK(official_timetable_issue='2026-11'),
 source_query_date date NOT NULL DEFAULT DATE '2026-10-31' CHECK(source_query_date=DATE '2026-10-31'),
 official_source_url text NOT NULL
 CHECK(official_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%?date=20261031'),
 origin_key text NOT NULL DEFAULT 'Aki-Kameyama' CHECK(origin_key='Aki-Kameyama'),
 destination_key text NOT NULL DEFAULT 'Hiroshima' CHECK(destination_key='Hiroshima'),
 line_fleet text NOT NULL DEFAULT '227系0番台（Red Wing）'
  CHECK(line_fleet='227系0番台（Red Wing）'),
 fleet_source_url text NOT NULL DEFAULT 'https://www.westjr.co.jp/press/article/items/181214_00_hiroshima.pdf',
 number_evidence text NOT NULL DEFAULT 'official_2026_11_issue_reference_only'
  CHECK(number_evidence='official_2026_11_issue_reference_only'),
 number_date_verified boolean NOT NULL DEFAULT false CHECK(NOT number_date_verified),
 stop_clocks_verified boolean NOT NULL DEFAULT false CHECK(NOT stop_clocks_verified),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false CHECK(NOT actual_vehicle_confirmed),
 png_paths text[] NOT NULL DEFAULT ARRAY[]::text[] CHECK(png_paths=ARRAY[]::text[]),
 authorizes_png boolean NOT NULL DEFAULT false CHECK(NOT authorizes_png),
 authorizes_2611_position boolean NOT NULL DEFAULT false CHECK(NOT authorizes_2611_position)
);
ALTER TABLE public.published_jrwest_kabe_2611_number_reference ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_jrwest_kabe_2611_number_reference IS
'Only 3 actual published JR Kabe service numbers from JR November 2026 issue; do not infer full dated 16-stop clocks or physical fleet.';
INSERT INTO public.published_jrwest_kabe_2611_number_reference
(train_number,calendar_scope,official_source_url) VALUES
('740M','saturday_holiday','https://timetable.jr-odekake.net/train-timetable/139551?date=20261031'),
('866M','daily','https://timetable.jr-odekake.net/train-timetable/140121?date=20261031'),
('868M','daily','https://timetable.jr-odekake.net/train-timetable/140131?date=20261031')
ON CONFLICT(train_number) DO NOTHING;
DO $assert$
BEGIN
 IF (SELECT count(*) FROM public.manual_timetable_templates WHERE line_key='Kabe')<>87
 OR (SELECT count(*) FROM public.published_jrwest_kabe_2611_source_quarantine)<>87
 OR (SELECT count(*) FROM public.published_jrwest_kabe_2611_source_quarantine WHERE calendar_urn='odpt.Calendar:Weekday')<>54
 OR (SELECT count(*) FROM public.published_jrwest_kabe_2611_source_quarantine WHERE calendar_urn='odpt.Calendar:SaturdayHoliday')<>33
 OR (SELECT count(*) FROM public.published_jrwest_kabe_2611_number_reference)<>3
 OR EXISTS(SELECT 1 FROM public.published_jrwest_kabe_2611_source_quarantine
   WHERE authorizes_2611_position OR authorizes_png OR number_date_verified OR actual_vehicle_confirmed)
 OR EXISTS(SELECT 1 FROM public.published_jrwest_kabe_2611_number_reference
   WHERE authorizes_2611_position OR authorizes_png OR number_date_verified OR actual_vehicle_confirmed)
 THEN RAISE EXCEPTION 'Kabe legacy scope / 3 official numbers changed'; END IF;
END $assert$;
COMMIT;