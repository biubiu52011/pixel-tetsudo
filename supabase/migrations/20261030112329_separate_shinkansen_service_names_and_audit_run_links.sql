-- Applied Supabase migration 20261030112329.
-- Keep original Shinkansen service-name evidence while removing false vehicle candidates
-- from published resolution views. Real-time vehicle identity is never inferred.

CREATE OR REPLACE VIEW rail_audit.shinkansen_service_labels WITH (security_invoker = true) AS
SELECT m.timetable_id,
    m.source_template_id,
    l.line_key,
    m.vehicle_type AS service_name,
    t.primary_train_number,
    t.timetable_validity,
    m.source_path
   FROM train_timetable_vehicle_mappings m
     JOIN train_timetables t ON t.id = m.timetable_id
     JOIN train_timetable_lines l ON l.timetable_id = m.timetable_id
  WHERE m.mapping_level = 'source_single_type_candidate'::text AND l.line_key ~~ '%Shinkansen'::text AND (m.vehicle_type = ANY (ARRAY['のぞみ'::text, 'ひかり'::text, 'こだま'::text, 'みずほ'::text, 'さくら'::text, 'かもめ'::text, 'つばさ'::text, 'こまち'::text, 'やまびこ'::text, 'なすの'::text, 'はやぶさ'::text, 'はやて'::text, 'はくたか'::text, 'あさま'::text, 'かがやき'::text, 'とき'::text, 'たにがわ'::text]));

CREATE OR REPLACE VIEW public.train_timetable_vehicle_resolution AS
SELECT t.id AS timetable_id,
    t.calendar_urn,
    t.primary_train_number,
    t.timetable_validity,
        CASE
            WHEN m.mapping_level = 'source_single_type_candidate'::text AND (m.vehicle_type = ANY (ARRAY['のぞみ'::text, 'ひかり'::text, 'こだま'::text, 'みずほ'::text, 'さくら'::text, 'かもめ'::text, 'つばさ'::text, 'こまち'::text, 'やまびこ'::text, 'なすの'::text, 'はやぶさ'::text, 'はやて'::text, 'はくたか'::text, 'あさま'::text, 'かがやき'::text, 'とき'::text, 'たにがわ'::text])) AND (EXISTS ( SELECT 1
               FROM train_timetable_lines l
              WHERE l.timetable_id = t.id AND l.line_key ~~ '%Shinkansen'::text)) THEN NULL::text
            ELSE m.vehicle_type
        END AS vehicle_type,
        CASE
            WHEN m.mapping_level = 'source_single_type_candidate'::text AND (m.vehicle_type = ANY (ARRAY['のぞみ'::text, 'ひかり'::text, 'こだま'::text, 'みずほ'::text, 'さくら'::text, 'かもめ'::text, 'つばさ'::text, 'こまち'::text, 'やまびこ'::text, 'なすの'::text, 'はやぶさ'::text, 'はやて'::text, 'はくたか'::text, 'あさま'::text, 'かがやき'::text, 'とき'::text, 'たにがわ'::text])) AND (EXISTS ( SELECT 1
               FROM train_timetable_lines l
              WHERE l.timetable_id = t.id AND l.line_key ~~ '%Shinkansen'::text)) THEN 'unresolved'::text
            ELSE COALESCE(m.mapping_level, 'unresolved'::text)
        END AS mapping_level,
    false AS actual_vehicle_confirmed,
    m.timetable_revision_date,
    m.rule_effective_from,
    m.rule_effective_to,
    m.vehicle_rule_id,
    m.source_template_id,
    m.source_path,
    m.source_id,
    COALESCE(own.source_url, e.source_url) AS source_url,
    e.evidence_grade,
    op.operation_code,
    art.image_path AS vehicle_artwork_path
   FROM train_timetables t
     LEFT JOIN train_timetable_vehicle_mappings m ON m.timetable_id = t.id
     LEFT JOIN curated_operation_owners own ON own.id = m.operation_owner_id
     LEFT JOIN evidence_sources e ON e.id = m.source_id
     LEFT JOIN train_timetable_operation_evidence op ON op.timetable_id = t.id
     LEFT JOIN train_timetable_vehicle_artwork art ON art.timetable_id = t.id;

