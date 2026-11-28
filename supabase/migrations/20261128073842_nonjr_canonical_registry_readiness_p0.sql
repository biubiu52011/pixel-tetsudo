-- Register non-JR canonical SQL lines independently of ODPT connectivity.
-- Preserve source records and original view shape. Never fabricate timetable data.
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
 SELECT l.id AS line_key,COALESCE(NULLIF(btrim(l.odpt_operator),''),NULLIF(btrim(l.timetable_operator),'')) AS registered_operator,l.odpt_railway
 FROM public.railway_lines l
 WHERE COALESCE(NULLIF(btrim(l.timetable_operator),''),NULLIF(btrim(l.odpt_operator),'')) !~ '^JR([.-]|$)'
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
 COALESCE(verified.official_or_rule_operator,cat.timetable_operator,reg.registered_operator,src.source_operator) AS operator_key,
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
LEFT JOIN rule_inventory rules ON rules.operator_key=UPPER(btrim(COALESCE(verified.official_or_rule_operator,cat.timetable_operator,reg.registered_operator,src.source_operator,'')));
CREATE OR REPLACE VIEW public.published_nonjr_registered_line_import_triage
WITH (security_invoker=true,security_barrier=true) AS
SELECT l.id AS line_key, v.operator_key, l.odpt_railway,
 l.timetable_api_enabled AS external_timetable_api_configured,
 l.sql_planned_fallback_enabled AS sql_planned_fallback_configured,
 v.weekday_templates AS published_weekday_templates,
 v.holiday_templates AS published_holiday_templates,
 CASE WHEN l.timetable_api_enabled THEN 'external_api_configured_sql_plan_not_imported'
 ELSE 'no_published_timetable_and_no_api_configured' END::text AS next_action_class,
 'Do not infer or copy train times or models from adjacent railway lines'::text AS protection
FROM public.railway_lines l
JOIN public.published_nonjr_timetable_vehicle_readiness v ON v.line_key=l.id
WHERE v.present_in_registered_lines AND v.plan_templates=0;
REVOKE ALL ON public.published_nonjr_timetable_vehicle_readiness, public.published_nonjr_registered_line_import_triage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.published_nonjr_timetable_vehicle_readiness, public.published_nonjr_registered_line_import_triage TO service_role;
COMMENT ON VIEW public.published_nonjr_timetable_vehicle_readiness IS 'Canonical non-JR SQL registry plus source-only lines; ODPT connection is not a registration requirement. Candidate models are not confirmed planned vehicles.';
DO $verify$
BEGIN
 IF EXISTS (SELECT 1 FROM public.railway_lines l LEFT JOIN public.published_nonjr_timetable_vehicle_readiness v ON v.line_key=l.id WHERE COALESCE(NULLIF(btrim(l.timetable_operator),''),NULLIF(btrim(l.odpt_operator),'')) !~ '^JR([.-]|$)' AND NOT COALESCE(v.present_in_registered_lines,false)) THEN RAISE EXCEPTION 'Non-JR registry audit incomplete'; END IF;
 IF EXISTS (SELECT 1 FROM public.published_nonjr_timetable_vehicle_readiness v WHERE v.present_in_registered_lines AND v.plan_templates=0 AND NOT EXISTS (SELECT 1 FROM public.published_nonjr_registered_line_import_triage t WHERE t.line_key=v.line_key)) THEN RAISE EXCEPTION 'Non-JR no-plan triage incomplete'; END IF;
END $verify$;

