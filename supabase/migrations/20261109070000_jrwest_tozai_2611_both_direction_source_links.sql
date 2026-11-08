-- JR-West JR Tozai 2026-11 through-running audit: support both directions in ONE
-- source-link evidence table. This does not import a full timetable, verify a
-- dated rolling-stock working or authorize a vehicle/formation PNG.
BEGIN;

-- Canonicalize boundary fields that the original migration named only for the
-- Kyobashi -> Gakkentoshi direction. Preserve the five existing references.
DO $rename_tozai_boundary$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
        AND table_name='published_jrwest_tozai_2611_source_links'
        AND column_name='previous_kyobashi_departure') THEN
    ALTER TABLE public.published_jrwest_tozai_2611_source_links
      RENAME COLUMN previous_kyobashi_departure TO kyobashi_departure_clock;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
        AND table_name='published_jrwest_tozai_2611_source_links'
        AND column_name='junction_station_urn') THEN
    ALTER TABLE public.published_jrwest_tozai_2611_source_links
      RENAME COLUMN junction_station_urn TO source_boundary_station_urn;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
        AND table_name='published_jrwest_tozai_2611_source_links'
        AND column_name='junction_arrival_clock') THEN
    ALTER TABLE public.published_jrwest_tozai_2611_source_links
      RENAME COLUMN junction_arrival_clock TO source_boundary_arrival_clock;
  END IF;
END $rename_tozai_boundary$;

ALTER TABLE public.published_jrwest_tozai_2611_source_links
  ADD COLUMN IF NOT EXISTS traversal_direction text NOT NULL DEFAULT 'JRTozai_to_Gakkentoshi',
  ADD COLUMN IF NOT EXISTS continued_as_train_number text NULL;

DO $tozai_direction_constraint$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=
     'public.published_jrwest_tozai_2611_source_links'::regclass
     AND conname='jrwest_tozai_2611_direction_check') THEN
    ALTER TABLE public.published_jrwest_tozai_2611_source_links
      ADD CONSTRAINT jrwest_tozai_2611_direction_check
      CHECK (
        (traversal_direction='JRTozai_to_Gakkentoshi'
          AND source_boundary_station_urn IN
            ('odpt.Station:JR-West.Gakkentoshi.Shigino','odpt.Station:JR-West.Gakkentoshi.Hanaten')
          AND continued_as_train_number IS NULL)
        OR
        (traversal_direction='Gakkentoshi_to_JRTozai'
          AND source_boundary_station_urn='odpt.Station:JR-West.Gakkentoshi.Kyobashi-Osaka'
          AND (continued_as_train_number IS NULL OR
               (source_train_number='5727C' AND
                public_train_number='5727C' AND
                continued_as_train_number='4527C')))
      );
  END IF;
END $tozai_direction_constraint$;

