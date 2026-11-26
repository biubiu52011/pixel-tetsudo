-- 有乐町／副都心直通编号与西武池袋线候选清理预检。
-- 复用现有 tojo_wakoshi_through_links 和 manual_timetable_templates，不新增数据表。
-- 西武有乐町线已清理同类错误，见 docs/audits/seibu-yurakucho-20261116-route-through-fleet.md。
-- 这里只读列出拟修正的旧候选；不授予实车、日期或图片，不改时刻。
WITH metro AS (
 SELECT line_key,coalesce(substring(train_number from '[A-Z]+$'),'other') suffix,
 count(distinct train_number) full_numbers,
 count(*) FILTER(WHERE source_revision_date IS NOT NULL) dated_templates
 FROM public.manual_timetable_templates
 WHERE line_key IN ('Yurakucho','Fukutoshin')
 GROUP BY 1,2
), wk AS (
 SELECT partner_line_key metro_line,right(operation_code,1) owner_suffix,count(*) pair_count,
 count(*) FILTER(WHERE authorizes_position OR authorizes_vehicle) authorization_count,
 count(*) FILTER(WHERE NOT EXISTS (
 SELECT 1 FROM public.tojo_wakoshi_through_links reverse_link
 WHERE reverse_link.source_template_id=w.partner_template_id
 AND reverse_link.partner_template_id=w.source_template_id
 AND reverse_link.operation_code=w.operation_code
 AND reverse_link.calendar_urn=w.calendar_urn)) missing_reverse
 FROM public.tojo_wakoshi_through_links w WHERE source_line_key='Tojo'
 GROUP BY 1,2
), legacy AS (
 SELECT m.id,m.line_key,m.calendar_urn,m.train_number,m.vehicle_type_label old_label,
 replace(m.vehicle_type_label,'東武50070系 / ','') proposed_label,
 r.mapping_level,r.vehicle_type,r.vehicle_artwork_path,r.timetable_validity
 FROM public.manual_timetable_templates m
 LEFT JOIN public.train_timetable_source_resolution r ON r.source_template_id=m.id
 WHERE m.line_key='Ikebukuro' AND m.source_path='data/timetables/Ikebukuro-manual.js'
 AND m.train_type_urn='odpt.TrainType:Seibu.F-Liner'
 AND m.vehicle_type_label='西武40000系 / 東武50070系 / メトロ17000系 / 東急5050系4000番台'
), legacy_summary AS (
 SELECT calendar_urn,old_label,proposed_label,count(*) rows_to_review,
 count(*) FILTER(WHERE mapping_level='unresolved' AND vehicle_type IS NULL AND vehicle_artwork_path IS NULL) unresolved_no_artwork,
 count(*) FILTER(WHERE timetable_validity='undated_not_current_verified') undated
 FROM legacy GROUP BY 1,2,3
), cleaned AS (
 SELECT count(*) rows_already_cleaned
 FROM public.manual_timetable_templates
 WHERE line_key='Yurakucho_Seibu' AND train_type_urn='odpt.TrainType:Seibu.F-Liner'
 AND vehicle_type_label='西武40000系 / メトロ17000系 / 東急5050系4000番台'
), identities AS (
 SELECT line_key,source_path,count(distinct train_number) full_identifiers,
 count(*) FILTER(WHERE source_revision_date IS NOT NULL) dated_templates,
 count(*) FILTER(WHERE train_number ~ '^[0-9]+$') numeric_only_rows
 FROM public.manual_timetable_templates
 WHERE line_key IN ('Ikebukuro','Yurakucho_Seibu','TokyuToyoko','MinatoMirai')
 GROUP BY 1,2
)
SELECT jsonb_build_object(
 'metro_suffix_inventory',(SELECT jsonb_agg(to_jsonb(m) ORDER BY line_key,suffix) FROM metro m),
 'wakoshi_existing_pairs',(SELECT jsonb_agg(to_jsonb(w) ORDER BY metro_line,owner_suffix) FROM wk w),
 'ikebukuro_candidate_correction',(SELECT jsonb_agg(to_jsonb(l) ORDER BY calendar_urn) FROM legacy_summary l),
 'seibu_yurakucho_existing_correction',(SELECT rows_already_cleaned FROM cleaned),
 'source_identifier_inventory',(SELECT jsonb_agg(to_jsonb(i) ORDER BY line_key,source_path) FROM identities i)
) audit;
