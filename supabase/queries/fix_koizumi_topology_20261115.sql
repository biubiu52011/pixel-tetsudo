-- Tobu Koizumi topology correction, 2026-11-15.
-- https://www.tobu.co.jp/railway/guide/line/koizumi_line.html
-- 126 historical timetable templates cover Tatebayashi–Nishi-Koizumi only.
-- The Ota spur is topology-only; do not infer train services.
BEGIN;
INSERT INTO public.railway_lines
 (id,timetable_operator,timetable_api_enabled,realtime_position_api_enabled,sql_planned_fallback_enabled)
 VALUES ('KoizumiBranch','Tobu',false,false,false)
 ON CONFLICT (id) DO NOTHING;
UPDATE public.line_stations SET station_index=CASE station_name
 WHEN 'Tatebayashi' THEN 0 WHEN 'Narushima' THEN 1
 WHEN 'Hon_Nakano' THEN 2 WHEN 'Shinozuka' THEN 3
 WHEN 'Higashi_Koizumi' THEN 4 WHEN 'Koizumicho' THEN 5
 WHEN 'Nishi_Koizumi' THEN 6 END
 WHERE line_id='Koizumi' AND station_name IN
 ('Tatebayashi','Narushima','Hon_Nakano','Shinozuka','Higashi_Koizumi','Koizumicho','Nishi_Koizumi');
UPDATE public.line_stations SET line_id='KoizumiBranch',
 station_index=CASE station_name WHEN 'Ryumai' THEN 1 WHEN 'Ota' THEN 2 END
 WHERE line_id='Koizumi' AND station_name IN ('Ryumai','Ota');
INSERT INTO public.line_stations (line_id,station_name,station_index)
 SELECT 'KoizumiBranch','Higashi_Koizumi',0
 WHERE NOT EXISTS (SELECT 1 FROM public.line_stations
  WHERE line_id='KoizumiBranch' AND station_name='Higashi_Koizumi');
COMMIT;
