
-- Live quality instrumentation for all operators' recurring published plans.
-- No daily run records, no actual formation history, no inferred station clocks.
-- Internal diagnostic views: service_role-only, security_invoker, base RLS upheld.
BEGIN;

CREATE OR REPLACE VIEW public.published_timetable_chronology_issues
WITH (security_invoker = true, security_barrier = true) AS
WITH timeline AS (
 SELECT s.template_id,s.stop_sequence,
   LAG(COALESCE(s.departure_clock,s.arrival_clock))
     OVER (PARTITION BY s.template_id ORDER BY s.stop_sequence) AS previous_station_clock,
   COALESCE(s.arrival_clock,s.departure_clock) AS current_station_clock
 FROM public.manual_timetable_template_stops s
)
SELECT m.line_key,m.calendar_urn AS operating_pattern,m.id AS template_id,
 m.train_number,t.stop_sequence,t.previous_station_clock,t.current_station_clock,
 'non_midnight_station_clock_reversal'::text AS issue_code
FROM timeline t JOIN public.manual_timetable_templates m ON m.id=t.template_id
WHERE t.previous_station_clock > t.current_station_clock
  -- Overnight source clocks may legally wrap 23:xx -> 00:xx.
  AND NOT (t.previous_station_clock >= '20:00' AND t.current_station_clock <= '04:00');

COMMENT ON VIEW public.published_timetable_chronology_issues IS
 'Unresolved scheduled-stop time reversals not plausibly explained by midnight wrap; manual verification required, no automatic time corrections.';

CREATE OR REPLACE VIEW public.published_timetable_plan_quality_summary
WITH (security_invoker = true, security_barrier = true) AS
WITH per_template AS (
 SELECT m.id,m.line_key,m.calendar_urn,
  (m.source_revision_date IS NOT NULL OR m.revision_id IS NOT NULL) AS source_revision_known,
  (m.source_path LIKE 'official-sampled:%') AS is_sampled_source,
  COUNT(s.*)::integer AS stop_count,
  COUNT(s.*) FILTER (WHERE s.arrival_clock IS NOT NULL OR s.departure_clock IS NOT NULL)::integer AS timed_stop_count,
  COUNT(DISTINCT COALESCE(s.departure_station_urn,s.arrival_station_urn))
    FILTER (WHERE s.arrival_clock IS NOT NULL OR s.departure_clock IS NOT NULL)::integer AS distinct_timed_stations,
  COUNT(s.*) FILTER (
    WHERE s.arrival_clock IS NOT NULL AND s.departure_clock IS NOT NULL
      AND s.arrival_clock > s.departure_clock
      AND s.arrival_clock >= '20:00' AND s.departure_clock <= '04:00'
  )::integer AS rollover_candidate_count
 FROM public.manual_timetable_templates m
 LEFT JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 GROUP BY m.id
), chronology AS (
 SELECT template_id,COUNT(*)::integer AS anomaly_count
 FROM public.published_timetable_chronology_issues GROUP BY template_id
)
SELECT p.line_key,p.calendar_urn AS operating_pattern,
 COUNT(*)::bigint AS source_templates,
 SUM(p.stop_count)::bigint AS source_stops,
 COUNT(*) FILTER (WHERE p.distinct_timed_stations >= 2)::bigint AS renderable_source_templates,
 COUNT(*) FILTER (WHERE p.distinct_timed_stations < 2)::bigint AS insufficient_timed_station_templates,
 COUNT(*) FILTER (WHERE NOT p.source_revision_known)::bigint AS revision_unverified_templates,
 COUNT(*) FILTER (WHERE p.is_sampled_source)::bigint AS sampled_templates,
 COUNT(*) FILTER (WHERE COALESCE(c.anomaly_count,0)>0)::bigint AS suspect_clock_order_templates,
 SUM(COALESCE(c.anomaly_count,0))::bigint AS suspect_clock_order_events,
 SUM(p.rollover_candidate_count)::bigint AS midnight_rollover_candidates
FROM per_template p LEFT JOIN chronology c ON c.template_id=p.id
GROUP BY p.line_key,p.calendar_urn;

COMMENT ON VIEW public.published_timetable_plan_quality_summary IS
 'All-operator live Weekday/SaturdayHoliday source quality. Rollover is review-only; a complete schedule must be verified against official dates and scope.';

-- Internal audit access only. Public timetable access remains unchanged.
REVOKE ALL ON public.published_timetable_chronology_issues
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.published_timetable_plan_quality_summary
 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.published_timetable_chronology_issues TO service_role;
GRANT SELECT ON public.published_timetable_plan_quality_summary TO service_role;

DO $assert$
DECLARE suspicious bigint; anomalous_templates bigint; source_count bigint;
BEGIN
 SELECT COUNT(*), COUNT(DISTINCT template_id) INTO suspicious,anomalous_templates
 FROM public.published_timetable_chronology_issues;
 SELECT COALESCE(SUM(source_templates),0) INTO source_count
 FROM public.published_timetable_plan_quality_summary;
 IF suspicious<>40 OR anomalous_templates<>39 OR source_count<>(SELECT count(*) FROM public.manual_timetable_templates)
 THEN RAISE EXCEPTION 'Source diagnostic changed, need review (events %, templates %, sources %)',suspicious,anomalous_templates,source_count;
 END IF;
END $assert$;
COMMIT;