CREATE OR REPLACE VIEW public.train_timetable_source_resolution AS
SELECT m.source_template_id,
    m.timetable_id,
    m.member_role,
    tt.group_evidence,
    tt.timetable_validity,
        CASE
            WHEN vm.mapping_level = 'source_single_type_candidate'::text AND (vm.vehicle_type = ANY (ARRAY['のぞみ'::text, 'ひかり'::text, 'こだま'::text, 'みずほ'::text, 'さくら'::text, 'かもめ'::text, 'つばさ'::text, 'こまち'::text, 'やまびこ'::text, 'なすの'::text, 'はやぶさ'::text, 'はやて'::text, 'はくたか'::text, 'あさま'::text, 'かがやき'::text, 'とき'::text, 'たにがわ'::text])) AND (EXISTS ( SELECT 1
               FROM train_timetable_lines l
              WHERE l.timetable_id = m.timetable_id AND l.line_key ~~ '%Shinkansen'::text)) THEN NULL::text
            ELSE vm.vehicle_type
        END AS vehicle_type,
        CASE
            WHEN vm.mapping_level = 'source_single_type_candidate'::text AND (vm.vehicle_type = ANY (ARRAY['のぞみ'::text, 'ひかり'::text, 'こだま'::text, 'みずほ'::text, 'さくら'::text, 'かもめ'::text, 'つばさ'::text, 'こまち'::text, 'やまびこ'::text, 'なすの'::text, 'はやぶさ'::text, 'はやて'::text, 'はくたか'::text, 'あさま'::text, 'かがやき'::text, 'とき'::text, 'たにがわ'::text])) AND (EXISTS ( SELECT 1
               FROM train_timetable_lines l
              WHERE l.timetable_id = m.timetable_id AND l.line_key ~~ '%Shinkansen'::text)) THEN 'unresolved'::text
            ELSE COALESCE(vm.mapping_level, 'unresolved'::text)
        END AS mapping_level,
    vm.source_id AS vehicle_source_id,
    vm.source_path AS vehicle_source_path,
    COALESCE(vown.source_url, es.source_url) AS vehicle_source_url,
    vm.timetable_revision_date AS vehicle_revision_date,
    art.image_path AS vehicle_artwork_path,
    op.operation_code,
    op.source_id AS operation_source_id,
    op.source_revision_date AS operation_revision_date,
    own.owner_operator AS operation_owner,
    own.source_url AS operation_owner_source_url
   FROM train_timetable_members m
     JOIN train_timetables tt ON tt.id = m.timetable_id
     LEFT JOIN train_timetable_vehicle_mappings vm ON vm.timetable_id = m.timetable_id
     LEFT JOIN evidence_sources es ON es.id = vm.source_id
     LEFT JOIN curated_operation_owners vown ON vown.id = vm.operation_owner_id
     LEFT JOIN train_timetable_vehicle_artwork art ON art.timetable_id = m.timetable_id
     LEFT JOIN train_timetable_operation_evidence op ON op.timetable_id = m.timetable_id
     LEFT JOIN curated_operation_owners own ON own.id = op.curated_owner_id;

CREATE OR REPLACE VIEW rail_audit.train_run_timetable_reconciliation WITH (security_invoker = true) AS
WITH raw_matches AS (
         SELECT r_1.id AS run_id,
            t.id AS timetable_id,
            t.timetable_validity,
            t.source_revision_date
           FROM train_runs r_1
             JOIN train_timetable_lines l ON l.line_key = r_1.line_id::text AND l.primary_train_number = r_1.train_number
             JOIN train_timetables t ON t.id = l.timetable_id
          WHERE r_1.calendar_type = 'weekday'::text AND t.calendar_urn = 'odpt.Calendar:Weekday'::text OR (r_1.calendar_type = ANY (ARRAY['saturday_holiday'::text, 'holiday'::text])) AND t.calendar_urn = 'odpt.Calendar:SaturdayHoliday'::text
        ), candidates AS (
         SELECT raw_matches.run_id,
            count(DISTINCT raw_matches.timetable_id) AS candidate_count,
            min(raw_matches.timetable_id) AS candidate_timetable_id,
            min(raw_matches.timetable_validity) AS candidate_validity,
            min(raw_matches.source_revision_date) AS candidate_revision
           FROM raw_matches
          GROUP BY raw_matches.run_id
        )
 SELECT r.id AS train_run_id,
    r.service_date,
    r.operator,
    r.network_key,
    r.line_id,
    r.calendar_type,
    r.train_number,
    r.canonical_timetable_id AS stored_timetable_id,
    COALESCE(c.candidate_count, 0::bigint) AS exact_key_candidate_count,
        CASE
            WHEN c.candidate_count = 1 THEN c.candidate_timetable_id
            ELSE NULL::bigint
        END AS candidate_timetable_id,
        CASE
            WHEN r.service_date IS NULL THEN 'SERVICE_DATE_MISSING'::text
            WHEN COALESCE(c.candidate_count, 0::bigint) = 0 THEN 'NO_EXACT_KEY_MATCH'::text
            WHEN c.candidate_count > 1 THEN 'AMBIGUOUS_EXACT_KEY'::text
            WHEN c.candidate_validity IS DISTINCT FROM 'current_verified'::text THEN 'TIMETABLE_CURRENT_VALIDITY_UNVERIFIED'::text
            WHEN c.candidate_revision IS NULL THEN 'TIMETABLE_REVISION_MISSING'::text
            WHEN c.candidate_revision > r.service_date THEN 'TIMETABLE_REVISION_AFTER_SERVICE'::text
            ELSE 'ELIGIBLE_EXACT_KEY_LINK'::text
        END AS reconciliation_status,
        CASE
            WHEN c.candidate_count = 1 AND c.candidate_validity = 'current_verified'::text AND c.candidate_revision IS NOT NULL AND r.service_date IS NOT NULL AND c.candidate_revision <= r.service_date THEN c.candidate_timetable_id
            ELSE NULL::bigint
        END AS verified_timetable_id
   FROM train_runs r
     LEFT JOIN candidates c ON c.run_id = r.id;

REVOKE ALL ON rail_audit.shinkansen_service_labels FROM PUBLIC, anon, authenticated;
REVOKE ALL ON rail_audit.train_run_timetable_reconciliation FROM PUBLIC, anon, authenticated;