-- Official train pages directly prove each exact source's Kyobashi arrival,
-- departure and the connection beyond Kyobashi on JR Tozai. Holiday H suffix
-- is a legacy import calendar discriminator, not a published vehicle/formation.
-- In the 5727C case the public service number CHANGES to 4527C at Kyobashi;
-- that must not be modeled as 5727C throughout both lines.
WITH proof(id,source_number,public_number,cal,kyobashi_arrival,kyobashi_departure,
           next_number,url) AS (
VALUES
 (41344::bigint,'5421M','5421M','odpt.Calendar:Weekday','06:59','07:01',NULL::text,
   'https://timetable.jr-odekake.net/train-timetable/323491?date=20261013'),
 (41345::bigint,'5421MH','5421M','odpt.Calendar:SaturdayHoliday','07:06','07:08',NULL,
   'https://timetable.jr-odekake.net/train-timetable/323501?date=20261004'),
 (41346::bigint,'5423M','5423M','odpt.Calendar:Weekday','07:22','07:24',NULL,
   'https://timetable.jr-odekake.net/train-timetable/70091?date=20261008'),
 (41347::bigint,'5423MH','5423M','odpt.Calendar:SaturdayHoliday','07:19','07:22',NULL,
   'https://timetable.jr-odekake.net/train-timetable/70331?date=20261004'),
 (41375::bigint,'5491M','5491M','odpt.Calendar:Weekday','15:52','15:53',NULL,
   'https://timetable.jr-odekake.net/train-timetable/122361?date=20261007'),
 (41376::bigint,'5491MH','5491M','odpt.Calendar:SaturdayHoliday','15:52','15:53',NULL,
   'https://timetable.jr-odekake.net/train-timetable/122511?date=20261114'),
 (41364::bigint,'5953M','5953M','odpt.Calendar:Weekday','11:05','11:07',NULL,
   'https://timetable.jr-odekake.net/train-timetable/200871?date=20261006'),
 (41340::bigint,'5727C','5727C','odpt.Calendar:Weekday','06:30','06:32','4527C',
   'https://timetable.jr-odekake.net/train-timetable/123341?date=20261027')
), matched AS (
 SELECT p.*,s.arrival_station_urn
 FROM proof p
 JOIN public.manual_timetable_templates m
    ON m.id=p.id AND m.line_key='Gakkentoshi'
      AND m.calendar_urn=p.cal AND m.train_number=p.source_number
      AND m.source_path='data/timetables/Gakkentoshi-manual.js'
 JOIN public.manual_timetable_template_stops s
    ON s.template_id=m.id
      AND s.stop_sequence=(SELECT max(last.stop_sequence)
         FROM public.manual_timetable_template_stops last WHERE last.template_id=m.id)
      AND s.arrival_station_urn='odpt.Station:JR-West.Gakkentoshi.Kyobashi-Osaka'
      AND s.arrival_clock=p.kyobashi_arrival
      AND s.departure_clock=p.kyobashi_departure
)
INSERT INTO public.published_jrwest_tozai_2611_source_links
 (source_template_id,calendar_urn,source_train_number,public_train_number,
  kyobashi_departure_clock,source_boundary_station_urn,source_boundary_arrival_clock,
  official_source_url,traversal_direction,continued_as_train_number)
SELECT id,cal,source_number,public_number,kyobashi_departure,
   arrival_station_urn,kyobashi_arrival,url,
   'Gakkentoshi_to_JRTozai',next_number
FROM matched
ON CONFLICT (source_template_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS jrwest_tozai_2611_direction_calendar_idx
 ON public.published_jrwest_tozai_2611_source_links
 (traversal_direction,calendar_urn,public_train_number);

DO $audit_tozai$
BEGIN
 IF (SELECT count(*) FROM public.published_jrwest_tozai_2611_source_links
     WHERE edition='2611')<>13 THEN
   RAISE EXCEPTION 'JR Tozai expected 13 verified partial source rows (5+8)';
 END IF;
 IF (SELECT count(*) FROM public.published_jrwest_tozai_2611_source_links
     WHERE traversal_direction='Gakkentoshi_to_JRTozai')<>8 THEN
   RAISE EXCEPTION 'JR Tozai westbound source evidence is incomplete';
 END IF;
 IF (SELECT count(*) FROM public.published_jrwest_tozai_2611_source_links
     WHERE traversal_direction='JRTozai_to_Gakkentoshi')<>5 THEN
   RAISE EXCEPTION 'JR Tozai existing eastbound source evidence drifted';
 END IF;
 IF (SELECT count(*) FROM public.published_jrwest_tozai_2611_source_links
     WHERE source_train_number='5727C' AND continued_as_train_number='4527C')<>1 THEN
   RAISE EXCEPTION 'JR Tozai 5727C -> 4527C renumbering is unverified';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.published_jrwest_tozai_2611_source_links x
   WHERE x.vehicle_type IS NOT NULL OR x.vehicle_png_path IS NOT NULL
      OR x.actual_vehicle_confirmed
      OR x.timetable_completeness <> 'partial_source_only'
      OR x.verification_scope <> 'official_number_and_boundary_clock_only'
      OR x.official_source_url !~ '^https://timetable[.]jr-odekake[.]net/train-timetable/'
 ) THEN RAISE EXCEPTION 'JR Tozai proof promoted to non-evidenced timetable or vehicle';
 END IF;
END $audit_tozai$;
COMMIT;
