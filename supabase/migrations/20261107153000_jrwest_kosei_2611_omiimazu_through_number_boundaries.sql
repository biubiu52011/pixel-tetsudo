-- 2026-11 JR-West official service-number changes at Oumiimazu.
-- 3143M -> 3443M (weekday, Tsuruga-Himeji),
-- 3145M -> 3445M (SaturdayHoliday, Tsuruga-Osaka).
-- These are NUMBER+SEGMENT references ONLY. The historical Kosei
-- source has all legs under the first number; until the source
-- timetable is split at the numbering boundary it must remain
-- source-only and NOT date/position certified. No exact car fleet/PNG.
BEGIN;
SELECT pg_advisory_xact_lock(26110730);
ALTER TABLE public.published_jrwest_2611_crossline_number_reference
 DROP CONSTRAINT published_jrwest_2611_crossline_number_ref_calendar_scope_check;
ALTER TABLE public.published_jrwest_2611_crossline_number_reference
 ADD CONSTRAINT published_jrwest_2611_crossline_number_ref_calendar_scope_check
 CHECK (calendar_scope IN ('daily','weekday','saturday_holiday'));
WITH official_segments(
 line_key,published_train_number,calendar_scope,train_type,
 segment_from,segment_to,continuous_service_key,
 official_source_url,observed_date
) AS(VALUES
('Kosei','3143M','weekday','SpecialRapid','Omi-Shiotsu','Oumiimazu','tsuruga-himeji-3143-3443','https://timetable.jr-odekake.net/train-timetable/145061?date=20261006','2026-11-07'),
('Kosei','3443M','weekday','SpecialRapid','Oumiimazu','Yamashina','tsuruga-himeji-3143-3443','https://timetable.jr-odekake.net/train-timetable/145061?date=20261006','2026-11-07'),
('TokaidoKansai','3443M','weekday','SpecialRapid','Kyoto','Kobe','tsuruga-himeji-3143-3443','https://timetable.jr-odekake.net/train-timetable/145061?date=20261006','2026-11-07'),
('SanyoMain','3443M','weekday','SpecialRapid','Hyougo','Himeji','tsuruga-himeji-3143-3443','https://timetable.jr-odekake.net/train-timetable/145061?date=20261006','2026-11-07'),
('Kosei','3145M','saturday_holiday','SpecialRapid','Omi-Shiotsu','Oumiimazu','tsuruga-osaka-3145-3445','https://timetable.jr-odekake.net/train-timetable/145291?date=20261024','2026-11-07'),
('Kosei','3445M','saturday_holiday','SpecialRapid','Oumiimazu','Yamashina','tsuruga-osaka-3145-3445','https://timetable.jr-odekake.net/train-timetable/145291?date=20261024','2026-11-07'),
('TokaidoKansai','3445M','saturday_holiday','SpecialRapid','Kyoto','Osaka','tsuruga-osaka-3145-3445','https://timetable.jr-odekake.net/train-timetable/145291?date=20261024','2026-11-07')
)
INSERT INTO public.published_jrwest_2611_crossline_number_reference
(line_key,published_train_number,calendar_scope,train_type,segment_from,segment_to,
 continuous_service_key,official_source_url,observed_date)
SELECT line_key,published_train_number,calendar_scope,train_type,segment_from,segment_to,
 continuous_service_key,official_source_url,observed_date::date
FROM official_segments
ON CONFLICT (line_key,published_train_number,calendar_scope) DO NOTHING;
DO $proof$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_2611_crossline_number_reference)<>15
 OR (SELECT count(*) FROM public.published_jrwest_2611_crossline_number_reference
 WHERE calendar_scope='weekday')<>4
 OR (SELECT count(*) FROM public.published_jrwest_2611_crossline_number_reference
 WHERE calendar_scope='saturday_holiday')<>7
 OR (SELECT count(*) FROM public.published_jrwest_2611_crossline_number_reference
 WHERE calendar_scope='daily')<>4
 OR EXISTS(SELECT 1 FROM public.published_jrwest_2611_crossline_number_reference
 WHERE stop_clocks_verified OR actual_vehicle_confirmed OR authorizes_position OR authorizes_png)
 THEN RAISE EXCEPTION 'JR-West Omiimazu through-number source scope changed'; END IF;
END $proof$;
COMMIT;
