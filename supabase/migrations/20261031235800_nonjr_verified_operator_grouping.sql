-- Resolve company identity for NON-JR audit without editing published
-- railway URNs or assigning any candidate fleet to a specific train.
-- Verified operator identity review is line-scoped, not name-only.
BEGIN;
CREATE OR REPLACE VIEW public.published_nonjr_timetable_vehicle_readiness
WITH (security_invoker=true,security_barrier=true) AS
WITH source_counts AS (
 SELECT
  m.line_key,
  MIN(CASE
    WHEN m.railway_urn LIKE 'odpt.Railway:%'
      THEN split_part(split_part(m.railway_urn,':',2),'.',1)
    ELSE m.railway_urn
   END) AS source_operator,
  COUNT(*)::bigint AS plan_templates,
  COUNT(*) FILTER(WHERE m.calendar_urn='odpt.Calendar:Weekday')::bigint AS weekday_templates,
  COUNT(*) FILTER(WHERE m.calendar_urn='odpt.Calendar:SaturdayHoliday')::bigint AS holiday_templates,
  COUNT(*) FILTER(
    WHERE r.vehicle_type IS NOT NULL AND btrim(r.vehicle_type) <> ''
      AND r.mapping_level IN ('dated_schedule_rule','dated_operation_owner')
  )::bigint AS schedule_vehicle_rule_supported,
  COUNT(*) FILTER(
    WHERE r.vehicle_type IS NOT NULL AND btrim(r.vehicle_type) <> ''
      AND r.mapping_level='source_single_type_candidate'
  )::bigint AS single_type_source_candidate_only,
  COUNT(*) FILTER(
    WHERE r.vehicle_type IS NULL OR btrim(r.vehicle_type)=''
       OR r.mapping_level NOT IN ('dated_schedule_rule','dated_operation_owner','source_single_type_candidate')
  )::bigint AS vehicle_unresolved,
  COUNT(*) FILTER(WHERE m.vehicle_type_label LIKE '%/%')::bigint AS source_multi_vehicle_labels,
  COUNT(*) FILTER(WHERE m.source_revision_date IS NULL AND m.revision_id IS NULL)::bigint AS source_revision_unverified
 FROM public.manual_timetable_templates m
 LEFT JOIN public.train_timetable_source_resolution r ON r.source_template_id=m.id
 WHERE m.railway_urn NOT LIKE 'odpt.Railway:JR-%'
   AND m.railway_urn NOT LIKE 'odpt.Railway:JR.%'
 GROUP BY m.line_key
),
registered AS (
 SELECT l.id AS line_key,l.odpt_operator AS registered_operator,l.odpt_railway
 FROM public.railway_lines l
 WHERE l.odpt_operator IS NOT NULL
   AND l.odpt_operator NOT LIKE 'JR-%'
),
all_keys AS (
 SELECT line_key FROM source_counts
 UNION SELECT line_key FROM registered
),
rule_inventory AS (
 SELECT upper(btrim(operator)) AS operator_key, COUNT(*)::bigint AS operation_family_rule_rows,
 COUNT(*) FILTER(WHERE exact_vehicle_type IS NOT NULL AND btrim(exact_vehicle_type)<>'')::bigint
    AS operator_exact_model_rule_rows,
 COUNT(*) FILTER(WHERE cardinality(vehicle_candidates)=1)::bigint AS operator_single_candidate_rule_rows,
 COUNT(*) FILTER(WHERE cardinality(vehicle_candidates)>1)::bigint AS operator_multiple_candidate_rule_rows
 FROM public.operation_family_rules
 WHERE btrim(operator)<>''
 GROUP BY upper(btrim(operator))
)
SELECT a.line_key,
 COALESCE(reg.registered_operator,verified.official_or_rule_operator,cat.timetable_operator,src.source_operator) AS operator_key,
 reg.registered_operator,src.source_operator,
 reg.odpt_railway,
 (reg.line_key IS NOT NULL) AS present_in_registered_lines,
 (src.line_key IS NOT NULL) AS present_in_source_timetables,
 COALESCE(src.plan_templates,0)::bigint AS plan_templates,
 COALESCE(src.weekday_templates,0)::bigint AS weekday_templates,
 COALESCE(src.holiday_templates,0)::bigint AS holiday_templates,
 COALESCE(src.schedule_vehicle_rule_supported,0)::bigint AS schedule_vehicle_rule_supported,
 COALESCE(src.single_type_source_candidate_only,0)::bigint AS single_type_source_candidate_only,
 COALESCE(src.vehicle_unresolved,0)::bigint AS vehicle_unresolved,
 COALESCE(src.source_multi_vehicle_labels,0)::bigint AS source_multi_vehicle_labels,
 COALESCE(src.source_revision_unverified,0)::bigint AS source_revision_unverified,
 COALESCE(rules.operation_family_rule_rows,0)::bigint AS operator_exact_name_rule_rows,
 COALESCE(rules.operator_exact_model_rule_rows,0)::bigint AS operator_exact_model_rule_rows,
 COALESCE(rules.operator_single_candidate_rule_rows,0)::bigint AS operator_single_candidate_rule_rows,
 COALESCE(rules.operator_multiple_candidate_rule_rows,0)::bigint AS operator_multiple_candidate_rule_rows,
 CASE
  WHEN src.line_key IS NULL THEN 'registered_id_without_matching_timetable'
  WHEN src.weekday_templates=0 OR src.holiday_templates=0 THEN 'one_calendar_missing'
  WHEN src.plan_templates<=2 THEN 'one_or_two_source_templates'
  ELSE 'two_calendars_present_coverage_unverified'
 END::text AS timetable_readiness,
 CASE
  WHEN src.line_key IS NULL THEN 'no_plan_to_evaluate'
  WHEN src.schedule_vehicle_rule_supported=src.plan_templates THEN 'all_plan_rules_supported'
  WHEN src.schedule_vehicle_rule_supported>0 THEN 'some_plan_rules_supported'
  WHEN src.single_type_source_candidate_only>0 THEN 'candidate_only_not_operation_verified'
  ELSE 'unresolved_plan_vehicle'
 END::text AS planned_vehicle_readiness
