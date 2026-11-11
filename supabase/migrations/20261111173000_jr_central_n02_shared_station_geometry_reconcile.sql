-- MLIT N02-2024: correct existing shared *physical* station coordinates.
-- https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2024.html
-- https://github.com/antfu/mlit-json/blob/main/data/stations.json
-- Four physical station IDs already link multiple railway lines; do not split
-- them or overwrite the identities of other station names.
-- Existing train schedules, vehicle assets, runs and operator boundaries unchanged.
BEGIN;
SELECT pg_advisory_xact_lock(2026111117);
CREATE TEMP TABLE _jrc_n02_existing_station_review(
  station_id text PRIMARY KEY, old_lat numeric NOT NULL,old_lng numeric NOT NULL,
  new_lat numeric NOT NULL,new_lng numeric NOT NULL,expected_line_count integer NOT NULL
) ON COMMIT DROP;
INSERT INTO _jrc_n02_existing_station_review VALUES
 ('Atami',35.0961,139.0711,35.10379,139.077805,5),
 ('Haruda',35.12,136.78,35.14315,136.813385,2),
 ('Hatta',35.16,136.85,35.148787,136.852183,2),
 ('Tatsuno',35.981,137.992,35.984517,137.997183,2);
DO $precheck$
BEGIN
 IF (SELECT count(*) FROM _jrc_n02_existing_station_review r
     JOIN public.stations st ON st.id=r.station_id
       AND st.latitude=r.old_lat AND st.longitude=r.old_lng
     WHERE (SELECT count(*) FROM public.line_stations ls
            WHERE ls.station_name=st.id)=r.expected_line_count)<>4
 THEN RAISE EXCEPTION 'JRC_EXISTING_SHARED_STATION_GEOGRAPHY_BASELINE_CHANGED'; END IF;
END $precheck$;
UPDATE public.stations s SET latitude=r.new_lat,longitude=r.new_lng
FROM _jrc_n02_existing_station_review r
WHERE s.id=r.station_id AND s.latitude=r.old_lat AND s.longitude=r.old_lng;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM _jrc_n02_existing_station_review r
     JOIN public.stations s ON s.id=r.station_id
      AND s.latitude=r.new_lat AND s.longitude=r.new_lng)<>4
 OR EXISTS(
  SELECT 1 FROM public.line_stations ls
  JOIN public.railway_lines l ON l.id=ls.line_id
  LEFT JOIN public.stations s ON s.id=ls.station_name
  WHERE l.timetable_operator='JR-Central' AND s.id IS NULL
 )
 THEN RAISE EXCEPTION 'JRC_EXISTING_SHARED_STATION_GEOGRAPHY_VERIFY_FAILED'; END IF;
END $verify$;
COMMIT;
