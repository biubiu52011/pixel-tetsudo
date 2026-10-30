-- An official published run-to-service label may select a scoped PLAN-only
-- vehicle FAMILY. It never identifies the actual consist/series variant.
-- Ambiguous plans are returned without selected candidates; no PNG here.
CREATE OR REPLACE VIEW rail_audit.official_train_run_planned_fleet
WITH (security_invoker = true) AS
WITH matching_rules AS (
 SELECT c.train_run_id, f.id rule_id
 FROM rail_audit.official_train_run_service_crosswalk c
 JOIN public.train_runs r ON r.id=c.train_run_id
 JOIN public.operation_family_rules f ON f.operator=c.operator
                               AND f.network_key=c.line_id
 WHERE c.evidence_status='OFFICIAL_RUN_SERVICE_LINK'
   AND r.train_type LIKE '%.Shinkansen'
   AND f.code_pattern LIKE 'PLAN:%'
   AND f.exact_vehicle_type IS NULL
   AND f.plan_scope @> '{"planOnly":true}'::jsonb
   AND (f.plan_scope->'lineIds') ? c.line_id
   AND (NOT f.plan_scope ? 'trainTypes' OR
        (f.plan_scope->'trainTypes') ? 'Shinkansen')
   AND (NOT f.plan_scope ? 'candidateLabelsAny'
        OR (f.plan_scope->'candidateLabelsAny') ?
           regexp_replace(
             regexp_replace(c.published_service_name,'[[:space:]　]+','','g'),
             '[0-9０-９]+号?$','','g'))
   AND f.effective_from <= c.service_date
   AND (f.effective_to IS NULL OR f.effective_to >= c.service_date)
   AND cardinality(f.vehicle_candidates)>0
), rollup AS (
 SELECT train_run_id,count(DISTINCT rule_id) rule_count,
        min(rule_id) single_rule_id
 FROM matching_rules GROUP BY train_run_id
)
SELECT c.train_run_id,c.operator,c.line_id,c.service_date,
       c.operational_train_number,c.published_service_name,
       c.source_id AS run_source_id,c.source_url AS published_run_source_url,
       coalesce(rollup.rule_count,0::bigint) AS candidate_plan_rule_count,
       CASE WHEN rollup.rule_count=1 THEN f.id ELSE NULL::bigint END AS selected_plan_rule_id,
       CASE WHEN rollup.rule_count=1 THEN f.vehicle_candidates ELSE NULL::text[] END AS planned_vehicle_candidates,
       CASE WHEN rollup.rule_count=1 THEN es.source_url ELSE NULL::text END AS planned_fleet_source_url,
       CASE WHEN c.evidence_status<>'OFFICIAL_RUN_SERVICE_LINK' THEN 'SOURCE_UNVERIFIED'
            WHEN rollup.rule_count IS NULL THEN 'NO_SCOPED_PLAN_RULE'
            WHEN rollup.rule_count>1 THEN 'AMBIGUOUS_SCOPED_PLAN_RULES'
            ELSE 'SCOPED_PLANNED_FLEET' END AS plan_status,
       false AS actual_vehicle_confirmed,
       NULL::text AS actual_formation_id,
       NULL::text AS exact_png_path
FROM rail_audit.official_train_run_service_crosswalk c
LEFT JOIN rollup ON rollup.train_run_id=c.train_run_id
LEFT JOIN public.operation_family_rules f ON f.id=rollup.single_rule_id
LEFT JOIN public.evidence_sources es ON es.id=f.source_id;

REVOKE ALL ON rail_audit.official_train_run_planned_fleet
FROM PUBLIC,anon,authenticated;