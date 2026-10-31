-- Seibu S-TRAIN 101/103/105/107/109: finish the canonical chain,
-- leaving the missing Kotake-Mukaihara boundary clock unguessed.
-- The two source segments were already entered from published timetable
-- evidence; this migration only enables the existing verified join.
-- No generated IDs are hardcoded and no stop times are changed.
WITH eligible AS (
  SELECT DISTINCT tm.timetable_id
  FROM public.published_timetable_through_service_gaps g
  JOIN public.manual_timetable_templates s
    ON s.source_path = 'official:seibu:S-TRAIN:20260314'
   AND s.source_trip_id = 'S-TRAIN-' || g.public_service_number
   AND s.line_key = 'Ikebukuro'
   AND s.calendar_urn = 'odpt.Calendar:Weekday'
  JOIN public.train_timetable_members tm
    ON tm.source_template_id = s.id
   AND tm.member_role = 'verified_continuation'
   AND tm.segment_order = 1 AND tm.stop_offset = 4
  JOIN public.train_timetable_members metro
    ON metro.source_template_id = g.existing_template_id
   AND metro.timetable_id = tm.timetable_id
   AND metro.member_role = 'primary'
  JOIN public.train_timetables t ON t.id = tm.timetable_id
  WHERE g.from_line_key = 'Yurakucho'
    AND g.to_line_key = 'Ikebukuro'
    AND g.operating_pattern = 'odpt.Calendar:Weekday'
    AND g.public_service_number IN ('101','103','105','107','109')
    AND (SELECT count(*) FROM public.manual_timetable_template_stops ss WHERE ss.template_id=s.id) = 6
    AND (SELECT count(*) FROM public.train_timetable_stops st WHERE st.timetable_id=t.id) = 10
)
UPDATE public.train_timetables t
SET group_evidence = 'verified_continuation'
FROM eligible e
WHERE t.id = e.timetable_id
  AND t.group_evidence = 'source_only';

-- Keep the five tickets as resolved for identity, but not for an
-- undocumented minute at Kotake-Mukaihara.
UPDATE public.published_timetable_through_service_gaps g
SET verification_status = 'canonical_continuation_verified_boundary_time_unavailable',
    checked_at = now()
WHERE g.from_line_key = 'Yurakucho'
  AND g.to_line_key = 'Ikebukuro'
  AND g.operating_pattern = 'odpt.Calendar:Weekday'
  AND g.public_service_number IN ('101','103','105','107','109')
  AND EXISTS (
    SELECT 1
    FROM public.manual_timetable_templates s
    JOIN public.train_timetable_members tm ON tm.source_template_id=s.id
    JOIN public.train_timetables t ON t.id=tm.timetable_id
    WHERE s.source_trip_id='S-TRAIN-'||g.public_service_number
      AND s.source_path='official:seibu:S-TRAIN:20260314'
      AND t.group_evidence='verified_continuation'
      AND tm.member_role='verified_continuation'
      AND (SELECT count(*) FROM public.train_timetable_stops st WHERE st.timetable_id=t.id)=10
  );
