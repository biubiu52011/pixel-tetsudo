-- Private21: Tobu 50090 (TJ Liner) dated exact numbered services.
--
-- Official Tobu fleet description explicitly ties type 50090 to TJ Liner:
-- https://www.tobu.co.jp/corporation/rail/vehicles/
-- Official Tobu weekday timetable (2025-03-15 revision) lists TJ Liner
-- up 2,4,6,8,10 and down 1,3,5,...,29 with matching 2024 departures:
-- https://www.tobu.co.jp/railway/tj/timetable/
-- Independent DATED 2024-03-16 weekday train working diagram labels
-- 列車番号 and 編成=50090 for EACH listed train in exactly this set:
-- https://munexpress.web.fc2.com/tobu/tita/2024/921-20240316.pdf
-- Cross-check 2026-04-01 observation for actual 50090 1 train:
-- https://www.tetsudo.com/movie/calendar/20260401/4.html
--
-- IMPORTANT: the 2024 diagram is a third-party historical source, NOT a
-- primary operator guarantee of 2026-11-18 train/formation/day.
-- The operator's official timetable labels TJ services, but those labels
-- alone are not a current exact-formation ID.
-- Preserve each distinct documented number as a SINGLETON. In particular,
-- do NOT merge 1-29 into a continuous interval (12,14,...,28 omitted).
-- Do NOT include rapid trains 51/54, Kawagoe limited 70-96 or numbered
-- deadheads merely because a historical working sometimes used 50090.
-- This is a pure/reference-only scoped TOJO record: no schedule update,
-- no new runtime mapping rule, no vehicle/formation assertion, and no
-- change to asset state, service day, operational or uniqueness guards.
BEGIN;
DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
     WHERE image_path='images/列车/東武鉄道/東武鉄道_50090型.png'
       AND operator='Tobu' AND vehicle_type='50090型'
       AND asset_status='available' AND asset_scope='generic'
       AND is_generic=TRUE AND file_format_status='native_png'
       AND formation_id IS NULL AND car_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Private21 50090 gallery asset metadata changed: manually review';
  END IF;
  IF EXISTS (
    WITH proposed(num) AS (
      VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(13),(15),(17),(19),(21),(23),(25),(27),(29)
    )
    SELECT 1 FROM proposed p
    JOIN public.published_train_png_number_ranges r
      ON r.edition='2611' AND r.line_key='Tojo' AND r.suffix=''
     AND p.num BETWEEN r.min_number AND r.max_number
  ) THEN
    RAISE EXCEPTION 'Private21 already numbered Tojo service overlaps reference';
  END IF;
END;
$preflight$;
INSERT INTO public.published_train_png_number_ranges
  (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
   png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Tojo','png_band/Tojo/0001-0001',1,1,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0002-0002',2,2,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0003-0003',3,3,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0004-0004',4,4,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0005-0005',5,5,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0006-0006',6,6,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0007-0007',7,7,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0008-0008',8,8,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0009-0009',9,9,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0010-0010',10,10,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0011-0011',11,11,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0013-0013',13,13,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0015-0015',15,15,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0017-0017',17,17,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0019-0019',19,19,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0021-0021',21,21,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0023-0023',23,23,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0025-0025',25,25,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0027-0027',27,27,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE),
  ('2611','Tojo','png_band/Tojo/0029-0029',29,29,'',NULL,'../images/列车/東武鉄道/東武鉄道_50090型.png',NULL,FALSE,FALSE);
DO $verify$
DECLARE refs integer; expanded integer;
BEGIN
  SELECT count(*),coalesce(sum(max_number-min_number+1),0)
    INTO refs,expanded
    FROM public.published_train_png_number_ranges
   WHERE edition='2611' AND line_key='Tojo'
     AND png_reference='../images/列车/東武鉄道/東武鉄道_50090型.png'
     AND segment_key LIKE 'png_band/Tojo/%'
     AND suffix='' AND vehicle_model IS NULL AND source_url IS NULL
     AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
  IF refs<>20 OR expanded<>20 THEN
    RAISE EXCEPTION 'Private21 expected 20 discrete historical TJ service numbers; got %/%',refs,expanded;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.published_train_png_number_ranges
     WHERE edition='2611' AND line_key='Tojo'
       AND png_reference='../images/列车/東武鉄道/東武鉄道_50090型.png' AND
       (min_number<>max_number OR min_number IN (12,14,16,18,20,22,24,26,28))
  ) THEN
    RAISE EXCEPTION 'Private21 must not invent a continuous 1..29 TOJO span';
  END IF;
END;
$verify$;
COMMIT;
