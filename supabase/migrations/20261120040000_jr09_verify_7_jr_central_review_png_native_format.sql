-- JR-09 / JR-Central: byte-level audit of seven pre-existing review-only PNGs.
-- GitHub main files: valid PNG signature, IHDR, all chunk CRCs and terminating IEND;
-- all seven images are 82x98. This changes format metadata ONLY.
-- Does not approve artwork, assign rolling stock, or publish any train-number band.
DO $migration$
DECLARE
  target_paths text[] := ARRAY[
    'images/列车/JR東海/c11nsk.png',
    'images/列车/JR東海/c25-1.png',
    'images/列车/JR東海/c313ce.png',
    'images/列车/JR東海/c35.png',
    'images/列车/JR東海/c385.png',
    'images/列车/JR東海/c75.png',
    'images/列车/JR東海/c85h.png'
  ];
  found_count integer;
BEGIN
  SELECT count(*) INTO found_count
  FROM public.vehicle_image_assets AS a
  WHERE a.image_path = ANY(target_paths)
    AND a.operator='JR-Central'
    AND a.asset_status='review'
    AND a.asset_scope='review'
    AND a.appearance_class='requires_review'
    AND a.file_format_status IS NULL
    AND a.formation_id IS NULL
    AND a.livery IS NULL;
  IF found_count <> 7 THEN
    RAISE EXCEPTION 'JR09 requires exactly seven unchanged review-only assets, got %', found_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.published_train_png_number_ranges AS r
    WHERE regexp_replace(r.png_reference, '^(\\.\\./|/)+', '') = ANY(target_paths)
  ) THEN
    RAISE EXCEPTION 'JR09 review-only images unexpectedly have published number bands';
  END IF;

  UPDATE public.vehicle_image_assets
     SET file_format_status='native_png'
   WHERE image_path = ANY(target_paths)
     AND operator='JR-Central'
     AND asset_status='review'
     AND asset_scope='review'
     AND appearance_class='requires_review'
     AND file_format_status IS NULL;

  SELECT count(*) INTO found_count
  FROM public.vehicle_image_assets AS a
  WHERE a.image_path = ANY(target_paths)
    AND a.asset_status='review' AND a.asset_scope='review'
    AND a.appearance_class='requires_review'
    AND a.file_format_status='native_png';
  IF found_count <> 7 THEN
    RAISE EXCEPTION 'JR09 native PNG post-check failed: %/7', found_count;
  END IF;
END
$migration$;
