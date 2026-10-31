-- Conventional recurring-plan quality audit, 2026-10-31.
-- Distinguish limited-express non-stopping source fragments from commuter
-- timetable gaps; only Weekday / SaturdayHoliday exist.
-- A one-station source is NOT a renderable train, but it may be a
-- boundary reference to the same planned train in another line's source.
-- Never create or infer train times or actual vehicle formations.

CREATE OR REPLACE VIEW public.published_conventional_plan_quality AS
WITH source_quality AS (
  SELECT m.id, m.line_key, m.calendar_urn, m.train_type_urn,
    COUNT(s.*)::int AS source_stops,
    COUNT(s.*) FILTER(WHERE s.arrival_clock IS NOT NULL OR s.departure_clock IS NOT NULL)::int AS timed_stops
  FROM public.manual_timetable_templates m
  LEFT JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
  WHERE m.line_key NOT ILIKE '%Shinkansen%'
    AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
  GROUP BY m.id
)
SELECT line_key, calendar_urn AS operating_pattern,
 COUNT(*)::bigint AS source_templates,
 COUNT(*) FILTER(WHERE source_stops>=2 AND timed_stops>=2)::bigint AS renderable_trains,
 COUNT(*) FILTER(WHERE source_stops<2 OR timed_stops<2)::bigint AS insufficient_stop_time,
 COUNT(*) FILTER(WHERE (source_stops<2 OR timed_stops<2) AND train_type_urn ILIKE '%LimitedExpress%')::bigint AS limited_express_source_gaps,
 COUNT(*) FILTER(WHERE (source_stops<2 OR timed_stops<2) AND (train_type_urn IS NULL OR train_type_urn NOT ILIKE '%LimitedExpress%'))::bigint AS commuter_source_gaps,
 COUNT(*) FILTER(WHERE source_stops<2 AND (train_type_urn IS NULL OR train_type_urn NOT ILIKE '%LimitedExpress%'))::bigint AS commuter_single_station,
 COUNT(*) FILTER(WHERE source_stops>=2 AND timed_stops<2 AND (train_type_urn IS NULL OR train_type_urn NOT ILIKE '%LimitedExpress%'))::bigint AS commuter_multi_station_untimed
FROM source_quality
GROUP BY line_key,calendar_urn;

ALTER VIEW public.published_conventional_plan_quality SET (security_barrier=true, security_invoker=false);
COMMENT ON VIEW public.published_conventional_plan_quality IS
 'Recurring Weekday/SaturdayHoliday source quality: excludes LimitedExpress from commuter-only stop-gap counts. Source templates != validated complete timetable. No dated runs or actual formations.';
GRANT SELECT ON public.published_conventional_plan_quality TO anon, authenticated;

CREATE OR REPLACE VIEW public.published_conventional_boundary_candidates AS
WITH one_stop AS (
 SELECT m.id, m.line_key,m.calendar_urn,m.train_number,m.railway_urn,m.direction_urn,m.train_type_urn,
   COALESCE(s.departure_station_urn,s.arrival_station_urn) station_urn,
   COALESCE(s.departure_clock,s.arrival_clock) clock_time
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key NOT ILIKE '%Shinkansen%'
   AND (m.train_type_urn IS NULL OR m.train_type_urn NOT ILIKE '%LimitedExpress%')
   AND m.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
   AND (SELECT COUNT(*) FROM public.manual_timetable_template_stops x WHERE x.template_id=m.id)=1
   AND COALESCE(s.departure_clock,s.arrival_clock) IS NOT NULL
)
SELECT DISTINCT
 w.id AS one_stop_source_id,w.line_key,w.calendar_urn AS operating_pattern,w.train_number,
 w.station_urn AS matching_station_urn,w.clock_time AS matching_clock,
 t.id AS candidate_complete_source_id,t.line_key AS candidate_line_key,
 'same_operator_train_number_calendar_direction_station_clock'::text AS match_evidence
FROM one_stop w
JOIN public.manual_timetable_templates t
 ON t.id<>w.id AND t.calendar_urn=w.calendar_urn
 AND t.train_number=w.train_number AND t.direction_urn=w.direction_urn
 AND split_part(split_part(t.railway_urn,':',2),'.',1)=split_part(split_part(w.railway_urn,':',2),'.',1)
JOIN public.manual_timetable_template_stops x ON x.template_id=t.id
 AND split_part(COALESCE(x.departure_station_urn,x.arrival_station_urn),'.',array_length(string_to_array(COALESCE(x.departure_station_urn,x.arrival_station_urn),'.'),1))=
     split_part(w.station_urn,'.',array_length(string_to_array(w.station_urn,'.'),1))
 AND COALESCE(x.departure_clock,x.arrival_clock)=w.clock_time
WHERE t.line_key<>w.line_key
 AND (SELECT COUNT(*) FROM public.manual_timetable_template_stops z
     WHERE z.template_id=t.id AND (z.departure_clock IS NOT NULL OR z.arrival_clock IS NOT NULL))>=2;

ALTER VIEW public.published_conventional_boundary_candidates SET (security_barrier=true, security_invoker=false);
COMMENT ON VIEW public.published_conventional_boundary_candidates IS
 'Candidate (NOT certified identity) matches for one-station commuter source fragments; require manual line boundary verification before canonical merge.';
REVOKE ALL ON public.published_conventional_boundary_candidates FROM PUBLIC,anon,authenticated;

DO $verify$
DECLARE commuter_weak bigint; express_weak bigint; matched bigint;
BEGIN
 SELECT COALESCE(SUM(commuter_source_gaps),0),COALESCE(SUM(limited_express_source_gaps),0)
 INTO commuter_weak,express_weak FROM public.published_conventional_plan_quality;
 SELECT COUNT(DISTINCT one_stop_source_id) INTO matched FROM public.published_conventional_boundary_candidates;
 IF commuter_weak<>513 OR express_weak<>215 OR matched<>153 THEN
   RAISE EXCEPTION 'Input source has changed; review before applying scoped audit: commuter %, limited %, boundary %',
     commuter_weak,express_weak,matched;
 END IF;
END $verify$;

-- Keep the honest source gap marker for all lines. But for the lines whose
-- problematic sources are *only* limited-express fragments, explicitly mark
-- commuter gaps as zero. Do not claim any line's timetable is complete.
WITH counts AS (
 SELECT line_key, SUM(commuter_source_gaps) commuter_bad, SUM(limited_express_source_gaps) express_bad
 FROM public.published_conventional_plan_quality GROUP BY line_key
)
UPDATE public.published_timetable_coverage_audit a
SET issues=ARRAY(
 SELECT DISTINCT flag FROM unnest(
 COALESCE(a.issues,ARRAY[]::text[]) ||
 CASE WHEN c.commuter_bad=0 AND c.express_bad>0 THEN
  ARRAY['COMMUTER_STOP_INTEGRITY_NO_GAPS','LIMITED_EXPRESS_UNTIMED_SEGMENTS_EXCLUDED_FROM_COMMUTER_GAP']::text[]
 ELSE
  ARRAY['COMMUTER_SINGLE_STATION_SOURCE_RECORDS_NEED_SCOPE_CHECK']::text[]
 END
 ) flag ORDER BY flag
),checked_at=now()
FROM counts c
WHERE a.line_key=c.line_key AND c.commuter_bad+c.express_bad>0;
