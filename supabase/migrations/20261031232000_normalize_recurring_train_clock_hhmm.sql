
-- Clock normalization of existing published recurring train plans.
-- "6:14" and "06:14" are the same clock; normalize representation ONLY.
-- Do not infer dates, service exceptions, missing stops, or actual formation.
-- Hours 24+ (if supplied by an operator for overnight service) stay legal.
BEGIN;

UPDATE public.manual_timetable_template_stops AS s
SET arrival_clock = CASE WHEN s.arrival_clock ~ '^[0-9]:[0-5][0-9]$'
                         THEN '0' || s.arrival_clock ELSE s.arrival_clock END,
    departure_clock = CASE WHEN s.departure_clock ~ '^[0-9]:[0-5][0-9]$'
                           THEN '0' || s.departure_clock ELSE s.departure_clock END
WHERE s.arrival_clock ~ '^[0-9]:[0-5][0-9]$'
   OR s.departure_clock ~ '^[0-9]:[0-5][0-9]$';

DO $integrity$
BEGIN
 IF EXISTS (
  SELECT 1 FROM public.manual_timetable_template_stops
  WHERE (arrival_clock IS NOT NULL AND arrival_clock !~ '^[0-9]{2}:[0-5][0-9]$')
     OR (departure_clock IS NOT NULL AND departure_clock !~ '^[0-9]{2}:[0-5][0-9]$')
 ) THEN
   RAISE EXCEPTION 'Unexpected timetable clock values; clock constraint not applied';
 END IF;
 IF NOT EXISTS(
   SELECT 1 FROM pg_constraint
    WHERE conrelid='public.manual_timetable_template_stops'::regclass
      AND conname='manual_timetable_stop_clock_hhmm'
 ) THEN
  ALTER TABLE public.manual_timetable_template_stops
    ADD CONSTRAINT manual_timetable_stop_clock_hhmm
    CHECK(
      (arrival_clock IS NULL OR arrival_clock ~ '^[0-9]{2}:[0-5][0-9]$')
      AND
      (departure_clock IS NULL OR departure_clock ~ '^[0-9]{2}:[0-5][0-9]$')
    ) NOT VALID;
 END IF;
END $integrity$;

ALTER TABLE public.manual_timetable_template_stops
  VALIDATE CONSTRAINT manual_timetable_stop_clock_hhmm;

COMMENT ON CONSTRAINT manual_timetable_stop_clock_hhmm
 ON public.manual_timetable_template_stops IS
 'Recurring planned station clocks are canonical HH:MM; preserves 24:xx and overnight hours. Does not establish date-specific operation.';

COMMIT;
