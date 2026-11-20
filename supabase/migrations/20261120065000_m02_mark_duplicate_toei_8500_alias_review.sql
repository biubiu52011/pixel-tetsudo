-- M-02: The two files below have the same verified Git blob SHA:
--   都営地下鉄_8500形（別）.png
--   都営地下鉄_8500形_8501号車_山吹色.png
-- Blob: b599af3f0168687b5c278b25c4ea0be8511372c0.
-- Preserve both existing gallery paths. The generic "（別）" alias must not
-- advertise an independently reviewed/available train identity.
-- No train-number range is added or changed.
DO $m02$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/都営地下鉄/都営地下鉄_8500形_8501号車_山吹色.png'
      AND asset_status='review' AND asset_scope='review'
      AND appearance_class='requires_review'
  ) THEN
    RAISE EXCEPTION 'M-02: reference 8501 Yamabuki PNG is not review-only';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.published_train_png_number_ranges
    WHERE png_reference LIKE '%都営地下鉄_8500形（別）.png%'
       OR png_reference LIKE '%都営地下鉄_8500形_8501号車_山吹色.png%'
  ) THEN
    RAISE EXCEPTION 'M-02: duplicate 8500 images have number ranges; manual review required';
  END IF;
  UPDATE public.vehicle_image_assets
  SET asset_status='review', asset_scope='review', is_generic=false,
      appearance_class='requires_review',
      review_note='Git blob b599af3f0168687b5c278b25c4ea0be8511372c0 is identical to 都営地下鉄_8500形_8501号車_山吹色.png. This alternate filename is a review-only duplicate, not an independently approved generic PNG and not train-number evidence. Keep original path until deliberate gallery deduplication.'
  WHERE image_path='images/列车/都営地下鉄/都営地下鉄_8500形（別）.png'
    AND asset_status='available' AND asset_scope='generic'
    AND is_generic=true AND file_format_status='native_png';
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_image_assets
    WHERE image_path='images/列车/都営地下鉄/都営地下鉄_8500形（別）.png'
      AND asset_status='review' AND asset_scope='review'
      AND is_generic=false AND appearance_class='requires_review'
      AND file_format_status='native_png'
  ) THEN
    RAISE EXCEPTION 'M-02: duplicate 8500 alias review-only check failed';
  END IF;
END
$m02$;