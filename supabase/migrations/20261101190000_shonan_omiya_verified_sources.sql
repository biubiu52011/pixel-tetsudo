CREATE OR REPLACE VIEW public.published_shonan_omiya_verified_boundary_sources
WITH (security_invoker = true) AS
WITH raw AS (
 SELECT a.id a_id,b.id b_id,a.line_key a_line,b.line_key b_line,
 a.calendar_urn,a.train_number,a.source_revision_date,
 a.direction_urn a_dir,b.direction_urn b_dir,
 a.source_trip_id a_source,b.source_trip_id b_source,
 a.previous_timetable_ids a_prev,a.next_timetable_ids a_next,
 b.previous_timetable_ids b_prev,b.next_timetable_ids b_next,
 a_first.departure_clock a_first_depart,a_last.arrival_clock a_last_arrive,
 b_first.departure_clock b_first_depart,b_last.arrival_clock b_last_arrive,
 substring(coalesce(a_first.arrival_station_urn,a_first.departure_station_urn) from '[^.]+$') a_first_station,
 substring(coalesce(a_last.arrival_station_urn,a_last.departure_station_urn) from '[^.]+$') a_last_station,
 substring(coalesce(b_first.arrival_station_urn,b_first.departure_station_urn) from '[^.]+$') b_first_station,
 substring(coalesce(b_last.arrival_station_urn,b_last.departure_station_urn) from '[^.]+$') b_last_station
 FROM public.manual_timetable_templates a
 JOIN public.manual_timetable_templates b
 ON b.calendar_urn=a.calendar_urn AND b.train_number=a.train_number
 AND b.source_revision_date IS NOT DISTINCT FROM a.source_revision_date
 AND b.line_key IN ('Takasaki','UtsunomiyaJR')
 CROSS JOIN LATERAL (
 SELECT s.* FROM public.manual_timetable_template_stops s
 WHERE s.template_id=a.id ORDER BY s.stop_sequence LIMIT 1) a_first
 CROSS JOIN LATERAL (
 SELECT s.* FROM public.manual_timetable_template_stops s
 WHERE s.template_id=a.id ORDER BY s.stop_sequence DESC LIMIT 1) a_last
 CROSS JOIN LATERAL (
 SELECT s.* FROM public.manual_timetable_template_stops s
 WHERE s.template_id=b.id ORDER BY s.stop_sequence LIMIT 1) b_first
 CROSS JOIN LATERAL (
 SELECT s.* FROM public.manual_timetable_template_stops s
 WHERE s.template_id=b.id ORDER BY s.stop_sequence DESC LIMIT 1) b_last
 WHERE a.line_key='ShonanShinjuku'
 AND a.source_trip_id IS NOT NULL AND b.source_trip_id IS NOT NULL
), connected AS (
 SELECT
 CASE WHEN a_dir='odpt.RailDirection:Northbound' THEN a_id ELSE b_id END from_template_id,
 CASE WHEN a_dir='odpt.RailDirection:Northbound' THEN b_id ELSE a_id END to_template_id,
 CASE WHEN a_dir='odpt.RailDirection:Northbound' THEN a_line ELSE b_line END from_line_key,
 CASE WHEN a_dir='odpt.RailDirection:Northbound' THEN b_line ELSE a_line END to_line_key,
 calendar_urn,train_number,source_revision_date,
 'odpt.Station:JR-East.ShonanShinjuku.Omiya'::text junction_station_urn,
 CASE WHEN a_dir='odpt.RailDirection:Northbound' THEN a_last_arrive ELSE b_last_arrive END arrival_clock,
 CASE WHEN a_dir='odpt.RailDirection:Northbound' THEN b_first_depart ELSE a_first_depart END departure_clock
 FROM raw WHERE
 (a_dir='odpt.RailDirection:Northbound' AND b_dir='odpt.RailDirection:Outbound'
 AND a_last_station='Omiya' AND b_first_station='Omiya'
 AND b_source=ANY(a_next) AND a_source=ANY(b_prev))
 OR
 (a_dir='odpt.RailDirection:Southbound' AND b_dir='odpt.RailDirection:Inbound'
 AND b_last_station='Omiya' AND a_first_station='Omiya'
 AND a_source=ANY(b_next) AND b_source=ANY(a_prev))
), timed AS (
 SELECT connected.*,
 (split_part(departure_clock,':',1)::integer*60+split_part(departure_clock,':',2)::integer -
 split_part(arrival_clock,':',1)::integer*60-split_part(arrival_clock,':',2)::integer+1440)%1440 connection_minutes
 FROM connected WHERE arrival_clock ~ '^[0-9]{1,2}:[0-9]{2}$'
 AND departure_clock ~ '^[0-9]{1,2}:[0-9]{2}$'
)
SELECT from_template_id,to_template_id,from_line_key,to_line_key,
 calendar_urn,train_number,source_revision_date,junction_station_urn,
 arrival_clock,departure_clock,connection_minutes,
 'reciprocal_source_ids_station_time_revision'::text evidence
FROM timed WHERE connection_minutes BETWEEN 0 AND 30;

COMMENT ON VIEW public.published_shonan_omiya_verified_boundary_sources IS
 'Verified publication-plan source train continuity at Omiya for Shonan-Shinjuku to Takasaki/Utsunomiya, reciprocal source trip IDs and timed boundary only, not daily actual operations.';