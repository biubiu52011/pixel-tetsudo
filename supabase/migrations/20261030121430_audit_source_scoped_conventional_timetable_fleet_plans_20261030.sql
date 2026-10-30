-- Conservative materialized-free audit of officially published conventional fleet plans.
-- A timetable may be undated: no candidate here is an actual vehicle or formation.
-- Match only a specifically registered line + service class, and where required
-- an explicitly named service (Sonic/Yakumo); never infer from the whole route.
CREATE OR REPLACE VIEW rail_audit.official_conventional_timetable_plans
WITH (security_invoker = true) AS
SELECT DISTINCT
 t.id AS timetable_id,l.line_key,t.calendar_urn,t.primary_train_number,
 t.timetable_validity,f.operator,f.code_pattern,
 f.vehicle_candidates AS planned_vehicle_candidates,
 f.source_id AS official_model_source_id,e.source_url AS official_model_source_url,
 f.effective_from AS plan_evidence_valid_from,
 'PLANNED_FLEET_UNVERIFIED_TIMETABLE'::text AS plan_status,
 false AS actual_vehicle_confirmed,NULL::text AS exact_png_path
FROM public.train_timetables t
JOIN public.train_timetable_lines l ON l.timetable_id=t.id
JOIN public.train_timetable_stops st ON st.timetable_id=t.id
  AND st.stop_sequence=1
JOIN public.operation_family_rules f ON f.network_key=l.line_key
  AND f.code_pattern LIKE 'PLAN:OFFICIAL-%'
  AND f.plan_scope @> '{"planOnly":true}'::jsonb
  AND (f.plan_scope->'lineIds') ? l.line_key
  AND (f.plan_scope->'trainTypes') ?
      regexp_replace(st.train_type_urn,'^.*[.]','','g')
  AND (NOT (f.plan_scope ? 'candidateLabelsAny')
       OR (f.plan_scope->'candidateLabelsAny') ?
          regexp_replace(t.primary_train_number,'[0-9０-９]+号?$','','g'))
JOIN public.evidence_sources e ON e.id=f.source_id
WHERE t.timetable_validity='undated_not_current_verified'
  AND cardinality(f.vehicle_candidates)>0;

REVOKE ALL ON rail_audit.official_conventional_timetable_plans
FROM PUBLIC,anon,authenticated;