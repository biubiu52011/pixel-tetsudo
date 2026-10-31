-- Correct a *specific* verified JR-West OsakaLoop source-number transcription.
-- The SaturdayHoliday source appended a calendar marker "H" to genuine 33xxK
-- Yamatoji Rapid numbers. JR-West October-2026 inner-loop published diagram
-- lists these as 3304K, 3306K, ... 3398K (not 3304KH, ...).
-- Official evidence: https://timetable.jr-odekake.net/line-timetable/2861?arv_node=&day=4&dep_node=&hour=&index=&min=&month=10&year=2026
-- Example Osaka 07:40: https://timetable.jr-odekake.net/train-timetable/202781?date=20261024
-- IMPORTANT: DO NOT remove a trailing H from any other train number.
-- Real JR-West trains have legitimate H suffixes (e.g. 4507H).
-- The canonical id and source key remain stable; no time/stops/daily actuals
-- or vehicles are invented or deleted.
BEGIN;
CREATE TEMP TABLE osaka_verified_number_fix ON COMMIT DROP AS
SELECT m.id AS template_id,tm.timetable_id AS canonical_id,
m.train_number AS previous_train_number,
left(m.train_number,-1) AS corrected_train_number
FROM public.manual_timetable_templates m
JOIN public.train_timetable_members tm ON tm.source_template_id=m.id
JOIN public.train_timetables c ON c.id=tm.timetable_id
WHERE m.line_key='OsakaLoop'
AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
AND m.train_number ~ '^33[0-9]{2}KH$'
AND m.train_number BETWEEN '3304KH' AND '3398KH'
AND m.source_path='data/timetables/OsakaLoop-manual.js'
AND c.primary_train_number=m.train_number
AND c.calendar_urn=m.calendar_urn
AND c.group_evidence='source_only';

DO $check$
BEGIN
 IF (SELECT count(*) FROM osaka_verified_number_fix)<>39 OR
    (SELECT count(distinct canonical_id) FROM osaka_verified_number_fix)<>39 OR
    EXISTS(SELECT 1 FROM osaka_verified_number_fix f JOIN public.manual_timetable_templates other
        ON other.line_key='OsakaLoop'
        AND other.calendar_urn='odpt.Calendar:SaturdayHoliday'
        AND other.train_number=f.corrected_train_number) OR
    EXISTS(SELECT 1 FROM osaka_verified_number_fix f JOIN public.train_timetable_members mm
        ON mm.timetable_id=f.canonical_id AND mm.source_template_id<>f.template_id)
 THEN RAISE EXCEPTION 'Unexpected Osaka train number canonical or collision; rollback';END IF;
END $check$;

UPDATE public.manual_timetable_templates m
SET train_number=f.corrected_train_number
FROM osaka_verified_number_fix f WHERE m.id=f.template_id
 AND m.train_number=f.previous_train_number;

UPDATE public.train_timetables c
SET primary_train_number=f.corrected_train_number
FROM osaka_verified_number_fix f WHERE c.id=f.canonical_id
 AND c.primary_train_number=f.previous_train_number;

DO $check$
BEGIN
 IF EXISTS (SELECT 1 FROM osaka_verified_number_fix f
 JOIN public.manual_timetable_templates m ON m.id=f.template_id
 JOIN public.train_timetables c ON c.id=f.canonical_id
 WHERE m.train_number<>f.corrected_train_number OR
 c.primary_train_number<>f.corrected_train_number) OR
 EXISTS(SELECT 1 FROM public.manual_timetable_templates m WHERE
 m.line_key='OsakaLoop' AND m.calendar_urn='odpt.Calendar:SaturdayHoliday'
 AND m.train_number ~ '^33[0-9]{2}KH$')
 THEN RAISE EXCEPTION 'Uncorrected verified 33xxKH names';END IF;
END $check$;

UPDATE public.published_timetable_coverage_audit a
SET issues=(SELECT array_agg(DISTINCT i ORDER BY i) FROM unnest(
 COALESCE(a.issues,ARRAY[]::text[]) || ARRAY[
 'OSAKA_LOOP_39_OFFICIAL_YAMATOJI_33XXK_NUMBERS_CORRECTED',
 'JR_WEST_OTHER_REAL_H_SUFFIX_TRAIN_NUMBERS_PRESERVED',
 'SOURCE_ONE_STATION_FRAGMENTS_REMAIN_UNRENDERABLE'
 ]::text[]) i),
 checked_at=now()
WHERE a.line_key='OsakaLoop';
COMMIT;