-- Idempotent repair: one canonical through train, not one vehicle per railway segment.
-- Re-run after a canonical timetable rebuild if historical source templates are reimported.
-- E531 is only a source candidate; E657 relies on an official published service source.
WITH official_e657 AS (
  SELECT id FROM public.evidence_sources
  WHERE source_key='20261101-jre-joban-hitachi-tokiwa-e657-regular-2611'
  AND source_url IS NOT NULL
  AND evidence_grade IN ('A','B')
  LIMIT 1
),
eligible AS (
  SELECT DISTINCT
    t.id AS timetable_id,
    b.id AS source_template_id,
    b.vehicle_type_label,
    b.source_path,
    CASE WHEN b.vehicle_type_label='E531系' THEN 'E531系' ELSE 'E657系' END vehicle_model,
    CASE WHEN b.vehicle_type_label='E531系'
      THEN 'source_single_type_candidate' ELSE 'official_service_vehicle_plan' END evidence_level,
    CASE WHEN b.vehicle_type_label='E531系' THEN NULL
      ELSE (SELECT id FROM official_e657) END official_source_id
  FROM public.train_timetable_continuity c
  JOIN public.manual_timetable_templates a ON a.id=c.from_template_id
  JOIN public.manual_timetable_templates b ON b.id=c.to_template_id
  JOIN public.train_timetable_members ma ON ma.source_template_id=a.id
  JOIN public.train_timetable_members mb ON mb.source_template_id=b.id
    AND mb.timetable_id=ma.timetable_id
  JOIN public.train_timetables t ON t.id=ma.timetable_id
  WHERE a.line_key='Joban' AND b.line_key='JobanMain'
    AND t.lead_source_template_id=a.id
    AND t.calendar_urn=a.calendar_urn AND t.calendar_urn=b.calendar_urn
    AND t.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
    AND a.train_number=b.train_number AND t.primary_train_number=b.train_number
    AND t.group_evidence='verified_continuation'
    AND b.source_path='data/timetables/JobanMain-manual.js'
    AND (SELECT count(*) FROM public.train_timetable_members x WHERE x.timetable_id=t.id)=2
    AND (
      (b.vehicle_type_label='E531系'
       AND b.train_type_urn IN ('odpt.TrainType:JR-East.Local',
                               'odpt.TrainType:JR-East.SpecialRapid'))
      OR (b.vehicle_type_label='E657系（ひたち・ときわ）'
          AND b.train_type_urn='odpt.TrainType:JR-East.LimitedExpress'
          AND EXISTS (SELECT 1 FROM official_e657))
    )
)
INSERT INTO public.train_timetable_vehicle_mappings(
  timetable_id,source_template_id,vehicle_type,mapping_level,source_id,
  source_path,actual_vehicle_confirmed)
SELECT e.timetable_id,e.source_template_id,e.vehicle_model,e.evidence_level,
       e.official_source_id,e.source_path,false
FROM eligible e
WHERE NOT EXISTS (SELECT 1 FROM public.train_timetable_vehicle_mappings v
                  WHERE v.timetable_id=e.timetable_id)
ON CONFLICT (timetable_id) DO NOTHING;
