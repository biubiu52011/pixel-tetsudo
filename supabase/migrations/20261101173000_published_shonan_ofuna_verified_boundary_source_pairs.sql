-- Strict, NON-GUESSING source evidence for published JR East Ofuna handovers.
-- It does not assert any specific train operates on an actual date.
CREATE OR REPLACE VIEW public.published_shonan_verified_boundary_sources
WITH (security_invoker = true)
AS
SELECT 
 CASE WHEN a.direction_urn='odpt.RailDirection:Northbound' THEN b.id ELSE a.id END AS from_template_id,
 CASE WHEN a.direction_urn='odpt.RailDirection:Northbound' THEN a.id ELSE b.id END AS to_template_id,
 CASE WHEN a.direction_urn='odpt.RailDirection:Northbound' THEN b.line_key ELSE a.line_key END AS from_line_key,
 CASE WHEN a.direction_urn='odpt.RailDirection:Northbound' THEN a.line_key ELSE b.line_key END AS to_line_key,
 a.train_number, a.calendar_urn,a.source_revision_date,
 'odpt.Station:JR-East.ShonanShinjuku.Ofuna'::text AS junction_station_urn,
 CASE WHEN a.direction_urn='odpt.RailDirection:Northbound' THEN bs.arrival_clock ELSE ast.arrival_clock END AS arrival_clock,
 CASE WHEN a.direction_urn='odpt.RailDirection:Northbound' THEN ast.departure_clock ELSE bs.departure_clock END AS departure_clock,
 0::integer AS connection_minutes,
 'reciprocal_source_ids_station_time_revision'::text AS evidence
FROM public.manual_timetable_templates a
JOIN public.manual_timetable_templates b
  ON b.calendar_urn=a.calendar_urn
 AND b.train_number=a.train_number
 AND b.source_revision_date IS NOT DISTINCT FROM a.source_revision_date
 AND b.line_key IN ('Tokaido','Yokosuka')
 AND a.source_trip_id IS NOT NULL AND b.source_trip_id IS NOT NULL
JOIN LATERAL (
  SELECT s.* FROM public.manual_timetable_template_stops s
  WHERE s.template_id=a.id AND s.stop_sequence =
    (CASE WHEN a.direction_urn='odpt.RailDirection:Northbound'
      THEN (SELECT MIN(q.stop_sequence) FROM public.manual_timetable_template_stops q WHERE q.template_id=a.id)
      ELSE (SELECT MAX(q.stop_sequence) FROM public.manual_timetable_template_stops q WHERE q.template_id=a.id) END)
) ast ON true
JOIN LATERAL (
  SELECT s.* FROM public.manual_timetable_template_stops s
  WHERE s.template_id=b.id AND s.stop_sequence =
    (CASE WHEN a.direction_urn='odpt.RailDirection:Northbound'
      THEN (SELECT MAX(q.stop_sequence) FROM public.manual_timetable_template_stops q WHERE q.template_id=b.id)
      ELSE (SELECT MIN(q.stop_sequence) FROM public.manual_timetable_template_stops q WHERE q.template_id=b.id) END)
) bs ON true
WHERE a.line_key='ShonanShinjuku'
 AND (
 (a.direction_urn='odpt.RailDirection:Northbound'
  AND b.direction_urn='odpt.RailDirection:Inbound'
  AND b.source_trip_id=ANY(a.previous_timetable_ids)
  AND a.source_trip_id=ANY(b.next_timetable_ids)
  AND ast.departure_clock IS NOT NULL
  AND bs.arrival_clock=ast.departure_clock)
 OR 
 (a.direction_urn='odpt.RailDirection:Southbound'
  AND b.direction_urn='odpt.RailDirection:Outbound'
  AND b.source_trip_id=ANY(a.next_timetable_ids)
  AND a.source_trip_id=ANY(b.previous_timetable_ids)
  AND ast.arrival_clock IS NOT NULL
  AND bs.departure_clock=ast.arrival_clock))
 AND substring(coalesce(ast.arrival_station_urn,ast.departure_station_urn) from '[^.]+$')='Ofuna'
 AND substring(coalesce(bs.arrival_station_urn,bs.departure_station_urn) from '[^.]+$')='Ofuna';

COMMENT ON VIEW public.published_shonan_verified_boundary_sources IS
'Publication-plan reciprocal ODPT source IDs and exact Ofuna boundary station-time evidence; weekdays/holidays only, no real daily observation, no physical carset or guessed through train.';
