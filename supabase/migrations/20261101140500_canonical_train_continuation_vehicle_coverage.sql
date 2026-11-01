-- Train identity is the canonical timetable_id, never its first line/source.
-- Only audit verified continuation; conflicting models are not resolved.
CREATE OR REPLACE VIEW public.published_train_continuation_vehicle_coverage
WITH (security_invoker = true)
AS
SELECT
  t.id AS timetable_id,
  t.calendar_urn,
  t.primary_train_number,
  t.group_evidence,
  COUNT(*)::integer AS source_segments,
  ARRAY_AGG(DISTINCT m.line_key ORDER BY m.line_key) AS line_keys,
  COUNT(DISTINCT NULLIF(BTRIM(m.vehicle_type_label), ''))::integer AS distinct_source_vehicle_labels,
  CASE WHEN COUNT(DISTINCT NULLIF(BTRIM(m.vehicle_type_label), '')) = 1
       THEN MIN(NULLIF(BTRIM(m.vehicle_type_label), ''))
       ELSE NULL END AS sole_source_vehicle_candidate,
  MAX(vm.vehicle_type) AS canonical_vehicle_model,
  MAX(vm.mapping_level) AS mapping_level,
  CASE
    WHEN MAX(vm.vehicle_type) IS NOT NULL THEN 'canonical_vehicle_mapped'
    WHEN COUNT(DISTINCT NULLIF(BTRIM(m.vehicle_type_label), '')) > 1 THEN 'conflicting_member_vehicle_labels'
    WHEN COUNT(DISTINCT NULLIF(BTRIM(m.vehicle_type_label), '')) = 1 THEN 'missing_canonical_vehicle_mapping'
    ELSE 'no_source_vehicle_evidence'
  END AS vehicle_coverage_status
FROM public.train_timetables t
JOIN public.train_timetable_members mem ON mem.timetable_id=t.id
JOIN public.manual_timetable_templates m ON m.id=mem.source_template_id
LEFT JOIN public.train_timetable_vehicle_mappings vm ON vm.timetable_id=t.id
WHERE t.group_evidence='verified_continuation'
GROUP BY t.id,t.calendar_urn,t.primary_train_number,t.group_evidence
HAVING COUNT(*) >= 2;

COMMENT ON VIEW public.published_train_continuation_vehicle_coverage
IS 'Published plan only: audit planned vehicle model per canonical through train and all its verified line segments; source candidates do not imply actual formation. Matches by timetable_id, never by train number alone.';
