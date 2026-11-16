-- Read-only service-date and evidence-coverage audit for pixel-tetsudo.
-- Source: public.manual_timetable_templates, public.train_timetables,
-- public.train_timetable_vehicle_resolution. No DDL, no mutations.
--
-- Change the literal date in EACH parameters CTE before running a different day.
-- IMPORTANT: manual_timetable_templates.id != train_timetables.id.
-- The correct provenance relationship is:
--   train_timetables.lead_source_template_id = manual_timetable_templates.id
-- then train_timetable_vehicle_resolution.timetable_id = train_timetables.id.
-- The resolution view's source_template_id is secondary provenance, not
-- a replacement for the canonical timetable join.
-- explicit operating_dates selects evidence-bearing source templates only;
-- NULL dates do not mean the train did not operate. Do not call this a full-day
-- timetable count or a rendered-PNG success percentage.
--
-- 1. Whole-source summary, same metric definitions on each run.
WITH params AS (
  SELECT DATE '2026-11-16' AS service_date
), linked AS (
  SELECT m.id AS source_template_id, m.line_key, m.railway_urn,
    m.calendar_urn, m.direction_urn, m.train_number, m.operating_dates,
    m.source_revision_date, m.source_path, t.id AS canonical_timetable_id,
    r.source_template_id AS resolution_source_template_id,
    r.mapping_level, r.vehicle_type, r.vehicle_artwork_path,
    r.actual_vehicle_confirmed
  FROM public.manual_timetable_templates m
  LEFT JOIN public.train_timetables t ON
    t.lead_source_template_id = m.id
  LEFT JOIN public.train_timetable_vehicle_resolution r ON
    r.timetable_id = t.id
)
SELECT
  count(*) AS total_source_templates,
  count(*) FILTER (
    WHERE operating_dates IS NULL OR cardinality(operating_dates)=0
  ) AS templates_without_explicit_dates,
  count(*) FILTER (
    WHERE cardinality(operating_dates)>0
  ) AS templates_with_explicit_dates,
  count(*) FILTER (
    WHERE p.service_date=ANY(operating_dates)
  ) AS explicit_date_source_rows,
  count(DISTINCT (
    line_key, railway_urn, calendar_urn, direction_urn, train_number
  )) FILTER (
    WHERE p.service_date=ANY(operating_dates)
  ) AS explicit_date_unique_service_keys,
  count(*) FILTER (
    WHERE p.service_date=ANY(operating_dates)
      AND canonical_timetable_id IS NOT NULL
  ) AS explicit_date_joined_to_canonical,
  count(*) FILTER (
    WHERE p.service_date=ANY(operating_dates)
      AND mapping_level='unresolved'
  ) AS explicit_date_unresolved,
  count(*) FILTER (
    WHERE p.service_date=ANY(operating_dates) AND vehicle_type IS NOT NULL
  ) AS explicit_date_model_label,
  count(*) FILTER (
    WHERE p.service_date=ANY(operating_dates)
      AND vehicle_artwork_path IS NOT NULL
  ) AS explicit_date_sql_png_path,
  count(*) FILTER (
    WHERE p.service_date=ANY(operating_dates)
      AND actual_vehicle_confirmed
  ) AS explicit_date_confirmed_physical_vehicle,
  count(*) FILTER (
    WHERE p.service_date=ANY(operating_dates)
      AND resolution_source_template_id IS NOT NULL
      AND resolution_source_template_id<>source_template_id
  ) AS source_lineage_mismatch,
  count(*) FILTER (
    WHERE p.service_date=ANY(operating_dates)
      AND source_revision_date>=date_trunc('month',p.service_date)::date
      AND source_revision_date<(date_trunc('month',p.service_date)+interval '1 month')::date
  ) AS explicit_date_revised_in_month
FROM linked CROSS JOIN params p;

-- 2. Per-line status of explicitly dated templates.
WITH params AS (
  SELECT DATE '2026-11-16' AS service_date
)
SELECT m.line_key, count(*) AS dated_source_rows,
  count(*) FILTER (WHERE t.id IS NOT NULL) AS canonical_linked,
  count(*) FILTER (WHERE r.mapping_level='unresolved') AS unresolved,
  count(*) FILTER (WHERE r.vehicle_type IS NOT NULL) AS model_label,
  count(*) FILTER (WHERE r.vehicle_artwork_path IS NOT NULL) AS sql_png_path,
  count(*) FILTER (WHERE r.actual_vehicle_confirmed) AS confirmed_physical,
  string_agg(DISTINCT COALESCE(r.mapping_level,'NO_LINK'),', ') AS mapping_levels
FROM public.manual_timetable_templates m
CROSS JOIN params p
LEFT JOIN public.train_timetables t ON
  t.lead_source_template_id=m.id
LEFT JOIN public.train_timetable_vehicle_resolution r ON
  r.timetable_id=t.id
WHERE p.service_date=ANY(m.operating_dates)
GROUP BY m.line_key ORDER BY dated_source_rows DESC, m.line_key;

-- 3. Exact service-number collision: do not count duplicate source rows twice.
-- Duplicate keys may be independent provenance sources, not contradictory cars.
WITH params AS (
  SELECT DATE '2026-11-16' AS service_date
)
SELECT m.line_key, m.railway_urn, m.calendar_urn,
  m.direction_urn, m.train_number, count(*) AS source_rows,
  array_agg(m.id ORDER BY m.id) AS source_template_ids,
  array_agg(m.source_path ORDER BY m.id) AS source_paths
FROM public.manual_timetable_templates m CROSS JOIN params p
WHERE p.service_date=ANY(m.operating_dates)
GROUP BY m.line_key,m.railway_urn,m.calendar_urn,m.direction_urn,m.train_number
HAVING count(*)>1
ORDER BY source_rows DESC,m.line_key,m.train_number;

-- 4. Prioritized high-volume route evidence gaps. Never join on equal IDs.
SELECT m.line_key,
  count(*) AS source_templates,
  count(*) FILTER (WHERE t.id IS NOT NULL) AS linked_canonical,
  count(*) FILTER (WHERE r.mapping_level='unresolved') AS unresolved,
  count(*) FILTER (WHERE r.mapping_level IS NOT NULL
    AND r.mapping_level<>'unresolved') AS mapped_model_or_candidate,
  count(*) FILTER (WHERE r.vehicle_artwork_path IS NOT NULL) AS sql_png_path,
  count(*) FILTER (WHERE NULLIF(btrim(m.vehicle_type_label),'') IS NOT NULL)
    AS source_vehicle_label
FROM public.manual_timetable_templates m
LEFT JOIN public.train_timetables t ON
  t.lead_source_template_id=m.id
LEFT JOIN public.train_timetable_vehicle_resolution r ON
  r.timetable_id=t.id
WHERE m.line_key IN (
 'Keikyu','Odawara','Ikebukuro','Tojo','TobuSkytree',
 'SotetsuMain','Keisei','TokyuToyoko','SeibuShinjuku','OsakaLoop'
)
GROUP BY m.line_key ORDER BY source_templates DESC,m.line_key;

-- 5. Correctness guard: this MUST return zero rows.
SELECT m.id AS source_template_id, t.id AS canonical_timetable_id,
  r.source_template_id AS mapping_source_template_id
FROM public.manual_timetable_templates m
JOIN public.train_timetables t ON t.lead_source_template_id=m.id
JOIN public.train_timetable_vehicle_resolution r ON r.timetable_id=t.id
WHERE r.source_template_id IS NOT NULL AND r.source_template_id<>m.id
LIMIT 100;
