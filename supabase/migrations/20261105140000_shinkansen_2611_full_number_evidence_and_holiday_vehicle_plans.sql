-- Shinkansen 2026-11: preserve service labels and certify only existing official evidence.
-- No schema changes, invented full-number intervals, physical carsets, or PNG substitution.
-- Safe to re-run: ON CONFLICT DO NOTHING; exact source/calendar/railway/number gates.
-- 5 full railway train numbers already individually cross-checked in
-- supabase/functions/train-runs/index.ts: JR_EAST_SHINKANSEN_OFFICIAL_2611.
-- Number evidence proves a train NUMBER, not a particular vehicle formation.
BEGIN;

WITH verified(line_key, source_label, full_number, official_url) AS (
  VALUES
    ('AkitaShinkansen','こまち1','3001M',
     'https://timetables.jreast.co.jp/2611/train/030/033833.html'),
    ('YamagataShinkansen','つばさ121','121M',
     'https://timetables.jreast.co.jp/2611/train/025/029831.html'),
    ('JoetsuShinkansen','Toki301','1301C',
     'https://timetables.jreast.co.jp/2611/train/035/038221.html'),
    ('HokurikuShinkansen','かがやき501','3501E',
     'https://timetables.jreast.co.jp/2611/train/095/098481.html'),
    ('TohokuShinkansen','Hayabusa29','29B',
     'https://timetables.jreast.co.jp/2611/train/125/129731.html')
)
INSERT INTO public.published_train_number_evidence
  (edition,line_key,calendar_urn,direction_urn,train_number,
   source_template_id,official_source_url,verification_scope)
SELECT '2611',m.line_key,m.calendar_urn,m.direction_urn,
  v.full_number,m.id,v.official_url,'train_number_only'
FROM verified v JOIN public.manual_timetable_templates m
  ON m.line_key=v.line_key AND m.train_number=v.source_label
WHERE m.calendar_urn='odpt.Calendar:SaturdayHoliday'
  AND m.railway_urn='odpt.Railway:JR-East.'||v.line_key
  AND m.source_path='official-sampled:holiday:'||v.official_url
  AND m.direction_urn='odpt.RailDirection:Outbound'
ON CONFLICT DO NOTHING;

-- The 47 Nishi Kyushu holiday records are the previously imported
-- official published 2026-03-14 regular baseline; the service labels
-- are not necessarily full railway train numbers. Every Kamome is
-- N700S (six-car), supported by EXISTING official source ID 4932.
-- Akita Komachi E6 and Yamagata Tsubasa E8 use existing source IDs
-- 4931 and 4933. Plans are never actual-date carset confirmations.
-- N700S has NO matching repository PNG: preserve the neutral fallback.
WITH approved AS (
  SELECT m.id AS source_template_id,mem.timetable_id,m.source_path,
    CASE m.line_key WHEN 'AkitaShinkansen' THEN 'E6系'
      WHEN 'YamagataShinkansen' THEN 'E8系'
      WHEN 'NishiKyushuShinkansen' THEN 'N700S系' END AS vehicle_type,
    CASE m.line_key WHEN 'AkitaShinkansen' THEN 4931::bigint
      WHEN 'YamagataShinkansen' THEN 4933::bigint
      WHEN 'NishiKyushuShinkansen' THEN 4932::bigint END AS source_id
  FROM public.manual_timetable_templates m
  JOIN public.train_timetable_members mem ON mem.source_template_id=m.id
  JOIN public.train_timetables t ON t.id=mem.timetable_id
  WHERE m.calendar_urn='odpt.Calendar:SaturdayHoliday'
    AND mem.member_role='primary' AND t.group_evidence='source_only'
    AND (
      (m.line_key='AkitaShinkansen' AND m.id=128897
       AND m.train_number='こまち1'
       AND m.railway_urn='odpt.Railway:JR-East.AkitaShinkansen'
       AND m.source_path='official-sampled:holiday:https://timetables.jreast.co.jp/2611/train/030/033833.html')
      OR
      (m.line_key='YamagataShinkansen' AND m.id=128896
       AND m.train_number='つばさ121'
       AND m.railway_urn='odpt.Railway:JR-East.YamagataShinkansen'
       AND m.source_path='official-sampled:holiday:https://timetables.jreast.co.jp/2611/train/025/029831.html')
      OR
      (m.line_key='NishiKyushuShinkansen'
       AND m.train_number ~ '^かもめ[0-9]+号$'
       AND m.railway_urn='odpt.Railway:JR-Kyushu.NishiKyushuShinkansen'
       AND (
         m.source_path='official-sampled:holiday:https://www.jrkyushu.co.jp/english/pdf/timetable_20260314_20270228.pdf'
         OR (m.id=128894 AND m.train_number='かもめ1号'
             AND m.source_path='official-sampled:holiday:https://www.jrkyushu-timetable.jp/sp/2608/0019/00190501.html?d=20260722&t=2828302e')
       ))
    )
)
INSERT INTO public.train_timetable_vehicle_mappings
  (timetable_id,source_template_id,vehicle_type,mapping_level,source_id,
   source_path,actual_vehicle_confirmed)
