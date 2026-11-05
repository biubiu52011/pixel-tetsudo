-- JR-WEST 大糸線 (OitoWest), 南小谷--糸魚川, 2026 November.
-- This is a new independent JR-West company line; Oito remains JR-East.
-- Official JR-West:
-- https://timetable.jr-odekake.net/line-timetable/2846 (Itoigawa->Minami)
-- https://timetable.jr-odekake.net/line-timetable/2845 (Minami->Itoigawa)
-- 19 official D numbered services; source SQL only knows 14 services,
-- and only their three southern mountain-side STOPS (NOT full route).
-- 7901-7906 were through Oct 31 bus replacements; no Nov train.
-- No authentic Okayama/orange-red Oito KiHa120 PNG is in current gallery.
BEGIN;
SELECT pg_advisory_xact_lock(26112845);

INSERT INTO public.railway_lines (
 id,odpt_operator,odpt_railway,odpt_base_url,timetable_operator,
 timetable_api_enabled,realtime_position_api_enabled,
 sql_planned_fallback_enabled
)
VALUES('OitoWest',NULL,NULL,NULL,'JR-West',false,false,true)
ON CONFLICT(id) DO NOTHING;

-- Only legacy JR-WEST source trains/buses are moved. Never mutate JR-East
-- M-number trains, 8361/8362D, or the 141-entry 2611 East-only roster.
CREATE TEMP TABLE _west_moved_source ON COMMIT DROP AS
SELECT t.* FROM public.manual_timetable_templates t
WHERE t.line_key='Oito' AND
 (t.train_number ~ '^4[0-9]{2}D$' OR t.train_number ~ '^790[1-6]$');
DO $check_before$
BEGIN
 IF (SELECT count(*) FROM _west_moved_source)<>40 OR
    (SELECT count(*) FROM _west_moved_source
     WHERE train_number ~ '^4[0-9]{2}D$')<>28 OR
    (SELECT count(*) FROM _west_moved_source
     WHERE train_number ~ '^790[1-6]$')<>12 OR
    EXISTS(SELECT 1 FROM _west_moved_source WHERE
      railway_urn<>'odpt.Railway:JR-East.Oito' OR
      (train_number ~ 'D$' AND vehicle_type_label<>'キハ120形') OR
      (train_number ~ '^790' AND vehicle_type_label IS NOT NULL) OR
      source_occurrence<>0)
 THEN RAISE EXCEPTION 'Oito legacy West source changed; refuse broad relocation';
 END IF;
END $check_before$;

UPDATE public.manual_timetable_templates t SET
 line_key='OitoWest',
 railway_urn='odpt.Railway:JR-West.Oito',
 train_type_urn='odpt.TrainType:JR-West.Local',
 destination_urns=ARRAY(
  SELECT replace(replace(x,'odpt.Station:JR-East.',
    'odpt.Station:JR-West.'),'Naka-Otsari','Nakatsuchi')
  FROM unnest(t.destination_urns) x),
 vehicle_type_label=CASE WHEN t.train_number ~ 'D$'
   THEN 'キハ120形300番台（大糸線・岡山色）'
   ELSE NULL END
WHERE t.id IN(SELECT id FROM _west_moved_source);

UPDATE public.manual_timetable_template_stops s SET
 arrival_station_urn=CASE WHEN s.arrival_station_urn IS NULL THEN NULL
 ELSE replace(replace(s.arrival_station_urn,
   'odpt.Station:JR-East.','odpt.Station:JR-West.'),
   'Naka-Otsari','Nakatsuchi') END,
 departure_station_urn=CASE WHEN s.departure_station_urn IS NULL THEN NULL
 ELSE replace(replace(s.departure_station_urn,
   'odpt.Station:JR-East.','odpt.Station:JR-West.'),
   'Naka-Otsari','Nakatsuchi') END
WHERE s.template_id IN(SELECT id FROM _west_moved_source);

