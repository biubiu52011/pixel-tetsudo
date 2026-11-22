-- JR East 2611 奥羽本線: exact service-date admission from official
-- 9459M: February 12/13 2027 only; no November service.
-- 9463M: November 2/3/4 2026 (source SQL exists only on weekday).
-- 9455M and 9457D: February 12/13 2027, no existing OuMain SQL rows.
-- https://timetables.jreast.co.jp/2611/train/190/190611.html
-- https://timetables.jreast.co.jp/2611/train/185/187971.html
-- https://timetables.jreast.co.jp/2611/train/190/190601.html
-- https://timetables.jreast.co.jp/2611/train/190/190581.html
BEGIN;
SELECT pg_advisory_xact_lock(2611946);
ALTER TABLE public.published_oumain_2611_source_scope
 ADD COLUMN IF NOT EXISTS verified_november_operating_dates date[] DEFAULT NULL,
 ADD COLUMN IF NOT EXISTS service_date_source_url text DEFAULT NULL;
DO $pre$
BEGIN
 IF (SELECT count(*) FROM public.published_oumain_2611_source_scope
 WHERE edition='2611' AND line_key='OuMain'
 AND train_number IN('9459M','9463M'))<>2
 OR (SELECT count(*) FROM public.published_oumain_2611_source_scope
 WHERE train_number='9459M' AND calendar_urn='odpt.Calendar:SaturdayHoliday')<>1
 OR (SELECT count(*) FROM public.published_oumain_2611_source_scope
 WHERE train_number='9463M' AND calendar_urn='odpt.Calendar:Weekday')<>1
 THEN RAISE EXCEPTION 'OuMain 9459/9463 source changed';END IF;
END $pre$;
UPDATE public.published_oumain_2611_source_scope
SET verified_november_operating_dates='{}'::date[],
 service_date_source_url='https://timetables.jreast.co.jp/2611/train/190/190611.html'
WHERE edition='2611' AND line_key='OuMain' AND train_number='9459M';
UPDATE public.published_oumain_2611_source_scope
SET verified_november_operating_dates=ARRAY[
 '2026-11-02','2026-11-03','2026-11-04']::date[],
 service_date_source_url='https://timetables.jreast.co.jp/2611/train/185/187971.html'
WHERE edition='2611' AND line_key='OuMain' AND train_number='9463M';
DO $check$
BEGIN
 IF (SELECT count(*) FROM public.published_oumain_2611_source_scope
 WHERE train_number='9459M' AND
 cardinality(verified_november_operating_dates)=0)<>1
 OR (SELECT count(*) FROM public.published_oumain_2611_source_scope
 WHERE train_number='9463M' AND
 cardinality(verified_november_operating_dates)=3)<>1
 THEN RAISE EXCEPTION 'OuMain official run dates mismatch';END IF;
END $check$;
COMMIT;