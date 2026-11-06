-- JR East 2611 Miyo (Yahiko) Momiji Kairi public-number boundary at Yoshida.
-- The printed 233d1/d2 pages carry 9279D from Yahiko to Yoshida
-- and 9179D AFTER the transfer arrow onto Echigo line to Niigata.
-- The service is one physical train; these are line-section numbers.
-- Sources: https://timetables.jreast.co.jp/2611/timetable-v/233d1.html
--          https://timetables.jreast.co.jp/2611/timetable-v/233d2.html
-- No SQL station clocks for any Momiji segment: no fake track positions.
BEGIN;
SELECT pg_advisory_xact_lock(2611233);
DO $precheck$
BEGIN
 IF (SELECT count(*) FROM public.published_miyo_2611_number_roster
     WHERE edition='2611' AND line_key='Miyo')<>100
 OR (SELECT count(*) FROM public.published_miyo_2611_number_roster
     WHERE edition='2611' AND train_number='9179D'
       AND segment_key='momiji_no_sql_source'
       AND source_template_id IS NULL)<>2
 OR (SELECT count(*) FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND line_key='Miyo'
       AND segment_key='momiji_no_sql_source' AND suffix='D'
       AND min_number IN(9179,9278) AND max_number=9279)<>1
 THEN RAISE EXCEPTION 'Miyo/Echigo Momiji 2611 current roster changed: inspect before applying';
 END IF;
END $precheck$;
ALTER TABLE public.published_miyo_2611_number_roster
 ADD COLUMN IF NOT EXISTS actual_segment_line_key text NOT NULL DEFAULT 'Miyo';
UPDATE public.published_miyo_2611_number_roster
SET actual_segment_line_key='Echigo'
WHERE edition='2611' AND line_key='Miyo'
  AND train_number='9179D'
  AND segment_key='momiji_no_sql_source'
  AND source_template_id IS NULL;
DO $constraint$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=
   'public.published_miyo_2611_number_roster'::regclass AND
   conname='published_miyo_2611_actual_segment_scope_check')
 THEN
  ALTER TABLE public.published_miyo_2611_number_roster
   ADD CONSTRAINT published_miyo_2611_actual_segment_scope_check
   CHECK (
    (actual_segment_line_key='Miyo' AND train_number<>'9179D')
    OR (actual_segment_line_key='Echigo' AND train_number='9179D'
        AND segment_key='momiji_no_sql_source' AND source_template_id IS NULL)
   );
 END IF;
END $constraint$;
COMMENT ON COLUMN public.published_miyo_2611_number_roster.actual_segment_line_key IS
'Rail section actually covered by published number: 9179D is the subsequent Echigo section of 9279D, never a separate Miyo train. No source stop clocks for Momiji.';
UPDATE public.published_train_png_number_ranges
SET min_number=9278
WHERE edition='2611' AND line_key='Miyo'
  AND segment_key='momiji_no_sql_source'
  AND suffix='D' AND min_number=9179 AND max_number=9279;
DO $postcheck$
BEGIN
 IF (SELECT count(*) FROM public.published_miyo_2611_number_roster
      WHERE edition='2611' AND line_key='Miyo'
        AND actual_segment_line_key='Miyo')<>98
 OR (SELECT count(*) FROM public.published_miyo_2611_number_roster
      WHERE edition='2611' AND line_key='Miyo'
        AND actual_segment_line_key='Echigo')<>2
 OR (SELECT count(*) FROM public.published_miyo_2611_number_roster
      WHERE edition='2611' AND actual_segment_line_key='Miyo'
        AND calendar_urn='odpt.Calendar:Weekday')<>42
 OR (SELECT count(*) FROM public.published_miyo_2611_number_roster
      WHERE edition='2611' AND actual_segment_line_key='Miyo'
        AND calendar_urn='odpt.Calendar:SaturdayHoliday')<>56
 OR (SELECT count(*) FROM public.published_train_png_number_ranges
      WHERE edition='2611' AND line_key='Miyo'
        AND segment_key='momiji_no_sql_source'
        AND min_number=9278 AND max_number=9279)<>1
 THEN RAISE EXCEPTION 'Miyo/Echigo Momiji rail scope correction not consistent';
 END IF;
END $postcheck$;
COMMIT;
