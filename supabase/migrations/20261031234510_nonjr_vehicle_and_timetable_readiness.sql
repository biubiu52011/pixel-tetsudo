-- Audit registered/non-JR commuter railways separately from vehicle certainty.
-- Recurring Weekday / SaturdayHoliday planned-service timetable ONLY.
-- A one-line source vehicle label, candidate fleet, or operating-code family
-- does not prove that a specific train has one particular planned vehicle type.
-- No observation of actual carsets, service dates or actual train formations.
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
 COALESCE(reg.registered_operator,src.source_operator) AS operator_key,
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
LEFT JOIN source_counts src ON src.line_key=a.line_key
LEFT JOIN rule_inventory rules ON rules.operator_key=UPPER(btrim(COALESCE(reg.registered_operator,src.source_operator,'')));

COMMENT ON VIEW public.published_nonjr_timetable_vehicle_readiness IS
 'Internal non-JR published recurring train timetable and planned vehicle confidence audit. 1-2 fleet rules are NOT 1-2 trains. Exact matches of registered line IDs only; alias reconciliation requires evidence. No actual dated vehicle assignment.';

CREATE OR REPLACE VIEW public.published_nonjr_operator_readiness
WITH (security_invoker=true,security_barrier=true) AS
SELECT operator_key,
 COUNT(*)::bigint AS tracked_line_keys,
 COUNT(*) FILTER(WHERE present_in_registered_lines)::bigint AS registered_line_keys,
 COUNT(*) FILTER(WHERE timetable_readiness='registered_id_without_matching_timetable')::bigint
   AS registered_ids_without_timetables,
 COUNT(*) FILTER(WHERE plan_templates>0)::bigint AS with_plans,
 COALESCE(SUM(plan_templates),0)::bigint AS plan_templates,
 COALESCE(SUM(weekday_templates),0)::bigint AS weekday_templates,
 COALESCE(SUM(holiday_templates),0)::bigint AS holiday_templates,
 COALESCE(SUM(schedule_vehicle_rule_supported),0)::bigint AS schedule_vehicle_rule_supported,
 COALESCE(SUM(single_type_source_candidate_only),0)::bigint AS single_type_source_candidate_only,
 COALESCE(SUM(vehicle_unresolved),0)::bigint AS vehicle_unresolved,
 MAX(operator_exact_name_rule_rows) AS operator_exact_name_rule_rows
FROM public.published_nonjr_timetable_vehicle_readiness
GROUP BY operator_key;

COMMENT ON VIEW public.published_nonjr_operator_readiness IS
 'Operator-level sum of timetable templates and separately graded scheduled vehicle certainty, based on non-JR line readiness. No observed service-date formations.';

REVOKE ALL ON public.published_nonjr_timetable_vehicle_readiness FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.published_nonjr_operator_readiness FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.published_nonjr_timetable_vehicle_readiness TO service_role;
GRANT SELECT ON public.published_nonjr_operator_readiness TO service_role;

DO $audit$
DECLARE n_sources bigint; n_supported bigint; n_candidates bigint; n_unresolved bigint; n_missing int;
BEGIN
 SELECT SUM(plan_templates),SUM(schedule_vehicle_rule_supported),
        SUM(single_type_source_candidate_only),SUM(vehicle_unresolved),
        COUNT(*) FILTER(WHERE timetable_readiness='registered_id_without_matching_timetable')
 INTO n_sources,n_supported,n_candidates,n_unresolved,n_missing
 FROM public.published_nonjr_timetable_vehicle_readiness;
 IF n_sources<>55673 OR n_supported<>403 OR n_candidates<>7006 OR n_unresolved<>48264 OR n_missing<>12 THEN
  RAISE EXCEPTION 'Audit input drift: source %, rule %, candidate %, unresolved %, registered missing %',
     n_sources,n_supported,n_candidates,n_unresolved,n_missing;
 END IF;
END $audit$;
COMMIT;