SELECT a.timetable_id,a.source_template_id,a.vehicle_type,
  'official_service_vehicle_plan',a.source_id,
  a.source_path||'|20261105-shinkansen-single-fleet-holiday-plan',false
FROM approved a
WHERE (SELECT COUNT(*) FROM approved)=49
  AND (SELECT COUNT(*) FROM public.evidence_sources es
       WHERE es.id IN (4931,4932,4933)
         AND es.source_type='official' AND es.evidence_grade IN ('A','B'))=3
ON CONFLICT (timetable_id) DO NOTHING;

-- Exact-number PNG references only, not inferred from an interval.
-- These three full railway numbers are already verified individually
-- by the train-runs Edge Function and the first INSERT above.
-- Model evidence separately comes from each published single-fleet plan;
-- the PNGs below are canonical, available JR East generic images.
WITH exact(line_key,full_number,suffix,expected_model,png_path) AS (
 VALUES
  ('AkitaShinkansen',3001,'M','E6系','../images/列车/JR東日本/JR東日本_E6系.png'),
  ('YamagataShinkansen',121,'M','E8系','../images/列车/JR東日本/JR東日本_E8系.png'),
  ('JoetsuShinkansen',1301,'C','E7系','../images/列车/JR東日本/JR東日本_E7系.png')
)
INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,
  vehicle_model,png_reference,source_url,requires_exact_roster,
  actual_vehicle_confirmed)
SELECT e.edition,e.line_key,'verified_single_service',x.full_number,
 x.full_number,x.suffix,x.expected_model,x.png_path,
 e.official_source_url,true,false
FROM exact x JOIN public.published_train_number_evidence e
 ON e.edition='2611' AND e.line_key=x.line_key
 AND e.train_number=x.full_number::text||x.suffix
 AND e.verification_scope='train_number_only'
JOIN public.train_timetable_members mem
 ON mem.source_template_id=e.source_template_id
JOIN public.train_timetable_vehicle_mappings v
 ON v.timetable_id=mem.timetable_id
 AND v.source_template_id=e.source_template_id
 AND v.vehicle_type=x.expected_model
 AND v.mapping_level='official_service_vehicle_plan'
 AND v.actual_vehicle_confirmed=false
JOIN public.manual_timetable_templates m
 ON m.id=e.source_template_id AND m.line_key=e.line_key
 AND m.calendar_urn=e.calendar_urn AND m.direction_urn=e.direction_urn
JOIN public.vehicle_image_assets a
 ON a.operator='JR-East' AND a.vehicle_type=x.expected_model
 AND a.image_path=substring(x.png_path FROM 4)
 AND a.asset_status='available' AND a.is_generic=true
WHERE e.calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND m.railway_urn='odpt.Railway:JR-East.'||x.line_key
ON CONFLICT DO NOTHING;
COMMIT;
