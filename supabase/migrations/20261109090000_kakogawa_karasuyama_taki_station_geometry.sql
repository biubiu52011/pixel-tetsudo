-- Canonical station identity correction, verified 2026-11-09.
-- MapFan: https://mapfan.com/spots/SCH%2CJ%2CXM5 (Takino)
--         https://mapfan.com/spots/SCH%2CJ%2CCM5 (Taki, Hyogo)
--         https://mapfan.com/spots/SCH%2CJ%2CF15 (Taki, Tochigi).
-- ODPT timetable stop URNs are source records; do not rewrite them here.
BEGIN;
SELECT pg_advisory_xact_lock(26110911);
DO $guard$
BEGIN
  IF (SELECT count(*) FROM public.line_stations WHERE line_id='Karasuyama' AND station_name IN ('Taki','Taki-Tochigi'))<>1
   OR (SELECT count(*) FROM public.line_stations WHERE line_id='KakogawaLine' AND station_name='Taki')<>1
  THEN RAISE EXCEPTION 'Kakogawa/Karasuyama Taki station baseline drift'; END IF;
END $guard$;
INSERT INTO public.stations(id,name,latitude,longitude) VALUES
 ('Taki','Taki',34.948737,134.9623568),
 ('Takino','Takino',34.9411467,134.9553627),
 ('Taki-Tochigi','Taki-Tochigi',36.6487217,140.1382081)
ON CONFLICT(id) DO UPDATE SET
 latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,name=EXCLUDED.name;
UPDATE public.line_stations SET station_name='Taki-Tochigi'
 WHERE line_id='Karasuyama' AND station_name='Taki';
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.line_stations WHERE line_id='Karasuyama' AND station_name='Taki-Tochigi')<>1
 OR (SELECT count(*) FROM public.line_stations WHERE line_id='Karasuyama' AND station_name='Taki')<>0
 OR (SELECT count(*) FROM public.line_stations WHERE line_id='KakogawaLine' AND station_name='Taki')<>1
 THEN RAISE EXCEPTION 'Taki physical station identity not isolated'; END IF;
END $verify$;
COMMIT;
