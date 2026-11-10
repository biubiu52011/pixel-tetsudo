-- ChuoCentral status: stations are registered; source timestamps do NOT prove 2026-11 trains.
WITH t AS (
 SELECT count(*) AS templates,
 count(*) FILTER(WHERE calendar_urn='odpt.Calendar:Weekday') AS weekday,
 count(*) FILTER(WHERE calendar_urn='odpt.Calendar:SaturdayHoliday') AS holiday,
 count(*) FILTER(WHERE direction_urn='odpt.RailDirection:Inbound') AS inbound,
 count(*) FILTER(WHERE direction_urn='odpt.RailDirection:Outbound') AS outbound
 FROM public.manual_timetable_templates WHERE line_key='ChuoCentral'
)
SELECT 'ChuoCentral' AS line_key,
 (SELECT count(*) FROM public.line_stations WHERE line_id='ChuoCentral') AS station_count,
 (SELECT count(*) FROM public.stations WHERE id IN
    (SELECT station_name FROM public.line_stations WHERE line_id='ChuoCentral')) AS geocoded_station_count,
 t.templates AS plan_templates,t.weekday,t.holiday,t.inbound,t.outbound,
 (SELECT count(*) FROM public.manual_timetable_template_stops s JOIN public.manual_timetable_templates m
   ON m.id=s.template_id WHERE m.line_key='ChuoCentral') AS planned_stops,
 (SELECT count(*) FROM public.train_timetable_members m JOIN public.manual_timetable_templates t
   ON t.id=m.source_template_id WHERE t.line_key='ChuoCentral') AS canonical_members,
 a.coverage_status, f.acceptance_status,f.full_day_timetable_acceptance_passed,
 a.issues
FROM t LEFT JOIN public.published_timetable_coverage_audit a ON a.line_key='ChuoCentral'
LEFT JOIN public.published_timetable_full_day_acceptance f ON f.line_key='ChuoCentral';
