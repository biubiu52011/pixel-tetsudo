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
COMMIT;
