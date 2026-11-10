-- JR-Central TokaidoCentral: read-only train-first SQL plan status.
WITH source AS (
 SELECT count(*) AS total,
        count(*) FILTER(WHERE calendar_urn='odpt.Calendar:Weekday') AS weekday_trains,
        count(*) FILTER(WHERE calendar_urn='odpt.Calendar:SaturdayHoliday') AS holiday_trains,
        count(*) FILTER(WHERE direction_urn='odpt.RailDirection:Inbound') AS inbound_trains,
        count(*) FILTER(WHERE direction_urn='odpt.RailDirection:Outbound') AS outbound_trains
 FROM public.manual_timetable_templates WHERE line_key='TokaidoCentral'
),
stops AS (
 SELECT count(*) AS stop_count FROM public.manual_timetable_template_stops s
 JOIN public.manual_timetable_templates t ON t.id=s.template_id
 WHERE t.line_key='TokaidoCentral'
),
canonical AS (
 SELECT count(*) AS canonical_count FROM public.train_timetable_members m
 JOIN public.manual_timetable_templates t ON t.id=m.source_template_id
 WHERE t.line_key='TokaidoCentral'
)
SELECT 'TokaidoCentral' AS line_key,
 (SELECT count(*) FROM public.line_stations WHERE line_id='TokaidoCentral') AS station_count,
 source.total AS train_templates,source.weekday_trains,source.holiday_trains,
 source.inbound_trains,source.outbound_trains,
 stops.stop_count,canonical.canonical_count,
 audit.coverage_status,a.acceptance_status,a.full_day_timetable_acceptance_passed,
 audit.issues
FROM source CROSS JOIN stops CROSS JOIN canonical
LEFT JOIN public.published_timetable_coverage_audit audit ON audit.line_key='TokaidoCentral'
LEFT JOIN public.published_timetable_full_day_acceptance a ON a.line_key='TokaidoCentral';
