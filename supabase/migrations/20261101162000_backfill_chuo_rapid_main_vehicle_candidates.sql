-- Backfill only one nonconflicting source-labelled model per VERIFIED canonical through train.
-- Caution: E233 series is a timetable source candidate, not an actual carset.
-- Another 11 ChuoRapid -> ChuoMain services have mixed '211系 / E233系0番台'
-- source metadata and MUST stay unresolved until independently verified.
WITH eligible AS MATERIALIZED (
  SELECT DISTINCT
    t.id timetable_id,
    b.id source_template_id,
    b.source_path
  FROM public.train_timetable_continuity c
  JOIN public.manual_timetable_templates a ON a.id=c.from_template_id
  JOIN public.manual_timetable_templates b ON b.id=c.to_template_id
  JOIN public.train_timetable_members ma ON ma.source_template_id=a.id
  JOIN public.train_timetable_members mb ON mb.source_template_id=b.id
       AND mb.timetable_id=ma.timetable_id
  JOIN public.train_timetables t ON t.id=ma.timetable_id
  WHERE a.line_key='ChuoRapid' AND b.line_key='ChuoMain'
    AND t.lead_source_template_id=a.id
    AND t.calendar_urn=a.calendar_urn AND t.calendar_urn=b.calendar_urn
    AND t.calendar_urn IN ('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
    AND t.group_evidence='verified_continuation'
    AND b.vehicle_type_label='E233系0番台'
    AND b.source_path LIKE 'https://timetables.jreast.co.jp/2610/%'
    AND (SELECT count(*) FROM public.train_timetable_members mm WHERE mm.timetable_id=t.id)=3
    AND (SELECT count(DISTINCT NULLIF(m.vehicle_type_label,'')) 
      FROM public.train_timetable_members mem
      JOIN public.manual_timetable_templates m ON m.id=mem.source_template_id
      WHERE mem.timetable_id=t.id)=1
    AND NOT EXISTS (SELECT 1 FROM public.train_timetable_vehicle_mappings v
                    WHERE v.timetable_id=t.id)
)
INSERT INTO public.train_timetable_vehicle_mappings (
  timetable_id,source_template_id,vehicle_type,mapping_level,
  source_id,source_path,actual_vehicle_confirmed)
SELECT timetable_id,source_template_id,'E233系0番台',
       'source_single_type_candidate',NULL,source_path,false
FROM eligible
ON CONFLICT (timetable_id) DO NOTHING;
