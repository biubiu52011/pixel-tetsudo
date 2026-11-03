-- Restore single E531 source-candidate references on both directions of
-- the verified JobanRapid <-> JobanMain canonical service across Toride.
-- No actual-day train-set assignment and no official dated model claim.
-- Unlike 20261101141500, resolve the E531 source from either member, not
-- only from the second member of one directional continuation.
WITH eligible AS (
  SELECT DISTINCT
    t.id AS timetable_id,
    src.id AS source_template_id,
    src.source_path
  FROM public.train_timetable_continuity c
  JOIN public.manual_timetable_templates a ON a.id = c.from_template_id
  JOIN public.manual_timetable_templates b ON b.id = c.to_template_id
  JOIN public.train_timetable_members ma ON ma.source_template_id = a.id
  JOIN public.train_timetable_members mb
    ON mb.source_template_id = b.id AND mb.timetable_id = ma.timetable_id
  JOIN public.train_timetables t ON t.id = ma.timetable_id
  JOIN public.manual_timetable_templates src
    ON src.id = CASE WHEN a.line_key = 'JobanMain' THEN a.id ELSE b.id END
  WHERE ((a.line_key = 'JobanMain' AND b.line_key = 'Joban')
      OR (a.line_key = 'Joban' AND b.line_key = 'JobanMain'))
    AND c.evidence = 'reciprocal_source_ids_station_time_revision'
    AND t.group_evidence = 'verified_continuation'
    AND t.lead_source_template_id = a.id
    AND a.calendar_urn = b.calendar_urn
    AND t.calendar_urn = a.calendar_urn
    AND t.calendar_urn IN ('odpt.Calendar:Weekday',
                          'odpt.Calendar:SaturdayHoliday')
    AND a.train_number = b.train_number
    AND t.primary_train_number = a.train_number
    AND src.source_path = 'data/timetables/JobanMain-manual.js'
    AND src.vehicle_type_label = 'E531系'
    AND src.train_type_urn IN ('odpt.TrainType:JR-East.Local',
                                'odpt.TrainType:JR-East.SpecialRapid')
    AND (SELECT count(*) FROM public.train_timetable_members mem
         WHERE mem.timetable_id = t.id) = 2
)
INSERT INTO public.train_timetable_vehicle_mappings (
  timetable_id, source_template_id, vehicle_type, mapping_level,
  source_id, source_path, actual_vehicle_confirmed
)
SELECT timetable_id, source_template_id, 'E531系',
       'source_single_type_candidate', NULL, source_path, false
FROM eligible e
WHERE NOT EXISTS (
  SELECT 1 FROM public.train_timetable_vehicle_mappings vm
  WHERE vm.timetable_id = e.timetable_id
)
ON CONFLICT (timetable_id) DO NOTHING;
