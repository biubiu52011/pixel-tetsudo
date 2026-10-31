-- Global rule: Supabase's public published timetable interface represents
-- recurring weekday and Saturday/holiday plans for *every* railway operator.
-- Published plans must not be inferred from observations on a particular date.
-- Special-date historical evidence is not deleted; it is excluded here.
-- Preserve existing view columns and read-only public projection grants.

CREATE OR REPLACE VIEW public.published_timetable_plan_trains AS
SELECT m.id AS template_id,
       m.line_key,
       m.calendar_urn AS operating_pattern,
       m.direction_urn,
       m.train_number,
       m.train_type_urn,
       m.railway_urn,
       m.destination_urns,
       m.source_path,
       (m.source_path LIKE 'official-sampled:%') AS is_sampled_source
FROM public.manual_timetable_templates AS m
WHERE m.calendar_urn IN (
  'odpt.Calendar:Weekday', 'odpt.Calendar:SaturdayHoliday'
);

CREATE OR REPLACE VIEW public.published_timetable_plan_stops AS
SELECT s.template_id,
       m.line_key,
       m.calendar_urn AS operating_pattern,
       s.stop_sequence,
       COALESCE(s.departure_station_urn, s.arrival_station_urn) AS station_urn,
       s.arrival_station_urn,
       s.departure_station_urn,
       s.arrival_clock,
       s.departure_clock
FROM public.manual_timetable_template_stops AS s
JOIN public.manual_timetable_templates AS m ON m.id = s.template_id
WHERE m.calendar_urn IN (
  'odpt.Calendar:Weekday', 'odpt.Calendar:SaturdayHoliday'
);

ALTER VIEW public.published_timetable_plan_trains
  SET (security_invoker = false, security_barrier = true);
ALTER VIEW public.published_timetable_plan_stops
  SET (security_invoker = false, security_barrier = true);

COMMENT ON VIEW public.published_timetable_plan_trains IS
  'Published recurring train plans for all operators: Weekday or SaturdayHoliday. Never a particular service date.';
COMMENT ON VIEW public.published_timetable_plan_stops IS
  'Published recurring train stop times for all operators: Weekday or SaturdayHoliday. Special-date source evidence is excluded.';

-- Verification: no unexpected calendar variant or orphaned stop
-- SELECT DISTINCT operating_pattern FROM public.published_timetable_plan_trains;
-- SELECT count(*) FROM public.published_timetable_plan_stops s
-- LEFT JOIN public.published_timetable_plan_trains t USING (template_id)
-- WHERE t.template_id IS NULL;
