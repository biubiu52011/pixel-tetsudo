-- Verified operator-name mismatch / aliases, not trainset assignments.
-- Keep original per-train planning keys intact until import/source migration
-- can verify every dependent reference. Model-rule links are candidates only.
BEGIN;

CREATE OR REPLACE VIEW public.published_nonjr_operator_identity_review
WITH (security_invoker=true,security_barrier=true) AS
WITH external_evidence(
  line_key,recorded_operator,official_or_rule_operator,mismatch_type,source_url
) AS (VALUES
  ('NewShuttle','SaitamaRailway','SaitamaNewUrbanTransit','incorrect_source_operator',
   'https://www.new-shuttle.jp/company/resume/'),
  ('TsukubaExpress','MIR','TsukubaExpress','rule_operator_name_alias',
   'https://www.mir.co.jp/company/outline.html'),
  ('ChibaMonorail1','ChibaMonorail','ChibaUrbanMonorail','rule_operator_name_alias',
   'https://chiba-monorail.co.jp/index.php/company-info/'),
  ('ChibaMonorail2','ChibaMonorail','ChibaUrbanMonorail','rule_operator_name_alias',
   'https://chiba-monorail.co.jp/index.php/company-info/'),
  ('MinatoMirai','MinatoMirai','YokohamaMinatomiraiRailway','rule_operator_name_alias',
   'https://www.mm21railway.co.jp/info/corpo/corpo.html')
),
current_source AS (
 SELECT m.line_key,
 MIN(CASE WHEN m.railway_urn LIKE 'odpt.Railway:%'
       THEN split_part(split_part(m.railway_urn,':',2),'.',1)
       ELSE m.railway_urn END) AS current_operator,
 COUNT(*)::bigint AS plan_templates
 FROM public.manual_timetable_templates m GROUP BY m.line_key
)
SELECT e.line_key,e.recorded_operator,e.official_or_rule_operator,
       e.mismatch_type,e.source_url,
       s.current_operator,s.plan_templates,
       (s.current_operator=e.recorded_operator) AS recorded_source_matches,
       (SELECT COUNT(*)::bigint FROM public.operation_family_rules f
          WHERE f.operator=e.official_or_rule_operator) AS existing_related_operation_family_rules,
       'operator_only_no_train_model_allocation'::text AS evidence_scope
FROM external_evidence e JOIN current_source s USING(line_key);

COMMENT ON VIEW public.published_nonjr_operator_identity_review IS
 'Official-company verified name/coding discrepancies for non-JR published plan sources and vehicle family rules. Does NOT decide a scheduled train model.';

REVOKE ALL ON public.published_nonjr_operator_identity_review
 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.published_nonjr_operator_identity_review TO service_role;

DO $assert$
BEGIN
 IF (SELECT count(*) FROM public.published_nonjr_operator_identity_review) <> 5
 OR EXISTS (SELECT 1 FROM public.published_nonjr_operator_identity_review
            WHERE NOT recorded_source_matches)
 THEN RAISE EXCEPTION 'Known operator-alias source identity changed, review mappings'; END IF;
END $assert$;

UPDATE public.published_timetable_coverage_audit a
SET issues=ARRAY(SELECT DISTINCT i FROM unnest(
  COALESCE(a.issues,ARRAY[]::text[]) ||
  ARRAY['NEW_SHUTTLE_SOURCE_OPERATOR_ATTRIBUTED_TO_WRONG_COMPANY',
        'PLANNED_VEHICLE_IDENTITY_NOT_RESOLVED_BY_COMPANY_NAME_ALONE']::text[]
) i ORDER BY i),checked_at=now()
WHERE a.line_key='NewShuttle';

COMMIT;