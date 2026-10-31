-- JR East Tsurumi / Okawa branch, 2026-11 published recurrence.
-- Correct twelve INBOUND branch projections. JR official pages publish
-- the Anzen DEPARTURE clock, not the Anzen ARRIVAL clock. Never invent an
-- arrival minute; carry the scheduled departure clock into the last
-- branch stop so that two timed station points are available.
-- This stores only Weekday/SaturdayHoliday, NO per-service-date operation.
--
-- Official recurring diagrams:
-- https://timetables.jreast.co.jp/2611/timetable-v/661u1.html
-- https://timetables.jreast.co.jp/2611/timetable-v/661u2.html
-- Individual trains:
-- https://timetables.jreast.co.jp/2611/train/025/028711.html
-- https://timetables.jreast.co.jp/2611/train/065/066061.html
-- https://timetables.jreast.co.jp/2611/train/065/066021.html

BEGIN;
CREATE TEMP TABLE verified_anzen_times (
  calendar_urn text NOT NULL,
  train_number text NOT NULL,
  okawa_departure text NOT NULL,
  anzen_departure text NOT NULL,
  PRIMARY KEY(calendar_urn,train_number)
) ON COMMIT DROP;
INSERT INTO verified_anzen_times VALUES
('odpt.Calendar:Weekday','712','07:18','07:22'),
('odpt.Calendar:Weekday','712B','07:56','08:00'),
('odpt.Calendar:Weekday','800','08:23','08:27'),
('odpt.Calendar:Weekday','808B','08:51','08:55'),
('odpt.Calendar:Weekday','1706','17:28','17:32'),
('odpt.Calendar:Weekday','1808','18:03','18:07'),
('odpt.Calendar:Weekday','1806B','18:54','18:58'),
('odpt.Calendar:Weekday','1912B','19:44','19:48'),
('odpt.Calendar:Weekday','2012','20:29','20:33'),
('odpt.Calendar:SaturdayHoliday','704','07:36','07:40'),
('odpt.Calendar:SaturdayHoliday','804','08:22','08:26'),
('odpt.Calendar:SaturdayHoliday','1808','18:14','18:18');

DO $verify$
DECLARE matches integer;
BEGIN
 SELECT count(*) INTO matches
 FROM verified_anzen_times v
 JOIN public.manual_timetable_templates m
   ON m.line_key='TsurumiOkawa'
   AND m.calendar_urn=v.calendar_urn
   AND m.train_number=v.train_number
   AND m.direction_urn='odpt.RailDirection:Inbound'
 JOIN public.manual_timetable_template_stops a
   ON a.template_id=m.id
   AND a.stop_sequence=0
   AND a.departure_station_urn='odpt.Station:JR-East.TsurumiOkawaBranch.Okawa'
   AND a.departure_clock=v.okawa_departure
 JOIN public.manual_timetable_template_stops z
   ON z.template_id=m.id
   AND z.stop_sequence=1
   AND z.arrival_station_urn='odpt.Station:JR-East.TsurumiOkawaBranch.Anzen'
   AND z.departure_station_urn IS NULL
   AND z.departure_clock IS NULL
   AND z.arrival_clock IS NULL;
 IF (SELECT count(*) FROM verified_anzen_times)<>12 OR matches<>12 THEN
  RAISE EXCEPTION 'Expected exactly 12 untouched Okawa inbound template chains; got %',matches;
 END IF;
END $verify$;

UPDATE public.manual_timetable_template_stops z
SET arrival_station_urn=NULL,
    departure_station_urn='odpt.Station:JR-East.TsurumiOkawaBranch.Anzen',
    departure_clock=v.anzen_departure
FROM verified_anzen_times v
JOIN public.manual_timetable_templates m ON m.line_key='TsurumiOkawa'
  AND m.calendar_urn=v.calendar_urn AND m.train_number=v.train_number
  AND m.direction_urn='odpt.RailDirection:Inbound'
WHERE z.template_id=m.id AND z.stop_sequence=1
  AND z.arrival_station_urn='odpt.Station:JR-East.TsurumiOkawaBranch.Anzen'
  AND z.departure_clock IS NULL;

DO $verify$
DECLARE matches integer;
BEGIN
 SELECT count(*) INTO matches FROM verified_anzen_times v
 JOIN public.manual_timetable_templates m
  ON m.line_key='TsurumiOkawa' AND m.calendar_urn=v.calendar_urn
  AND m.train_number=v.train_number
 JOIN public.manual_timetable_template_stops z
  ON z.template_id=m.id AND z.stop_sequence=1
  AND z.departure_station_urn='odpt.Station:JR-East.TsurumiOkawaBranch.Anzen'
  AND z.departure_clock=v.anzen_departure
  AND z.arrival_clock IS NULL;
 IF matches<>12 THEN RAISE EXCEPTION 'Only % Anzen official clocks updated',matches; END IF;
 IF EXISTS(SELECT 1 FROM public.manual_timetable_templates m
  JOIN public.manual_timetable_template_stops s ON s.template_id=m.id
  WHERE m.line_key='TsurumiOkawa'
  GROUP BY m.id HAVING COUNT(*) FILTER(WHERE s.departure_clock IS NOT NULL OR s.arrival_clock IS NOT NULL)<2)
 THEN RAISE EXCEPTION 'TsurumiOkawa still has single-clock timetable rows'; END IF;
END $verify$;

UPDATE public.published_timetable_coverage_audit a
SET issues=(SELECT ARRAY(SELECT DISTINCT issue FROM unnest(
  COALESCE(a.issues,ARRAY[]::text[]) ||
  ARRAY['OKAWA_2026_11_ALL_12_INBOUND_ANZEN_DEPARTURE_CLOCKS_VERIFIED','OKAWA_INBOUND_BRANCH_END_IS_ANZEN_PASS_THROUGH_DEPARTURE_NOT_ARRIVAL']::text[]
) issue ORDER BY issue)),checked_at=now()
WHERE a.line_key='TsurumiOkawa';
COMMIT;