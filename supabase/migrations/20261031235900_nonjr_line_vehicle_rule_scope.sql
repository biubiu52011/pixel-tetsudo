-- A company's vehicle-family rule is only eligible for a planned
-- line when its network_key or explicit plan_scope.lineIds names that line.
-- Eligibility is NOT evidence of a specific scheduled train's vehicle type.
-- This prevents applying the Yokohama Minatomirai Kodomonokuni Y000 rule to
-- the MinatoMirai Line merely because both share a company operator.
BEGIN;
CREATE OR REPLACE VIEW public.published_nonjr_line_vehicle_rule_scope
WITH (security_invoker=true,security_barrier=true) AS
SELECT x.line_key,x.operator_key,x.plan_templates,
 x.schedule_vehicle_rule_supported,
 x.single_type_source_candidate_only,x.vehicle_unresolved,
 COUNT(f.id)::bigint AS operator_family_rules,
 COUNT(f.id) FILTER(WHERE
   f.network_key=x.line_key OR
   COALESCE(f.plan_scope->'lineIds' ? x.line_key,FALSE)
 )::bigint AS line_scoped_family_rules,
 COUNT(f.id) FILTER(WHERE
   (f.network_key=x.line_key OR
    COALESCE(f.plan_scope->'lineIds' ? x.line_key,FALSE))
   AND f.exact_vehicle_type IS NOT NULL
   AND btrim(f.exact_vehicle_type)<>''
 )::bigint AS line_scoped_exact_type_rules,
 COUNT(f.id) FILTER(WHERE
   (f.network_key=x.line_key OR
    COALESCE(f.plan_scope->'lineIds' ? x.line_key,FALSE))
   AND cardinality(f.vehicle_candidates)>1
 )::bigint AS line_scoped_multi_candidate_rules,
 CASE
  WHEN x.plan_templates=0 THEN 'no_published_plan'
  WHEN x.schedule_vehicle_rule_supported>0 THEN 'some_train_specific_schedule_evidence'
  WHEN COUNT(f.id) FILTER(WHERE f.network_key=x.line_key OR COALESCE(f.plan_scope->'lineIds' ? x.line_key,FALSE))=0 THEN 'no_applicable_line_vehicle_rule'
  ELSE 'only_line_scoped_fleet_candidates_not_train_assignments'
 END::text AS evidence_state
FROM public.published_nonjr_timetable_vehicle_readiness x
LEFT JOIN public.operation_family_rules f ON upper(btrim(f.operator))=upper(btrim(x.operator_key))
GROUP BY x.line_key,x.operator_key,x.plan_templates,
x.schedule_vehicle_rule_supported,x.single_type_source_candidate_only,x.vehicle_unresolved;

COMMENT ON VIEW public.published_nonjr_line_vehicle_rule_scope IS
 'Distinguishes operator-level fleet rule inventory from rules applicable to a specific line. A line rule never implies a planned trainset/formation assignment.';
REVOKE ALL ON public.published_nonjr_line_vehicle_rule_scope FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.published_nonjr_line_vehicle_rule_scope TO service_role;

DO $verify$
BEGIN
 IF (SELECT line_scoped_family_rules
   FROM public.published_nonjr_line_vehicle_rule_scope
   WHERE line_key='MinatoMirai') <> 0
 OR (SELECT line_scoped_family_rules FROM public.published_nonjr_line_vehicle_rule_scope
     WHERE line_key='NewShuttle')<>1
 OR (SELECT line_scoped_family_rules FROM public.published_nonjr_line_vehicle_rule_scope
     WHERE line_key='TsukubaExpress')<>1
 OR (SELECT count(*) FROM public.published_nonjr_line_vehicle_rule_scope)<>89
 THEN RAISE EXCEPTION 'Operator / line-scoped rule isolation failed'; END IF;
END $verify$;
COMMIT;