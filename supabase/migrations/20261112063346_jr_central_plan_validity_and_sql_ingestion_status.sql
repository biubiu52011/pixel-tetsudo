
-- Update the existing JR-Central authorized SQL importer IN PLACE.
-- Preserve source templates, canonical train IDs, existing November records,
-- railway operations and their production renderers (no second schedule owner).
DO $migration$
DECLARE f text; original_hash text;
BEGIN
 SELECT pg_get_functiondef('public.import_jr_central_authorized_plan(text,jsonb)'::regprocedure) INTO f;
 IF f IS NULL OR position('v_edition date;' IN f)=0
   OR position('v_date < ''2026-11-01'' OR v_date > ''2026-11-30''' IN f)=0
   OR position('v_source_path,''md5:''||v_trip_hash,v_edition,v_dates)' IN f)=0
 THEN RAISE EXCEPTION 'JRC_SQL_IMPORTER_VERSION_UNEXPECTED'; END IF;
 -- Function already migrated? This migration must run once, not patch twice.
 IF position('v_valid_from date;' IN f)>0 THEN
   RAISE EXCEPTION 'JRC_SQL_MONTHLY_VALIDITY_ALREADY_PRESENT';
 END IF;
 f:=replace(f,
   '  v_edition date;',
   '  v_edition date;
  v_valid_from date;
  v_valid_to date;
  v_holiday_dates date[];
  v_holiday_date text;
  v_occurrence integer;');
 f:=replace(f,
   '  v_edition := (v_source->>''edition_date'')::date;
  IF v_edition > current_date THEN RAISE EXCEPTION ''JRC_PLAN_FUTURE_EDITION''; END IF;',
   '  v_edition := (v_source->>''edition_date'')::date;
  IF v_edition > current_date THEN RAISE EXCEPTION ''JRC_PLAN_FUTURE_EDITION''; END IF;
  -- Old sources default to the month of the documented edition.
  IF (v_source ? ''valid_from'' AND coalesce(v_source->>''valid_from'','''') !~ ''^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'')
     OR (v_source ? ''valid_to'' AND coalesce(v_source->>''valid_to'','''') !~ ''^20[0-9]{2}-[01][0-9]-[0-3][0-9]$'')
  THEN RAISE EXCEPTION ''JRC_PLAN_INVALID_VALIDITY_RANGE''; END IF;
  v_valid_from := coalesce(nullif(v_source->>''valid_from'','''')::date,v_edition);
  v_valid_to := coalesce(nullif(v_source->>''valid_to'','''')::date,
    (date_trunc(''month'',v_valid_from)::date + interval ''1 month - 1 day'')::date);
  IF v_valid_from<v_edition OR v_valid_to<v_valid_from OR v_valid_to-v_valid_from>=62
  THEN RAISE EXCEPTION ''JRC_PLAN_INVALID_VALIDITY_RANGE''; END IF;
  v_holiday_dates:=ARRAY[]::date[];
  IF v_valid_from=DATE ''2026-11-01'' AND v_valid_to=DATE ''2026-11-30'' THEN
    v_holiday_dates:=ARRAY[DATE ''2026-11-03'',DATE ''2026-11-23''];
  ELSE
    -- For any other source period the publisher must attest its service
    -- calendar, including public holidays and special timetable days.
    IF jsonb_typeof(v_source->''holiday_dates'') IS DISTINCT FROM ''array''
       OR coalesce(v_source->>''calendar_evidence_url'','''') !~ ''^https://[^ ]+''
    THEN RAISE EXCEPTION ''JRC_PLAN_NEW_MONTH_CALENDAR_PROOF_REQUIRED''; END IF;
    FOR v_holiday_date IN SELECT value FROM jsonb_array_elements_text(v_source->''holiday_dates'')
    LOOP
      IF v_holiday_date !~ ''^20[0-9]{2}-[01][0-9]-[0-3][0-9]$''
         OR v_holiday_date::date < v_valid_from
         OR v_holiday_date::date > v_valid_to
         OR extract(isodow FROM v_holiday_date::date) IN (6,7)
         OR v_holiday_date::date = ANY(v_holiday_dates)
      THEN RAISE EXCEPTION ''JRC_PLAN_INVALID_NEW_MONTH_HOLIDAY''; END IF;
      v_holiday_dates:=array_append(v_holiday_dates,v_holiday_date::date);
    END LOOP;
  END IF;');
 f:=replace(f,
   '      IF v_date::date < v_edition OR v_date < ''2026-11-01'' OR v_date > ''2026-11-30''',
   '      IF v_date::date < v_valid_from OR v_date::date > v_valid_to');
 f:=replace(f,
   '      -- Standard 2026 November calendar, including Culture Day and Labor Thanksgiving Day.
      IF v_date BETWEEN ''2026-11-01'' AND ''2026-11-30'' AND
        ((v_calendar=''odpt.Calendar:Weekday'' AND
           (extract(isodow FROM v_date::date) IN (6,7) OR v_date IN (''2026-11-03'',''2026-11-23'')))
          OR
         (v_calendar=''odpt.Calendar:SaturdayHoliday'' AND
           extract(isodow FROM v_date::date) BETWEEN 1 AND 5
           AND v_date NOT IN (''2026-11-03'',''2026-11-23'')))
      THEN RAISE EXCEPTION ''JRC_PLAN_SERVICE_CALENDAR_CONFLICT:%'',v_date; END IF;',
   '      -- Explicit source holiday overrides with weekday/weekend fallback.
      IF (v_calendar=''odpt.Calendar:Weekday'' AND
          (extract(isodow FROM v_date::date) IN (6,7)
           OR v_date::date=ANY(v_holiday_dates)))
         OR (v_calendar=''odpt.Calendar:SaturdayHoliday'' AND
          extract(isodow FROM v_date::date) BETWEEN 1 AND 5
          AND NOT(v_date::date=ANY(v_holiday_dates)))
      THEN RAISE EXCEPTION ''JRC_PLAN_SERVICE_CALENDAR_CONFLICT:%'',v_date; END IF;');
 f:=replace(f,
   '    v_number := v_train->>''train_number'';',
   '    v_number := v_train->>''train_number'';
    -- Existing Nov 2026 templates remain occurrence 0, later months
    -- get a unique monthly occurrence even with revision_id=NULL.
    IF (v_train ? ''source_occurrence'' AND
        (v_train->>''source_occurrence'') !~ ''^[0-9]{1,9}$'')
    THEN RAISE EXCEPTION ''JRC_PLAN_INVALID_SOURCE_OCCURRENCE''; END IF;
    v_occurrence:=coalesce(nullif(v_train->>''source_occurrence'','''')::integer,
      CASE WHEN v_valid_from>=DATE ''2026-12-01'' THEN
        extract(year FROM v_valid_from)::integer*10000+
        extract(month FROM v_valid_from)::integer*100 ELSE 0 END);');
 f:=replace(f,
   'destination_urns,source_path,source_trip_id,source_revision_date,operating_dates)',
   'destination_urns,source_path,source_trip_id,source_revision_date,operating_dates,source_occurrence)');
 f:=replace(f,
   'v_source_path,''md5:''||v_trip_hash,v_edition,v_dates)',
   'v_source_path,''md5:''||v_trip_hash,v_edition,v_dates,v_occurrence)');
 IF position('v_date::date < v_valid_from' IN f)=0
    OR position('v_valid_to date;' IN f)=0
    OR position('v_dates,v_occurrence)' IN f)=0
    OR position('v_holiday_dates:=ARRAY[]::date[]' IN f)=0
    OR position('v_date < ''2026-11-01'' OR v_date > ''2026-11-30''' IN f)>0
 THEN RAISE EXCEPTION 'JRC_PLAN_MONTH_VALIDATION_PATCH_FAILED'; END IF;
 EXECUTE f;
END
$migration$;

-- Indexes for the existing date-scoped train-runs service and manual importer.
CREATE INDEX IF NOT EXISTS jr_central_templates_service_dates_gin
ON public.manual_timetable_templates USING gin (operating_dates)
WHERE line_key IN ('TokaidoCentral','ChuoCentral','Gotemba','Minobu','Iida','Takayama','Taita','Taketoyo','KansaiCentral','KiseiCentral','Sangu','Meisho','MinoAkasaka');
CREATE INDEX IF NOT EXISTS jr_central_templates_route_calendar_idx
ON public.manual_timetable_templates(line_key,calendar_urn,train_number,source_revision_date)
WHERE line_key IN ('TokaidoCentral','ChuoCentral','Gotemba','Minobu','Iida','Takayama','Taita','Taketoyo','KansaiCentral','KiseiCentral','Sangu','Meisho','MinoAkasaka');
CREATE INDEX IF NOT EXISTS jr_central_line_stations_import_idx
ON public.line_stations(line_id,station_name,station_index);

-- Read-only overview of the actual SQL data, not an invented full roster.
CREATE OR REPLACE VIEW public.published_jr_central_sql_plan_status
WITH (security_invoker = true)
AS WITH lines AS (
 SELECT id FROM public.railway_lines
 WHERE timetable_operator='JR-Central' AND id<>'TokaidoShinkansen'
), stations AS (
 SELECT s.line_id,count(*) station_count
 FROM public.line_stations s JOIN lines l ON l.id=s.line_id
 GROUP BY s.line_id
), trips AS (
 SELECT t.line_key,count(*) templates,count(DISTINCT t.train_number) numbered_trains,
 count(*) FILTER(WHERE t.calendar_urn='odpt.Calendar:Weekday') weekday_templates,
 count(*) FILTER(WHERE t.calendar_urn='odpt.Calendar:SaturdayHoliday') holiday_templates,
 count(DISTINCT t.direction_urn) covered_directions,
 count(DISTINCT t.source_path) source_paths,
 min(t.source_revision_date) earliest_edition,max(t.source_revision_date) latest_edition
 FROM public.manual_timetable_templates t JOIN lines l ON l.id=t.line_key
 GROUP BY t.line_key
), stop_counts AS (
 SELECT t.line_key,count(*) timed_stops
 FROM public.manual_timetable_template_stops st
 JOIN public.manual_timetable_templates t ON t.id=st.template_id
 JOIN lines l ON l.id=t.line_key GROUP BY t.line_key
), dates AS (
 SELECT t.line_key,count(DISTINCT d.day) covered_dates,
 min(d.day) first_service_date,max(d.day) last_service_date
 FROM public.manual_timetable_templates t JOIN lines l ON l.id=t.line_key
 CROSS JOIN LATERAL unnest(t.operating_dates) d(day)
 GROUP BY t.line_key
)
SELECT l.id AS line_key, coalesce(st.station_count,0) AS registered_stations,
 coalesce(t.numbered_trains,0) AS numbered_trains,
 coalesce(t.templates,0) AS plan_templates,
 coalesce(t.weekday_templates,0) AS weekday_templates,
 coalesce(t.holiday_templates,0) AS holiday_templates,
 coalesce(t.covered_directions,0) AS sampled_directions,
 coalesce(t.source_paths,0) AS source_paths,
 coalesce(s.timed_stops,0) AS stop_events,
 coalesce(d.covered_dates,0) AS covered_dates,
 d.first_service_date,d.last_service_date,
 t.earliest_edition,t.latest_edition,
 coalesce(a.acceptance_status,'not_evaluated') AS acceptance_status,
 coalesce(a.full_day_timetable_acceptance_passed,false) AS full_day_accepted,
 CASE WHEN coalesce(a.full_day_timetable_acceptance_passed,false) THEN 'accepted_full_day'
      WHEN coalesce(t.templates,0)=0 THEN 'no_numbered_plan'
      ELSE 'sampled_not_full_day' END AS sql_data_status
FROM lines l
LEFT JOIN stations st ON st.line_id=l.id
LEFT JOIN trips t ON t.line_key=l.id
LEFT JOIN stop_counts s ON s.line_key=l.id
LEFT JOIN dates d ON d.line_key=l.id
LEFT JOIN public.published_timetable_full_day_acceptance a ON a.line_key=l.id;
REVOKE ALL ON public.published_jr_central_sql_plan_status FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.import_jr_central_authorized_plan(text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role;
