-- Metro first scoped PNG-number reference bands, November 2026 edition.
-- Reuse EXACTLY the existing guarded JS min/max/suffix on source-only lines.
-- Plain bands are supplemental inventory, not proof of an actual carset or
-- entitlement to skip the existing service date, calendar, source operator,
-- train-number format, model and through-service checks.
-- Deliberately exclude multi-PNG lines and unverified Asakusa GTFS numbers.
DO $metro_six_reference_guard$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('Ginza',501,6152,'','../images/列车/東京メトロ/東京メトロ_1000系.png'),
    ('Marunouchi',427,21153,'','../images/列车/東京メトロ/東京メトロ_2000系.png'),
    ('MarunouchiBranch',543,23632,'','../images/列车/東京メトロ/東京メトロ_2000系.png'),
    ('Chiyoda',501,2496,'S','../images/列车/東京メトロ/東京メトロ_16000系.png'),
    ('Namboku',530,2456,'S','../images/列车/東京メトロ/東京メトロ_9000系.png'),
    ('JobanLocal',400,2599,'S','../images/列车/東京メトロ/東京メトロ_16000系.png')
  ) AS v(line_key,min_number,max_number,suffix,png_reference)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicle_image_assets a
      WHERE a.image_path=substring(r.png_reference FROM 4)
        AND a.asset_status='available'
        AND a.file_format_status='native_png'
        AND a.appearance_class IS DISTINCT FROM 'requires_review'
    ) THEN
      RAISE EXCEPTION 'Metro PNG unavailable or review-only: %',r.png_reference;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.published_train_png_number_ranges b
      WHERE b.edition='2611' AND b.line_key=r.line_key AND b.suffix=r.suffix
        AND b.min_number<=r.max_number AND b.max_number>=r.min_number
        AND b.png_reference<>r.png_reference
    ) THEN
      RAISE EXCEPTION 'Metro reference band conflicts with a different PNG: %, %',r.line_key,r.png_reference;
    END IF;
  END LOOP;
END
$metro_six_reference_guard$;

INSERT INTO public.published_train_png_number_ranges
 (edition,line_key,segment_key,min_number,max_number,suffix,vehicle_model,
  png_reference,source_url,requires_exact_roster,actual_vehicle_confirmed)
VALUES
  ('2611','Ginza','png_band/Ginza/0501-6152',501,6152,'',NULL,'../images/列车/東京メトロ/東京メトロ_1000系.png',NULL,FALSE,FALSE),
  ('2611','Marunouchi','png_band/Marunouchi/0427-21153',427,21153,'',NULL,'../images/列车/東京メトロ/東京メトロ_2000系.png',NULL,FALSE,FALSE),
  ('2611','MarunouchiBranch','png_band/MarunouchiBranch/0543-23632',543,23632,'',NULL,'../images/列车/東京メトロ/東京メトロ_2000系.png',NULL,FALSE,FALSE),
  ('2611','Chiyoda','png_band/Chiyoda/0501-2496S',501,2496,'S',NULL,'../images/列车/東京メトロ/東京メトロ_16000系.png',NULL,FALSE,FALSE),
  ('2611','Namboku','png_band/Namboku/0530-2456S',530,2456,'S',NULL,'../images/列车/東京メトロ/東京メトロ_9000系.png',NULL,FALSE,FALSE),
  ('2611','JobanLocal','png_band/JobanLocal/0400-2599S',400,2599,'S',NULL,'../images/列车/東京メトロ/東京メトロ_16000系.png',NULL,FALSE,FALSE)
ON CONFLICT (edition,line_key,segment_key,min_number,max_number,suffix) DO NOTHING;

DO $metro_six_reference_verify$
DECLARE found integer;
BEGIN
  SELECT count(*) INTO found
  FROM public.published_train_png_number_ranges
  WHERE edition='2611' AND segment_key IN (
    'png_band/Ginza/0501-6152',
    'png_band/Marunouchi/0427-21153',
    'png_band/MarunouchiBranch/0543-23632',
    'png_band/Chiyoda/0501-2496S',
    'png_band/Namboku/0530-2456S',
    'png_band/JobanLocal/0400-2599S'
  )
    AND vehicle_model IS NULL AND source_url IS NULL
    AND requires_exact_roster=FALSE AND actual_vehicle_confirmed=FALSE;
  IF found<>6 THEN
    RAISE EXCEPTION 'Metro six reference bands were not persisted: %/6',found;
  END IF;
END
$metro_six_reference_verify$;
