-- Kyoto/Kobe 2026-11: four MORE original 7-stop new-rapid proofs.
-- Two import source rows conflict with the OFFICIAL Nov 2611 calendar:
-- 3506M is SATURDAY/HOLIDAY only, not weekday; 3450M is weekday
-- only, not SaturdayHoliday. Keep them as audit source, suppress on map.
BEGIN;
SELECT pg_advisory_xact_lock(26110714);
ALTER TABLE public.published_jrwest_kyoto_kobe_2611_source_fleet
 ADD COLUMN IF NOT EXISTS official_calendar_conflict boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS official_calendar_urn text,
 ADD COLUMN IF NOT EXISTS official_calendar_source_url text;
ALTER TABLE public.published_jrwest_kyoto_kobe_2611_source_fleet
 ADD CONSTRAINT jrwest_kyoto_kobe_2611_calendar_conflict_scope CHECK(
 (NOT official_calendar_conflict AND official_calendar_urn IS NULL
  AND official_calendar_source_url IS NULL)
 OR (official_calendar_conflict AND
     official_calendar_urn IN('odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday')
     AND official_calendar_urn<>calendar_urn
     AND official_calendar_source_url LIKE 'https://timetable.jr-odekake.net/train-timetable/%'
     AND source_line_key='TokaidoKansai' AND source_public_number_suffix IN('3450M','3506M')
     AND official_train_number IS NULL AND authorizes_png=false)
 );
WITH e(source_train_id,official_num,expected_hash,source_url,calendar_token,dir) AS (VALUES
('500310-2235800-3452M','3452M','42dd7ceca39477f45a225667080ce7c4','https://timetable.jr-odekake.net/train-timetable/206741?date=20261127','Weekday','Inbound'),
('500300-1864000-3511M','3511M','5250588962676ec65abce5c820392670','https://timetable.jr-odekake.net/train-timetable/173961?date=20261124','Weekday','Outbound'),
('500300-1864400-3531M','3531M','19b19128d6e8735923e3ff33b7d7bc6f','https://timetable.jr-odekake.net/train-timetable/209371?date=20261030','Weekday','Outbound'),
('500310-2237400-3534M','3534M','7b558daa85869d18842cb1e21289e48c','https://timetable.jr-odekake.net/train-timetable/206771?date=20261009','Weekday','Inbound')
), hashed AS (
 SELECT m.id,m.train_number,m.calendar_urn,m.direction_urn,
 count(*)::integer n,md5(string_agg(concat_ws('|',s.stop_sequence,
 coalesce(s.departure_station_urn,s.arrival_station_urn,''),
 coalesce(s.arrival_clock,'∅'),coalesce(s.departure_clock,'∅')),
 E'\n' ORDER BY s.stop_sequence)) original_hash
 FROM public.manual_timetable_templates m
 JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
 WHERE m.line_key='TokaidoKansai'
 AND m.railway_urn='odpt.Railway:JR-West.TokaidoKansai'
 AND m.source_path='data/timetables/TokaidoKansai-manual.js'
 AND m.source_revision_date IS NULL AND m.source_occurrence=0
 AND m.train_type_urn='odpt.TrainType:JR-West.Rapid'
 GROUP BY m.id,m.train_number,m.calendar_urn,m.direction_urn
)
UPDATE public.published_jrwest_kyoto_kobe_2611_source_fleet f
SET official_train_number=e.official_num,official_source_url=e.source_url,
 official_stop_md5=e.expected_hash,official_stop_count=7,
 official_public_train_type='SpecialRapid'
FROM e JOIN hashed h ON h.train_number=e.source_train_id
 AND h.calendar_urn='odpt.Calendar:'||e.calendar_token
 AND h.direction_urn='odpt.RailDirection:'||e.dir
 AND h.n=7 AND h.original_hash=e.expected_hash
WHERE f.source_template_id=h.id AND f.source_train_id=e.source_train_id
 AND f.source_line_key='TokaidoKansai' AND f.edition='2611'
 AND f.source_public_number_suffix=e.official_num
 AND f.calendar_urn=h.calendar_urn AND f.direction_urn=h.direction_urn
 AND f.service_family='regional_rapid_t_m' AND f.authorizes_png=false
 AND f.official_train_number IS NULL AND NOT f.official_calendar_conflict;

WITH e(source_train_id,old_calendar,real_calendar,source_url) AS (VALUES
 ('500310-3536200-3450M','odpt.Calendar:SaturdayHoliday','odpt.Calendar:Weekday',
  'https://timetable.jr-odekake.net/train-timetable/321991?date=20261029'),
 ('500310-1866500-3506M','odpt.Calendar:Weekday','odpt.Calendar:SaturdayHoliday',
  'https://timetable.jr-odekake.net/train-timetable/173162?date=20261024')
)
UPDATE public.published_jrwest_kyoto_kobe_2611_source_fleet f
SET official_calendar_conflict=true,
 official_calendar_urn=e.real_calendar,
 official_calendar_source_url=e.source_url
FROM e WHERE f.source_train_id=e.source_train_id
 AND f.calendar_urn=e.old_calendar AND f.source_line_key='TokaidoKansai'
 AND f.edition='2611' AND f.source_public_number_suffix=split_part(e.source_train_id,'-',3)
 AND f.official_train_number IS NULL AND f.authorizes_png=false;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence)<>9
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_clock_evidence WHERE verified_source_match)<>9
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet WHERE official_calendar_conflict)<>2
 OR (SELECT count(*) FROM public.published_jrwest_kyoto_kobe_2611_source_fleet
     WHERE official_train_number IS NOT NULL AND authorizes_png)<>0
 THEN RAISE EXCEPTION 'Kyoto Kobe source clock proofs and two calendar-conflict guards changed'; END IF;
END $proof$;
COMMIT;