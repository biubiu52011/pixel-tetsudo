-- Keep physical station identities separate from official ODPT source tokens.
-- Frontend station aliases (STATION_ALIAS_BY_RAILWAY) map raw IDs within a
-- railway scope; do NOT globally rewrite odpt.Station:* or timetable templates.
-- Station coordinates: MapFan station locations (2026-11-09 verification).
BEGIN;
SELECT pg_advisory_xact_lock(26110905);
INSERT INTO public.stations(id,name,latitude,longitude) VALUES
 ('Kanda-Fukuoka','Kanda-Fukuoka',33.785106,130.978811),
 ('Kasuga-Fukuoka','Kasuga-Fukuoka',33.5347658,130.469238),
 ('Koga-Fukuoka','Koga-Fukuoka',33.7324147,130.466831),
 ('Araki-Fukuoka','Araki-Fukuoka',33.2766777,130.5026769)
ON CONFLICT(id) DO UPDATE SET
 name=EXCLUDED.name,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude;
-- Rewrite only documented JR-Kyushu line membership; Tokyo IDs remain unchanged.
UPDATE public.line_stations SET station_name='Kanda-Fukuoka'
 WHERE line_id='Nippo' AND station_name='Kanda';
UPDATE public.line_stations SET station_name='Kasuga-Fukuoka'
 WHERE line_id IN ('KagoshimaMain','KagoshimaMainJB') AND station_name='Kasuga';
UPDATE public.line_stations SET station_name='Koga-Fukuoka'
 WHERE line_id IN ('KagoshimaMain','KagoshimaMainJA') AND station_name='Koga';
UPDATE public.line_stations SET station_name='Araki-Fukuoka'
 WHERE line_id IN ('KagoshimaMain','KagoshimaMainJB') AND station_name='Araki';
DO $audit$
BEGIN
 IF EXISTS(SELECT 1 FROM public.line_stations
  WHERE (line_id='Nippo' AND station_name='Kanda')
     OR (line_id IN ('KagoshimaMain','KagoshimaMainJB') AND station_name IN ('Kasuga','Araki'))
     OR (line_id IN ('KagoshimaMain','KagoshimaMainJA') AND station_name='Koga'))
 THEN RAISE EXCEPTION 'Legacy JR-Kyushu same-ID line membership remains'; END IF;
END $audit$;
COMMIT;