FROM all_keys a
LEFT JOIN registered reg ON reg.line_key=a.line_key
LEFT JOIN public.railway_lines cat ON cat.id=a.line_key
LEFT JOIN public.published_nonjr_operator_identity_review verified ON verified.line_key=a.line_key
LEFT JOIN source_counts src ON src.line_key=a.line_key
LEFT JOIN rule_inventory rules ON rules.operator_key=UPPER(btrim(COALESCE(reg.registered_operator,verified.official_or_rule_operator,cat.timetable_operator,src.source_operator,'')));

COMMENT ON VIEW public.published_nonjr_timetable_vehicle_readiness IS
 'Non-JR recurring timetable and planned-model audit using verified canonical company identity where available, preserving old source operator labels for traceability. Single-candidate models are NOT confirmed planned vehicles.';
DO $verify$
DECLARE n bigint; s bigint; r bigint;
BEGIN
 SELECT count(*) INTO n FROM public.published_nonjr_timetable_vehicle_readiness
 WHERE line_key='NewShuttle' AND operator_key='SaitamaNewUrbanTransit'
   AND plan_templates=424;
 SELECT count(*) INTO s FROM public.published_nonjr_timetable_vehicle_readiness
 WHERE line_key='SaitamaRapid' AND operator_key='SaitamaRailway' AND plan_templates=533;
 SELECT COALESCE(SUM(plan_templates),0) INTO r FROM public.published_nonjr_timetable_vehicle_readiness;
 IF n<>1 OR s<>1 OR r<>55673 THEN
   RAISE EXCEPTION 'Canonical operator grouping failed NewShuttle %, SaitamaRapid %, total %',n,s,r;
 END IF;
END $verify$;
COMMIT;