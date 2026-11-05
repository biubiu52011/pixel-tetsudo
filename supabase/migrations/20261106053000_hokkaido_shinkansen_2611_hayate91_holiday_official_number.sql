-- JR-East 2611 individual official train page for the Hokkaido
-- Shinkansen holiday sampled HAYATE91 source (06:33 Shin-Aomori).
-- Distinct from the 06:39 alternative; this is full-number-only.
-- Official: https://timetables.jreast.co.jp/2611/train/040/044991.html
-- E5/H5 fleets remain unresolved, no guessed PNG range.
BEGIN;
INSERT INTO public.published_train_number_evidence
(edition,line_key,calendar_urn,direction_urn,train_number,source_template_id,
 official_source_url,verification_scope)
SELECT '2611',m.line_key,m.calendar_urn,m.direction_urn,
  '91B',m.id,'https://timetables.jreast.co.jp/2611/train/040/044991.html',
  'train_number_only'
FROM public.manual_timetable_templates m
WHERE m.id=128898 AND m.line_key='HokkaidoShinkansen'
AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
AND m.direction_urn='odpt.RailDirection:Outbound'
AND m.train_number='はやて91'
AND m.railway_urn='odpt.Railway:JR-Hokkaido.HokkaidoShinkansen'
AND m.source_path='official-sampled:holiday:https://timetables.jreast.co.jp/2611/train/040/044991.html'
AND EXISTS (
 SELECT 1 FROM public.manual_timetable_template_stops s
 WHERE s.template_id=m.id AND s.stop_sequence=0
 AND s.departure_clock='06:33'
 AND s.departure_station_urn='odpt.Station:JR-Hokkaido.HokkaidoShinkansen.Shin-Aomori')
ON CONFLICT DO NOTHING;
COMMIT;
