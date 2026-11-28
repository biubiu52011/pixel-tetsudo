-- TS-08: source-verified physical topology only.
BEGIN;
LOCK TABLE public.line_stations IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO public.railway_lines (id,timetable_operator,timetable_api_enabled,realtime_position_api_enabled,sql_planned_fallback_enabled) VALUES ('SendaiAirport','SendaiAirportTransit',false,false,false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.stations (id,name,latitude,longitude) VALUES ('Natori','Natori',38.1731,140.88275),('Morisekinoshita','Morisekinoshita',38.165349,140.896127),('Mitazono','Mitazono',38.159698,140.917281),('Sendai-Airport','Sendai-Airport',38.137292,140.929435) ON CONFLICT (id) DO NOTHING;
DO $guard$ BEGIN
IF EXISTS (SELECT 1 FROM public.line_stations WHERE line_id='SendaiAirport') AND (SELECT array_agg(station_name ORDER BY station_index) FROM public.line_stations WHERE line_id='SendaiAirport') IS DISTINCT FROM ARRAY['Natori','Morisekinoshita','Mitazono','Sendai-Airport']::text[] THEN RAISE EXCEPTION 'Existing topology differs'; END IF;
IF NOT EXISTS (SELECT 1 FROM public.railway_lines WHERE id='SendaiAirport' AND timetable_operator='SendaiAirportTransit' AND NOT timetable_api_enabled AND NOT realtime_position_api_enabled AND NOT sql_planned_fallback_enabled) THEN RAISE EXCEPTION 'Registry mismatch'; END IF;
END $guard$;
WITH wanted(station_name,station_index) AS (VALUES ('Natori',0),('Morisekinoshita',1),('Mitazono',2),('Sendai-Airport',3)), base AS (SELECT coalesce(max(id),0) AS max_id FROM public.line_stations) INSERT INTO public.line_stations(id,line_id,station_name,station_index) SELECT base.max_id+row_number() OVER(ORDER BY w.station_index),'SendaiAirport',w.station_name,w.station_index FROM wanted w CROSS JOIN base WHERE NOT EXISTS (SELECT 1 FROM public.line_stations s WHERE s.line_id='SendaiAirport' AND s.station_index=w.station_index);
COMMIT;
