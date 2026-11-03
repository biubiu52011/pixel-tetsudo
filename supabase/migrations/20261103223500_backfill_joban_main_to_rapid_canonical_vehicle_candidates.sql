-- Repair the reverse continuation direction omitted by
-- 20261101141500_backfill_joban_canonical_train_vehicle_from_members.sql.
-- Actual canonical services are JobanMain (source E531 label) -> Joban
-- (ODPT JobanRapid feed) at Toride. The old SQL mistakenly required the
-- Joban segment first and searched for the E531 label in the second.
--
-- This is a timetable SOURCE CANDIDATE only, never a physical train-set
-- observation, official dated vehicle plan, or exact assignment.
-- Restrict to reciprocal, two-segment verified canonical services.
WITH eligible AS (
  SELECT DISTINCT
    t.id AS timetable_id,
    a.id AS source_template_id,
    a.source_path AS source_path
  FROM public.train_timetable_continuity c
  JOIN public.manual_timetable_templates a
    ON a.id = c.from_template_id
  JOIN public.manual_timetable_templates b
    ON b.id = c.to_template_id
  JOIN public.train_timetable_members ma
    ON ma.source_template_id = a.id
  JOIN public.train_timetable_members mb
    ON mb.source_template_id = b.id
   AND mb.timetable_id = ma.timetable_id
  JOIN public.train_timetables t
    ON t.id = ma.timetable_id
  WHERE a.line_key = 'JobanMain'
    AND b.line_key = 'Joban'
    AND a.source_path = 'data/timetables/JobanMain-manual.js'
    AND a.vehicle_type_label = 'E531系'
    AND a.train_type_urn IN (
      'odpt.TrainType:JR-East.Local',
      'odpt.TrainType:JR-East.SpecialRapid'
    )
    AND t.lead_source_template_id = a.id
    AND t.calendar_urn = a.calendar_urn
    AND t.calendar_urn = b.calendar_urn
    AND t.calendar_urn IN (
      'odpt.Calendar:Weekday',
      'odpt.Calendar:SaturdayHoliday'
    )
    AND a.train_number = b.train_number
    AND t.primary_train_number = a.train_number
    AND t.group_evidence = 'verified_continuation'
    AND (
      SELECT count(*)
      FROM public.train_timetable_members x
      WHERE x.timetable_id = t.id
    ) = 2
)
INSERT INTO public.train_timetable_vehicle_mappings (
  timetable_id,
  source_template_id,
  vehicle_type,
  mapping_level,
  source_id,
  source_path,
  actual_vehicle_confirmed
)
SELECT e.timetable_id,
       e.source_template_id,
       'E531系',
       'source_single_type_candidate',
       NULL,
       e.source_path,
       false
FROM eligible e
WHERE NOT EXISTS (
  SELECT 1
  FROM public.train_timetable_vehicle_mappings v
  WHERE v.timetable_id = e.timetable_id
)
ON CONFLICT (timetable_id) DO NOTHING;
