-- Read-only service-date/PNG coverage audit (2026-11-16 baseline).
-- This reuses the existing canonical SOURCE-level owner:
-- public.train_timetable_source_resolution (one row per manual source template).
-- It already reconciles train_timetable_members and train_timetables;
-- DO NOT directly join manual_timetable_templates.id to train_timetables.id.
-- It is also invalid to demand that the lead template equals the selected
-- vehicle mapping template; a multi-segment train can use a continuation's
-- valid vehicle source. Inspect members instead of rejecting unequal IDs.
--
-- All results are source evidence, not actual vehicle or UI-rendered PNG.
-- The date filter is only an explicit-dates SUBSET. A source without
-- operating_dates may still run by weekly calendar or an independent feed.
-- Change the date in each params CTE for a different service day.

-- 1. Source provenance and explicitly dated samples.
WITH params AS (SELECT DATE '2026-11-16' AS service_date)
SELECT
 count(*) AS source_templates,
 count(*) FILTER (
   WHERE m.operating_dates IS NULL OR cardinality(m.operating_dates)=0
 ) AS source_templates_without_explicit_dates,
 count(*) FILTER (
   WHERE cardinality(m.operating_dates)>0
 ) AS source_templates_with_explicit_dates,
 count(*) FILTER (
   WHERE p.service_date=ANY(m.operating_dates)
 ) AS active_explicit_date_source_rows,
 count(DISTINCT (m.line_key,m.railway_urn,m.calendar_urn,
   m.direction_urn,m.train_number)) FILTER (
   WHERE p.service_date=ANY(m.operating_dates)
 ) AS active_explicit_date_distinct_keys,
 count(*) FILTER (
   WHERE p.service_date=ANY(m.operating_dates)
     AND s.mapping_level='unresolved'
 ) AS active_explicit_date_unresolved,
 count(*) FILTER (
   WHERE p.service_date=ANY(m.operating_dates) AND s.vehicle_type IS NOT NULL
 ) AS active_explicit_date_with_model,
 count(*) FILTER (
   WHERE p.service_date=ANY(m.operating_dates)
     AND s.vehicle_artwork_path IS NOT NULL
 ) AS active_explicit_date_with_sql_png_path,
 count(*) FILTER (
   WHERE p.service_date=ANY(m.operating_dates)
     AND m.source_revision_date>=date_trunc('month',p.service_date)::date
     AND m.source_revision_date<(date_trunc('month',p.service_date)+interval '1 month')::date
 ) AS active_explicit_date_revised_this_month
FROM public.manual_timetable_templates m
JOIN public.train_timetable_source_resolution s ON s.source_template_id=m.id
CROSS JOIN params p;

-- 2. Explicitly dated line-level numbers (not the total active-day service set).
WITH params AS (SELECT DATE '2026-11-16' AS service_date)
SELECT m.line_key,
 count(*) AS active_explicit_date_source_rows,
 count(*) FILTER (WHERE s.mapping_level='unresolved') AS unresolved,
 count(*) FILTER (WHERE s.vehicle_type IS NOT NULL) AS with_model,
 count(*) FILTER (WHERE s.vehicle_artwork_path IS NOT NULL) AS with_sql_png,
 string_agg(DISTINCT s.mapping_level,', ') AS mapping_levels
FROM public.manual_timetable_templates m
JOIN public.train_timetable_source_resolution s ON s.source_template_id=m.id
CROSS JOIN params p
WHERE p.service_date=ANY(m.operating_dates)
GROUP BY m.line_key ORDER BY active_explicit_date_source_rows DESC,m.line_key;

-- 3. Duplicate source keys: distinguish underlying source overlap from train
-- identity, service continuation, or repeated provenance.
WITH params AS (SELECT DATE '2026-11-16' AS service_date)
SELECT m.line_key,m.railway_urn,m.calendar_urn,m.direction_urn,m.train_number,
 count(*) AS source_rows,
 array_agg(m.id ORDER BY m.id) AS source_template_ids,
 array_agg(m.source_path ORDER BY m.id) AS source_paths
FROM public.manual_timetable_templates m CROSS JOIN params p
WHERE p.service_date=ANY(m.operating_dates)
GROUP BY m.line_key,m.railway_urn,m.calendar_urn,m.direction_urn,m.train_number
HAVING count(*)>1
ORDER BY source_rows DESC,m.line_key,m.train_number;

-- 4. Highest-priority numbered source lines in previous audit.
SELECT m.line_key,count(*) AS source_templates,
 count(*) FILTER (WHERE s.mapping_level='unresolved') AS unresolved,
 count(*) FILTER (WHERE s.mapping_level<>'unresolved') AS model_or_candidate,
 count(*) FILTER (WHERE s.vehicle_artwork_path IS NOT NULL) AS direct_sql_png,
 count(*) FILTER (
   WHERE NULLIF(btrim(m.vehicle_type_label),'') IS NOT NULL
 ) AS source_vehicle_label
FROM public.manual_timetable_templates m
JOIN public.train_timetable_source_resolution s ON s.source_template_id=m.id
WHERE m.line_key IN (
 'Keikyu','Odawara','Ikebukuro','Tojo','TobuSkytree',
 'SotetsuMain','Keisei','TokyuToyoko','SeibuShinjuku','OsakaLoop'
)
GROUP BY m.line_key ORDER BY source_templates DESC,m.line_key;

-- 5. Tested provenance guards: both counts should be zero.
-- 380 vehicle-mapping sources differ from the canonical LEAD source template,
-- but all those sources are valid members of the same train-timetable group.
SELECT
 (SELECT count(*)
    FROM public.train_timetable_source_resolution s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.train_timetable_members mem
      WHERE mem.timetable_id=s.timetable_id
        AND mem.source_template_id=s.source_template_id
    )) AS source_resolution_nonmembers,
 (SELECT count(*)
    FROM public.train_timetable_vehicle_resolution r
    WHERE r.source_template_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.train_timetable_members mem
        WHERE mem.timetable_id=r.timetable_id
          AND mem.source_template_id=r.source_template_id
      )) AS vehicle_mapping_nonmembers;
