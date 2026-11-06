-- Jōban Main 2611: preserve source-only E531 planned fleet candidates.
-- The 2026-11 JR East published number lists are 240u1/u2/d1/d2.
-- Historical manual station clocks and car assignments are NOT proven
-- for the 2611 edition by those public number lists.
-- Existing verified Joban<->JobanMain canonical mappings are untouched.
-- JR East 2026-11: https://timetables.jreast.co.jp/2611/timetable-v/240u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/240u2.html
-- https://timetables.jreast.co.jp/2611/timetable-v/240d1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/240d2.html
--
-- Deliberately do NOT insert 701系 / E721系 (100 source-only rows).
-- A multi-model historical source label is NOT a single vehicle mapping;
-- the existing read API exposes BOTH candidates without drawing either PNG.
-- Idempotent: safe after a canonical-table reimport.
WITH eligible AS (
  SELECT DISTINCT t.id AS timetable_id, m.id AS source_template_id,
         m.source_path
  FROM public.train_timetables t
  JOIN public.train_timetable_members me ON me.timetable_id=t.id
  JOIN public.manual_timetable_templates m ON m.id=me.source_template_id
  WHERE t.group_evidence='source_only'
    AND t.lead_source_template_id=m.id
    AND t.calendar_urn=m.calendar_urn
    AND t.primary_train_number=m.train_number
    AND t.calendar_urn IN ('odpt.Calendar:Weekday',
                           'odpt.Calendar:SaturdayHoliday')
    AND (SELECT count(*) FROM public.train_timetable_members x
         WHERE x.timetable_id=t.id)=1
    AND m.line_key='JobanMain'
    AND m.source_path='data/timetables/JobanMain-manual.js'
    AND m.railway_urn='odpt.Railway:JR-East.Joban'
    AND m.vehicle_type_label='E531系'
    AND m.train_type_urn='odpt.TrainType:JR-East.Local'
    AND m.train_number ~ '^[0-9]{3,4}M$'
)
INSERT INTO public.train_timetable_vehicle_mappings
  (timetable_id,source_template_id,vehicle_type,mapping_level,
   source_id,source_path,actual_vehicle_confirmed)
SELECT e.timetable_id,e.source_template_id,'E531系',
       'source_single_type_candidate',NULL,e.source_path,false
FROM eligible e
WHERE NOT EXISTS (
  SELECT 1 FROM public.train_timetable_vehicle_mappings v
  WHERE v.timetable_id=e.timetable_id
)
ON CONFLICT (timetable_id) DO NOTHING;
