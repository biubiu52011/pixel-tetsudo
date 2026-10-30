-- Legacy Seibu 8500-only label predates L00 fleet renewal.
-- Preserve source table; publish a scoped UNKNOWN model while retaining
-- documented 8500 + L00 candidates in plan evidence, not exact PNG.
CREATE OR REPLACE VIEW rail_audit.seibu_yamaguchi_legacy_single_type
WITH (security_invoker = true) AS
SELECT m.timetable_id,l.line_key,t.primary_train_number,
       m.vehicle_type AS legacy_label,m.source_path,t.timetable_validity
FROM public.train_timetable_vehicle_mappings m
JOIN public.train_timetable_lines l USING(timetable_id)
JOIN public.train_timetables t ON t.id=m.timetable_id
WHERE m.mapping_level='source_single_type_candidate'
  AND m.vehicle_type='8500系（レオライナー、新型導入中）'
  AND l.line_key='SeibuYamaguchi';

CREATE OR REPLACE VIEW public.train_timetable_vehicle_resolution AS
SELECT t.id AS timetable_id,
    t.calendar_urn,
    t.primary_train_number,
    t.timetable_validity,
        CASE
            WHEN m.mapping_level = 'source_single_type_candidate'::text AND (m.vehicle_type = ANY (ARRAY['のぞみ'::text, 'ひかり'::text, 'こだま'::text, 'みずほ'::text, 'さくら'::text, 'かもめ'::text, 'つばさ'::text, 'こまち'::text, 'やまびこ'::text, 'なすの'::text, 'はやぶさ'::text, 'はやて'::text, 'はくたか'::text, 'あさま'::text, 'かがやき'::text, 'とき'::text, 'たにがわ'::text])) AND (EXISTS ( SELECT 1
               FROM train_timetable_lines l
              WHERE l.timetable_id = t.id AND l.line_key ~~ '%Shinkansen'::text)) THEN NULL::text
            WHEN m.mapping_level = 'source_single_type_candidate'::text AND m.vehicle_type = '40000系（Laview）'::text AND (EXISTS ( SELECT 1
               FROM train_timetable_lines source_line
              WHERE source_line.timetable_id = t.id AND (source_line.line_key = ANY (ARRAY['SeibuChichibu'::text, 'Haijima'::text])))) THEN NULL::text
            WHEN m.mapping_level='source_single_type_candidate'::text AND m.vehicle_type='8500系（レオライナー、新型導入中）'::text AND EXISTS
         (SELECT 1 FROM public.train_timetable_lines replacement_line
          WHERE replacement_line.timetable_id=t.id
            AND replacement_line.line_key='SeibuYamaguchi') THEN NULL::text
            ELSE m.vehicle_type
        END AS vehicle_type,
        CASE
            WHEN m.mapping_level = 'source_single_type_candidate'::text AND (m.vehicle_type = ANY (ARRAY['のぞみ'::text, 'ひかり'::text, 'こだま'::text, 'みずほ'::text, 'さくら'::text, 'かもめ'::text, 'つばさ'::text, 'こまち'::text, 'やまびこ'::text, 'なすの'::text, 'はやぶさ'::text, 'はやて'::text, 'はくたか'::text, 'あさま'::text, 'かがやき'::text, 'とき'::text, 'たにがわ'::text])) AND (EXISTS ( SELECT 1
               FROM train_timetable_lines l
              WHERE l.timetable_id = t.id AND l.line_key ~~ '%Shinkansen'::text)) THEN 'unresolved'::text
            WHEN m.mapping_level = 'source_single_type_candidate'::text AND m.vehicle_type = '40000系（Laview）'::text AND (EXISTS ( SELECT 1
               FROM train_timetable_lines source_line
              WHERE source_line.timetable_id = t.id AND (source_line.line_key = ANY (ARRAY['SeibuChichibu'::text, 'Haijima'::text])))) THEN 'unresolved'::text
            WHEN m.mapping_level='source_single_type_candidate'::text AND m.vehicle_type='8500系（レオライナー、新型導入中）'::text AND EXISTS
         (SELECT 1 FROM public.train_timetable_lines replacement_line
          WHERE replacement_line.timetable_id=t.id
            AND replacement_line.line_key='SeibuYamaguchi') THEN 'unresolved'::text
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
            WHEN vm.mapping_level = 'source_single_type_candidate'::text AND vm.vehicle_type = '40000系（Laview）'::text AND (EXISTS ( SELECT 1
               FROM train_timetable_lines source_line
              WHERE source_line.timetable_id = m.timetable_id AND (source_line.line_key = ANY (ARRAY['SeibuChichibu'::text, 'Haijima'::text])))) THEN NULL::text
            WHEN vm.mapping_level='source_single_type_candidate'::text AND vm.vehicle_type='8500系（レオライナー、新型導入中）'::text AND EXISTS
         (SELECT 1 FROM public.train_timetable_lines replacement_line
          WHERE replacement_line.timetable_id=m.timetable_id
            AND replacement_line.line_key='SeibuYamaguchi') THEN NULL::text
            ELSE vm.vehicle_type
        END AS vehicle_type,
        CASE
            WHEN vm.mapping_level = 'source_single_type_candidate'::text AND (vm.vehicle_type = ANY (ARRAY['のぞみ'::text, 'ひかり'::text, 'こだま'::text, 'みずほ'::text, 'さくら'::text, 'かもめ'::text, 'つばさ'::text, 'こまち'::text, 'やまびこ'::text, 'なすの'::text, 'はやぶさ'::text, 'はやて'::text, 'はくたか'::text, 'あさま'::text, 'かがやき'::text, 'とき'::text, 'たにがわ'::text])) AND (EXISTS ( SELECT 1
               FROM train_timetable_lines l
              WHERE l.timetable_id = m.timetable_id AND l.line_key ~~ '%Shinkansen'::text)) THEN 'unresolved'::text
            WHEN vm.mapping_level = 'source_single_type_candidate'::text AND vm.vehicle_type = '40000系（Laview）'::text AND (EXISTS ( SELECT 1
               FROM train_timetable_lines source_line
              WHERE source_line.timetable_id = m.timetable_id AND (source_line.line_key = ANY (ARRAY['SeibuChichibu'::text, 'Haijima'::text])))) THEN 'unresolved'::text
            WHEN vm.mapping_level='source_single_type_candidate'::text AND vm.vehicle_type='8500系（レオライナー、新型導入中）'::text AND EXISTS
         (SELECT 1 FROM public.train_timetable_lines replacement_line
          WHERE replacement_line.timetable_id=m.timetable_id
            AND replacement_line.line_key='SeibuYamaguchi') THEN 'unresolved'::text
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

REVOKE ALL ON rail_audit.seibu_yamaguchi_legacy_single_type FROM PUBLIC,anon,authenticated;
