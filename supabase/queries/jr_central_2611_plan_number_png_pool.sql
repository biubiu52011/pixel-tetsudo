-- 2026-11 JR-Central plan-number → PNG reference pool (not actual carset tracking).
-- A plan label such as のぞみ1 is NOT a train number. Use the existing
-- published_train_number_evidence source mapping (e.g. 1A) without suffix math.
-- Every rule is a single closed train number. No broad number ranges.
-- The available JR東海_N700系.png is explicitly an N700-FAMILY pixel
-- illustration, including N700S plan numbers, NOT a verified N700S drawing
-- or a claim about the day's physical consist.
-- Retain existing N700系/N700S系 plan labels in train_timetable_vehicle_mappings.
-- Idempotent; requires 50 unique source-backed 2611 official number records.
BEGIN;

-- These three pre-existing native images are present on GitHub main;
-- register the assets, not any train assignment.
WITH gallery(vehicle_type,image_path) AS (
  VALUES
    ('313系','images/列车/JR東海/JR東海_313系.png'),
    ('315系','images/列车/JR東海/JR東海_315系.png'),
    ('373系','images/列车/JR東海/JR東海_373系.png')
)
INSERT INTO public.vehicle_image_assets
 (operator,vehicle_type,image_path,is_generic,asset_status,file_format_status,review_note)
SELECT 'JR-Central',g.vehicle_type,g.image_path,true,'available','native_png',
  'Existing JR-Central gallery file; asset inventory only. Plan-number pool must assign any train.'
FROM gallery g
WHERE NOT EXISTS(
 SELECT 1 FROM public.vehicle_image_assets a
 WHERE a.operator='JR-Central' AND a.image_path=g.image_path);

DO $jrc2611$
DECLARE n integer;
BEGIN
  WITH proof AS (
    SELECT e.train_number
    FROM public.manual_timetable_templates t
    JOIN public.published_train_number_evidence e
      ON e.source_template_id=t.id AND e.edition='2611'
      AND e.line_key=t.line_key AND e.calendar_urn=t.calendar_urn
      AND e.direction_urn=t.direction_urn
    JOIN public.train_timetable_members m
      ON m.source_template_id=t.id AND m.member_role='primary'
    JOIN public.train_timetable_vehicle_mappings v
      ON v.timetable_id=m.timetable_id AND v.source_template_id=t.id
    JOIN public.evidence_sources s ON s.id=v.source_id
    WHERE t.line_key='TokaidoShinkansen'
      AND t.railway_urn='odpt.Railway:JR-Central.TokaidoShinkansen'
      AND e.verification_scope='train_number_only'
      AND e.train_number ~ '^[1-9][0-9]{0,4}A$'
      AND e.official_source_url LIKE 'https://%'
      AND v.mapping_level='official_service_vehicle_plan'
      AND v.vehicle_type IN ('N700系','N700S系')
      AND v.actual_vehicle_confirmed=false
      AND s.source_type='official' AND s.evidence_grade IN ('A','B')
  )
  SELECT count(DISTINCT train_number) INTO n FROM proof;
  IF n <> 50 THEN
    RAISE EXCEPTION 'JR_CENTRAL_2611_NUMBER_POOL_EVIDENCE_COUNT_CHANGED: %',n;
  END IF;
  IF NOT EXISTS (
     SELECT 1 FROM public.vehicle_image_assets
     WHERE operator='JR-Central' AND vehicle_type='N700系'
       AND image_path='images/列车/JR東海/JR東海_N700系.png'
       AND asset_status='available' AND file_format_status='native_png'
       AND is_generic=true
  ) THEN RAISE EXCEPTION 'JR_CENTRAL_N700_NATIVE_GENERIC_PNG_NOT_REGISTERED';
  END IF;
END
$jrc2611$;

WITH eligible AS (
 SELECT DISTINCT e.train_number,e.official_source_url
 FROM public.manual_timetable_templates t
 JOIN public.published_train_number_evidence e
   ON e.source_template_id=t.id AND e.edition='2611'
   AND e.line_key=t.line_key AND e.calendar_urn=t.calendar_urn
   AND e.direction_urn=t.direction_urn
 JOIN public.train_timetable_members m
   ON m.source_template_id=t.id AND m.member_role='primary'
 JOIN public.train_timetable_vehicle_mappings v
   ON v.timetable_id=m.timetable_id AND v.source_template_id=t.id
 JOIN public.evidence_sources s ON s.id=v.source_id
 WHERE t.line_key='TokaidoShinkansen'
   AND t.railway_urn='odpt.Railway:JR-Central.TokaidoShinkansen'
   AND e.verification_scope='train_number_only'
   AND e.train_number ~ '^[1-9][0-9]{0,4}A$'
   AND e.official_source_url LIKE 'https://%'
   AND v.mapping_level='official_service_vehicle_plan'
   AND v.vehicle_type IN ('N700系','N700S系')
   AND v.actual_vehicle_confirmed=false
   AND s.source_type='official' AND s.evidence_grade IN ('A','B')
), numbered AS (
 SELECT train_number, min(official_source_url) AS source_url
 FROM eligible GROUP BY train_number
)
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,
  actual_vehicle_confirmed)
SELECT '2611','TokaidoShinkansen','2611_planned_number_n700_family_reference',
       regexp_replace(train_number,'A$','')::integer,
       regexp_replace(train_number,'A$','')::integer,'A',
       'N700系','../images/列车/JR東海/JR東海_N700系.png',
       source_url,true,false
FROM numbered
ON CONFLICT DO NOTHING;

COMMIT;

-- Read-only follow-up: expected 50 precise number rules, 11 current-day
-- numbered plans on 2026-11-12. Do not mark all-day timetable accepted.
SELECT count(*) AS exact_number_pool_rows,
       count(DISTINCT min_number::text||suffix) AS unique_train_numbers
FROM public.published_train_png_number_ranges
WHERE line_key='TokaidoShinkansen' AND edition='2611'
 AND segment_key='2611_planned_number_n700_family_reference';
