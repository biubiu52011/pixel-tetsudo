-- M-01: native PNG CRC and IHDR were verified against GitHub blob b599af3f0168687b5c278b25c4ea0be8511372c0 (82x98, 1730 bytes).
-- Idempotent metadata-only change. This does NOT approve the image or create a train-number mapping.
DO $m01$
BEGIN
  UPDATE public.vehicle_image_assets SET file_format_status='native_png'
  WHERE image_path='images/列车/都営地下鉄/都営地下鉄_8500形_8501号車_山吹色.png'
    AND asset_status='review' AND asset_scope='review'
    AND appearance_class='requires_review' AND file_format_status IS NULL;
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/都営地下鉄/都営地下鉄_8500形_8501号車_山吹色.png'
      AND asset_status='review' AND asset_scope='review'
      AND appearance_class='requires_review'
      AND file_format_status IN ('native_png')
  ) THEN RAISE EXCEPTION 'M-01 8501 yamabuki review-only native PNG verification missing'; END IF;
END
$m01$;