CREATE TABLE IF NOT EXISTS public.published_oito_west_2611_number_roster (
 edition text NOT NULL CHECK(edition='2611'),
 line_key text NOT NULL CHECK(line_key='OitoWest'),
 train_number text NOT NULL CHECK(train_number ~ '^4[0-9]{2}D$'),
 calendar_urn text NOT NULL CHECK(calendar_urn IN
  ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')),
 direction_urn text NOT NULL CHECK(direction_urn IN
  ('odpt.RailDirection:Inbound','odpt.RailDirection:Outbound')),
 train_type_urn text NOT NULL CHECK(train_type_urn='odpt.TrainType:JR-West.Local'),
 source_template_id bigint,
 original_stop_keys text[] NOT NULL DEFAULT '{}'::text[],
 source_scope text NOT NULL CHECK(source_scope IN
  ('historical_three_station_partial','official_number_no_sql_stops')),
 excluded_dates date[] NOT NULL DEFAULT '{}'::date[],
 vehicle_model text NOT NULL
  CHECK(vehicle_model='キハ120形300番台（大糸線・岡山色）'),
 png_reference text CHECK(png_reference IS NULL),
 official_source_url text NOT NULL,
 fleet_source_url text NOT NULL
  DEFAULT 'https://info-otari.jp/oito_line/',
 clock_source_status text NOT NULL
  DEFAULT 'historical_partial_not_2611_verified'
  CHECK(clock_source_status='historical_partial_not_2611_verified'),
 reference_only boolean NOT NULL DEFAULT true CHECK(reference_only),
 actual_vehicle_confirmed boolean NOT NULL DEFAULT false
  CHECK(NOT actual_vehicle_confirmed),
 PRIMARY KEY(edition,line_key,calendar_urn,direction_urn,train_number),
 UNIQUE(edition,line_key,source_template_id),
 CHECK((source_template_id IS NULL AND
  source_scope='official_number_no_sql_stops' AND
  cardinality(original_stop_keys)=0) OR
  (source_template_id IS NOT NULL AND
  source_scope='historical_three_station_partial' AND
  cardinality(original_stop_keys)=3)),
 CHECK(cardinality(excluded_dates)=0 OR
  (cardinality(excluded_dates)=1 AND train_number IN('429D','430D') AND
   excluded_dates=ARRAY['2026-11-08']::date[]))
);
ALTER TABLE public.published_oito_west_2611_number_roster
 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.published_oito_west_2611_number_roster IS
'JR-West-only Oito 2611: 19 published KiHa120-300 D train numbers x 2 calendars. 28 historical SQL sources cover only Minami-Otari/Nakatsuchi/Kita-Otari (3 stations), 10 number-only. Do NOT claim full route/clock or a 2026 confirmed formation. No authentic orange/red Oito fleet PNG is in gallery. Oct-only 790x buses excluded.';

CREATE TEMP TABLE _west_source ON COMMIT DROP AS
SELECT t.id,t.calendar_urn,t.direction_urn,t.train_number,
 ARRAY(SELECT split_part(coalesce(s.departure_station_urn,s.arrival_station_urn),'.',3)
 FROM public.manual_timetable_template_stops s
 WHERE s.template_id=t.id ORDER BY s.stop_sequence) keys
FROM public.manual_timetable_templates t
WHERE t.line_key='OitoWest' AND t.train_number ~ '^4[0-9]{2}D$';
DO $check_source$
BEGIN
 IF (SELECT count(*) FROM _west_source)<>28 OR
  EXISTS(SELECT 1 FROM _west_source WHERE
   cardinality(keys)<>3 OR
   keys @> ARRAY['']::text[] OR
   (substring(train_number FROM '^([0-9]+)')::int%2)
    <>CASE WHEN direction_urn='odpt.RailDirection:Inbound'
     THEN 0 ELSE 1 END)
 THEN RAISE EXCEPTION 'Migrated JR-West source ID/stops changed';
 END IF;
END $check_source$;

WITH numbers AS (
 SELECT unnest(ARRAY['420D','422D','424D','426D','428D',
    '430D','432D','434D','436D','438D','421D','423D',
    '425D','427D','429D','431D','433D','435D','437D']::text[])
     AS train_number
), calendars AS (
 SELECT unnest(ARRAY['odpt.Calendar:Weekday',
    'odpt.Calendar:SaturdayHoliday']::text[]) AS cal
)
INSERT INTO public.published_oito_west_2611_number_roster(
 edition,line_key,train_number,calendar_urn,direction_urn,train_type_urn,
 source_template_id,original_stop_keys,source_scope,excluded_dates,
 vehicle_model,png_reference,official_source_url)
SELECT '2611','OitoWest',n.train_number,c.cal,
 CASE WHEN substring(n.train_number FROM '^([0-9]+)')::int%2=0
  THEN 'odpt.RailDirection:Inbound'
  ELSE 'odpt.RailDirection:Outbound' END,
 'odpt.TrainType:JR-West.Local',
 s.id,COALESCE(s.keys,'{}'::text[]),
 CASE WHEN s.id IS NULL THEN 'official_number_no_sql_stops'
  ELSE 'historical_three_station_partial' END,
 CASE WHEN n.train_number IN('429D','430D')
  THEN ARRAY['2026-11-08']::date[]
  ELSE '{}'::date[] END,
 'キハ120形300番台（大糸線・岡山色）',NULL,
 'https://timetable.jr-odekake.net/line-timetable/'||
 CASE WHEN substring(n.train_number FROM '^([0-9]+)')::int%2=0
  THEN '2846' ELSE '2845' END
FROM numbers n CROSS JOIN calendars c
LEFT JOIN _west_source s ON s.train_number=n.train_number AND
 s.calendar_urn=c.cal
ON CONFLICT DO NOTHING;

-- The shared evidence table requires a real source template ID.
-- Published missing-number rows remain explicit on the West roster,
-- never assigned a fabricated template or a made-up PNG.
INSERT INTO public.published_train_number_evidence(
 edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,verification_scope)
SELECT edition,line_key,calendar_urn,direction_urn,train_number,
 source_template_id,official_source_url,'train_number_only'
FROM public.published_oito_west_2611_number_roster
WHERE source_template_id IS NOT NULL
ON CONFLICT DO NOTHING;

DO $after$
BEGIN
 IF (SELECT count(*) FROM public.published_oito_west_2611_number_roster)<>38 OR
   (SELECT count(*) FROM public.published_oito_west_2611_number_roster
    WHERE source_scope='historical_three_station_partial')<>28 OR
   (SELECT count(*) FROM public.published_oito_west_2611_number_roster
    WHERE source_scope='official_number_no_sql_stops')<>10 OR
   (SELECT count(*) FROM public.published_train_number_evidence
    WHERE line_key='OitoWest' AND edition='2611')<>28 OR
   (SELECT count(*) FROM public.manual_timetable_templates
    WHERE line_key='OitoWest')<>40 OR
   (SELECT count(*) FROM public.manual_timetable_templates
    WHERE line_key='Oito')<>141 OR
   (SELECT count(*) FROM public.published_oito_east_2611_number_roster)<>141
 THEN RAISE EXCEPTION 'JR West split/official roster counts mismatch';
 END IF;
END $after$;
COMMIT;